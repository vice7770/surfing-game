# A quicker lean-in: a study

On the user's choice (2026-09-30), after the falls were traced to the bottom turn's lost speed (`body-lean-study.md`). The lever: a quicker lean into the turn, so less time dragging. Study first. The entry study found the lean paced by the balance's rate term (a 0.49 s time constant). Lower rate gains, everywhere or at the entry only, broke rail changes, the wobble and top turns. A feed-forward on the reference's rate (LEAN_IN_FEED) dropped riders. Both are on the don't-retry list.

Measured in the deep U (`FaceToFlat`: crouched 0.6 down the 15° face at 7.3 m/s, full lean frontside 1 m before the flat), compressed and crouched. The variants are experiment hooks in `prepareBank`, reverted.

## What the plant allows

The body is an inverted pendulum on the feet. Its lean accelerates by about g / h times how far it leans past its own force line, plus the feet's and the upper body's torques over m h². Crouched, h ≈ 0.9 m.

- The feet move the board's rail off the body by at most their rest range, 14° (0.25 rad): (g / h) × 0.25 ≈ 2.7 rad/s².
- Their pressure reaches 0.13 m across: about 1.6 rad/s² more.
- The upper body's swing, 200 N·m on m h² ≈ 65 kg·m²: about 3.1 rad/s² more, for the 0.3 s or so its range allows.

Leaning 40° (0.70 rad) as fast as that allows and stopping there (full acceleration to half way, full braking after) takes 1.02 s on the rest alone, 0.81 s with the pressure, and 0.62 s with the swing too. Today the body reaches 90% of the lean asked (34° of 38°) in about 0.9–1.0 s. So at best a controller could lean 20–40% quicker. These are upper bounds: they assume every actuator at its limit at once, and a pull that catches the body as fast as it leans.

## Tries

Turned and speed kept at each time, from the steer:

| Compressed | 0.3 s | 0.6 s | 1.0 s | 1.2 s | Rider |
|---|---:|---:|---:|---:|---|
| today | 2°, 85% | 13°, 80% | 42°, 69% | 61°, 55% | on |
| the reference's rate fed forward (as LEAN_IN_FEED) | 17°, 85% | | | | fell at 0.4 s |
| a minimum-jerk reference over 0.2–0.5 s, its rate fed forward | 14–35°, 40–82% | | | | fell at 0.3–0.9 s |
| the same over 0.3 s, fed at half | 10°, 90% | 19°, 85% | | | fell |
| the same over 0.4 s, not fed | 3°, 83% | 6°, 78% | 30°, 71% | 48°, 61% | on |
| a bang-bang reference at 2–4 rad/s², fed forward | 3–5° | 2–4° | 24–35° | | fell by 1.4 s |
| the same at 2–3 rad/s², fed at half | 2° | 1–2° | 18–27°, 72–74% | 35–46°, 62–67% | on |
| the same at 3 rad/s², not fed | 1° | 1° | 13°, 69% | 26°, 65% | on |

Crouched without Compress the same: every variant that feeds the reference's rate at full strength falls. Those that stay on turn slower than today (today 46° at 1.0 s and 99° at 1.55 s; the best survivor, the minimum-jerk reference over 0.4 s not fed, 33°).

## Why it falls

The bang-bang reference at 2 rad/s², fed forward, compressed (angles toward the turn):

| t s | Asked | Body | Its force line | Rail | Feet's pressure across | Contact | Turned | Speed m/s |
|---:|---:|---:|---:|---:|---:|---|---:|---:|
| 0.4 | 9° | 9° | 7° | 8° | 0.02 m | held | 2° | 5.6 |
| 0.6 | 20° | 20° | 13° | 16° | 0.07 m | held | 2° | 5.4 |
| 0.7 | 25° | 25° | 20° | 28° | 0.13 m | fails | 4° | 5.3 |
| 0.8 | 28° | 31° | 23° | 40° | 0.13 m | fails | 9° | 5.3 |
| 1.0 | 32° | 46° | 34° | 54° | 0.13 m | fails | 24° | 5.3 |
| 1.2 | 22° | 70° | 55° | 70° | −0.06 m | fails | 40° | 4.3 |
| 1.4 | 0° | 70° | 4° | 92° | 0.10 m | held | 54° | 2.4 |

- The body follows the plan until about 20°. **The turn has not built**: 2° turned at 0.6 s, and the pull (the force line) is 7° behind the body.
- The body, ahead of its pull, falls inward. The feet press its inside edge to hold it, and that pressure rolls the board onto its rail. The rail passes its bite (48°) at 0.9 s and the board capsizes onto it (92°). The speed goes, the pull with it, and the rider falls in.
- With the rate fed at every reference speed the story is the same. Today's fast reference and the minimum-jerk ones pin the feet within 0.1–0.2 s, the bang-bang ones at about 0.7 s.

## Reading

1. **The lean-in's pace is set by how fast the turn builds, not by the reference or the rate term.** A body that leans faster than its turn pulls falls in. Held on its feet, it rolls the board past its bite. Today's rate term keeps the body behind its pull (the entry study: the pull runs ahead from 0.25 s), which is why it stays on.
2. Shaping the reference cannot beat that. Fed at full strength every shape falls; fed at half or not at all, every shape turns slower than today's fast reference.
3. **The plant's own bound** allows at most a 20–40% quicker lean, and only if the turn's pull kept up.
4. So a quicker lean needs a quicker turn build. The turn builds as the rail rolls over, and the rail follows the body (the hull rights about its load line). Rolling the rail first bogs the board (the entry study).
5. Options, for the user:
   - **a rail-angle controller**: the rail leading the body by a small angle held below its bite, so the pull builds first and the body follows inside it. This is the memory's old "rail-angle controller designed on a modal model of board + banked body". It needs the board's yaw build-up in the roll model, which it leaves out today. Research-sized.
   - **stop here**: the lean-in is within about a third of what this rider's feet and trunk allow, and the bottom turn's physics is right (the angulation, carve-drag and body-lean studies).

The probes are `src/dev/zz-lean-in.test.ts` (the deep U's variants and trace) and the hooks as `lean-in-experiment.patch`, both in the session's scratchpad.
