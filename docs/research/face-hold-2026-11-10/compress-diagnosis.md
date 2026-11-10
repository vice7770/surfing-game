# Why Compress prevents the sudden fall on the Canyon-matched arm wave (2026-11-10)

**Result: it is not the crouch. It is two of Compress's gameplay-rule forces,
which no limb makes.** The lean-out pull (`LEAN_OUT_PULL`, one body weight pushed
sideways on the body's centre of mass while it still leans the old way) takes the
sudden falls of the top turn from 14 of 16 to 4 by itself. Without it, the
compressed turn's pull (`COMPRESS_PULL`) on crouched legs takes them to 6. The
parts of Compress that limbs do make (the legs' depth, their softer spring, the
hand's reach) leave 12 of 16. **Part 2 was not built**: there is no single cause
that visible limbs can supply, and giving either force to the ordinary rider would
be a hidden motor. No source file under `src/` changes.

Wave and plan: `MATCH=canyon HEIGHTS=1.4,1.95` (the arm rows of
calibration-canyon.md, 16°), `START=trim AT=0.75 SPEEDS=0,1.5`, medium climbs
(steer 0.5 and 1 up the face until 65° or 80° off the fall line, then full stick
the other way), 8 s: 16 runs per row. Kinds as in calibration.md: sudden = bank 45°
or more at the fall; stall = balance, bank 20° or less, under 2.5 m/s.

## What the probe's `compress` does differently from `steer`

Both climb the same way (stick only, standing) and at the same instant put the
stick fully the other way; the heading at that instant is the same in every pair
(`topFrom` 66-67° and 81-83° off the fall line, both controls). From that instant
until the board is within 30° of the fall line, `compress` also holds
`rider.compress = 1` and `rider.crouch = 0.6`; then both let go of everything.

In `AttachedRider`, Compress held with a steer is six things:

| part | what it is | made by a limb? |
|---|---|---|
| legs | the leg's rest length down by 0.3 m (`CROUCH_DEPTH`), dropping as fast as the load allows | yes |
| soft | the leg spring softened to half at full depth (`CROUCH_SOFTENING`) | yes |
| reach | the inside hand reaching for the water (from Compress 0.5 and a 10° lean) | yes |
| pull | `COMPRESS_PULL`: a level force on the body, across the board's path, toward the lean asked for, 0.5·m·g·tan(lean asked), within `TURN_PULL_LIMIT` | no ("a gameplay rule, not physics" in the source) |
| carry | `CARVE_CARRY`: a level force along the path, 0.4·m·g·tan(bank) | no (same) |
| lean-out | `LEAN_OUT_PULL`: while the body leans the other way to the stick by more than 2°, a level force of one body weight (73 kg: 716 N) across the path toward the new rail | no (same) |

The three forces act only while planing, steering, and Compress deeper than the
crouch. No range or gain of the ankle or the hips changes with Compress.

## The paired trace (H 1.4, +0 m/s, steer 1, up to 65°)

Identical until the reversal at 0.95 s: 8.0 m/s, heading 67° off the fall line,
body banked 38° up the face and still leaning in at 24°/s, board rolled 51°,
turning up at 76°/s, load 1.46.

| after the reversal | `steer`: bank, bank rate, board roll, yaw rate, lean asked, upper-body swing, load | `compress`: the same, and the lean-out force |
|---|---|---|
| +0.07 s | -39°, -15°/s, 54°, -97°/s, -31°, -15°, 1.49 | -38°, +11°/s, 50°, -87°/s, -31°, -16°, 1.57; 1.0 body weight |
| +0.17 s | -40°, -5°/s, 56°, -100°/s, -2°, -4°, 1.66 | -34°, +66°/s, 46°, -65°/s, -2°, -13°, 1.55; 1.0 |
| +0.27 s | -40°, -6°/s, 54°, -65°/s, +26°, +14°, 1.65 | -25°, +111°/s, 29°, +6°/s, +26°, -11°, 1.35; 1.0 |
| +0.37 s | -42°, -26°/s, 55°, -40°/s, +42°, +37°, 1.36 | -13°, +115°/s, 14°, +113°/s, +40°, -11°, 0.76; 1.0 |
| +0.47 s | -48°, -94°/s, 60°, -34°/s, +42°, +60°, 0.97 | -2°, +100°/s, 1°, +169°/s, +44°, -14°, 0.41; ends here |
| +0.52 s | -53°, -124°/s, 65°, -36°/s, +42°, +69° (the stop), 0.79 | +2°, +92°/s, -1°, +143°/s, +47° |
| +0.67 s | -70°, -207°/s, 78°, -31°/s, +41°, 69°, 0.11 | +15°, +72°/s, -6°, +51°/s, +50° |
| end | falls at +0.72 s, bank -70°, 5.9 m/s, heading 107° (still turning the old way) | round to 30° of the fall line at +0.87 s, 8.7 m/s |

Where the paths part: at the first step. On `steer` the body stops leaning
further (bank rate to -5°/s by +0.17 s) but never starts back: it hangs at 40°
while the board, still rolled 54-56° on the old rail, keeps turning the old way
(65-100°/s); the upper body swings across to the new side and reaches its 69°
stop at +0.52 s; from +0.3 s the body falls on into the face. The ankle's rest
stays at 0 (it has nothing left to give) and the contact limit reads `tip` at
+0.17 to +0.22 s. On `compress` the bank rate changes sign within 0.07 s and
reaches +121°/s at +0.32 s; the board's roll follows the body down (50° to 0° in
0.45 s) and the yaw reverses at +0.25 s. The hand reaches on the old side for the
first 0.4 s; the toggle table shows it changes nothing.

The size fits the force (estimate): the bank rate goes from -24 to +121°/s in
0.32 s, about 8 rad/s²; one body weight across the path on a body leaning 38°
gives g·cos 38° = 7.7 m/s² of righting pull, 8 rad/s² for a centre of mass about
1 m above the feet. Nothing the standing rider has gives a righting pull of that
order: on `steer` the body's own righting stays within ±6°/s for 0.2 s.

## The toggle table (arm rows, medium, 16 runs each)

Scratch toggle `ZPARTS` (`compress-parts.diff.txt`): the probe's `compress`
control with only the named parts of Compress left on.

| run | sudden | stall | stay on |
|---|---|---|---|
| `steer` (today) | 14 | 0 | 2 |
| `compress` (today, all six parts) | 2 | 7 | 7 |
| Compress held, all parts off (check: equals `steer`) | 14 | 0 | 2 |
| legs alone (the pelvis at Compress's depth, the leg as stiff as standing) | 13 | 0 | 3 |
| legs + soft | 12 | 0 | 4 |
| reach alone | 14 | 0 | 2 |
| legs + soft + reach (everything the limbs do) | 12 | 0 | 4 |
| pull alone | 13 | 2 | 1 |
| carry alone | 16 | 0 | 0 |
| **lean-out alone** | **4** | 5 | 7 |
| pull + carry | 13 | 0 | 3 |
| legs + soft + pull | 6 | 2 | 8 |
| legs + soft + carry | 12 | 0 | 4 |
| legs + soft + pull + carry | 6 | 0 | 10 |
| legs + soft + lean-out | 2 | 6 | 8 |
| Compress with the body height held at standing (all but legs and soft) | 4 | 6 | 4 (and 2 other) |
| Compress without lean-out | 6 | 0 | 10 |
| Compress without pull | 3 | 4 | 9 |
| Compress without carry | 0 | 9 | 7 |
| Compress without reach | 2 | 7 | 7 |

Drag or speed: the only part that changes speed is the carry; alone it makes
things worse (16 of 16), and Compress without it has no sudden fall at all (0, 9
stalls). The stalls come only with a rule force on (lean-out or pull): the riders
it saves from the sudden fall come round, lose their speed and stall 5 to 7 s
later. That is the separate matter of the stalls.

## The cause

Two causes, neither a limb's:

1. **The lean-out pull.** Putting the stick the other way while leaning 38° up
   the face, a standing body has no way back over the board: for about 0.3 s it
   hangs at 40° while the old turn runs on, then falls in. Compress replaces the
   missing righting push with one body weight (716 N) applied to the centre of
   mass from outside, which rights the body in 0.5 s (14 sudden falls to 4, alone;
   2 with the crouched legs).
2. **The turn's pull on crouched legs.** Without the lean-out pull, Compress still
   takes 14 to 6: `COMPRESS_PULL` (up to 0.5·tan 50° = 0.6 body weights toward the
   new lean) does it, but only with the legs down (pull alone 13; legs alone
   12-13; together 6). Why the crouch is needed for the pull to work was not
   traced; the likely reading (estimate) is the shorter, softer leg letting the
   feet follow the body the pull moves.

The lower body height alone, which is the part a rider could show with his knees,
is worth one or two runs in 16.

## Part 2: not built

The bar asked for medium `steer` on the arm rows from 14 sudden of 16 to at most
4 with stalls at most 4. The only single part that reaches 4 sudden is the
lean-out pull (and it brings 5 stalls); it is an outside force on the centre of
mass, as is the pull. Under the no-hidden-motors rule neither may be given to a
rider who is not holding Compress, and bending the knees with the steer (legs,
soft, reach: 12 of 16) misses the bar by 8. So no `?turnCrouch` switch, no source
change.

What this says for a later attempt: the missing thing is a righting push of the
order of a body weight for 0.3 to 0.5 s at the reversal. Physically that push can
only come through the feet from the water, that is from the board's own side
force during the reversal. The trace shows the board not giving it (it keeps
carving the old way under a body that does not rise). Several ways of asking the
feet for it are on the do-not-retry list; none was retried here.

Limits: one wave shape (the 16° arm rows), 16 runs per row, one traced pair. A
difference of one or two runs between rows is noise. Bowl and Big rows were not
rerun since nothing was built.
