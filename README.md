# Breakline — Surf Simulator

A small Three.js browser prototype for exploring the interaction between a traveling wave and a surfboard.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The game opens on its main menu, over live waves at a different spot each time.

## Play

- **Surf:** pick Beach, Point or Reef and the conditions (swell, tide, wind and time of day), then paddle out on the physical surf zone.
  - Hold Space (or ↑) to paddle, and press Enter when "Pop up now" shows. Steer with ← → or A D.
  - Standing, lean with ← → (A D) to carve. W or ↑ puts your weight forward to run down the line, and S or ↓ puts it back to slow and stall. Hold Shift to crouch: extending out of a turn pumps. Hold E to drag the wave-side hand in the face. With nothing held, the rider holds its line.
  - R paddles out again, C changes the camera, and Esc pauses.
  - On a gamepad: RT paddles, A pops up, and the left stick or D-pad steers. Standing, the left stick's up and down trims, LT crouches as far as you pull it, and X drags the hand. Y paddles out again, RB changes the camera, and Start pauses.
  - On a touch phone, use the Paddle, Pop up, Crouch and arrow buttons, and the pause button at the top right.
  - The screen stays clean: a prompt, your speed, and a balance meter while standing. Turns are called out as you make them, and a hint teaches each riding move once. After each ride a card sums it up: distance, top speed, time, time in the pocket, and each turn with the speed it kept. It marks a new best.
- **Logbook:** your last 50 rides, and your bests per spot.
- **Settings:**
  - **Gameplay:** units, default camera, touch controls, the balance meter (on the Practice swell by default), and Score rides: a 0–10 score on the WSL criteria for each ride, with the session's best two.
  - **Graphics:** Auto benchmarks the device on first launch. You can also choose Low, Medium, High or Ultra, or change individual settings under Advanced.
  - **Controls:** every action except pause can be rebound, on the keyboard and the gamepad.
  - **Accessibility:** reduced motion, UI scale, and a high-contrast HUD.

  Settings are saved in the browser.

## Developer tools

`DEV_TOOLS` in [src/devTools.ts](src/devTools.ts) is one switch for everything below. Set it to false to ship without them.

The Wave Lab (a menu tile) is the original screen, around the legacy wave: the wave waits for the first paddle input. Use Space to paddle, Enter or the Get Up button to attempt a pop-up when enabled, and Left/Right to steer and carve. On a touch phone, hold Paddle and the arrow buttons, then tap Get Up when it becomes available. The incoming wave evolves in a shared height field sampled by rendering and board physics. During a ride, the grid scrolls and replenishes the swell so there is no 20 m finish. Its peeling break also launches a bounded 3D plunging sheet that renders and collides from the same parcel positions. The surfer has articulated paddling, standing, and leaning poses on a detailed shortboard; a wipeout detaches a separate body that falls into and floats in the moving water. The Wave Lab offers three surf spot presets plus wave, board, current, wind, shore shelf, and sun controls; it also keeps a local record of recent outcomes. The shelf slows the wave toward shore and appears in the Below view. Replay repeats the current seed and settings, while New Wave creates a different seed. Profile shows diagnostic contacts, and Below follows the board from under the water. URL flags open the Wave Lab directly:
- `?demo` shows an automatic clean ride, and `?demo=carve` a turn into the breaking section;
- `?physical` opens the physical surf zone;
- `?record` films an autopilot ride;
- `?inpage` runs the surf zone without a worker.

The 3D lip is a local hybrid model, not a full fluid solver; its scope is recorded in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md) and [ROADMAP.md](ROADMAP.md).

## Validate

```sh
npm test
npm run build
```

See the always-current [project roadmap](ROADMAP.md), [requirements](docs/REQUIREMENTS.md), [technical plan](docs/PLAN.md), and [implementation task list](docs/IMPLEMENTATION_TASKS.md). The Wayfinder decision map is at [docs/wayfinder/MAP.md](docs/wayfinder/MAP.md).
