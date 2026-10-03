# Breakline — Surf Simulator

A small Three.js browser prototype for exploring the interaction between a traveling wave and a surfboard.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The game opens on its main menu, over live waves at a different spot each time.

## Play

- **Surf:** pick Beach, Point, Reef or Canyon and the conditions (swell, tide, wind and time of day), then paddle out on the physical surf zone. It starts at the Canyon, whose waves peel along the break; the other spots mostly close out.
  - Hold Space (or ↑) to paddle, and press Enter when "Pop up now" shows. Steer with ← → or A D.
  - Standing, lean with ← → (A D) to carve. W or ↑ puts your weight forward to run down the line, and S or ↓ puts it back to slow and stall. Hold Shift to crouch: extending out of a turn pumps. Hold E to drag the wave-side hand in the face. With nothing held, the rider holds its line. Press Enter again to lie back down on the board.
  - R paddles out again, C changes the camera, and Esc pauses.
  - On a gamepad: RT paddles, A pops up, and the left stick or D-pad steers. Standing, the left stick's up and down trims, LT crouches as far as you pull it, and X drags the hand. Y paddles out again, RB changes the camera, and Start pauses.
  - On a touch phone, use the Paddle, Pop up, Crouch and arrow buttons, and the pause button at the top right.
  - The screen stays clean: a prompt, your speed, and a balance meter while standing. Turns are called out as you make them, and a hint teaches each riding move once. After each ride a card sums it up: distance, top speed, time, time in the pocket, and each turn with the speed it kept. It marks a new best.
- **Sound:** the sea and your ride are heard from the camera, starting at your first click or key.
  - Everything comes from the physics: the roar where the water breaks, lip crashes by the water they throw, distant surf with the swell, wind with the Wind setting, the board's rush with its speed, spray off the rail, paddle splashes, the pop-up and the plunge.
  - Underwater and under the pause menu it is muffled; slow motion slows it.
  - M (or the gamepad's Back button) mutes, and so does the speaker toggle in the menu and pause menu.
- **Multiplayer:** surf one break with up to 50 friends ([spec](docs/superpowers/specs/2026-09-26-online-lineup.md)).
  - Type your name, then **Create room** (spot, conditions and a player cap) or **Join** with a room's code. The page's address carries the room (`?room=CODE`): share it, and a friend's link opens Multiplayer with the code filled in. A browser needs WebGPU (a current Chrome or Safari).
  - Everyone starts in the water outside the break and sees the others, with a name tag over each. Keys 1–4 shout "Left!", "Right!", "Party wave!" and "Nice one!". Rides of 3 s or more go to everyone's feed, and to your Logbook marked "online".
  - The sea never pauses: Esc opens a menu with the room's players and link (the creator can kick), and R takes you back to a free spot in the lineup after 3 s.
  - Each player runs the whole sea. Someone joining late takes the sea of the player who has been in the room longest, so every player's waves break in the same places.
- **Logbook:** your last 50 rides, and your bests per spot.
- **Settings:**
  - **Gameplay:** units, default camera, touch controls, the balance meter (on the Practice swell by default), and Score rides: a 0–10 score on the WSL criteria for each ride, with the session's best two.
  - **Graphics:** Auto benchmarks the device on first launch. You can also choose Low, Medium, High or Ultra, or change individual settings under Advanced.
  - **Controls:** every action except pause can be rebound, on the keyboard and the gamepad.
  - **Audio:** Master, Sea, Board and rider, and Interface volumes, and Mute when out of view.
  - **Accessibility:** reduced motion, UI scale, a high-contrast HUD, and Mono audio.

  Settings are saved in the browser.

## Developer tools

`DEV_TOOLS` in [src/devTools.ts](src/devTools.ts) is one switch for everything below. Set it to false to ship without them.

The Wave Lab (a menu tile) is the original screen, around the legacy wave: the wave waits for the first paddle input. Use Space to paddle, Enter or the Get Up button to attempt a pop-up when enabled, and Left/Right to steer and carve. On a touch phone, hold Paddle and the arrow buttons, then tap Get Up when it becomes available. The incoming wave evolves in a shared height field sampled by rendering and board physics. During a ride, the grid scrolls and replenishes the swell so there is no 20 m finish. Its peeling break also launches a bounded 3D plunging sheet that renders and collides from the same parcel positions. The surfer has articulated paddling, standing, and leaning poses on a detailed shortboard; a wipeout detaches a separate body that falls into and floats in the moving water. The Wave Lab offers three surf spot presets plus wave, board, current, wind, shore shelf, and sun controls; it also keeps a local record of recent outcomes. The shelf slows the wave toward shore and appears in the Below view. Replay repeats the current seed and settings, while New Wave creates a different seed. Profile shows diagnostic contacts, and Below follows the board from under the water. URL flags open the Wave Lab directly:
- `?demo` shows an automatic clean ride, and `?demo=carve` a turn into the breaking section;
- `?physical` opens the physical surf zone;
- `?record` films an autopilot ride, and `?record&pilot=jev` films Jev playing (below);
- `?inpage` runs the surf zone without a worker.

The Wave Lab's ♪ Sound button opens the **sound check**: every sound's synthesised version and its candidate recordings on buttons, a gain per sound, and the bus levels; `public/assets/audio/sounds.json` picks the recordings. `npm run report:sound` logs the sound an autopilot ride makes and checks it follows its causes ([sound report](docs/research/sound-report.md)).

**Jev plays the game** ([docs/jev-player.md](docs/jev-player.md)): TypeSafe's Jev, a System One model, makes a player's decisions (paddle, point, pop up, line, weight, stance) from the game's state put into words, at a human's reaction time. `npm run play:jev` plays the physical surf zone headless and exits 0 once it has caught a wave (a ride of 3 s or more by the ride analyzer), so it can gate a change; `npm run film:jev` with `?inpage&record&pilot=jev` films it. The key is read from `TYPESAFE_API_KEY` or `~/.config/typesafe/api_key`.

The 3D lip is a local hybrid model, not a full fluid solver; its scope is recorded in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md) and [ROADMAP.md](ROADMAP.md).

## Online

The room server is a small Node process in [server/](server/). It serves the built game and the rooms (`/ws`), holds the rooms in memory, and relays: it never runs the sea.

```sh
npm run server          # build the game and the server, then serve both on http://localhost:8787
```

Several tabs on `localhost` can share a room (WebGPU works on `localhost`, not on plain HTTP over a network). For development with Vite's hot reload, run `npm run dev` and, beside it, `npm run server:dev`; Vite forwards `/ws` to the room server.

- **Dev bots:** `npm run bots:record` records an autopilot's track on the Canyon (about 5 minutes of sea), and `npm run server:bots` serves with bots. Open `/?bots=8` and create a room to fill it with 8 of them.
- **Deploying to Fly.io:** once, create a Fly.io account, install `flyctl` and run `fly auth login` and `fly launch --no-deploy`. The launch picks the app's name and the region nearest you, which go in [fly.toml](fly.toml). Then `npm run deploy` builds the [Dockerfile](Dockerfile) and deploys. One small always-on machine serves the game and its rooms over HTTPS, and restarting it ends every room.

## Validate

```sh
npm test
npm run build
```

See the always-current [project roadmap](ROADMAP.md), [requirements](docs/REQUIREMENTS.md), [technical plan](docs/PLAN.md), and [implementation task list](docs/IMPLEMENTATION_TASKS.md). The Wayfinder decision map is at [docs/wayfinder/MAP.md](docs/wayfinder/MAP.md).
