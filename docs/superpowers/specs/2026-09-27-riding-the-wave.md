# Riding the wave: specification

Status: **agreed** in a grilling session with the user on 2026-09-27, after their playtest of the turn redesign (PR #24) and the play fixes (PR #27). This is the spec the riding-the-wave plans argue from. The [gameplay milestone spec](2026-09-26-gameplay-milestone.md)'s principles still hold: physical inputs, not scripted moves; the player gives intent and the rider's reflexes balance; outcomes are validation checks, never tuned into passing; performance is never a gate.

## The problem

The user's playtest:
- "Any ride is 2 seconds long": the rider loses the wave after being pushed forward in front of it.
- "The surfer speeds too much after the wave and cannot keep in the wave."
- "The surfer stands in only one position"; the animation is poor.

The picture of right is a professional's ride at Uluwatu ([YouTube short](https://www.youtube.com/shorts/I0tgv6Qdxss)), read frame by frame: about 17 s on a long left, six or seven turns, always within a few metres of the breaking part, the body working throughout (deep knees in bottom turns, taller at the top, arms wide, shoulders turning into each turn, head looking ahead).

Measured on the automated Canyon runs before this work: riders averaged 8.1 m/s (top 12.6) against a crest at about 7.5 m/s, and sat about 8 m ahead of the breaking part. Real surfers average about 6.4 m/s (Forsyth et al. 2024). Competition rides average 11.5 s (world-class professionals) to 14.9 s (Farley); most rides overall last 5–10 s.

## Decisions

1. **Postures stay the player's** (Shift crouch and extend, W/S weight, E hand). There is no automatic posture flow.
2. **Two fall fixes first, as a small PR:** the board dropping off the plane, and a cap on how far the rail digs so full steer doesn't bog the board.
3. **Why rides end after about 2 s** is diagnosed, and every ride end is labelled honestly: a fall, a kick-out over the back, or the wave dying (reaching the shore or going flat). A ride never ends by the board silently losing the wave.
4. **Riding physics, judged on one reference wave:**
   - the wave is the Canyon, tuned toward a long, steady peel with chest-to-head-high faces (1–1.5 m), going whichever way it peels best;
   - the face is speed control: going down speeds the rider up, and turning up the face slows it and brings it back toward the curl;
   - going straight down does not end the ride: the face or the broken water keeps pushing, so the rider can turn back or ride the whitewater in;
   - if broken water does not push a board today, only that push is brought forward from P11 (the surface roller moving at about the wave's speed, changing what the bodies sample; no added force). Hold-downs stay in P11;
   - a rider who falls behind or in front can pick the wave back up.
5. **The pocket reflex** (the user's choice: real speeds, plus a reflex):
   - with no forward or back weight held, the rider shifts its own weight to stay a few metres ahead of the curl;
   - weight only: steering stays the player's, and the heading hold keeps the line;
   - it is a setting, on by default in Practice and off otherwise, like the balance meter.
6. **Animation, posed from the physics with more points** (knees, elbows, head, shoulder twist), not hand-made clips:
   - clearly visible crouch and extension (knee bend, hips dropping);
   - torso and shoulders turning into turns with the arms leading (the upper-body swing, drawn);
   - the head looking where the rider is going;
   - arms reacting to balance.

   Spray off the rail and a visible rail angle come in a later pass.
7. **Regular or goofy** is chosen in settings, default regular (moved up from P12).
8. **Order of work:** 2, 3, 4, 5, 6, 7 as numbered above, with 7 slotted in wherever convenient.

## Done when

On the reference wave, with the automated rider:
- the median ride is 10 s or more, and the best rides last 15–20 s;
- no ride ends by silently losing the wave: every end is a fall, a kick-out, or the wave dying;
- the mean speed is 6–9 m/s (Forsyth 2024: 6.4 mean, 9.7 top);
- at least half of each ride is within about 8 m of the curl;
- bottom turns are within Forsyth's ranges (99° in 0.96 s at 1.9 rad/s, 3.8 m radius, 42° rail);

and then the user's playtest agrees. The playtest is the final say.

## Later

The other wave types (Beach, Point and Reef, which mostly close out today) come as their own plan, built on the same riding physics.
