# The bottom turn's entry and speed: a study

On the user's go-ahead for the rail-first redesign (2026-09-29), after the Lapoint lesson check: the game's bottom turn came round 113° in 2.1 s on the Canyon's practice wave, keeping 59% of its speed, where Forsyth et al. 2024's surfers turn about 100° in 0.96 s at 1.9 rad/s keeping about 90%.

Measured on the deep U's still water (`FaceToFlat`: a 15° face easing into flat water, entry 7 m/s, full steer frontside from 1 m before the flat), with a step-by-step probe of the rider's balance, the board's yaw moments, the fins and the energy ledger.

## The turn, step by step (standing, full steer)

| t s | Turned | Yaw rate rad/s | Speed m/s | Bank asked | Body bank | Board roll | Path's pull |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.10 | +2° | +0.97 | 6.64 | 29° | 3° | 1° | 42° the wrong way |
| 0.30 | +6° | −0.27 | 6.20 | 41° | 15° | 15° | 30° |
| 0.50 | −6° | −1.12 | 6.05 | 40° | 24° | 27° | 28° |
| 0.80 | −30° | −1.75 | 5.89 | 38° | 32° | 42° | 41° |
| 1.00 | −50° | −1.75 | 5.37 | 34° | 34° | 43° | 43° |
| 1.47 | −99° | −1.84 | 3.44 | 18° | 31° | 43° | 30° |

- From the turn's own start (yaw rate past 0.5 rad/s the right way, at 0.33 s), it reaches 99° in 1.08 s. Forsyth et al. do not publish how their device finds a turn's start, so their 0.96 s may leave out the lean-in too.
- It keeps 61% of its speed from that start (49% from the steer).

## What the entry is

**The first 0.35 s turn the wrong way (5–7°).**
- To lean in, the body's centre of mass must accelerate inward, so the feet push the board outward (about 44 N here).
- The fins at the tail hold the tail, so the nose swings out: the fins' yaw moment is +13 N·m, and the push's own −10 N·m.
- This is the counter-steer that any lean needs (a bicycle's). A yaw torque on the board at the entry (20–60 N·m, as an upper-body twist through the feet would give) removes it, but the turn is no quicker: 45° at 1 s against 50°. The counter-steer helps the body fall in.

**The rail first, as proposed, fails.**
- Rolling the board onto the inside rail beyond the body at the entry (the feet's rest toward the inside, 0.25–1 of its range) starts the yaw the right way at once (0.17 s).
- But at half the range and more the board bogs: 83% → 46% of the speed between 0.6 and 1.0 s. The rider falls at 1.17 s, and at 0.6 s with the full range.
- At a quarter of the range it turns slower than now.
- The balance already puts the rail first as a brake. Early in the lean it judges the body is falling in too fast and rolls the board further in (the rest reaches +5 to +14°).

**The lean is slow because of the balance's rate term, not the body's strength.**
- The balance asks the feet for BANK_GAIN (reference − bank) − BANK_RATE_GAIN × bank rate. That caps the lean's rate at 7.4 / 3.6 = 2.06 per second of the error left: 0.94 rad/s with 26° to go. It is the 0.49 s time constant the rail-change study found.
- The swing is not saturated: at 0.05 s it gives 69 of its 200 N·m, and doubling its torque changes nothing.
- The turn's pull is not what limits the lean. From 0.25 s the path's pull runs ahead of the body (30° against 15° at 0.3 s; 41° against 32° at 0.8 s).

| Rate gain | At 0.6 s | At 1.0 s | At 1.2 s | 99° from the steer | 99° from the turn's start | Rider |
|---:|---:|---:|---:|---:|---:|---|
| 3.6 (now) | 13° / 84% | 50° / 77% | 71° / 67% | 1.47 s, 49% | 1.08 s, 61% | on |
| 2.8 | 17° / 90% | 62° / 77% | 85° / 62% | 1.35 s, 50% | 0.97 s, 60% | on |
| 2.2 | 21° / 94% | 69° / 75% | 89° / 59% | 1.35 s, 50% | 0.93 s, 60% | on |
| 1.8 | 22° / 99% | 71° / 79% | 90° / 52% | — | 0.95 s, 52% | fell at 1.17 s |
| 1.4 | 22° / 110% | 66° / 65% | 64° / 55% | — | — | fell at 0.82 s |

Compressed (Shift 0.6 + Compress) the same gains turn 42°, 51°, 60°, 67° and 69° at 1.0 s, but keep 69%, 65%, 57%, 46% and 40%. Compressed never reaches 99° within 1.6 s.

**A lower gain only for the entry does no better.** Used only while leaning into a steered turn, easing from the low gain at 20° or more of error back to 3.6 at none, 2.2 turns as the global 2.2 does (99° in 0.90 s from the turn's start). 1.8 falls at 1.22 s, 1.4 at 0.87 s, and 1.4 eased from 30° at 1.58 s.

**What a lower gain breaks** (the physics, dev and game suites, 746 tests; 0 fail now):

| Gain | Everywhere | Entry only (from 20° of error) |
|---:|---:|---:|
| 2.8 | 15 fail | 10 fail |
| 2.2 | 24 fail | 22 fail |

At 2.8 everywhere, the 15 are:
- the mid-turn wobble with Compress at 8 and 11 m/s (yaw swings up to 1.8 rad/s against 0.72);
- rail changes from a carve at 6 and 10 m/s;
- the crouched full-steer turn at 11 m/s, which falls;
- the rail digs past its bite at full steer (52.8° against 52°);
- the drawn body's weave and balance cues, and the held rider settling on its bank.

The pinned hard turn ("turns hard with a full lean and a crouch, keeping most of its speed") passes at 2.8.

Entry only at 2.8 still loses:
- rail changes from a carve at 6 and 10 m/s;
- the crouched full-steer turn at 11 m/s (falls);
- Compress mid-turn at 11 m/s;
- the drawn body's balance cues and the held rider.

At 2.2 it also loses every top turn at 8 m/s and the mid-turn Compress at 7–10 m/s. A rail change is a lean-in toward a new reference, so an entry rule cannot tell it from a bottom turn's. This is the same wall the earlier feed-forward on the reference's rate (LEAN_IN_FEED, 2026-09-29) met.

## The compressed board sinks

The compressed turn's extra loss is not the reaching hand. With no hand in the water it keeps the same speed to a percent. It is the legs, dragging 230–370 J each against 9 J standing. But they only get wet after 0.75 s. By then the slowing board has sunk from 0.18 to 0.53 m under the surface (its inside rail's lowest point, of which about 0.18 m is the 45° roll), and the leg spheres go under with it. The drag is a symptom of losing the plane: slower, less lift, deeper, more drag.

## Where the speed goes

- **On flat water with no steer at all,** the board slows from 7.0 to 5.1 m/s in 0.7 s: about 160 N of planing drag for an 80 kg load, a lift-to-drag ratio of about 5. The carve lab's tow measured 1.8–2.0 m/s² at 7–11 m/s. The board's frame pitches 7–10° nose up in carves (the carve lab's depth table). With rocker, the tail's planing angle is not the frame's, so that is not the planing trim itself.
- **In the carve the rolled hull does the turning.** Rolled 42°, its bottom pressure tilts inward and supplies the pull: about 700 N at 1.35 g. The planing drag grows with that load, to about 230 N at 1.0 s (a ratio of about 4.6).
- **The fins carry almost none of it.** Each sees 1–5° of attack and 5–30 N, about 50–65 N in all, against the ~670 N the turn needs.
  - Kniesburges et al. 2025 estimate up to about 800 N on one instrumented fin in turns, measured by pressure on a river wave.
  - A fin CFD study finds fins' lift-to-drag ratio peaks at 7–9° of attack ([PMC12024775](https://pmc.ncbi.nlm.nih.gov/articles/PMC12024775/)).
  - The Kniesburges estimate assumes the peak pressure over the whole fin, so it is an upper bound ([PMC11937575](https://pmc.ncbi.nlm.nih.gov/articles/PMC11937575/)).
  - A board that turned partly on its fins would bleed less.
- **Compressed, the rider's own drag adds 474 J** (16 J standing) over the 1.6 s: the legs once the board has sunk (above), and 54 J from the reaching hand.
- **Late in the turn the board skids:** the nose leads the path by 5–9° from 1.0 s as the speed drops.

## On real waves the turn's strength already matches

The ride report (`ride-report-practice.md`, Canyon practice, 2026-09-27) measures the autopilot's bottom turns on waves:

| | Count | Duration | Yaw | Peak yaw rate | Speed in | Lateral g | Rail |
|---|---:|---:|---:|---:|---:|---:|---:|
| Breakline | 39 | 1.08 s | 72° | 1.8 rad/s | 8.9 m/s | 1.42 | 45° |
| Forsyth 2024 | 3.8 per wave | 0.96 s | 99° | 1.9 rad/s | 7.3 m/s | 1.41 | 42° |

- The yaw rate, the pull and the rail are Forsyth's. The yaw is short because the autopilot ends its turns (1.5 s limit, 120° from its line). Held to its end (the recording, `turnLimit=3`), a turn came round 113°.
- **The gap is the speed kept.** The speed carried from a bottom turn into the next top turn is 0.45 against Forsyth's "turn flow" of 0.88–0.95. The recorded 113° turn kept 0.59.

## Reading

1. The entry's wrong-way yaw is physical and helps the lean. Removing it does not speed the turn.
2. Rolling the rail first, beyond the body, bogs the board, and the rider falls. The balance already does it as a brake. **The rail-first redesign is refuted.**
3. On still water, the turn's time is set by the balance's rate gain. A lower gain turns 99° in 0.93–0.97 s from the turn's start. But it keeps no more speed per degree, it breaks rail changes and the mid-turn wobble (entry only too), and below 2.2 the rider falls.
4. On waves, the turn's rate, pull and rail already match Forsyth's. What does not match is the speed it keeps.
5. The speed lost per degree is the hull's planing drag under the turn's load. The rolled hull does the turning at a lift-to-drag ratio of about 4–5, with the fins nearly idle (about a tenth of the pull). Compressed, the slowing board loses its plane and sinks, and the legs drag.

## What next

A carve-drag study, measured before any change:
- How the pull splits between the hull and the fins at a steady 40–45° carve.
- The board's planing trim and slip in the carve, and where the pressure drag arises: trim, slip, rolled rocker.
- What sources say for a surfboard's straight and carving drag. D'Ambrosio 2020's CFD maps drag and lift against pitch at 6 m/s, but only in figures, and Oggiano 2018 simulates a bottom turn.

Any fix changes the board's glide everywhere: the catch, trim, the Canyon's peel and the ride reports. It is a decision for the user.

Pins kept: the deep U, the hard turn, Compress over the crouch (unchanged).
