# Breakline — Surf Simulator

A small Three.js browser prototype for exploring the interaction between a traveling wave and a surfboard.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use Space to paddle, Enter or the Get Up button to attempt a pop-up when enabled, and Left/Right to steer. The incoming wave evolves in a shared water field sampled by rendering and board physics. The Wave Lab tunes the next run; Replay repeats the current seed and settings, while New Wave creates a different seed. Current physics limitations and future visual-water work are tracked in [ROADMAP.md](ROADMAP.md).

## Validate

```sh
npm test
npm run build
```

See the always-current [project roadmap](ROADMAP.md), [requirements](docs/REQUIREMENTS.md), [technical plan](docs/PLAN.md), and [implementation task list](docs/IMPLEMENTATION_TASKS.md). The Wayfinder decision map is at [docs/wayfinder/MAP.md](docs/wayfinder/MAP.md).
