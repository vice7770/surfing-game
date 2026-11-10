# Snap's rail change: why the cutback turns the old way first, and why it falls (2026-11-10)

The owner's cutback (Snap held, stick thrown the other way after a carve) is "very off": the board
turns harder the OLD way for about half a second before it reverses, it barely leans on the new rail,
and almost every scripted cutback falls. This study traces both faults frame by frame and tries a fix.

**Outcome: first written up with nothing shipped; then shipped as an opt-in, default off (last section).** A candidate (`?snapCross=on`) cuts the wrong-way turn by
about half, but it misses the pass bar on the roll and on the heading turned, and it does not cut the
falls. 

Nothing here was seen on screen. Everything is scripted probes on flat water and on the Canyon-matched
test wave (`FaceWater({ depth: 2.6, height: 1.4, slope: 16, speed: 5.7 })`); no rides on the real sea.

## The runs

48 runs, 24 a row: a Compress carve then Snap + opposite stick ("cutback"), and a stick-only carve
then Snap + opposite stick ("standcut"); 6 to 11 m/s; toe side and heel side; flat water and the test
wave. Snap is held 1.5 s, then let go for 1.5 s. Raw tables are in `results.txt`.

## A. The wrong-way turn

### What happens (main, cutback, flat water, 10 m/s, toe side; minus = the old way)

| s after Snap | speed m/s | yaw °/s | board roll ° | body lean ° | twist on board N·m | weight shift m (− = tail) | front foot share | rider's yaw moment N·m |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.000 | 9.1 | −54 | −38 | −42 | 0 | 0.00 | 0.67 | −33 |
| 0.017 | 9.5 | −112 | −39 | −42 | 100 | 0.00 | 0.67 | −13 |
| 0.033 | 9.7 | −141 | −38 | −42 | 64 | 0.00 | 0.65 | −44 |
| 0.117 | 9.3 | −76 | −35 | −40 | −11 | −0.04 | 0.56 | −96 |
| 0.217 | 9.0 | −87 | −32 | −33 | −18 | −0.12 | 0.50 | −97 |
| 0.317 | 8.0 | −97 | −20 | −21 | −11 | −0.19 | 0.49 | −88 |
| 0.417 | 7.2 | −2 | −3 | −8 | −5 | −0.22 | 0.51 | −27 |
| 0.467 | 7.2 | +56 | +3 | −2 | −4 | −0.23 | 0.50 | 0 |
| 0.617 | 7.1 | +22 | +11 | +12 | −1 | −0.25 | 0.30 | +37 |

### The mechanism

When Snap and the opposite stick arrive, the body is still leaning about 42° into the old turn. It
takes about 0.5 s to come over the board, and the board cannot turn the new way until it does: it has
to keep running the old way to pass under the body (the counter-steer of
`docs/research/rail-change-study.md`). That part is physical. Three things make it worse than it needs
to be:

1. **The shoulders wind at once.** Snap winds the shoulders the new way in the first step, and the
   reaction goes into the board the old way: 100 N·m in the first 1/60 s. Yaw jumps −54 → −112 →
   −141 °/s. Over the 29 runs where the body does cross: 63 °/s before Snap, 101 in Snap's first step.
2. **Snap puts the weight on the tail while the board is still on the old rail.** Within 0.3 s the
   weight is 0.22 m back and the front foot's share falls 0.67 → 0.50. The rider's yaw moment on the
   board goes −33 → −97 N·m the old way. Weight on the tail of a banked board tightens the turn it is
   already in, so the old carve tightens (peak old-way yaw 146 °/s, from 63).
3. **Nothing pushes the body across.** Snap zeroes Compress, so the Compress carve's own pull to the
   outside is gone, and the back-foot leg drive is off by default. The body only crosses because the
   board runs out from under it.

The rule that produces the old-way yaw is therefore not one line: it is Snap's tail weight
(`balanceStep`, the `copTarget.z` for Snap) acting before the rail change, on top of the twist
reaction, on top of a counter-steer nothing shortens. Board roll reaches flat at 0.42–0.45 s, yaw
reverses at about 0.45 s, and the speed is already down (9.1 → 7.2 m/s here; 6.2 → 3.5 from a slow start).

Frontside and backside are the same on flat water. On the wave they differ only because the toe-side
run carves up the face first (see the falls). Stick-only carves are worse than Compress carves (old-way
time 0.65 s against 0.52 s) because the body starts further inside.

### What a real surfer does differently

From `docs/research/stance-map.md`: out of the bottom turn the surfer extends and brings the weight
more even over the board while crossing (Knox's cutback notes, Bali Surfing Camp's "decompress up the
face"), pushes the tail round through the back foot with the body more upright (Knox), and only then
sits on the tail, on the NEW rail, at the top (Hobgood; Rapture's 65/35–70/30 back-foot split). The old
turn's rate fades through the change; it does not double. Rail angle in the turn is 76 ± 5° (Forsyth
2024); ours reaches 16–36° in the means, 43° where the body crosses, which is the lean cap.

## B. The falls

With everything off, 47 of 48 runs fall. Split by what fails first:

| cause | cutback | standcut | total | what it is |
| --- | --- | --- | --- | --- |
| stall | 14 | 7 | 21 | crosses and turns, then drops off the plane (speed kept 0.4–0.5 through the hold); falls inside the new turn, mostly 0.2–1.2 s after Snap is let go (1.7–2.7 s after Snap) |
| speed gone | 4 | 8 | 12 | under 3 m/s before the body has crossed; the board stands on its tail (pitch 45–73°); mostly the 6–7 m/s starts on flat water |
| old side | 3 | 4 | 7 | the body never comes over; falls into the OLD turn at speed, 0.3–1.3 s after Snap. All on the wave's toe side, where the first carve goes up the face and is already at its edge when Snap arrives (margin 0.10–0.16, upper body swung out 35–40°) |
| thrown | 2 | 5 | 7 | over the board and on the new rail at speed, then the body goes past its lean inside the new turn while Snap is held (0.8–1.5 s) |
| rides | 1 | 0 | 1 | |

So about 33 of 47 are speed deaths: holding Snap with a full stick for 1.5 s is a brake and nothing
gives the speed back. 7 are the known "can't carve up the face" fault, arriving before the rail change
starts. Only the 7 "thrown" falls happen in the rail change's own aftermath. **The falls are mostly not
caused by the wrong-way turn**, and shortening it does not remove them.

## C. The candidate, and why it is not shipped

`?snapCross=on` (wired like `?snapLegs=drive`): under Snap, (1) the weight
waits over the middle of the board until the body has come over, then goes to the tail on the new
rail, and (2) the back foot pushes the body toward the new rail (the existing leg drive, 250 N, with
its equal and opposite push on the tail). Both act through the feet; no added moment or brake.

Same frames with it on (cutback, flat, 10 m/s, toe): yaw −54 → −70 → −80 → −43 → −3 → +5 °/s by
0.17 s, then −41 to −65 while the body crosses, new way from 0.6 s. The board goes nearly straight
through the change instead of harder the old way.

The 29 runs whose body crosses with everything off:

| | main | candidate |
| --- | --- | --- |
| yaw in Snap's first step °/s (63 before) | 101 | 74 |
| peak old-way yaw °/s | 146 | 83 |
| first turns the new way s | 0.45 | 0.30 |
| heading run on the old way ° | 35 | 15 |
| body over the board s | 0.48 | 0.51 |
| roll on the new rail ° | 43 | 41 |
| heading the new way at 1.5 s ° | 35 | 47 |

The earlier study's own scripts (`docs/research/snap-legs-2026-11-10`, 24 runs a row):

| | wrong-way s | roll ° | turned from the extreme ° | speed kept | falls in the hold | falls in all |
| --- | --- | --- | --- | --- | --- | --- |
| Compress cutback, main | 0.41 | 28 | 55 | 0.46 | 7 | 21 |
| Compress cutback, candidate | 0.22 | 23 | 42 | 0.49 | 5 | 20 |
| stick-only cutback, main | 0.51 | 29 | 68 | 0.35 | 15 | 21 |
| stick-only cutback, candidate | 0.33 | 19 | 50 | 0.44 | 8 | 22 |
| half stick, main | 0.37 | 13 | 28 | 0.48 | 6 | 12 |
| half stick, candidate | 0.36 | 8 | 25 | 0.48 | 5 | 9 |
| Snap from trim, main | 0.09 | 42 | 67 | 0.60 | 4 | 23 |
| Snap from trim, candidate | 0.09 | 42 | 70 | 0.58 | 4 | 19 |

With no Snap held (trim, Compress carve, stick carve; flat and wave) the output is byte-identical.

Against the pass bar:

- wrong-way time drops clearly: **yes** for the Compress cutback (0.41 → 0.22 s), **short** for the stick-only one (0.51 → 0.33 s, bar 0.2 s);
- roll on the new rail rises: **no** (28 → 23°, 29 → 19°; 43 → 41° where the body crosses). It sits at the lean cap, which this work may not change;
- heading turned not less: **no** by the earlier study's measure (55 → 42°, 68 → 50°), because the board no longer swings as far the old way first; yes by net heading from Snap (35 → 47° at 1.5 s);
- falls not more: **equal** (42 → 42 of 48; fewer inside the hold, 22 → 13).

Two of four, so by the brief nothing went into `src/` at first. It was shipped afterwards as an opt-in; see the last section.

### Candidates dropped

Numbers are for the 29 matched runs: peak old-way yaw °/s / heading run on ° (main 146 / 35).

| candidate | result | why dropped |
| --- | --- | --- |
| no twist reaction (shoulders do not wind) | 161 / 38 | removes the first-step jump (101 → 57 °/s) and nothing else |
| weight waits for the cross, alone | 127 / 29 | small |
| leg drive under Snap, alone (same as `?legDrive=on`) | 115 / 25 | reverses later (0.57 s); stick-only falls in the hold 16 → 21 |
| weight eases back in step with the body | 128 / 30 | no better than waiting |
| eased weight + drive | 92 / 18 | worse than wait + drive (83 / 15) |
| weight let go with 30 / 50 / 70 % of the old lean left | 83–88 / 15–17 | no better |
| legs stand up through the cross (alone, and with each of the above) | 106–154 / 25–41 | more falls in the hold (9 → 14, 16 → 20), heading lost |
| let the old rail go first | not tried | it is the rail-first roll on the don't-retry list |

## What is still off

- **The body takes 0.5 s to cross in every setting.** No candidate moved it (0.47–0.52 s). Total time
  spent turning the old way stays about 0.46 s; the candidate only makes that turn weak. A sharper
  cutback needs a faster way for the body to get over the board, the same wall the rider-movement work hit.
- **Roll on the new rail stops at the lean cap** (about 45°) against 76° for a real surfer.
- **Held Snap is a brake with no return.** Two thirds of the falls are speed deaths.
- **The toe-side carve up the wave is at its edge before Snap arrives.**

## Surprises

- The existing `?legDrive=on` already acts at Snap's rail change; the candidate with `legDrive` on top is byte-identical to the candidate alone.
- `?snapLegs=drive` and `?carveFlex=on` leave the wrong-way turn untouched (146 / 35 both ways).
- Removing the twist reaction makes the old-way peak slightly higher, not lower.
- Toe and heel side are the same on flat water; all the difference is the wave.

## Files

- `results.txt`: every table (means, the 29 matched runs, falls by cause, every run, frame tables).
- `railchange.test.ts.txt`: the probe. `run.sh.txt` runs the 48-run set; `sum.py.txt`, `share.py.txt`, `falls.py.txt`, `frames.py.txt` make the tables.
- The candidate's patch file is gone: the code is in `src/` now (see "Shipped as opt-in").

## Shipped as opt-in

`?snapCross=on` is in the game, default off (`AttachedRiderOptions.snapCross: 'on'`; online rooms run the
default). The code is the candidate's patch unchanged, plus `src/physics/snapCross.test.ts`. With the
switch off the output is byte-identical to before.

Why, although it missed the bar (the parent session's reason): the bar's "turned from the extreme"
measure penalises the very thing being fixed, since less swing the old way leaves less to turn back
from. By net heading from Snap it turns more (35 → 47° at 1.5 s), the old-way kick halves (146 →
83 °/s), falls in the hold drop (22 → 13) and all falls are equal (42 → 42). The lower roll on the new
rail (28 → 23°, 29 → 19°) is a real drawback and stays. It is opt-in so the owner can judge the feel.

The numbers above are unchanged: the Compress cutback row was run again on the shipped code and its
results are byte-identical to the candidate's.

With the other switches (Compress cutback, 24 runs, the earlier study's scripts):

| | wrong-way s | roll ° | peak yaw °/s | turned ° | speed kept | pelvis height mid / exit m | falls in the hold | falls in all |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all off | 0.41 | 28 | 112 | 55 | 0.46 | 0.52 / 0.52 | 7 | 21 |
| `snapCross=on` | 0.22 | 23 | 115 | 42 | 0.49 | 0.50 / 0.51 | 5 | 20 |
| `snapLegs=drive` | 0.41 | 31 | 126 | 55 | 0.51 | 0.60 / 0.64 | 7 | 22 |
| both | 0.22 | 25 | 126 | 42 | 0.52 | 0.59 / 0.61 | 5 | 21 |

- **With `snapLegs=drive` the two add up without getting in each other's way:** the rail change is
  snapCross's (0.22 s, 42°), the rising legs and the speed kept are snapLegs's (0.52), and the roll
  lands between (25°).
- **With `legDrive=on` on top nothing changes:** byte-identical to `snapCross=on` alone, on flat water
  and on the wave. Under Snap the push is the same one.

Still not seen on screen.
