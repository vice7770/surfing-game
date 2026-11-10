# The turning body: three drawn fixes behind switches (2026-11-10)

The study next to this file (`README.md`) measured why the surfer looks "very off" in turns. This
page covers the three drawn changes built from it. **All three are off by default and change the
drawing only.** The ride, the steering and the falls are the same with them on (the "fell at"
column below is identical in every run). Nothing in `src/physics` changed.

## The switches

| Address | What it does | What causes the motion |
| --- | --- | --- |
| `?turnTrunk=lean` | In a turn the trunk leans with the body instead of folding at the waist. | The turn's load: the physics' own lean line. |
| `?turnLead=on` | The head, then the shoulders, then the hips turn toward the new direction as soon as the stick moves. The turn's pose starts with the stick too. | The stick. |
| `?cutbackHand=back` | In a frontside cutback (Snap held) the back hand goes down to the water and the front arm points where the board is going. | Snap held on the heels' rail. |
| `?turnBody=on` | All three. | |

They work in the game (with the dev tools, like the other rig switches) and on `character-sheet.html`.

**Online rooms.** Same rule as `?snapArms=old`: a switch is for the page, so it changes how *this*
page draws every rider, the player's and the others'. Nothing is sent. Another player's stick is
not on the wire, so `turnLead` does nothing for their rider (they are drawn as today); the trunk
lean and the cutback hand do apply to them.

## See it on the character sheet

Six new films on flat water at 8 m/s. Open each without and with `&turnBody=on` (or one switch):

- Compress carve, toe side: `character-sheet.html?motion=turn-toe` and `character-sheet.html?motion=turn-toe&turnBody=on`
- Compress carve, heel side: `character-sheet.html?motion=turn-heel` and `...&turnBody=on`
- Stick-only carve: `character-sheet.html?motion=turn-stand-toe`, `character-sheet.html?motion=turn-stand-heel`
- Frontside cutback (carve, then Snap with the stick the other way): `character-sheet.html?motion=turn-cutback` and `character-sheet.html?motion=turn-cutback&turnBody=on`
- Backside cutback: `character-sheet.html?motion=turn-cutback-backside`

Add `&side=goofy` or `&surfer=0`…`3` as on the other films. Single switches: `&turnTrunk=lean`, `&turnLead=on`, `&cutbackHand=back`.

## What the player will see

1. **The lean.** In a carve the body is one line from the board to the head. Before, the trunk
   folded 25–30° further over the toes than the body's line; now it stays within about 7°.
2. **The lead.** Push the stick and the head looks into the turn at once, the chest follows about
   a tenth of a second later, the hips after that, all before the board has come round. Before,
   the head turned *after* the board and the chest a second later or never. Once the board is
   turning, the lead hands over to it; it is not added on top.
3. **The cutback hand.** In a frontside cutback the back hand comes down near the water and the
   front arm lifts and points into the turn. Before it was the front hand that dropped.

## Before and after: the films (60 Hz, Regular; Goofy mirrors; a 30 Hz page within 0.03 s and 3°)

**Trunk against the body's line, across the board** (from 0.5 s after the stick to its release):

| Turn | Before, mean / max | After, mean / max | Trunk from upright, before → after |
| --- | --- | --- | --- |
| Compress carve, toe side | 25° / 30° | 7° / 8° | up to 66° → up to 43° |
| Compress carve, heel side | 14° / 28° | 8° / 13° | 58° → 48° |
| Stick-only carve, toe side | 12° / 16° | 5° / 9° | |
| Stick-only carve, heel side | 10° / 20° | 7° / 11° | |
| Frontside cutback, Snap | 40° / 57° | 10° / 19° | |
| Backside cutback, Snap | 35° / 54° | 5° / 8° | 102° → 56° |

**Who turns first** (seconds after the stick; "10°" = that far into the turn):

| Part | Before | After |
| --- | --- | --- |
| Head 10° | 0.63 | 0.07 |
| Chest 10° | 1.2 (toe side), never (heel side) | 0.18–0.20 |
| Hips 5° | never | 0.28–0.30 |
| Hips 10° | never | 0.45 toe side; never heel side (8° at most) |
| Board's heading 10° (unchanged, physics) | 0.47 | 0.47 |

**Frontside cutback, the last 0.4 s of Snap** (height over the water):

| | Before | `cutbackHand=back` alone | All three |
| --- | --- | --- | --- |
| Back hand | 0.67–0.88 m | 0.10–0.33 m | 0.13–0.31 m |
| Front hand | 0.12–0.27 m | 0.51–0.64 m | 0.26–0.56 m |
| Front arm | along the board | up to 50–60° into the turn | up to 40° into the turn |

The back hand comes down over about a quarter second (6 m/s at its fastest; the old arm swing at
the rail change is 13 m/s and is still there). In the **backside cutback** the hands are no longer
drawn under the water while Snap is held: lowest hand −0.05 m (−0.13 m on a 30 Hz page) before,
+0.13 m after.

**Still standing on the board** (all three on, every film): knees 48–163° (no locked knee; the
stick-only heel turn had 171° before); feet slide at most 1 mm per frame more than before; the
fastest wrist is no faster than before; the hips stay between the feet (0.36–0.63 of the way,
0.40–0.62 before).

## Before and after: the study's probe (off → on, all three)

Same probe and plans as the study (`turnbody.test.ts.txt`, now reading `SW=turnBody=on`), flat
water and the test wave calibrated to Canyon B. Each row skips the first 0.3 s of its part. Many
of these runs end in a fall (as in the study); the large maximums come from the moments the rider
is already going over.

| run | part | line gap mean / max, ° off → on | trunk from upright max, ° | front hand lowest, m | back hand lowest, m | straightest knee, ° | fell at, s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compress carve flat 8 toe | carve | 26 / 33 → 7 / 8 | 65 → 49 | 0.16 → 0.25 | 0.02 → 0.02 | 116 → 119 | 3.7 → 3.7 |
| Compress carve flat 8 heel | carve | 27 / 38 → 7 / 12 | 85 → 65 | 0.05 → 0.10 | 0.29 → 0.33 | 124 → 121 | 3.5 → 3.5 |
| Compress carve flat 11 toe | carve | 30 / 46 → 6 / 9 | 77 → 44 | 0.26 → 0.41 | 0.09 → 0.24 | 118 → 121 | - → - |
| Compress carve flat 11 heel | carve | 12 / 31 → 7 / 12 | 51 → 49 | 0.24 → 0.27 | 0.63 → 0.67 | 126 → 122 | - → - |
| Compress carve canyon 8 toe | carve | 15 / 48 → 7 / 38 | 74 → 74 | 0.22 → 0.20 | 0.06 → 0.06 | 120 → 118 | 2.4 → 2.4 |
| Compress carve canyon 8 heel | carve | 21 / 30 → 10 / 17 | 56 → 47 | 0.22 → 0.28 | 0.62 → 0.63 | 132 → 129 | - → - |
| Compress carve canyon 11 toe | carve | 28 / 36 → 6 / 11 | 68 → 52 | 0.18 → 0.33 | 0.05 → 0.13 | 119 → 121 | 2.7 → 2.7 |
| Compress carve canyon 11 heel | carve | 17 / 34 → 10 / 20 | 54 → 46 | 0.28 → 0.31 | 0.40 → 0.51 | 124 → 120 | - → - |
| stick only carve flat 8 toe | carve | 11 / 20 → 7 / 32 | 88 → 87 | -0.29 → -0.21 | -0.26 → -0.24 | 177 → 178 | 2.6 → 2.6 |
| stick only carve flat 8 heel | carve | 15 / 47 → 10 / 36 | 66 → 82 | -0.05 → -0.27 | -0.06 → -0.30 | 180 → 175 | 2.6 → 2.6 |
| stick only carve flat 11 toe | carve | 10 / 17 → 7 / 14 | 89 → 88 | -0.02 → 0.01 | -0.03 → 0.04 | 170 → 171 | 2.8 → 2.8 |
| stick only carve flat 11 heel | carve | 18 / 33 → 11 / 22 | 67 → 82 | 0.06 → -0.01 | 0.11 → -0.02 | 168 → 160 | 2.8 → 2.8 |
| stick only carve canyon 8 toe | carve | 10 / 16 → 7 / 19 | 85 → 85 | -0.04 → -0.05 | 0.07 → 0.07 | 141 → 144 | 2.0 → 2.0 |
| stick only carve canyon 8 heel | carve | 16 / 31 → 10 / 21 | 67 → 82 | -0.07 → -0.11 | -0.05 → -0.10 | 162 → 157 | 2.8 → 2.8 |
| stick only carve canyon 11 toe | carve | 11 / 17 → 7 / 19 | 87 → 87 | -0.36 → -0.29 | -0.16 → -0.09 | 147 → 148 | 2.4 → 2.4 |
| stick only carve canyon 11 heel | carve | 19 / 31 → 11 / 21 | 67 → 82 | 0.12 → 0.06 | 0.15 → 0.08 | 169 → 158 | 3.1 → 3.1 |
| Compress cutback flat 8.5 toe | carve | 21 / 27 → 5 / 6 | 62 → 42 | 0.46 → 0.57 | 0.12 → 0.21 | 118 → 120 | 3.4 → 3.4 |
| Compress cutback flat 8.5 toe | snap | 38 / 56 → 10 / 21 | 57 → 70 | -0.03 → 0.03 | 0.25 → 0.05 | 77 → 73 | 3.4 → 3.4 |
| Compress cutback flat 8.5 heel | carve | 16 / 26 → 8 / 13 | 54 → 47 | 0.25 → 0.29 | 0.58 → 0.58 | 126 → 122 | 3.4 → 3.4 |
| Compress cutback flat 8.5 heel | snap | 38 / 59 → 5 / 14 | 124 → 70 | -0.22 → 0.02 | -0.18 → 0.03 | 83 → 86 | 3.4 → 3.4 |
| Compress cutback canyon 8.5 toe | carve | 22 / 29 → 5 / 7 | 61 → 40 | 0.32 → 0.41 | 0.12 → 0.12 | 119 → 117 | 2.5 → 2.5 |
| Compress cutback canyon 8.5 toe | snap | 31 / 46 → 18 / 33 | 56 → 41 | 0.39 → -0.01 | 0.29 → 0.31 | 170 → 166 | 2.5 → 2.5 |
| Compress cutback canyon 8.5 heel | carve | 18 / 28 → 9 / 13 | 47 → 45 | 0.31 → 0.32 | 0.65 → 0.64 | 130 → 127 | 3.8 → 3.8 |
| Compress cutback canyon 8.5 heel | snap | 37 / 66 → 6 / 13 | 108 → 49 | 0.03 → 0.35 | 0.11 → 0.28 | 88 → 84 | 3.8 → 3.8 |
| stick only standcut flat 8.5 toe | carve | 11 / 15 → 5 / 6 | 55 → 44 | 0.68 → 0.72 | 0.39 → 0.44 | 134 → 136 | 2.7 → 2.7 |
| stick only standcut flat 8.5 toe | snap | 16 / 81 → 14 / 65 | 145 → 145 | -0.47 → -0.38 | -0.46 → -0.44 | 173 → 170 | 2.7 → 2.7 |
| stick only standcut flat 8.5 heel | carve | 17 / 20 → 10 / 13 | 31 → 32 | 0.89 → 0.90 | 0.65 → 0.65 | 178 → 165 | 2.7 → 2.7 |
| stick only standcut flat 8.5 heel | snap | 28 / 61 → 17 / 65 | 147 → 146 | -0.45 → -0.36 | -0.58 → -0.31 | 177 → 174 | 2.7 → 2.7 |
| stick only standcut canyon 8.5 toe | carve | 10 / 14 → 5 / 6 | 55 → 46 | 0.63 → 0.66 | 0.52 → 0.54 | 135 → 135 | 2.1 → 2.1 |
| stick only standcut canyon 8.5 toe | snap | 11 / 20 → 16 / 24 | 86 → 82 | -0.10 → -0.04 | 0.11 → 0.09 | 115 → 115 | 2.1 → 2.1 |
| stick only standcut canyon 8.5 heel | carve | 18 / 22 → 10 / 12 | 15 → 27 | 0.94 → 0.97 | 0.80 → 0.81 | 167 → 154 | 2.9 → 2.9 |
| stick only standcut canyon 8.5 heel | snap | 27 / 41 → 6 / 13 | 130 → 81 | -0.26 → -0.13 | 0.07 → 0.29 | 111 → 114 | 2.9 → 2.9 |

Onsets in the probe with the switches on (all runs, both waters): head 10° at 0.05–0.07 s, chest
10° at 0.17 s, hips 10° at 0.37–0.45 s toe side and never heel side; at the cutback's rail change
head 0.03–0.13 s, chest 0.10–0.20 s, hips 0.17–0.32 s. The board's heading reaches 10° at
0.33–0.50 s (off: head 0.60–0.73 s, chest 1.15 s or never, hips never).

## The stance map

Targets met: **190 of 259 with the switches off, 189 of 259 with all three on.** No target was
changed. Thirteen targets change sides (Regular's reading shown):

| Target | Wanted | Off | On |
| --- | --- | --- | --- |
| compress-frontside hip angle, front | 60–90° | 75 (met) | 108 (missed) |
| compress-frontside trunk tilt | 40–60° | 59 (met) | 39 (missed) |
| compress-frontside low hand over the water | 0–0.3 m | 0.26 (met) | 0.41 (missed) |
| compress-frontside head yaw | 10–70° | 79 (missed) | 53 (met) |
| compress-frontside chest twist | −10–25° | 25.0 (missed) | 9 (met) |
| compress-frontside lead elbow | 150–180° | 149 (missed) | 152 (met) |
| compress-frontside rear knee in | 10–35° | 36.6 (missed) | 34.9 (met) |
| snap-frontside rear knee | 110–140° | 112 (met) | 106 (missed) |
| snap-backside chest twist | −90–−20° | −11 (missed) | −39 (met) |
| cutback-backside lean | 40–75° | 49 (met) | 39 (missed) |
| cutback-backside rear knee in | 10–35° | 35.7 (missed) | 34.0 (met) |
| hand-in-face trunk tilt | 40–60° | 59 (met) | 34 (missed) |
| hand-in-face low hand over the water | 0–0.3 m | 0.29 (met) | 0.43 (missed) |

The three Compress-frontside misses and the two hand-in-face misses are the lean itself: the map
asks for a trunk folded 40–60°, the brief for a small hinge and the body's line. With the trunk no
longer folded, the inside hand ends 0.13–0.15 m higher, so **it no longer reaches for the water in
a Compress carve or with the hand button**. The owner should say which is wanted; the two cannot
both be met by the trunk alone (a longer arm reach would be the next thing to try).

## What is still off, and why

- **Heel side, early.** The trunk is up to 13–14° off the line in the first half second of a
  heel-side carve: the lean comes in with the turn's weight, which arrives later on that side.
- **Frontside cutback's rail change.** Up to 19–21° off the line for a moment: the physics' line
  swings 80° across in half a second and the drawn trunk is eased, not snapped, after it.
- **Hips, heel side.** They lead by 8° at most, not 10°.
- **The stick shows the pose even if the board barely turns** (a stalled board, a held stick):
  the lead follows the stick, by design.
- **`cutbackHand` needs Snap.** A cutback steered without Snap keeps today's hands. The older
  `cutback` film (no Snap) does not show the change; `turn-cutback` does.
- **Hand to the water** in the Compress carve and hand-in-face: see the stance map above.
- **Not touched, still there with the switches on or off:** the arm that swings at 11–13 m/s at
  the cutback's rail change; the stick-only rider falling after about 2.5 s; the fall after the
  stick is released on flat water. These are the ride's, or older drawing, not these switches.
- **The tube's crouch is left out of the lean** (it folds under the lip with a hand on the rail).
- Measured on scripted turns only. The owner's ride on Canyon is the real check.

## Tests

`src/scene/rig/turnBody.test.ts` reads each switch through whole turns at 60 Hz and 30 Hz, Regular
and Goofy (the films above, via `turnBodyFilm.ts`): the line's bounds both sides, the order and
delays of head, chest and hips against the board, the cutback's hands and their hand-over, knees,
feet, wrists and hips, and that with the switches off the stick draws nothing.
