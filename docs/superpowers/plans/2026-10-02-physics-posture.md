# The Physics Posture (the riding body, step 6)

**Goal:** change the physics' posture only where the stance map proves it wrong, as a separate, measured step that re-checks the riding tests and the ride report (the grilling, memory `riding-body-animation`).

**The user's call (2026-09-29):** the map's physics-owned misses are mostly the weight fore and aft. The physics' balance keeps the feet's pressure near the board's own centre of pressure (within `TRIM_FREEDOM`, 0.2 m, of the stance's middle), and the stance recipes run on flat water. So the map did not clearly prove the physics wrong. The user chose to measure on the real wave first, and to change the physics only if it still sits forward where surfers go back.

## Method

`npm run report:ride -- --practice --ghosts --style turns --seeds 2 --minutes 3 --spots point,beach` reads the physics every standing step of the closed rides:
- **Where:** by the ride analyzer's manoeuvres and, outside them, by the board's climb (past ±0.3 m/s).
- **Two readings:**
  - the pelvis point between the rear foot (0) and the front foot (1), the map's weight until now;
  - the feet's own pressure: the contact's centre of pressure, the share on the front foot.

## Results (the practice waves, the autopilot's S-turns)

The Beach (8 rides, 11 turns):

| Where | Seconds | Pelvis | Feet's pressure | The map's target |
|---|---:|---:|---:|---|
| Level | 22.0 | 0.74 | **0.59** | 0.50–0.62 (trim) |
| Descending | 18.9 | 0.75 | **0.56** | 0.50–0.60 (a pump downhill) |
| Climbing | 1.6 | 0.66 | **0.63** | 0.40–0.50 (uphill); 0.35–0.45 (extending) |
| Bottom turn | 11.6 | 0.72 | **0.74** | 0.60–0.75 (Compress, driving) |
| Top turn | 7.8 | 0.89 | **0.65** | 0.35–0.45 |

The Point (2 rides, 3 turns) agrees: its pressure reads 0.65 level, 0.68 descending, 0.73 in the bottom turn and 0.70 in the top turn. The Reef gave almost no rides.

## Findings

- **The feet's pressure matches the coaching splits in trim, descending and the bottom turn.** The coaching (60/40, 70/30) describes what the surfer feels on the feet, which is the pressure. The pelvis sits 0.1–0.25 of the stance forward of it: on a board that slows, the force through the body tilts back, so the body rides ahead of its feet.
- **The map keeps its pelvis reading, and points here for weight.** Read at the recipe's instant on flat water, the physics' pressure was worse, not better: 42 misses against 39. It reads 0.72 in trim, 0.95 trimming forward and 1.00 in the pump's extension. Flat water's drag loads the front foot, and a single instant catches each motion's push. The coaching splits describe a sustained feel, which the real wave's averages over seconds match. So the real-wave reading here, not the flat-water map, is the authority for weight.
- **Climbing** reads 0.63. The autopilot does not sit back between turns (trim 0), so this is its input, not the physics: a player holding S sits back.
- **The top turn is the one real gap:** the feet's pressure stays 65/35 on the front foot where surfers go 40/60 onto the back.
  - The autopilot sits back there (trim −0.5; −1 in a snap).
  - The physics' trim moves only the upper body (`TRIM_SHIFT`, 0.25 m), about 0.2 of the stance at most. From a turn's forward baseline near 0.75, full trim back reaches about 0.55.
  - Giving the trim more reach would sink the tail further. The physics' own pinned test already shows it: with the weight back, the snap's tail sinks to 40° nose-up within a second and the rider falls ("snaps back down the face from a climb with the weight back", `it.fails`, pinned for the user's decision).
  - So the top turn's weight belongs to the open snap and top-turn decision (the "deep U" root), not to this step alone.

**No physics change in step 6.** The riding tests and the ride report are unchanged; the physics is untouched.

## Open, for the user

- **The top turn's weight** comes with the snap and top-turn physics (the tail sinking with the weight back). Decide those together: a trim that moves the hips over the back foot, and a board whose tail holds.
- **The autopilot's climb** could sit back (trim) to show the extension's weight; its riding is its own.
- **The map's lean and trunk rows** owned by step 6 are all low confidence: frames read by eye. They are not proof enough to move the physics.
