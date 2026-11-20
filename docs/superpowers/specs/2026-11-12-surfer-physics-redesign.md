# The new surfer: physics redesign (spec)

Agreed with the owner on 2026-11-12, in a three-round interview (Q1 to Q20). Background: the board study (`docs/research/board-in-water/`, ruling 27) and the wave route C2 (`docs/research/wave-strategy-alternatives/`).

## Two tracks, in parallel

The owner (2026-11-12): "we can split the order of work in wave and surfer they can exist in parallel. Make sure you grade their agents with the right effort."

- **Surfer track:** this spec.
- **Wave track:** C2, the whole breaking wave from the Basilisk library (`docs/research/wave-strategy-alternatives/README.md`, `t5-run.md`, `ruling-26-handover.md`).
- Each track has its own agent. The orchestrator sets each agent's effort by the task's difficulty and states it in the brief.

## Goal

Real physics with a skilled surfer (Q1). The surfer keeps his own balance from the point of balance. A move that goes against physics makes him fall, as it would any person. The owner's example: a sharp turn while standing tall.

## 1. The new surfer: body and legs (Q3, Q12, Q11)

- The body leans with the face of the wave (today it stands plumb in pitch).
- The knees bend and take the shocks.
- The legs have human strength. Net leg power is limited like a human's, and the contact never makes energy.
- He makes real balance moves by himself: ankles, hips, knees lower, arms out. Only as much as the stance leaves room for:
  - standing tall: room to save a wobble;
  - Compress or Snap: little room, so falls come faster.
- Falls happen only by physics: the weight passes the edge of the feet, or the board leaves the feet. No scripted falls.

## 2. Limits and falls (Q8, Q16, Q18)

| Stance | Sideways force it holds | Lean |
|---|---|---|
| Standing tall | about 0.6 g | about 30° |
| Pumping crouch | about 1 g | about 45° |
| Compress or Snap | about 1.7 g | about 60° |

- These are starting numbers, tuned on the owner's rides.
- For scale, at 7 m/s: a 10 m turn is 0.5 g (27°), 6 m is 0.83 g (40°), 4 m is 1.25 g (51°), 3 m is 1.67 g (59°).
- Past the limit for the stance, the surfer falls. These limits must come out of the body's physics (legs, balance room, the rail's grip), not from a table checked in code.
- **Save window:** only the body's own tipping time, about 0.2 to 0.3 s, shorter in Compress. No added grace time.

## 3. Controls (Q9, Q13, Q14, Q19, Q20)

- **No new buttons.** The lean moves the weight to toes or heels; trim (W/S, the right stick) moves it to the nose or tail.
- **The stance buttons stay:** crouch, Compress, Snap, tube tuck. The player chooses the stance; the physics decides what it can do.
- **Pumping is manual:** the crouch button plus small leans from rail to rail, in rhythm. Mistimed pumps cost speed. "This is a true measure of a surfer skill in real life so will be the player." It needs tuning.
- **The pop-up becomes a skill.** The button stays, and the physics decides:
  - too early: the wave leaves you;
  - too late or too steep: the nose digs in;
  - weight too far forward or back: you fall.

## 4. Speed (Q7)

- `CARVE_CARRY` (the hidden speed source in turns) goes with the new surfer.
- Speed comes only from the wave (gravity along the face, the water's push) and from pumping.
- A good ride tops out at about 25 to 35 km/h; 45 km/h is rare (Farley, Harris and Kilding 2012, PMID 21986691).

## 5. Water (Q2)

- The board's water forces stay; the board study found them realistic (Savitsky planing; 21, 11, 6 and 2 cm deep at 5, 7, 9 and 12 m/s).
- The feel (grip, the rail biting, leaning into the face) comes from the new surfer.
- The wave's push comes from the water's real speed under the board: the sea now, the library wave later.
- The water denting under the board (two-way coupling) comes last, for the look.

## 6. Balance meter (Q10, Q11, Q17)

- Keep today's bar (`RideHud`, `balanceReserve`).
- Shown on every wave by default while the new surfer is tested; Settings can hide it.
- It turns red below 30 %, with no flashing.
- No sound, rumble or screen effect. Only the surfer's body shows the wobble, as the stance allows.

## 7. Testing and switch (Q6, Q15)

- The new surfer comes behind `?rider=new`. After the owner rides it and says yes, it becomes the default, and the old surfer stays as `?rider=old` for a while.
- The owner rides in Canyon (its current waves are fine) and in the 2 m pool (Menu → Wave Pool → Waves: Barrel, with `?poolSize=ref` and the pool switches).
- No rider sessions, catch reports or autopilot rides as evidence. Probes on analytic water (`docs/research/board-in-water/`) measure; the owner rides and judges.

## 8. Order (surfer track)

1. **The energy leak on steep water,** `?legPower=cap` (ruling 27's A-lite, bars L1 to L5). A few days.
2. **The tube wall's added mass** from the water's own acceleration (ruling 27's B). 1 to 2 days.
3. **The new surfer, in steps, each behind `?rider=new`:**
   1. body lean with the face, and the knees;
   2. balance moves and stance room;
   3. the stance limits (section 2);
   4. the pop-up as a skill;
   5. manual pumping, and `CARVE_CARRY` removed;
   6. the meter shown on every wave, red below 30 %.
4. **Two-way coupling** (the dent and the wake), last.

**Out of scope for now:** the duck-dive (parked), paddling, and a difficulty setting (later; the owner's Q1 leaves room to move toward "hard").
