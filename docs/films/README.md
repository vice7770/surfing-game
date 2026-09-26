# Films

Films of the game played through its screens, made with `npm run record:session` (see [scripts/browser/record-session.mjs](../../scripts/browser/record-session.mjs)). Each film has a log beside it: what the driver saw and did, second by second (wall-clock time, so it runs longer than the film).

## 2026-09-26 · Beach session

[2026-09-26-beach-session.mp4](2026-09-26-beach-session.mp4) · [log](2026-09-26-beach-session.log) · 2 min, 1280 × 720, 30 fps, H.264 with the game's sound, 27 MB.

- **Build:** `main` at `aa1afc9` (PR #23), production build (`vite build`, `vite preview`), in Google Chrome 153 on a fresh profile: a first launch.
- **Machine:** MacBook Pro, Apple M4 Pro, 120 Hz display. The Auto benchmark on the title's waves picked **High**, with accurate water (see the [frame-rate report](../research/fps-report.md)).
- **What it shows:**
  1. The title's live waves while the Auto benchmark runs.
  2. Settings → Graphics (Auto (High)), then Logbook.
  3. Surf: Beach, Medium swell (1.4 m, 11 s), Mid tide, Calm, Midday, the default surfer; Paddle out.
  4. Seven attempts at a wave, then Pause → Quit to menu.
- **The driver** plays with the keyboard like a player. It reads the dev telemetry (hidden from the film): it paddles when a crest travelling 5 m/s or more, and not closing out, is 3–11 m behind the board. It pops up on the cue and gives up after 8 s without one, then paddles out again (R).
- **Cut:** the recorder pauses while no wave is coming, so the lulls between waves are left out.
- **Result: no wave caught.** None of the seven attempts lit the pop-up cue: each crest passed under the board. This matches the reports: the ride report's autopilot stands on about 1 % of its attempts. In the film the rider also paddles in shallow, clear water while the whitewater stays far out toward the horizon, which suggests the Beach lineup (and R's reset) seats the rider inside the break line; worth checking with the take-off work (P10).
