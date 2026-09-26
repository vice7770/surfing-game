# Online lineup (N1): specification

Status: **agreed** in a grilling session with the user on 2026-09-26 (Q1–Q20). The user accepted every recommendation. This is the spec the N1 plans argue from.

## What it is

Up to 50 surfers share one break. A player creates a room and shares its link. Friends open the link, type a name, and appear spread along the lineup, in the water. Everyone paddles, catches and rides the same waves and sees the others doing it. A later milestone starts players on the beach and adds a beach bar. Rooms are deliberately crowded, and physical collisions are part of the fun (Part B).

## Principles

1. **The physics stays exactly as it is.** Every player runs the full surf zone and their own full rider. Nothing is simplified for the network. Performance is measured, never a gate (M4 Pro is the reference; an M1 Air running poorly is acceptable).
2. **The server keeps time; the players run the sea.** The server hands out a room's seed, conditions and clock, and relays surfer poses. It never runs water.
3. **Friends first.** Rooms are joined by link. There are no accounts, no moderation and no cheat protection, and the server runs in one region. A public room list is a later grilling.
4. **Build now, in parallel.** Online work runs beside the physics milestones (P10 onwards). It reads the rider and board snapshot only, never the rider's internals.

## Audience and scope

- **In the first release (Part A):**
  - the Multiplayer tile on the main menu;
  - creating a room and joining one from its link;
  - picking a name (typed once, saved) and a surfer (the Surf screen's surfer card);
  - spawning spread along the lineup in the water;
  - paddling, catching and riding with everyone visible, with name tags;
  - respawning after a ride ends;
  - surf calls, a ride feed and a Kick button;
  - rides saved to the Logbook, marked "online".
- **Part B:** physical collisions.
- **Later:** the beach start and beach bar, accounts, a public room list, judging and scores, wave-priority rules (drop-in calls), text chat, voice, replays, spectating, and a server-checked sea.
- **Platforms:** the same as single player (desktop keyboard, gamepad, and touch on phones and tablets). A browser needs WebGPU to join.

## Architecture

### Who runs what

| Piece | Runs on | Notes |
|---|---|---|
| Room seed, conditions, clock, roster | Server | Held in memory; nothing is written to disk |
| The sea (surf zone water, lip, foam) | Every player | Stage 2 Boussinesq on the GPU, 64 sea components, built from the room's seed and conditions |
| Your surfer's physics | Your machine | The existing worker runner; nothing changes inside it |
| Other surfers | Your machine, drawn only | From their poses, interpolated about 100 ms behind |
| Other surfers' push on the water | Your machine | Each pose carries its board's summed water reaction; every player applies it to their own water |

- **The sea clock.**
  - Room sea time is `seaTimeAtCreate + (serverNow − createdAt)`.
  - Players estimate the offset between their clock and the server's from ping/pong pairs, NTP-style, keeping the lowest-round-trip samples.
  - A joining player warm-starts the surf zone so that its spun-up sea time equals the room's sea time, then steps faster than real time to catch up with the time the build took.
- **Pacing.** Online, the page asks the worker for as many steps as it takes to reach the room's sea time now, instead of stepping on the frame's elapsed time. Catch-up allows larger batches.
- **Falling behind.**
  - A player whose sea stays more than 1 s behind the room's clock for 3 s re-syncs: the surf zone is rebuilt at the room's time, a short "Catching up with the sea" notice shows, and the rider starts again in the lineup.
  - A player who is ahead waits.
- **Same water everywhere.** Online, every player's surf zone is built from the room's configuration:
  - `stage: 2`, `compute: 'auto'` and `componentCount: 64`, whatever their graphics settings;
  - the same spot, seed, swell, tide and wind.
- **WebGPU check on join.** A browser without WebGPU cannot keep stage 2 in real time (the CPU manages 0.68×). It is refused with: "This browser can't run the shared sea. Use a current Chrome or Safari."

### Drift gate (Task 1 of the plan)

Before anything depends on it, a report measures how far two copies of the same sea drift apart:
- **Precision:** one copy's state is rounded to 32-bit floats every step (a GPU-like difference).
- **A paddler:** one copy carries an autopilot rider pushing on the water; the other does not.
- **A late joiner:** a copy is built later at the reference's sea time and compared from then on, with the default spin-up and a longer one.

The report compares where and when each wave starts breaking along the take-off transect.
- **Pass line:** breaking positions within 1 m and timing within 0.2 s for every matched wave.
- **If it fails:** stop, and bring the user options before building anything that depends on the shared sea. The likely option is the server nudging everyone's sea toward a shared reference.

**Result (2026-09-26, [drift report](../../research/drift-report.md)):**
- **Precision and a paddler:** both copies stayed identical to the reference for 240 s (every onset matched within 0.00 s and 0.00 m). The forced surf zone is not chaotic at these scales.
- **Late joiners:** they fail. A fresh warm start breaks up to 2 s and 17 m off; with a 6-period spin-up, 0.7 s and 4 m off (RMS 5–8 % of Hs), converging only slowly.
- **The user's decision:** hand the sea over (below).

### Sea handover (decided 2026-09-26)

A player joining a room that already has players starts from a snapshot of an existing player's sea, not from a fresh warm start.
- **Asking for it:** when a player joins, or re-syncs, and others are in the room, the server asks the player who has been in the room longest for a snapshot. That player's worker exports its surf zone's state at its current sea time: the water, the breaking model, the foam and the lip. The state is stored as 32-bit floats and deflate-compressed; the size is measured (roughly 0.5–1 MB, once).
- **Delivering it:** the server forwards the snapshot to the joiner. The joiner builds the room's surf zone, loads the snapshot, and catches up to the room's clock.
- **When no snapshot comes:** if none arrives within 10 s (the donor left or stalled), the server asks the next-longest player. When nobody can give one, the joiner starts fresh and accepts the drift.
- **An empty room** starts fresh from its seed at the room's sea time. So does the creator.
- **Transport:** snapshots are binary WebSocket messages of their own kind. They are sent only when the server asks, with a larger size limit (8 MB).
- **What isn't sent:** the players' own boards and riders, and the visual-only bubbles and spray.

### Network

- **Transport:** WebSocket.
  - Control messages are JSON text frames.
  - Poses are binary frames, sent 20 times a second. The server sends each player one bundle of everyone else's latest poses 20 times a second.
- **Surfer pose, about 80 bytes:**
  - the room sea-time step;
  - the board position in cm, and its height above the owner's water surface in mm;
  - the board orientation as a quantised quaternion;
  - the seven rider points relative to the board, in cm;
  - the rider phase, heading and flags;
  - the board's summed water reaction since the last pose (its impulse-weighted point and impulse).
- **Drawing others on your water.** A remote board is drawn at your water's height at its position, plus the height it had above its owner's water. Its rider is drawn relative to the board.
- **Bandwidth:** about 80 KB/s down per player with 50 in a room, and about 4 MB/s out of the server.

### Rooms

- **Creating a room:**
  - Anyone can create one from Multiplayer → Create room.
  - The creator picks the spot, swell, tide, wind and time of day (the Surf screen's choices), and a player cap from 2 to 50.
  - The defaults are the Canyon, Medium swell, mid tide, calm, midday and a cap of 50.
- **While it runs:**
  - The conditions are fixed for the room's life.
  - The room lives while anyone is in it. The creator leaving doesn't end it, and it closes 5 minutes after the last player leaves.
- **Links and codes:**
  - A room's link is `/?room=<code>`.
  - The code is 8 characters from an alphabet without look-alike characters, drawn at random by the server.
  - A full room refuses new players with "This room is full".
- **Versions:** a room is pinned to the build that created it. A player on another build is told "A new version is out — reload" (and so is anyone whose tab is older than the server).
- **Kick:** the creator can remove a player from the player list. That player can't rejoin that room.

### Server

- Node 22 and TypeScript, with only the `ws` library. The code lives in `server/` and shares its message types with the game.
- It serves the built game (`dist/`) and the rooms (`/ws`) from one process.
- **Limits:** messages over 4 KB or more than 40 a second from one player are dropped. A player who keeps sending them is disconnected.
- **Hosting:** one small, always-on Fly.io machine in the region nearest the user.
  - The user creates the Fly.io account and pays for it (a few dollars a month).
  - Claude writes the Dockerfile, `fly.toml` and the deploy script.
  - `npm run deploy` runs only after the user says yes each time.
- **Local development:** the room server runs beside Vite, which forwards `/ws` to it. Several tabs on `localhost` can join one room, because WebGPU works on `localhost`. Friends need the HTTPS deploy: plain HTTP on a local network has no WebGPU.

## Playing online

- **Spawning:** players spawn spread along the lineup, 6–30 m outside the break line and across the take-off, never within 3 m of another surfer.
- **Esc** opens a menu (Resume / Settings / Leave room). The sea keeps running, and your surfer lets go of the controls.
- **Removed online:** slow motion, Replay wave and New wave.
- **Retry** (R) respawns you at a free spot in the lineup after a 3 s countdown.
- **Name tags** float over every other surfer, with a toggle in Settings → Gameplay.
- **Other surfers' looks:** each is drawn as their chosen body, outfit, colour and board design, sent when they join. Online rooms load all four bodies. Distant surfers use the graphics preset's lower detail.
- **Surf calls:** four remappable keys (1–4 by default) shout "Left!", "Right!", "Party wave!" and "Nice one!" as a bubble over your surfer for 2 s.
- **Ride feed:** a line in the corner when anyone finishes a ride of 3 s or more ("Ana · 42 m · 6.1 s"), for 6 s.
- **Sound:** other surfers make no board sounds in Part A; the waves sound as before.
- **Disconnects:** a dropped connection shows "Reconnecting…" and retries. Others see a surfer vanish after 5 s without poses. Rejoining keeps the name.

## Part B · Collisions

- Boards (their real hull as a few capsules), riders and fallen swimmers (the body points the physics already has) and loose boards collide.
- **How a hit works:**
  - Each player resolves hits for their own surfer against the others' positions, extrapolated to now (not the interpolated view).
  - The impulse goes into their own board and rider through the existing physics, and the rider's balance decides a fall.
  - There is no health, injury or fault.
- Part B gets its own plan once Part A has shipped and been played.

## Testing and done

- **Unit and integration tests** cover the protocol, the clock, the rooms, the pacing and the pose codec. One integration test runs the real server on a random port.
- **Dev bots:** these replay recorded autopilot tracks and fill a room to 50, to measure frame time, bandwidth and crowding. They sit behind the `DEV_TOOLS` switch and a server flag.
- **Done** is judged together in a playtest with about 5 friends after each part, plus a bot-filled room measured on this machine.

## Open after N1

- The beach start and the beach bar (the user's multiplayer vision).
- A public room list and accounts.
- A server-checked sea, if cheating or drift turns out to matter.
- Wave-priority rules and community judging.
