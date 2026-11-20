# The turn pair and the cutback: which step fails first (2026-11-10)

A measurement, not a fix. Two movements from real surfing were scripted on the Canyon-matched test wave and run with
and without leg drive (`legDrive: 'on'`), to find the first step that fails today and why.

- **The pair**: bottom turn, climb, top turn back down, bottom turn again, linked. The reference surfer takes about
  3.5 s per pair and about 1.2 s from the bottom turn to the top.
- **The cutback**: along the face, change rails, a long arc back toward the breaking part (150–180° of heading),
  change rails again and carry on in the first direction.

Everything below is measured unless it says "estimate". No game code changed. The probe is `turnpair.test.ts.txt`
(with `../face-hold-2026-11-10/r2Lab.ts.txt`), the commands are in `run.sh.txt`, every run and every trace is in
`results.txt`.

## Short answer

| Plan | First failing step | How often | Leg drive |
| --- | --- | --- | --- |
| Pair, standing for the climb (Compress let go at the bottom) | Coming out of the bottom turn: the body cannot stand back up over the board, the board keeps turning up the face and stalls | 32 of 32 fail in the first pair (30 sudden falls, 2 stalls) | No change: 16 of 16 fail off, 16 of 16 on |
| Pair, Compress held all the way | No step fails outright with leg drive off (14 of 16 make one pair, 6 of 16 make two), but the pair is too wide for the face: the bottom turn ends on the flat 0.9–1.3 face lengths ahead of the crest and the rider waits there for the wave | Off: 2 of 16 fail in pair 1. On: 11 of 16 fail in pair 1 | Worse when the top turn starts at half height or above: the rider is carried over the crest during the top turn (10 of 16 dropped behind the crest). The same when the top turn starts early |
| Cutback, 150–180° | The second rail change: the arc ends with the rider pointing along the crest or out to sea at the foot of the face, and the wave passes under before the board has turned back | 31 of 32 do not come back onto the wave (2 fall in the first arc, 29 in or after the second rail change) | No help: 0 of 16 complete on, 1 of 16 off |
| Cutback, 90–120° | None, but it all happens on the flat in front of the wave | 16 of 16 complete | Slower back turn at full stick (3.6 s against 1.9 s) |

The one cause behind the pair's width and the cutback's failure: **the rider's turn is about twice as wide as the
face is long**. Measured arc radius 9–17 m at 7–12 m/s; the face is 7.3 m from foot to crest in the probe's measure.
A turn that should fit between the trough and the lip takes the rider off the wave.

## The wave and the rider

`FaceWater` matched to the Canyon's arm wave (`MATCH=canyon`): height 1.4 m, depth 2.6 m, face slope 16°, speed
5.7 m/s. "Face length" is the probe's 7.3 m (1.5 H / tan slope); "face fraction" is 0 at the foot and 1 at the crest;
"ahead" is the distance in front of the crest in face lengths (above 1 = on the flat in front of the wave).

**`FaceWater` is uniform along the crest. It has no pocket, no breaking part and no white water.** So "back toward the
breaking part" is only a direction here, the rebound off the foam cannot be tested, and nothing on this wave pushes a
rider back the way she came. The slope is also the solver's 16°, not a real lip's 60–80°.

The rider starts in trim 45° off the fall line, 0.75 of a face length ahead of the crest (face fraction 0.16), at
the wave's pace along that line plus 0 or 1.5 m/s: 7.5 or 9.0 m/s through the water. Stick 0.5 and 1. Compress is
`compress = 1, crouch = 0.6`. A sudden fall has the body banked 45° or more; a stall is a balance fall at under 20° of
bank and under 2.5 m/s.

The pair's script: stick down with Compress until the board is within `DROP` (20° or 35°) of the fall line; stick
centred until low on the face; stick up until 60° off the fall line; stick centred until the wave has lifted the rider
to `TOP` of the face (0.3, 0.5 or 0.7); stick down again. "Hold" keeps Compress on throughout; "release" lets it go
when the stick goes up, so the climb and the top turn are ridden standing.

## The pair

### Counts (set B, 64 runs: two speeds, two sticks, DROP 20 and 35, TOP 0.5 and 0.7)

| Climb | Leg drive | Runs | Top turn begun | 1 pair | 2 pairs | First-pair failures |
| --- | --- | --- | --- | --- | --- | --- |
| Compress held | off | 16 | 15 | 14 | 6 | 1 sudden fall at the crest after the top turn, 1 never picked up by the wave |
| Compress held | on | 16 | 16 | 5 | 3 | 10 dropped behind the crest in or after the top turn, 1 stall at the crest |
| Standing | off | 16 | 10 | 0 | 0 | 15 sudden falls, 1 stall (6 before the top turn, 10 in it) |
| Standing | on | 16 | 14 | 0 | 0 | 16 sudden falls (2 before the top turn, 14 in it) |

Set C (Compress held, the top turn begun early at 0.3 of the face, DROP 20, 16 runs): **2 pairs in 7 of 8 off and 6
of 8 on.** So with Compress held the pair does link, and leg drive's failures above belong to a late top turn.

### Timings and speeds, Compress held (measured ranges)

| | Leg drive off | Leg drive on | Reference |
| --- | --- | --- | --- |
| Bottom turn (stick up until 60° off the fall line) | 0.88–1.43 s | 1.08–1.62 s | |
| Where the bottom turn ends | 0.91–1.26 face lengths ahead of the crest (on or beyond the foot) | 0.97–1.47 | on the face |
| Bottom turn to top turn | 1.85–3.75 s (set C 1.95–3.35) | 2.19–3.57 s (set C 2.50–3.59) | about 1.2 s |
| One pair (bottom turn to bottom turn) | 3.29–6.42 s (set C 3.61–4.74) | 4.10–5.04 s (set C 5.06–7.03) | about 3.5 s |
| Second pair | 4.92–7.22 s (set C 3.56–5.35) | 4.57–5.69 s (set C 4.50–6.25) | |
| Speed at the bottom turn | 8.2–10.3 m/s | 8.2–10.3 m/s | |
| Speed at the top turn | 4.3–6.9 m/s | 3.5–6.2 m/s | |
| Heading at the top, off the fall line | 57–100° | 64–103° | |
| Top turn: time, heading swing, peak yaw rate | 0.77–1.65 s, 22–78°, 42–122°/s | 0.98–1.23 s, 31–57°, 43–92°/s | |
| Highest face fraction | 0.58–1.00 | 0.66–1.00 | |

Best case: one run of 32 (off, stick 1, +0, DROP 35, TOP 0.5) made the first pair in 3.29 s with 1.85 s from bottom
to top. The typical pair is 4–6 s, and of that 1.1–3 s is spent with the stick centred on the flat waiting for the
wave to arrive.

On flat water in front of the wave, with no waiting (set A, heading only), the same Compress rider links two pairs in
8 of 8 off and 7 of 8 on, at 1.8–2.9 s per pair off and 2.5–3.4 s on. So the body's own S-turn is quick enough; the
time on the wave goes to the width of the arc.

### What the player has to do today for the pair to link

Hold Compress the whole time, leg drive off (or on with the early top turn). Stick down until the board is within 20°
of the fall line, centre it until low on the face, stick up until about 60° off the fall line, centre the stick and
wait for the wave to lift the board to about a third of the face, then stick down. Half stick and full stick both
work. Letting go of Compress at any point in the climb falls every time.

### Trace 1: standing climb (stick 1, +0, leg drive off) – the first failure

| Time | What happens |
| --- | --- |
| 0.2–0.87 s | Drop from trim with Compress: bank +36°, speed 7.5 → 9.2 m/s, board to 19° off the fall line. |
| 0.92–1.9 s | Stick up, Compress let go. The rail change standing takes about 1.0 s (bank +36° → −35°). The rider is already off the face: face fraction 0, 1.0–1.17 face lengths ahead of the crest. Speed falls 9 → about 6 m/s (Compress would have kept 8–9.7). |
| 2.4 s | Board 60° off the fall line: stick centred. The lean the rider is asked for goes to 0, but the body stays banked −41° to −45°. |
| 2.4–2.82 s | The board keeps turning up at about 100°/s (65° → 135° off the fall line) because the body is still leaning in. The body's twist winds from 0 to its 69° stop. |
| 2.82–3.28 s | Bank −53° → −70°, load on the board 1.3 → 0.14 body weights, speed 6.1 → 1.7 m/s. Falls at 3.28 s at face fraction 0.48. |

In plain terms: the standing rider leans into the turn up the face, and when the stick is let go nothing brings the
body back over the board. The board goes on turning under the leaning body until it points out to sea with no speed.
It is the face-hold README's "the body cannot cross back" again, and here it starts on flat water, before the wave has
any part in it. At half stick the same thing happens more slowly: the heading drifts from 60° to 91–104° while
waiting, the speed is 1.4 m/s at half height and the rider falls in the top turn at 0.9–1.0 of the face.

### Trace 2: Compress held (stick 1, +0, TOP 0.5) – why it is slow, and why leg drive drops behind

Leg drive off:

| Time | What happens |
| --- | --- |
| 0.92–1.32 s | Stick up. The rail change is driven by the lean-out pull (1.0 body weight) and takes 0.4 s. |
| 0.92–2.02 s | Bottom turn: yaw 45–85°/s at its peak, about 35°/s on average, radius about 15 m. Reaches 60° at 2.02 s, 1.07–1.09 face lengths ahead of the crest: on the flat. |
| 2.02–3.12 s | Stick centred, waiting 1.1 s for the wave. Speed 9 → 5.4 m/s, the heading drifts on to 96°. |
| 3.12–4.42 s | Top turn: 1.3 s, peak yaw 106°/s, bank to +42°. Ends at 0.76 of the face at 8.1 m/s. |
| 5.2 s | Low on the face (0.25) again; second bottom turn. |

Leg drive on, same script:

| Time | What happens |
| --- | --- |
| 0.92–1.32 s | Leg drive (0.35 body weights) in place of the lean-out pull. The board keeps turning the old way longer (to 3° off the fall line). |
| 2.32 s | Reaches 60°, 0.3 s later and further out: 1.25 face lengths ahead. |
| 2.32–3.6 s | Waits 1.3 s; arrives at half height at 4.4 m/s (5.2 off). |
| 3.6–4.3 s | Top turn: the lean asked for is only 18–28° at this speed, the yaw 20–37°/s for the first second. In that second the wave lifts the rider from 0.58 to 1.0 of the face. |
| after 4.3 s | The board turns at 97–122°/s on the crest and ends 0.14 face lengths behind it at 2.9 m/s: dropped behind. |

In plain terms: the weaker push makes the rail change at the bottom slower, so the rider goes further out, waits
longer, comes back slower, and the slow top turn then takes longer than the wave takes to pass under her. Started
earlier (0.3 of the face) the same top turn finishes in time in 6 of 8 runs, but the pair takes 5.1–7.0 s.

## The cutback (Compress held, stick toward the cut, then stick back)

### 150° and 180° (32 runs: two speeds, two sticks, two starts, off and on)

| | Leg drive off (16) | Leg drive on (16) |
| --- | --- | --- |
| Falls in the first arc (at the crest) | 1 | 1 |
| First arc reaches its heading | 15 | 15 |
| Falls or stalls in the second rail change / turn back | 10 | 12 |
| Dropped behind the crest during the turn back | 3 | 3 |
| Completes and carries on | 2 (one of them ends behind the crest at 0.8 m/s) | 0 |

First arc, both alike: 2.8–5.3 s for 150–180°, radius 9.7–17 m, peak yaw 48–154°/s. Speed at the start 6.5–9.0 m/s,
at the far end 5.1–12.1 m/s. The far end is 0.06–1.27 face lengths ahead of the crest, mostly on the flat. The one
clean success (off, half stick, +1.5 m/s, start 0.5): 150° in 4.9 s, back 147° in 4.0 s, 8.9 s in all, ending on the
flat a full face length ahead of the crest at 8.1 m/s (start 8.0, far end 6.8, lowest 3.7 m/s).

Note on the speed "kept": under Compress the hidden carve carry (0.4 body weights × tan bank along the path) feeds
the arc. In the traced run the speed rises from 7.5 to 12.1 m/s through the first arc on flat water. That gain is the
rule force, not the wave and not a visible limb.

### 90° and 120° (16 runs)

16 of 16 complete, off and on. First arc 1.6–3.5 s, radius 9.2–15.9 m; turn back 1.9–4.9 s, radius 9.3–23 m; 3.5–7 s
in all; speed at the end 3.3–8.7 m/s. But the rider ends 0.74–2.8 face lengths ahead of the crest at face fraction 0:
the whole move is ridden on the flat in front of the wave. With leg drive on the turn back at full stick is slower
(3.58 s against 1.93 s).

### Trace 3: 150° cutback (stick 1, +0, leg drive off) – the first failure

| Time | What happens |
| --- | --- |
| 0.22–1.1 s | Stick down with Compress. Lean asked 50°, bank builds 0 → 41° in 0.9 s; yaw 60–88°/s. The board reaches the fall line at 1.1 s at the foot of the face (fraction 0). |
| 1.1–2.9 s | The arc carries on across the flat, out to 1.32 face lengths ahead of the crest. Yaw 45–70°/s, bank 46–50°, speed 9.7 → 11.9 m/s. Radius 10.3 m. |
| 2.99 s | 151° turned: the board points along the crest the other way and 15° out to sea, at the foot of the face, at 12 m/s. Stick reversed. |
| 3.0–3.5 s | Second rail change: 0.5 s (bank +49° → −5°) with the lean-out pull on. The rider meets the face at 12 m/s (load 3.7 body weights at the foot) and crosses it: fraction 0.05 → 0.77 in half a second. The board has turned back only 10°. |
| 3.5–4.07 s | Over the crest: the board is in the air or tipping (load 0–0.7), still 104–114° off the fall line, and the body goes on rolling to the new side with nothing under it: bank −15° → −66°. Falls at 4.07 s, 0.18 face lengths behind the crest at 7.9 m/s. |

Leg drive on: the same until 3.0 s; without the lean-out pull the board goes on turning the old way (to 137° off the
fall line), is in the air over the crest by 3.6 s and ends behind the wave at 6.4 m/s.

In plain terms: after a 150° arc the rider is heading back along the wave and a little out to sea, and the wave is
coming at her. The rider and the wave close at the rider's speed across the face plus the wave's 5.7 m/s, so the
whole face goes by in under a second. The rail change alone takes half of that, and the turn back needs 2–4 s
(measured on the flat). She goes over the top with the rail change half done. On a real wave the white water would be
there to turn her; here there is none.

## What the two plans have in common

1. **The arc is too wide.** 9–17 m radius against a 7.3 m face. Estimate: a balanced turn at 9 m/s and 50° of bank
   has a radius of 9² / (9.81 × tan 50°) = 6.9 m; the measured arcs are wider because the bank takes about 0.9 s to
   build and the speed rises on the way.
2. **A rail change costs 0.4–1.0 s** (0.4 s with the lean-out pull, 0.5 s in the cutback, about 1.0 s standing), and
   it is the step where the wave or the turn gets ahead of the rider.
3. **Standing, the body does not come back over the board** when the stick is let go. Only Compress, with its rule
   forces, comes out of a turn.

## What would be needed (naming only; estimates; nothing here was built or tested)

All of it as motion of visible limbs with a reaction on the board, none of it from the face-hold don't-retry list:

- A tighter arc from the legs: more of the turn's force through the feet into the rail early in the turn, so the
  bank is there in the first 0.3 s instead of 0.9 s. The reaction is the board pushed harder into the water (a
  higher load at the bottom, as the reference surfer's compression shows).
- A way for the standing rider to end a turn: the legs pushing the board back under the body as the stick is let go
  (the leg drive's force pair, at the turn's exit as well as at its rail change). Measured here: at 0.35 body
  weights it is slower at the rail change than the 1.0 body weight pull it replaces, so its size or timing would
  have to change for the pair to fit.
- For the cutback, something for the turn back to push against: the white water or a steeper pocket. That is a
  wave question (`FaceWater` has neither), not a rider one.
- Speed through the arc from the wave and the legs' pumping, not from the carve carry. Today the Compress arc gains
  up to 4.6 m/s on flat water.

## Stance: how bent the rider is at rest

From the code (`src/physics/riderPosture.ts`, `src/physics/AttachedRider.ts`); heights are the pelvis part over the
deck.

| Stance | Pelvis over the deck | Source | Knee angle (estimate) |
| --- | --- | --- | --- |
| Legs fully extended (the leg's upper stop) | 0.88 m | standing + `LEG_EXTENSION` 0.1 | straight (180°) |
| Extension "tall" out of a turn | 0.82 m | standing + `EXTENSION_TALL` 0.04 | about 145° |
| Standing, untouched | 0.78 m | `regularPlaces` standing | about 130° (flexed about 50°) |
| Shift / pumping crouch, full | 0.585 m | `CROUCH_SHARE` 0.65 × `CROUCH_DEPTH` 0.3 = 0.195 m down | about 90° |
| Compress, untouched | 0.48 m | `CROUCH_DEPTH` 0.3 m down | about 75° |
| Tube tuck (covered only) and opt-in deep Snap | 0.33 m | `MANUAL_CROUCH_DEPTH` 0.45 m down | about 55° |

The feet are 0.63 m apart along the board (`stanceFeet`); head 1.38 m and chest 1.05 m over the deck standing.

The knee angles are estimates, not read from the rig: a leg of two equal 0.42 m segments from an ankle 0.08 m over
the deck to a hip at the pelvis height, each foot 0.315 m from the middle of the stance. The stance map's own targets
agree in kind: trim knees 115–150° (front) and 110–145° (rear), bottom-turn knees 70–90°.

So the model's untouched standing rider is already in a half squat (about 50° of knee bend, estimate) and never
stands with straight legs unless a move extends them. The Compress rider sits 0.30 m lower than the standing one (0.48
m against 0.78 m), near a 75° knee. Between them the Shift crouch is continuous: any resting height from 0.78 m down
to 0.585 m. There is no resting height between 0.585 m and Compress's 0.48 m, and Compress is all or nothing.

## Not measured

- Anything on the solver's sea, with a pocket, white water or a peeling crest (rider sessions were out of scope).
  The cutback's rebound in particular.
- Waves other than the 1.4 m Canyon arm wave; starts higher on the face than 0.5.
- The standing rider with the top turn begun early (set C was run with Compress held only).
- A Shift crouch (partial bend) in place of Compress for the climb.
- The knee angles (estimated from heights, see above).
- Run counts are tens per setting, so the fractions are indications, not rates.
