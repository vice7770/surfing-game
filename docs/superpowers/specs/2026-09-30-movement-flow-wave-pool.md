# The movement flow and the Wave Pool: specification

Status: **agreed** with the user on 2026-09-30, over three grilling rounds (Q1–Q26). They took every recommendation except Q8, where they chose no move recognition, and then said "all recommended, go ahead". This is the goalpost for a final prototype. The [stances spec](2026-09-27-stances.md) still holds where this one does not replace it. This spec replaces its Compress weight (no longer forced forward) and its Compress depth (no longer the same as the crouch's).

## The goal

1. **The movement flow maps correctly.** The player can do the sequence the user described (their notes, frontside):

   | Phase | Posture | Weight | Rail |
   | --- | --- | --- | --- |
   | Bottom turn | low and compressed | centred, front-foot drive | inside rail (toes, frontside) |
   | Projection | high and extended; unweights the board, which carries up the face onto the shoulder | light | neutral |
   | Cutback | low and compressed | heavy back foot, sinking the tail to pivot | outside rail (heels, frontside) |

   - In the cutback, the head, shoulders and torso twist to look back at the whitewater, and "the board follows the eyes".
   - The cutback carries on through the rebound off the foam. That rebound is simply the next turn.
   - **Pumping** is changing between the normal stance and the crouch while moving through the wave. It makes speed.
   - **Compress** is for turning very fast and sharply: the bottom turn and the cutback.
   - **Backside** mirrors the table: the bottom turn on the heels, the cutback on the toes. It uses the same controls.
2. **A training map, the Wave Pool.** It is a new spot like the others: a pool of stable, identical, blue-water waves 1–1.5 m high, where players practise the flow. The user's picture is a crowded wave-pool session (YouTube short `XG-aYPU-01I`, Cruz Dinofa).

## Why Compress seemed broken (the user's Q1)

The user saw no difference from the crouch and no faster turn. In the physics (`AttachedRider`):
- **Depth:** Compress reaches the same depth as a full crouch (`CROUCH_DEPTH`, 0.3 m).
- **Speed:** alone, it sinks only as fast as a turn's load allows. That is about 0.1 g on a straight line, so roughly 0.8 s against the crouch's 0.3 s.
- **Over the crouch:** held on top of Shift, it changes only the weight (forward) and the reaching hand.
- **Turning:** it turned less than the crouch (62° against 69°, pinned in September).

The work also checks that the key reaches the physics: a player's saved bindings could have left Compress unbound.

## Controls (the pad is the design target)

The pad is the main target: analog sticks and triggers. The keyboard is its digital approximation (keys ramp in), and touch follows the keyboard.

| Input | Pad | Keyboard | Does |
| --- | --- | --- | --- |
| Rail / lean | left stick X | ← → / A D | leans onto the inside or outside rail. Toes or heels follow from stance and direction. |
| Weight | right stick Y | W / S | front or back foot, in every stance. Centred by default. |
| Crouch | LT (analog) | Shift | down to about two thirds of the depth (knees about 100–110°): the pumping stance |
| Compress | RT (analog) | Space | down to full depth (knees and hips at or under 90°), dropping as fast as the crouch; works alone or over the crouch |
| Rotation | right stick X (analog, **new**) | automatic | twists the upper body. The stick points where the rider looks, in the same sense as steering. |
| Hand | LB | E | unchanged |

- **Heights:** normal (no input) → crouch → Compress. Releasing either one is the projection: a quick extension that unweights the board. There is no extend key.
- **Weight in Compress:** Compress no longer moves the weight forward. W/S (or the right stick) always set it. The bottom turn is Compress with the front foot; the cutback is Compress with the back foot.
- **Rotation:** with the stick, winding the upper body into a turn turns the board through the feet. This is a real effect, but a short-lived one: a steady twist gives no net yaw torque. The drawn head and shoulders follow it. On the keyboard and touch, the body twists by itself with the turn, as it does today.
- **The inside hand** still reaches for the water when compressed into a lean.
- **A HUD stance readout** shows height (Normal / Crouch / Compress), weight (front / back) and rotation. Settings can turn it off. It shows inputs only; it does not recognise moves.

## Sharper turns: physics first

- **The physics route:** a lower body leans in faster, as a shorter pendulum swings faster, so Compress should speed up the lean-in.
- **The bar:** on flat water at 7–8 m/s, a compressed bottom turn comes round **about 90° in about 1 s** (Forsyth et al. 2024: 99° in 0.96 s). It must be clearly sharper than the crouch and keep most of its speed. One short probe checks it.
- **Fallback:** if the physics route misses the bar, a gameplay assist goes in. It makes a compressed board turn tighter.
- **Don't retry:** the don't-retry lists in the bottom-turn and lean-in studies still apply.

## Pumping

Real physics only, with no pump bonus. Speed is gained when extension is timed with the high-load part of each up-and-down (about 0.2–0.6 m/s a pump). Mistimed pumps lose speed, and pumps on flat water gain nothing. The user judges it in play. The Surf School's Crouch/extend lesson teaches the timing.

## No move recognition

The game does not name or score the phases. There is no Flow lesson and no move names in the ride report (Q8). The stance readout shows only what the player is pressing.

## The Wave Pool

- **Kind:** a moving wave that peels along the pool, like the clip. Every wave is identical.
- **Made by the same solver as the other spots:** identical (monochromatic) waves are fed in from the tank edge onto a shaped pool floor that makes them peel.
  - The edges absorb the waves. The walls are drawn but not simulated, as real pools are built to kill reflections.
  - Before the floor shape is settled, the water-physics advisor checks it.
- **An A-frame:** one peak peeling both ways, so every wave gives a right and a left, frontside and backside.
- **Sizes:** faces of 1.0, 1.25 and 1.5 m (default 1.25). They take the place of the ocean's swell choice.
- **Rhythm:** a wave about every 10 s.
- **Rides:** about 15–20 s, enough for 3–4 bottom-turn-to-cutback cycles.
- **Shape:** a steep, open "performance" face with a clean shoulder to cut back on. The lip breaks without barrelling.
- **Conditions:** no tide and no wind (always glassy). The time of day stays.
- **Look:**
  - clear turquoise water with the pool floor visible;
  - concrete walls and a deck, and one plain building for the wave machine;
  - no crowd or props yet;
  - in both the Classic and Rich water looks.
- **Name and place:** "Wave Pool". It is first in the spot list and the **default spot**. It appears everywhere spots do: Surf, Surf School, the Wave Lab and Multiplayer.
- **Surf School** moves its lessons onto the pool wave. The existing lessons stay, updated for the new controls (Compress with W/S, the rotation stick, pump timing in Crouch/extend). Their pass thresholds come from one recorded attempt each, and the user judges them. There are no new lessons.

## Checks

The user does the gameplay testing (the tests are too slow). So:
- **Not run:** ride reports, autopilot sweeps and the slow physics suites.
- **Run:** fast unit tests for new logic (input mapping, the pool's settings), a type-check, a build and one quick look in the browser that it runs.
- **Probes:** short ones, only where the Compress bar needs a number.
- **Old tests:** tests that encode the old Compress behaviour are updated only in files the work touches.

## Order and delivery

One PR per step. A step is stacked on the previous one if that is not merged yet. The user merges.

1. **Compress:**
   - the height ladder and the weight;
   - the dead-key check;
   - the HUD stance readout;
   - the rotation stick;
   - sharper compressed turns (physics first).
2. **The Wave Pool.**
3. **Pumping,** checked on the pool.
4. **Bottom turn → projection.**
5. **Cutback.**
6. **The user's playtest.**
