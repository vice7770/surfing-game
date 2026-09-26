# Surfing Game Context

This glossary defines the player-facing and simulation concepts used by the surfing game project.

## Surfing

**Wave seed**:
A value that determines a generated wave and its reproducible starting conditions.
_Avoid_: random wave ID

**Wave replay**:
A fresh run using the same wave seed and simulation settings as the previous run.
_Avoid_: restart (ambiguous with a new wave)

**New wave**:
A run generated with a different wave seed.
_Avoid_: replay

**Ride**:
The sustained phase in which the wave carries the board and surfer forward along the wave face.
_Avoid_: session

**Wave catch**:
The transition from paddling to riding after the surfer stands up under suitable board-speed and local-wave conditions. A catch is successful only when the wave sustains the ride; crest proximity alone is insufficient.
_Avoid_: crest passage, automatic catch

**Pop-up**:
The player's timed action to move from paddling to a standing surf stance when the board has enough speed and the wave face is suitable.
_Avoid_: automatic stand-up

**Pop-up window**:
The interval when board speed and local wave conditions allow the player to initiate a pop-up. A premature attempt is ignored; a missed window can end the attempt without being treated as a successful catch.
_Avoid_: catch prompt

**Wave-driven transport**:
Forward board motion during a ride caused by physical board-water interaction and pop-up timing, rather than continued paddle input, scripted translation, or a staged animation. This is a product rule, not a future stretch goal.
_Avoid_: auto-surf, ride animation

**Board-water coupling**:
The exchange of forces and disturbances between the board and interactive water field, so the wave can move the board and board actions can affect the local surface. The first coupled-water feature uses modest hull displacement/wake; more complete physical coupling is future work.
_Avoid_: one-way animation

**Wave cue**:
A visible change in the wave and board interaction that communicates a suitable pop-up opportunity without relying on a persistent tutorial prompt.
_Avoid_: tutorial prompt

**Wipeout**:
The terminal run outcome when the surfer can no longer remain on the board.
_Avoid_: crash

## Simulation

**Wave model**:
The deterministic generated wave conditions that define the incoming swell and initialize it inside the interactive water field.
_Avoid_: fluid simulation (implies full computational fluid dynamics)

**Interactive water field**:
The evolving water-surface state that contains the incoming wave and can propagate disturbances; it is the shared source for rendering and board-water interaction.
_Avoid_: render-only wave, separate wave overlay

**Water sample**:
Local observations of the shared interactive water field at a position and time, including surface elevation, slope/orientation, and water motion.
_Avoid_: render-only sample

**Board response**:
The simulated motion of the surfboard under buoyancy, drag, lift, paddling, and rider input.
_Avoid_: board physics (too broad without a specific model)

**Physics tuning panel**:
The in-game controls for adjusting MVP wave and board parameters to inspect their effect.
_Avoid_: debug menu

**Sea state**:
The spectral description of the swell at the spot (Hs, Tp, direction, spread, tide), represented as seeded linear components.
_Avoid_: wave settings

**Set**:
A group of larger waves produced by interference of nearby periods, arriving at the group velocity.
_Avoid_: wave series

**Time-scale**:
A uniform slow-motion factor on simulated time; gravity and the fixed physics step are unchanged.
_Avoid_: slow gravity

**Breaker type**:
Spilling, plunging, or surging, classified by the Iribarren number.
_Avoid_: wave style

## Riding

**Speed over ground**:
The board's horizontal speed, as a GPS watch measures it; the speed the player sees.
_Avoid_: board speed (ambiguous with speed through the water)

**Required speed**:
The speed a rider needs to keep pace with a peeling break, c / sin α, from the breaker's celerity c and the peel angle α.
_Avoid_: wave speed

**Flexible rider**:
The standing rider as a body on legs of finite stiffness and damping, coupled to the board in one implicit solve and kept up by slow active balance.
_Avoid_: rigid rider, ragdoll

**Trim**:
Where the rider puts its weight along the board, which sets the board's pitch, wetted length and drag.
_Avoid_: speed control

**Stall**:
Slowing on purpose, with weight on the tail or a hand in the face.
_Avoid_: brake

**Pump**:
Speed gained by crouching and extending in time with the load on the feet; it needs a curved path on a wave and gives nothing on flat water.
_Avoid_: boost

**Heading hold**:
The rider's own reflex that keeps the board on its line when no lean is asked for.
_Avoid_: auto-steer

**Ride report**:
The measured summary of one ride: time, distance, speeds, time in the pocket and detected turns.
_Avoid_: score screen

**Wave score**:
An optional 0–10 rating of one ride from a rubric of measured quantities modelled on WSL judging criteria.
_Avoid_: points

**Kick-out**:
A ride ended by going up and over the back of the wave while still on the board.
_Avoid_: exit button

**Lost the face**:
A ride ended because the wave moved on and stopped carrying the board.
_Avoid_: missed
