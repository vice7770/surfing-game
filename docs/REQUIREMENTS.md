# Surfing Simulator MVP Requirements

## Product goal

Evolve the current browser-based Three.js prototype into a physics-focused surfing simulator where the player paddles, times a pop-up, and is carried forward by the simulated incoming wave. Wave-driven board travel must emerge from board-water forces and timing, not scripted translation or a staged ride animation. This is not a full ocean CFD simulation.

## Player flow

1. Load a single surf break with one board, one surfer silhouette, and a deterministic incoming wave represented inside the evolving water simulation.
2. Paddle to build speed while reading the visible wave/board interaction for a suitable pop-up opportunity.
3. Trigger Get Up during the valid window; the surfer stands and the run attempts a wave catch.
4. Release paddle and steer/balance while moving water carries the board forward through simulated forces.
5. Reach ride complete, miss the window/wave, or wipe out; replay the same seed/settings or generate a different wave.

## MVP functional requirements

### Wave and water

- Use Three.js and a deterministic evolving interactive water field. World axes: Y is up, X runs along the crest, and +Z is the travel direction.
- The incoming generated wave must be represented in the field's physical state from the start, not drawn as a separate overlay. The field is authoritative and shared by rendering and board physics.
- Provide surface height, slope/normal, and local water motion to rendering and board force calculations from that shared state.
- Wave conditions remain reproducible and tunable; a seed adds deterministic variation without defeating explicit settings.
- Research the Three.js compute-water example as a reference for height-field propagation and water/object coupling. Prototype CPU/reference and optional WebGPU compute approaches; preserve WebGL 2 as the baseline unless compatibility testing demonstrates the required compute behavior.
- Render the evolving finite water field, visible incoming crest, restrained slope-driven foam, horizon/sky, and light. Board support and motion must agree with that physical state.
- Provide a diagnostic side/profile view with the crest and board contact samples visible.

### Board and rider

- Show a stylized surfboard and simple rider silhouette; external art assets are not required.
- Simulate the board as a compact rigid body with position, velocity, pitch, roll, and heading. Apply gravity, buoyancy/support at four contact samples, water-relative drag, wave-driven forces, paddle thrust before pop-up, steering torque, and damped attitude response.
- Include modest two-way coupling: the board hull can create a small local displacement/wake. Detailed hand/paddle-fluid forces and more complete coupling are future work.
- After a valid pop-up, wave-driven forward travel must result from the shared water field and board forces. Continued paddle thrust, scripted translation, and timed ride animation must not create or sustain the ride.
- Apply a bounded contact correction so no hull sample penetrates the water surface by more than 0.2 m during approach, catch, or ride.
- Use a fixed 1/60 s physics step with a capped catch-up loop. Rendering runs independently.
- The MVP aims for stable, legible, physically emergent qualitative surfing behavior, not measured hydrodynamic accuracy.

### Future water fidelity (not an MVP blocker)

- Study [ThreeJS-water](https://github.com/martinRenou/threejs-water) for surface disturbance, reflection/refraction, and underwater caustic techniques, while accounting for its pool-demo context.
- Study the [Three.js ocean shader](https://threejs.org/examples/webgl_shaders_ocean) for sun position, sky lighting, and open-water reflections.
- Use the [surfing-game video reference](https://www.reddit.com/r/Unity3D/comments/1ro4tyq/new_surfing_game_made_in_unity/) for visual/gameplay inspiration only, and only watch the embedded video. The Reddit post text, comments, and discussion are explicitly out of scope as sources. Any useful observed player-facing qualities must be adapted to the browser-based Three.js game; do not inherit Unity-specific assumptions.
- Add an underwater camera/view with appropriate lighting, caustics, and depth attenuation in a later feature.
- Keep the evolving field shared: visual reflections, refraction, and underwater effects must not replace or fork the physics state that moves the board.

### Controls

- Space or ArrowUp: paddle.
- Left/Right: steer and shift balance.
- Enter and an on-screen Get Up button: attempt a pop-up; available only when board speed and local wave conditions are suitable. Premature attempts are ignored.
- R: replay the current seed and captured tuning settings.
- On-screen Replay and New Wave buttons provide the same actions.
- Keyboard focus and buttons must remain usable without interacting with the canvas.

### Tuning and diagnostics

| Setting | Unit | Range | Default |
|---|---:|---:|---:|
| Wave height | m | 0.6–2.4 | 1.4 |
| Wave period | s | 5–12 | 8 |
| Wave speed | m/s | 1.5–5 | 3 |
| Paddle force | N | 5–25 | 14 |
| Board response (steering/attitude gain) | multiplier | 0.5–2.0 | 1.0 |

- Display seed, run state, board speed, sampled surface height, submersion, and effective tuning values.
- Slider edits are pending until the next run. Provide Apply & Replay for a changed setup.

### Run state and outcomes

- States: `ready`, `paddling`, `pop-up-available`, `riding`, `missed`, `wipeout`, and `complete` (internal names may differ if transitions remain observable/testable).
- Enter paddling on first paddle input.
- Get Up requires suitable board speed and local wave conditions. The opportunity is communicated primarily by a visible wave cue; an on-screen action is available only during the valid window.
- A successful catch is sustained riding in which simulated water forces carry the board. Crest proximity alone is insufficient.
- An early Get Up attempt has no effect. Missing the valid opportunity can result in `missed`; losing board support/stability can result in `wipeout`.
- Wipe out if board roll exceeds 48°, pitch exceeds 55°, or all four board samples remain more than 0.25 m above the water for 1 s.
- Complete after riding 20 m with the wave, or after at least 8 m when the crest passes 15 m beyond the board. A shorter catch that loses the wave is `missed` rather than a completed ride.
- Terminal states freeze simulation and offer Replay and New Wave.

### Replay and seeds

- Store the seed and full effective settings snapshot at run start.
- Replay resets simulation time, fixed-step accumulator, board/rider state, run state, wave phase, and seeded random generator state.
- Same seed/settings and same ordered player inputs in the same build must produce materially matching trajectories within floating-point tolerance. Inputs are not automatically recorded/replayed.
- New Wave chooses a distinct seed and regenerates deterministic crest variation while preserving explicit tuning values.

## Quality requirements

- Browser viewport adapts to desktop and mobile widths; MVP controls are keyboard and on-screen buttons (no touch steering requirement).
- Provide readable contrast and visible focus states for HUD controls.
- Keep simulation responsive on a typical recent laptop; target 60 FPS rendering where feasible, and cap physics catch-up to avoid runaway work after a stalled frame.
- Handle resize and device pixel ratio without stretching the scene or making controls unreachable.
- No network service, account, analytics, or external art dependency is required.

## Acceptance criteria

- `npm install` and `npm run dev` start the playable app from the repository root.
- The app clearly shows the approaching wave, surfer/board, current seed, paddle/Get Up controls, and tuning controls.
- The interactive field contains the incoming wave, produces consistent render and contact data, and transfers forces to the board; hull interaction creates a bounded local disturbance/wake.
- Paddle input increases forward speed; release allows drag to reduce paddle-generated speed before a catch.
- Get Up is unavailable too early, becomes available under suitable speed/local-wave conditions, and initiates a standing pop-up.
- After Get Up and with no paddle input, the board travels with the incoming wave for at least 3 seconds as a result of board-water physics; no scripted forward ride motion is used.
- Rendering and board-contact samples use the same water state and remain aligned.
- Steering changes board heading/lean smoothly; no unbounded drift or NaN state occurs during a normal run.
- Miss, wipeout, and ride-complete outcomes are reachable and expose Replay/New Wave.
- Replay restores identical seed/settings and reset state; New Wave changes the seed and visible crest profile.
- Diagnostic view and overlay expose local water motion, board speed relative to water, distance to crest/face, pop-up eligibility, and board support.
- Keep the current prototype extension uncommitted until it is accepted; the earlier baseline is already committed and published.

## Advanced playable prototype extension

- A catch begins on the approaching wave face. Four board contacts produce pressure along local water normals, and rail/fin side force makes steering change the board path and speed.
- A deterministic breaking front peels along the crest. Breaking dissipates motion in the shared field, drives synchronized foam/lip rendering, and increases board instability.
- A clean no-paddle ride should travel at least 20 m on default conditions across generated seeds; steering into the breaking section can produce a recoverable challenge or a wipeout.
- Show break intensity, balance, FLOW, and concise move feedback derived from physical turning and pocket position. Visual wake and spray follow the simulated board.
- The wave and board remain the main focus. Add a restrained coastline, sunset, and reflective water only after the ride and break are playable.
