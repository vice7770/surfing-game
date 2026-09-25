# Breakline — Surf Simulator

A small Three.js browser prototype for exploring the interaction between a traveling wave and a surfboard.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The wave waits for the first paddle input. Use Space to paddle, Enter or the Get Up button to attempt a pop-up when enabled, and Left/Right to steer and carve. On a touch phone, hold Paddle and the arrow buttons, then tap Get Up when it becomes available. The incoming wave and its peeling break evolve in one shared water field sampled by rendering and board physics. The surfer has articulated paddling, standing, leaning, and wipeout poses on a detailed shortboard. The Wave Lab offers three surf spot presets plus wave, board, current, wind, shore shelf, and sun controls; it also keeps a local record of recent outcomes. The shelf slows the wave toward shore and appears in the Below view. Replay repeats the current seed and settings, while New Wave creates a different seed. Profile shows diagnostic contacts, and Below follows the board from under the water. Add `?demo` to the local URL to watch an automatic clean ride, or `?demo=carve` to see a turn into the breaking section. Current physics and visual limits are tracked in [ROADMAP.md](ROADMAP.md).

## Validate

```sh
npm test
npm run build
```

See the always-current [project roadmap](ROADMAP.md), [requirements](docs/REQUIREMENTS.md), [technical plan](docs/PLAN.md), and [implementation task list](docs/IMPLEMENTATION_TASKS.md). The Wayfinder decision map is at [docs/wayfinder/MAP.md](docs/wayfinder/MAP.md).
