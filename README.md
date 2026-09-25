# Breakline — Surf Simulator

A small Three.js browser prototype for exploring the interaction between a traveling wave and a surfboard.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The wave waits for the first paddle input. Use Space to paddle, Enter or the Get Up button to attempt a pop-up when enabled, and Left/Right to steer and carve. On a touch phone, hold Paddle and the arrow buttons, then tap Get Up when it becomes available. The incoming wave evolves in a shared height field sampled by rendering and board physics. During a ride, the grid scrolls and replenishes the swell so there is no 20 m finish. Its peeling break also launches a bounded 3D plunging sheet that renders and collides from the same parcel positions. The surfer has articulated paddling, standing, and leaning poses on a detailed shortboard; a wipeout detaches a separate body that falls into and floats in the moving water. The Wave Lab offers three surf spot presets plus wave, board, current, wind, shore shelf, and sun controls; it also keeps a local record of recent outcomes. The shelf slows the wave toward shore and appears in the Below view. Replay repeats the current seed and settings, while New Wave creates a different seed. Profile shows diagnostic contacts, and Below follows the board from under the water. Add `?demo` to the local URL to watch an automatic clean ride, or `?demo=carve` to see a turn into the breaking section. The 3D lip is a local hybrid model, not a full fluid solver; its scope is recorded in [ADR 0003](docs/adr/0003-plunging-sheet-collision.md) and [ROADMAP.md](ROADMAP.md).

## Validate

```sh
npm test
npm run build
```

See the always-current [project roadmap](ROADMAP.md), [requirements](docs/REQUIREMENTS.md), [technical plan](docs/PLAN.md), and [implementation task list](docs/IMPLEMENTATION_TASKS.md). The Wayfinder decision map is at [docs/wayfinder/MAP.md](docs/wayfinder/MAP.md).
