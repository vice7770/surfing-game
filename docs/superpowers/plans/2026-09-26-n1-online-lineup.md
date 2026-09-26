# N1 Online lineup (drift gate + Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Up to 50 players share one surf break from a room link. Each player runs the full sea and their own surfer, and a small Node server keeps the room's clock and relays poses.

**Architecture:**
- **The sea:** every player builds the same stage 2 surf zone from the room's seed and conditions, warm-started at the room's sea time. The page steps it to follow the room clock, which it estimates from ping/pong.
- **Your surfer:** its pose (about 76 bytes) goes to the server 20 times a second. The server bundles everyone's latest poses back to each player.
- **Other surfers:** they are drawn on the local water, and their board reactions push the local water.
- **The server:** Node + `ws`. It serves the built game and `/ws`, and holds rooms in memory.

**Tech Stack:** TypeScript, three.js (the existing game), Web Workers + WebGPU (the existing surf zone), Node 22 with `ws` 8, Vitest 5, Vite 8, rolldown (the existing scripts' bundler), Fly.io.

**Spec:** [docs/superpowers/specs/2026-09-26-online-lineup.md](../specs/2026-09-26-online-lineup.md)

## Global Constraints

- Each player's physics is untouched: the full stage 2 surf zone and the full rider. Nothing is simplified for the network.
- Online surf zones are always `stage: 2`, `compute: 'auto'` and `componentCount: 64`, built from the room's spot, seed, swell, tide and wind.
- Pose rate is 20 Hz. The room cap is 2–50. The defaults are Canyon, Medium swell, mid tide, calm, midday and cap 50.
- Rooms close 5 minutes after the last player leaves. A player silent for 5 s vanishes for the others.
- Messages over 4 KB, or more than 40 a second, are dropped. Five consecutive seconds of flooding disconnects the player.
- Room codes are 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
- Re-sync when the sea is more than 1 s behind the room clock for 3 s, or more than 5 s behind at once. Never re-sync before the first catch-up.
- Respawning waits 3 s. Spawns are 6–30 m outside the break line and at least 3 m from others where possible.
- Surf calls: "Left!", "Right!", "Party wave!", "Nice one!" on keys 1–4 (remappable), shown for 2 s. The ride feed shows rides of 3 s or more, for 6 s.
- All player-facing text goes in `src/ui/strings.ts`; UI is native CSS with no framework. The only new runtime dependency is `ws`, on the server only.
- Dev bots only exist with `DEV_TOOLS` and the server's `BOTS=1`.
- Deploys run only after the user's yes, and the Fly.io account is the user's.
- Run tests with `npx vitest run --dir src` and `npx vitest run --dir server`. Other worktrees under `.claude/worktrees/` hold their own tests.

## Review Focus

1. **A tab sent to the background** (throttled animation frames) comes back seconds behind. Expected: one immediate re-sync, never a loop. This is pinned in Task 8's `OnlinePacer` tests (a 30 s gap).
2. **The creator drops and rejoins** with their saved token. Expected: they are still the creator and can kick. Pinned in Task 5's `Room` tests.
3. **Two players with the same name.** Expected: both join; names are not unique. Pinned in Task 5.
4. **An expired or mistyped room link.** Expected: a "This room has closed or doesn't exist" refusal, with no crash and no half-built surf zone. Pinned in Task 5 (registry) and Task 13 (screen model).
5. **A malformed or short binary pose from a buggy or old client.** Expected: it is dropped and the room carries on. Pinned in Task 3 (codec) and Task 5 (room).

---

## File map

| File | Responsibility |
|---|---|
| `src/wave/SurfZoneSimulation.ts` | + `startSeaTime` config: warm start so the spun-up sea sits at a chosen sea time |
| `src/net/roomSea.ts` | A room's `SurfZoneConfig` (shared by the drift report and the game) |
| `scripts/drift-report.ts` | The drift gate: precision, paddler and late-joiner copies compared at the take-off |
| `src/net/protocol.ts` | Room/player types, control messages, limits, parsers (shared with the server) |
| `src/net/roomCode.ts` | Room codes and links |
| `src/net/poseCodec.ts` | The 76-byte pose and the server's bundle |
| `src/net/ClockSync.ts` | Server-clock offset from ping/pong, and room sea time |
| `server/Room.ts`, `server/RoomRegistry.ts` | Rooms, players, relaying, kick, limits (pure, no sockets) |
| `server/staticFiles.ts`, `server/main.ts` | HTTP static serving, WebSocket wiring, ticks |
| `src/physics/PhysicalSurfWater.ts` | + own-reaction tally and remote reactions |
| `src/wave/SurfZoneRunner.ts`, `src/game/SurfZoneHost.ts`, `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneWorkerCore.ts` | + spawn position, retry position, reaction buffers, outstanding steps |
| `src/net/OnlinePacer.ts`, `src/net/spawn.ts` | Steps to follow the room clock; free lineup spots |
| `src/net/NetClient.ts` | WebSocket client: hello, ping, reconnect |
| `src/net/RemoteSurfers.ts` | Remote pose buffers, interpolation, vanish |
| `src/net/ownPose.ts` | The player's pose from a snapshot |
| `src/net/OnlineController.ts` | One online session: client, roster, calls, feed, kick; what the game and UI read |
| `src/scene/RemoteSurferViews.ts` | Boards and skinned surfers for remote players |
| `src/ui/NameTags.ts` | Name tags and call bubbles (HTML overlay) |
| `src/ui/MultiplayerScreen.ts` | Create/join screen |
| `src/ui/OnlineHud.ts` | Ride feed, notices, player list with Kick |
| `src/main.ts`, `src/ui/App.ts`, `src/ui/MainMenu.ts`, `src/ui/PauseMenu.ts`, `src/game/Bindings.ts`, `src/game/Settings.ts`, `src/game/Logbook.ts`, `src/ui/strings.ts` | Wiring |
| `scripts/bot-tracks.ts`, `server/bots.ts` | Dev bots |
| `vite.config.ts`, `src/net/buildId.ts`, `Dockerfile`, `fly.toml`, `.dockerignore` | Build id, dev proxy, deploy |

---

### Task 1: Drift gate

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (config field + constructor)
- Create: `src/net/roomSea.ts`
- Create: `scripts/drift-report.ts`
- Modify: `package.json` (`report:drift`)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/net/roomSea.test.ts`
- Output: `docs/research/drift-report.md`

**Interfaces:**
- Produces: `SurfZoneConfig.startSeaTime?: number`. The spun-up simulation's `seaTime` equals it.
- Produces: `roomSurfZoneConfig(room: { spot: SpotName; conditions: SurfConditions; seed: number }, startSeaTime: number, compute?: 'auto' | 'cpu'): SurfZoneConfig`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/wave/SurfZoneSimulation.test.ts (append)
it('warm-starts so the spun-up sea sits at a chosen sea time', () => {
  const simulation = new SurfZoneSimulation({ ...quickConfig, stage: 1, alongShore: 40, startSeaTime: 500 });
  expect(simulation.seaTime).toBeCloseTo(500, 6);
});
```

```ts
// src/net/roomSea.test.ts
import { describe, expect, it } from 'vitest';
import { roomSurfZoneConfig } from './roomSea';

describe('roomSurfZoneConfig', () => {
  it('builds the same stage 2, 64-component sea for every player', () => {
    const config = roomSurfZoneConfig({ spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, seed: 42 }, 123);
    expect(config).toMatchObject({ spot: 'canyon', seed: 42, stage: 2, compute: 'auto', componentCount: 64, startSeaTime: 123, significantHeight: 1.4, peakPeriod: 11, tide: 0, windSpeed: 0 });
  });
  it('ignores the time of day, which only lights the scene', () => {
    const dawn = roomSurfZoneConfig({ spot: 'point', conditions: { swell: 'small', tide: 'low', wind: 'offshore', time: 'dawn' }, seed: 1 }, 0);
    const dusk = roomSurfZoneConfig({ spot: 'point', conditions: { swell: 'small', tide: 'low', wind: 'offshore', time: 'sunset' }, seed: 1 }, 0);
    expect(dawn).toEqual(dusk);
  });
});
```

(`quickConfig` is whatever the existing SurfZoneSimulation tests already use for a small stage 1 tank. Reuse it; if they build configs inline, copy one.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts src/net/roomSea.test.ts`
Expected: FAIL. `startSeaTime` is ignored (the sea time is the set plan's), and `roomSea` doesn't exist.

- [ ] **Step 3: Implement**

In `SurfZoneConfig` add:

```ts
  /** Online (N1): warm start so the sea, once spun up, sits at this sea time (the room's clock). */
  startSeaTime?: number;
```

In the constructor, replace the two lines that take `this.plan.warmStartSeaTime`:

```ts
    this.seaTimeOffset = config.startSeaTime !== undefined ? config.startSeaTime - spinUp : this.plan.warmStartSeaTime;
    warmStart(this.solver, this.sea, { referenceZ: TANK.zoneInner, seaTime: this.seaTimeOffset });
```

`src/net/roomSea.ts`:

```ts
import { GPU_TIER_COMPONENTS, swellFor } from '../game/PhysicalMode';
import { physicalSettingsFor, type SurfConditions } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** What fixes a room's sea: every player builds it from exactly these. */
export interface RoomSea {
  spot: SpotName;
  conditions: SurfConditions;
  seed: number;
}

/**
 * The surf zone every player in a room builds (spec N1): stage 2 with the GPU
 * tier's 64 components whatever the graphics settings, so the seas match, spun
 * up to sit at `startSeaTime`. `compute` is 'cpu' only for reports in Node.
 */
export function roomSurfZoneConfig(room: RoomSea, startSeaTime: number, compute: 'auto' | 'cpu' = 'auto'): SurfZoneConfig {
  const settings = physicalSettingsFor(room.spot, room.conditions, { stage: 2, compute });
  const swell = swellFor(settings);
  return {
    spot: room.spot,
    seed: room.seed,
    significantHeight: swell.significantHeight,
    peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
    stage: 2,
    compute,
    componentCount: GPU_TIER_COMPONENTS,
    startSeaTime,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts src/net/roomSea.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the drift report**

`scripts/drift-report.ts` builds five copies of the Canyon Medium room sea (seed 7) on the CPU, each as a `SurfZoneRunner`:

| Copy | Built | Difference |
|---|---|---|
| `ref` | at sea time 0 | none |
| `f32` | at sea time 0 | `h`, `qx`, `qz` rounded with `Math.fround` after every step (GPU-like precision) |
| `paddler` | at sea time 0, `{ rider: true }` | driven by `Autopilot`, as in `scripts/ride-report.ts` (copy its view-building) |
| `join` | at `JOIN_AT` = 90 s | default spin-up (2 periods) |
| `joinLong` | at 90 s | `spinUpPeriods: 6` |

All copies step to sea time 240 s. On each step, each copy records breaking **onsets** on three columns: the take-off's `focus.x`, and 20 m either side.
- The column's most seaward cell within [focus.z − 40, focus.z + 30] whose `simulation.breaking.strength` exceeds 0.3 marks where it is breaking.
- An onset is a column going from no breaking to breaking, or its breaking edge jumping more than 3 m seaward.
- Each onset records its sea time and z.

For each comparison (`f32`, `paddler`, `join` and `joinLong` against `ref`, the join copies from 90 s on):
- match each `ref` onset to the other copy's nearest onset on the same column within 2 s;
- report matched and unmatched counts, and the median and maximum |Δt| and |Δz|;
- mark it pass when every onset matched with |Δt| ≤ 0.2 s and |Δz| ≤ 1 m.

Every 10 s, also report the RMS surface difference against `ref` over the fine zone (z ≥ −150), as a fraction of Hs.

The report writes `docs/research/drift-report.md` with the tables, the pass lines and the run's settings. Add to `package.json`:

```json
"report:drift": "rolldown scripts/drift-report.ts -o dist/scripts/drift-report.mjs --format esm --platform node && node dist/scripts/drift-report.mjs"
```

- [ ] **Step 6: Run it** (in the background, about 15 min on the M1 Air)

Run: `npm run report:drift`
Expected: `docs/research/drift-report.md` exists with four comparisons.

- [ ] **Step 7: Commit**

```bash
git add src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts src/net/roomSea.ts src/net/roomSea.test.ts scripts/drift-report.ts package.json docs/research/drift-report.md
git commit -m "feat: measure how far two players' seas drift apart"
```

- [ ] **Step 8: Gate**

Every comparison passes → continue.
- **If the precision or paddler copy fails:** stop and report to the user, with the numbers and options. Tasks 2–6 (protocol, codec, clock, rooms, server) don't depend on the sea and may go on meanwhile. Nothing from Task 7 on starts until the user decides.
- **If only `join` fails and `joinLong` passes:** use the longer spin-up for joins (`spinUpPeriods: 6` in `roomSurfZoneConfig`'s online use), record that, and continue.

---

### Task 2: Protocol, room codes and build id

**Files:**
- Create: `src/net/protocol.ts`, `src/net/roomCode.ts`, `src/net/buildId.ts`
- Test: `src/net/protocol.test.ts`, `src/net/roomCode.test.ts`

**Interfaces:**
- Produces:
  - **Constants:** `ROOM_CAP`, `POSE_HZ`, `MAX_MESSAGE_BYTES`, `MAX_MESSAGES_PER_SECOND`, `FLOOD_SECONDS`, `EMPTY_ROOM_SECONDS`, `SILENT_PLAYER_SECONDS`, `NAME_LENGTH`, `CALLS`, `DEFAULT_ROOM_SETTINGS`.
  - **Types:** `CallId`, `RoomSettings`, `RoomInfo`, `PlayerLook`, `PlayerInfo`, `ClientMessage`, `ServerMessage`, `Refusal`.
  - **Parsers and helpers:** `cleanName`, `parseRoomSettings`, `parseLook`, `parseClientMessage`, `parseServerMessage`, `lookFor(surfer)`, `surferFor(look)`.
- Produces: `newRoomCode(random: (n: number) => Uint8Array): string`, `normalizeRoomCode(raw: string): string | undefined`, `roomCodeFromSearch(search: string): string | undefined`, `roomLink(origin: string, code: string): string`.
- Produces: `BUILD_ID: string` ('dev' outside a Vite build).

- [ ] **Step 1: Write the failing tests**

```ts
// src/net/roomCode.test.ts
import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET, newRoomCode, normalizeRoomCode, roomCodeFromSearch, roomLink } from './roomCode';

const bytes = (...values: number[]) => () => Uint8Array.from(values);

describe('room codes', () => {
  it('draws 8 characters without look-alikes', () => {
    const code = newRoomCode(() => Uint8Array.from({ length: 16 }, (_, i) => i * 13));
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });
  it('rejects bytes that would bias the alphabet', () => {
    // 248..255 are skipped; the next bytes are used.
    const code = newRoomCode(bytes(255, 250, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9));
    expect(code).toBe(ROOM_CODE_ALPHABET.slice(0, 8));
  });
  it('normalizes what a player types or pastes', () => {
    expect(normalizeRoomCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeRoomCode('ABCD')).toBeUndefined();
    expect(normalizeRoomCode('ABCDEFG0')).toBeUndefined();
  });
  it('reads and writes links', () => {
    expect(roomCodeFromSearch('?room=abcd2345')).toBe('ABCD2345');
    expect(roomCodeFromSearch('?physical')).toBeUndefined();
    expect(roomLink('https://example.fly.dev', 'ABCD2345')).toBe('https://example.fly.dev/?room=ABCD2345');
  });
});
```

```ts
// src/net/protocol.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER } from '../game/SurferChoice';
import { cleanName, lookFor, parseClientMessage, parseRoomSettings, surferFor } from './protocol';

describe('protocol', () => {
  it('cleans names: trims, collapses spaces, strips control characters, 16 at most', () => {
    expect(cleanName('  Ana \n  Rita ')).toBe('Ana Rita');
    expect(cleanName('a'.repeat(40))).toHaveLength(16);
    expect(cleanName('   ')).toBeUndefined();
    expect(cleanName(42)).toBeUndefined();
  });
  it('accepts only known spots, conditions and caps', () => {
    const good = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 50 };
    expect(parseRoomSettings(good)).toEqual(good);
    expect(parseRoomSettings({ ...good, cap: 51 })).toBeUndefined();
    expect(parseRoomSettings({ ...good, cap: 1 })).toBeUndefined();
    expect(parseRoomSettings({ ...good, spot: 'bells' })).toBeUndefined();
    expect(parseRoomSettings({ ...good, conditions: { ...good.conditions, swell: 'huge' } })).toBeUndefined();
  });
  it('parses client messages and drops anything else', () => {
    expect(parseClientMessage('{"type":"ping","t":12.5}')).toEqual({ type: 'ping', t: 12.5 });
    expect(parseClientMessage('{"type":"call","call":"party"}')).toEqual({ type: 'call', call: 'party' });
    expect(parseClientMessage('{"type":"call","call":"cowabunga"}')).toBeUndefined();
    expect(parseClientMessage('{"type":"kick","id":"3"}')).toBeUndefined();
    expect(parseClientMessage('not json')).toBeUndefined();
    const join = { type: 'join', build: 'dev', code: 'ABCD2345', name: 'Ana', look: lookFor(DEFAULT_SURFER) };
    expect(parseClientMessage(JSON.stringify(join))).toEqual(join);
  });
  it('turns a look back into a surfer, falling back on unknown parts', () => {
    expect(surferFor({ body: 'surfer9', outfit: 'vest', color: 'coral', board: 'nope' })).toEqual({ ...DEFAULT_SURFER, outfit: 'vest', color: 'coral' });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/net/protocol.test.ts src/net/roomCode.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement**

`src/net/roomCode.ts`:

```ts
/** Room code characters: no 0/O, 1/I/L, so a code read aloud or typed is unambiguous. */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 8;
/** Bytes at or above this would favour the alphabet's first letters (256 = 8 × 31 + 8). */
const UNBIASED = ROOM_CODE_ALPHABET.length * Math.floor(256 / ROOM_CODE_ALPHABET.length);

/** A fresh room code from random bytes (the server's `crypto.getRandomValues`). */
export function newRoomCode(random: (count: number) => Uint8Array): string {
  let code = '';
  while (code.length < ROOM_CODE_LENGTH) {
    for (const byte of random(ROOM_CODE_LENGTH * 2)) {
      if (byte >= UNBIASED) continue;
      code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (code.length === ROOM_CODE_LENGTH) break;
    }
  }
  return code;
}

/** A typed or pasted code, upper-cased without spaces or dashes; undefined unless it is a valid code. */
export function normalizeRoomCode(raw: string): string | undefined {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return undefined;
  for (const character of code) if (!ROOM_CODE_ALPHABET.includes(character)) return undefined;
  return code;
}

/** The room a link names (`?room=CODE`). */
export function roomCodeFromSearch(search: string): string | undefined {
  const raw = new URLSearchParams(search).get('room');
  return raw ? normalizeRoomCode(raw) : undefined;
}

export function roomLink(origin: string, code: string): string {
  return `${origin}/?room=${code}`;
}
```

`src/net/buildId.ts`:

```ts
declare const __BUILD_ID__: string | undefined;

/** The build this page came from (the Vite config stamps it; 'dev' elsewhere). A room only takes players on its own build. */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
```

`src/net/protocol.ts` holds everything in the Interfaces list. The shapes:

```ts
import { DEFAULT_SURFER, sanitizeSurfer, type SurferSettings } from '../game/SurferChoice';
import type { SurfConditions, SwellSize, TideLevel, TimeOfDay, WindKind } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';

export const ROOM_CAP = { min: 2, max: 50 } as const;
export const POSE_HZ = 20;
export const MAX_MESSAGE_BYTES = 4096;
export const MAX_MESSAGES_PER_SECOND = 40;
export const FLOOD_SECONDS = 5;
export const EMPTY_ROOM_SECONDS = 300;
export const SILENT_PLAYER_SECONDS = 5;
export const NAME_LENGTH = 16;
export const CALLS = ['left', 'right', 'party', 'nice'] as const;
export type CallId = (typeof CALLS)[number];

const SPOTS: readonly SpotName[] = ['beach', 'point', 'reef', 'canyon'];
const SWELLS: readonly SwellSize[] = ['practice', 'small', 'medium', 'big'];
const TIDES: readonly TideLevel[] = ['low', 'mid', 'high'];
const WINDS: readonly WindKind[] = ['offshore', 'calm', 'onshore'];
const TIMES: readonly TimeOfDay[] = ['dawn', 'midday', 'sunset'];

export interface RoomSettings { spot: SpotName; conditions: SurfConditions; cap: number }
export const DEFAULT_ROOM_SETTINGS: RoomSettings = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 50 };

/** A running room: its settings, the sea's seed, the build it runs, and its clock (server ms at creation, and the sea time then). */
export interface RoomInfo extends RoomSettings { code: string; seed: number; build: string; seaTimeAtCreate: number; createdAt: number }

/** A surfer's looks as sent: plain strings, checked by `surferFor` on arrival. */
export interface PlayerLook { body: string; outfit: string; color: string; board: string }
export interface PlayerInfo { id: number; name: string; look: PlayerLook }

export type Refusal = 'full' | 'version' | 'notFound' | 'kicked' | 'invalid';

export type ClientMessage =
  | { type: 'create'; build: string; settings: RoomSettings; name: string; look: PlayerLook; bots?: number }
  | { type: 'join'; build: string; code: string; name: string; look: PlayerLook; token?: string }
  | { type: 'ping'; t: number }
  | { type: 'call'; call: CallId }
  | { type: 'ride'; distance: number; seconds: number }
  | { type: 'kick'; id: number };

export type ServerMessage =
  | { type: 'welcome'; room: RoomInfo; you: number; token: string; creator: boolean; players: PlayerInfo[] }
  | { type: 'joined'; player: PlayerInfo }
  | { type: 'left'; id: number }
  | { type: 'pong'; t: number; server: number }
  | { type: 'call'; id: number; call: CallId }
  | { type: 'ride'; id: number; distance: number; seconds: number }
  | { type: 'refused'; reason: Refusal };
```

Parsers:
- `cleanName`: string only; strip `[\u0000-\u001f\u007f]`; collapse whitespace; trim; slice(0, 16); empty → undefined.
- `parseRoomSettings`: exact membership in the lists; `cap` an integer within `ROOM_CAP`.
- `parseLook`: four strings of at most 32 characters each.
- `parseClientMessage`: `JSON.parse` in a try block, then a switch on `type`:
  - `ping.t` must be a finite number;
  - `call.call` must be in `CALLS`;
  - `ride` needs finite, non-negative `distance` and `seconds`;
  - `kick.id` must be an integer;
  - `create` needs `build` (a string of at most 64 characters), `settings` (via `parseRoomSettings`), `name` (via `cleanName`) and `look` (via `parseLook`), plus an optional `bots` integer 0–49;
  - `join` needs `code` (via `normalizeRoomCode`) and an optional `token` of 32 hex characters.
  - Anything else returns undefined.
- `parseServerMessage`: `JSON.parse` in a try block; returns the object when it has a string `type`. The server is trusted.
- `lookFor(surfer)`: copies the four fields.
- `surferFor(look)`: returns `sanitizeSurfer(look, DEFAULT_SURFER)`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/protocol.test.ts src/net/roomCode.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/protocol.ts src/net/protocol.test.ts src/net/roomCode.ts src/net/roomCode.test.ts src/net/buildId.ts
git commit -m "feat: describe online rooms, players and their messages"
```

---

### Task 3: Pose codec

**Files:**
- Create: `src/net/poseCodec.ts`
- Test: `src/net/poseCodec.test.ts`

**Interfaces:**
- Produces:
  - `POSE_BYTES = 76` and `BUNDLE_KIND = 1`.
  - `SurferPose { step; x; z; lift; qx; qy; qz; qw; points: Float32Array(21); phase: number (-1 = no rider); present; boardPresent; paddling; heading; reaction: { x; z; jx; jz } }`.
  - `createPose()`, `encodePose(pose, view, offset)`, `decodePose(view, offset, out)`.
  - `encodeBundle(entries: { id: number; pose: Uint8Array }[]): Uint8Array` and `readBundle(data: ArrayBuffer, visit: (id: number, view: DataView, offset: number) => void): number`.

Layout (little-endian):

| Offset | Size | Field |
|---|---|---|
| 0 | u32 | `step` |
| 4 | i16 ×2 | `x`, `z` (cm) |
| 8 | i16 | `lift` (mm) |
| 10 | i16 ×4 | quaternion ×32767 |
| 18 | i16 ×21 | `points` relative to the board (cm) |
| 60 | u8 | `phase` (255 = no rider) |
| 61 | u8 | flags: 1 = present, 2 = board, 4 = paddling |
| 62 | i16 | `heading` ×10000 |
| 64 | i16 ×2 | reaction x, z (cm) |
| 68 | f32 ×2 | reaction jx, jz (N·s) |

Everything is clamped to its integer range.

Bundle: u8 kind, u8 0, u16 count, then per entry u16 id followed by 76 pose bytes.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { POSE_BYTES, createPose, decodePose, encodeBundle, encodePose, readBundle } from './poseCodec';

function samplePose() {
  const pose = createPose();
  Object.assign(pose, { step: 123456, x: -42.37, z: -101.25, lift: -0.043, qx: 0.1, qy: 0.7, qz: -0.1, qw: 0.7, phase: 3, present: true, boardPresent: true, paddling: false, heading: -2.5 });
  for (let i = 0; i < 21; i += 1) pose.points[i] = Math.sin(i) * 1.2;
  pose.reaction = { x: -41.9, z: -100.8, jx: 12.5, jz: -3.25 };
  return pose;
}

describe('pose codec', () => {
  it('round-trips a pose within its quantisation', () => {
    const bytes = new Uint8Array(POSE_BYTES);
    encodePose(samplePose(), new DataView(bytes.buffer), 0);
    const back = decodePose(new DataView(bytes.buffer), 0, createPose());
    const pose = samplePose();
    expect(back.step).toBe(pose.step);
    expect(back.x).toBeCloseTo(pose.x, 2);
    expect(back.z).toBeCloseTo(pose.z, 2);
    expect(back.lift).toBeCloseTo(pose.lift, 3);
    expect(back.qy).toBeCloseTo(pose.qy / Math.hypot(pose.qx, pose.qy, pose.qz, pose.qw), 4);
    for (let i = 0; i < 21; i += 1) expect(Math.abs(back.points[i] - pose.points[i])).toBeLessThanOrEqual(0.005);
    expect(back).toMatchObject({ phase: 3, present: true, boardPresent: true, paddling: false });
    expect(back.heading).toBeCloseTo(-2.5, 3);
    expect(back.reaction.jx).toBeCloseTo(12.5, 4);
  });
  it('clamps values beyond the range instead of wrapping', () => {
    const pose = samplePose();
    pose.x = 1e6;
    const bytes = new Uint8Array(POSE_BYTES);
    encodePose(pose, new DataView(bytes.buffer), 0);
    expect(decodePose(new DataView(bytes.buffer), 0, createPose()).x).toBeCloseTo(327.67, 2);
  });
  it('marks a pose without a rider', () => {
    const pose = samplePose();
    pose.phase = -1;
    pose.present = false;
    const bytes = new Uint8Array(POSE_BYTES);
    encodePose(pose, new DataView(bytes.buffer), 0);
    expect(decodePose(new DataView(bytes.buffer), 0, createPose())).toMatchObject({ phase: -1, present: false });
  });
  it('bundles poses by player id', () => {
    const a = new Uint8Array(POSE_BYTES).fill(1);
    const b = new Uint8Array(POSE_BYTES).fill(2);
    const bundle = encodeBundle([{ id: 7, pose: a }, { id: 300, pose: b }]);
    const seen: [number, number][] = [];
    const count = readBundle(bundle.buffer as ArrayBuffer, (id, view, offset) => seen.push([id, view.getUint8(offset)]));
    expect(count).toBe(2);
    expect(seen).toEqual([[7, 1], [300, 2]]);
  });
  it('reads nothing from a malformed bundle', () => {
    const visit = () => { throw new Error('visited'); };
    expect(readBundle(new Uint8Array([9, 0, 1, 0]).buffer, visit)).toBe(0);
    expect(readBundle(new Uint8Array([1, 0, 5, 0, 1, 2]).buffer, visit)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/net/poseCodec.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Implement** `src/net/poseCodec.ts` with the table's layout:
- An `i16(value)` helper does `Math.max(-32768, Math.min(32767, Math.round(value)))`.
- The quaternion is normalised before encoding.
- `readBundle` returns 0 without visiting unless the kind is 1 and `byteLength === 4 + count * (2 + POSE_BYTES)`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/poseCodec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/poseCodec.ts src/net/poseCodec.test.ts
git commit -m "feat: pack a surfer's pose into 76 bytes"
```

---

### Task 4: Clock sync

**Files:**
- Create: `src/net/ClockSync.ts`
- Test: `src/net/ClockSync.test.ts`

**Interfaces:**
- Produces: `ClockSync` with `add(sentAt, server, receivedAt)`, `ready`, `offset`, `rtt` and `serverNow(localNow)`.
- Produces: `roomSeaTime(room: Pick<RoomInfo, 'seaTimeAtCreate' | 'createdAt'>, serverNow: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { ClockSync, roomSeaTime } from './ClockSync';

describe('ClockSync', () => {
  it('estimates the server clock from the quickest round trip', () => {
    const clock = new ClockSync();
    // The server runs 5000 ms ahead. A slow sample (asymmetric: 180 ms out, 20 back) misleads by 80 ms.
    clock.add(1000, 1000 + 5000 + 180, 1200);
    clock.add(2000, 2000 + 5000 + 10, 2020);
    expect(clock.rtt).toBe(20);
    expect(clock.offset).toBeCloseTo(5000, 6);
    expect(clock.serverNow(3000)).toBeCloseTo(8000, 6);
  });
  it('keeps only recent samples', () => {
    const clock = new ClockSync(2);
    clock.add(0, 100, 2);
    clock.add(10, 5110, 30);
    clock.add(20, 5120, 40);
    expect(clock.offset).toBeCloseTo(5090, 6);
  });
  it('ignores a pong that arrives before its ping', () => {
    const clock = new ClockSync();
    clock.add(100, 0, 50);
    expect(clock.ready).toBe(false);
  });
  it('tells the room sea time from the server clock', () => {
    expect(roomSeaTime({ seaTimeAtCreate: 30, createdAt: 10_000 }, 12_500)).toBeCloseTo(32.5, 9);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/net/ClockSync.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Implement**

```ts
import type { RoomInfo } from './protocol';

/**
 * The server's clock seen from this page (spec N1), NTP-style: each ping/pong
 * gives offset = server + rtt/2 − received. The quickest recent round trip is
 * trusted most, since its halves can differ least.
 */
export class ClockSync {
  private readonly samples: { offset: number; rtt: number }[] = [];

  constructor(private readonly keep = 8) {}

  add(sentAt: number, server: number, receivedAt: number): void {
    const rtt = receivedAt - sentAt;
    if (!(rtt >= 0) || !Number.isFinite(server)) return;
    this.samples.push({ offset: server + rtt / 2 - receivedAt, rtt });
    if (this.samples.length > this.keep) this.samples.shift();
  }

  get ready(): boolean {
    return this.samples.length > 0;
  }

  private get best(): { offset: number; rtt: number } | undefined {
    let best: { offset: number; rtt: number } | undefined;
    for (const sample of this.samples) if (!best || sample.rtt < best.rtt) best = sample;
    return best;
  }

  /** Server ms minus local ms. */
  get offset(): number {
    return this.best?.offset ?? 0;
  }

  get rtt(): number {
    return this.best?.rtt ?? Number.NaN;
  }

  serverNow(localNow: number): number {
    return localNow + this.offset;
  }
}

/** The room's sea time, s, at a server time, ms. */
export function roomSeaTime(room: Pick<RoomInfo, 'seaTimeAtCreate' | 'createdAt'>, serverNow: number): number {
  return room.seaTimeAtCreate + (serverNow - room.createdAt) / 1000;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/ClockSync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/ClockSync.ts src/net/ClockSync.test.ts
git commit -m "feat: follow the server's clock from ping and pong"
```

---

### Task 5: Rooms and the registry (pure)

**Files:**
- Create: `server/Room.ts`, `server/RoomRegistry.ts`, `server/tsconfig.json`
- Test: `server/RoomRegistry.test.ts`
- Modify: `package.json` (devDependencies `@types/node`, `@types/ws`; dependency `ws`)

**Interfaces:**
- Consumes (from Tasks 2–3): `protocol.ts`, `newRoomCode`, `POSE_BYTES`, `encodeBundle`.
- Produces:
  - `Connection { sendText(text: string): void; sendBinary(data: Uint8Array): void; close(): void }`.
  - `RoomRegistry(options: { build: string; now: () => number; random: (n: number) => Uint8Array; seed?: () => number; bots?: BotSource })`.
  - Registry methods: `connect(conn): ServerSession`, `tick(): void`, `sweep(): void`, `rooms: Map<string, Room>`.
  - `ServerSession`: `text(data: string)`, `binary(data: Uint8Array)`, `close()`.

Behaviour:
- **Hello:** the first valid message must be `create` or `join`. Anything else is ignored until then.
- **`create`:**
  - A build other than the registry's is refused with `version`.
  - Otherwise it makes a room with a fresh code, a seed from 1–9999, `seaTimeAtCreate` 0 and `createdAt = now()`. The creator gets a new 32-hex token and becomes a player.
  - `bots` is honoured only when the registry has a bot source (Task 15).
- **`join`:**
  - An unknown code → `notFound`.
  - A build other than the room's → `version`.
  - A banned token → `kicked`.
  - Players ≥ cap → `full`.
  - Otherwise a new player id, reusing the token when one was given. The player is the creator when the token equals the room's creator token.
- **Replies to a new player:** a `welcome` to them with the room, their id and token, `creator`, and the other players; a `joined` to the rest.
- **Relaying:**
  - `ping` → `pong` with `t` echoed and `server: now()`.
  - `call` → relayed to everyone, sender included.
  - `ride` → relayed to everyone, only if `seconds ≥ 3`.
  - `kick` from the creator → the target gets `refused: kicked` and is closed and removed, its token is banned, and the others get `left`. A kick from anyone else is ignored.
- **Binary:** exactly `POSE_BYTES` long, from a player → stored as that player's latest pose, with `lastPoseAt = now()`. Any other length is dropped.
- **`tick()`:** each player gets a bundle of the other players' latest poses heard within `SILENT_PLAYER_SECONDS`. Nothing is sent when there are none. Each pose is sent once (a fresh flag is cleared after the tick).
- **Limits:**
  - Text over `MAX_MESSAGE_BYTES` is dropped.
  - Each session counts messages per wall-clock second; above 40 they are dropped.
  - After `FLOOD_SECONDS` consecutive flooded seconds the session is closed.
- **`close()`:** the player is removed and the others get `left`. An emptied room records `emptySince = now()`.
- **`sweep()`:** deletes rooms empty for `EMPTY_ROOM_SECONDS`.

- [ ] **Step 1: Write the failing tests** (`server/RoomRegistry.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { lookFor, type ServerMessage } from '../src/net/protocol';
import { DEFAULT_SURFER } from '../src/game/SurferChoice';
import { POSE_BYTES, readBundle } from '../src/net/poseCodec';
import { RoomRegistry, type Connection } from './RoomRegistry';

class FakeConnection implements Connection {
  texts: ServerMessage[] = [];
  bundles: Uint8Array[] = [];
  closed = false;
  sendText(text: string) { this.texts.push(JSON.parse(text)); }
  sendBinary(data: Uint8Array) { this.bundles.push(data); }
  close() { this.closed = true; }
  last<T extends ServerMessage['type']>(type: T) { return this.texts.filter((m) => m.type === type).at(-1) as Extract<ServerMessage, { type: T }> | undefined; }
}

const look = lookFor(DEFAULT_SURFER);
const settings = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 3 };

function setup() {
  let now = 1_000_000;
  let counter = 0;
  const registry = new RoomRegistry({ build: 'b1', now: () => now, random: (n) => Uint8Array.from({ length: n }, () => (counter++ * 37) % 248), seed: () => 7 });
  const open = () => { const conn = new FakeConnection(); return { conn, session: registry.connect(conn) }; };
  const create = (name = 'Ana') => {
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings, name, look }));
    return a;
  };
  const join = (code: string, name = 'Bea', token?: string, build = 'b1') => {
    const b = open();
    b.session.text(JSON.stringify({ type: 'join', build, code, name, look, ...(token ? { token } : {}) }));
    return b;
  };
  return { registry, open, create, join, advance: (ms: number) => { now += ms; } };
}

describe('RoomRegistry', () => {
  it('creates a room and welcomes its creator', () => {
    const { create } = setup();
    const { conn } = create();
    const welcome = conn.last('welcome')!;
    expect(welcome.creator).toBe(true);
    expect(welcome.room).toMatchObject({ spot: 'canyon', cap: 3, seed: 7, build: 'b1', seaTimeAtCreate: 0, createdAt: 1_000_000 });
    expect(welcome.room.code).toMatch(/^[23456789A-HJKMNP-Z]{8}$/);
    expect(welcome.token).toMatch(/^[0-9a-f]{32}$/);
  });
  it('lets friends join by code, and tells everyone', () => {
    const { create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    expect(b.conn.last('welcome')!.players.map((p) => p.name)).toEqual(['Ana']);
    expect(a.conn.last('joined')!.player.name).toBe('Bea');
  });
  it('allows two players with the same name', () => {
    const { create, join } = setup();
    const a = create('Ana');
    const b = join(a.conn.last('welcome')!.room.code, 'Ana');
    expect(b.conn.last('welcome')).toBeDefined();
  });
  it('refuses unknown codes, other builds and full rooms', () => {
    const { create, join } = setup();
    expect(join('ABCD2345').conn.last('refused')!.reason).toBe('notFound');
    const code = create().conn.last('welcome')!.room.code;
    expect(join(code, 'x', undefined, 'b2').conn.last('refused')!.reason).toBe('version');
    join(code, 'b');
    join(code, 'c');
    expect(join(code, 'd').conn.last('refused')!.reason).toBe('full');
  });
  it('refuses to create a room on another build', () => {
    const { open } = setup();
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'old', settings, name: 'Ana', look }));
    expect(a.conn.last('refused')!.reason).toBe('version');
  });
  it('relays poses as bundles of the others, once each', () => {
    const { registry, create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    a.session.binary(new Uint8Array(POSE_BYTES).fill(5));
    registry.tick();
    expect(a.conn.bundles).toHaveLength(0);
    expect(b.conn.bundles).toHaveLength(1);
    const ids: number[] = [];
    readBundle(b.conn.bundles[0].slice().buffer, (id) => ids.push(id));
    expect(ids).toEqual([a.conn.last('welcome')!.you]);
    registry.tick();
    expect(b.conn.bundles).toHaveLength(1);
  });
  it('drops malformed poses', () => {
    const { registry, create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    a.session.binary(new Uint8Array(POSE_BYTES - 1));
    registry.tick();
    expect(b.conn.bundles).toHaveLength(0);
  });
  it('answers pings with the server clock', () => {
    const { create } = setup();
    const a = create();
    a.session.text('{"type":"ping","t":42}');
    expect(a.conn.last('pong')).toEqual({ type: 'pong', t: 42, server: 1_000_000 });
  });
  it('relays calls and rides of 3 s or more', () => {
    const { create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    a.session.text('{"type":"call","call":"party"}');
    expect(b.conn.last('call')).toMatchObject({ call: 'party' });
    a.session.text('{"type":"ride","distance":40,"seconds":2.5}');
    expect(b.conn.last('ride')).toBeUndefined();
    a.session.text('{"type":"ride","distance":40,"seconds":6}');
    expect(b.conn.last('ride')).toMatchObject({ distance: 40, seconds: 6 });
  });
  it('lets only the creator kick, and keeps the kicked player out', () => {
    const { create, join } = setup();
    const a = create();
    const code = a.conn.last('welcome')!.room.code;
    const b = join(code);
    const c = join(code, 'Cai');
    const bId = b.conn.last('welcome')!.you;
    c.session.text(JSON.stringify({ type: 'kick', id: a.conn.last('welcome')!.you }));
    expect(a.conn.closed).toBe(false);
    a.session.text(JSON.stringify({ type: 'kick', id: bId }));
    expect(b.conn.last('refused')!.reason).toBe('kicked');
    expect(b.conn.closed).toBe(true);
    expect(c.conn.last('left')).toEqual({ type: 'left', id: bId });
    expect(join(code, 'Bea', b.conn.last('welcome')!.token).conn.last('refused')!.reason).toBe('kicked');
  });
  it('keeps the creator the creator when they rejoin with their token', () => {
    const { create, join } = setup();
    const a = create();
    const { code } = a.conn.last('welcome')!.room;
    const token = a.conn.last('welcome')!.token;
    join(code, 'Bea');
    a.session.close();
    const again = join(code, 'Ana', token);
    expect(again.conn.last('welcome')!.creator).toBe(true);
  });
  it('closes a room 5 minutes after it empties', () => {
    const { registry, create, advance } = setup();
    const a = create();
    a.session.close();
    advance(299_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(1);
    advance(2_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(0);
  });
  it('drops a flood, then disconnects a flooder', () => {
    const { create, advance } = setup();
    const a = create();
    for (let second = 0; second < 5; second += 1) {
      for (let i = 0; i < 60; i += 1) a.session.text('{"type":"ping","t":1}');
      advance(1000);
    }
    a.session.text('{"type":"ping","t":1}');
    expect(a.conn.closed).toBe(true);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run --dir server`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement** `server/Room.ts` (Room, Player) and `server/RoomRegistry.ts` (registry, session, rate window) to the behaviour above.
- Tokens are the hex of `random(16)`.
- Player ids count up per room from 1 and fit a u16.

`server/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": { "types": ["node"], "noEmit": true },
  "include": ["./**/*.ts", "../src/net/**/*.ts", "../src/vite-env.d.ts"]
}
```

Install: `npm install ws` and `npm install -D @types/ws @types/node`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run --dir server && npx tsc -p server/tsconfig.json`
Expected: PASS, with no type errors.

- [ ] **Step 5: Commit**

```bash
git add server package.json package-lock.json
git commit -m "feat: hold online rooms and relay their surfers"
```

---

### Task 6: The server process and the dev proxy

**Files:**
- Create: `server/staticFiles.ts`, `server/main.ts`, `vite.config.ts`
- Test: `server/main.test.ts` (real sockets on port 0)
- Modify: `package.json` (`server`, `build:server`, `typecheck:server`)

**Interfaces:**
- Produces: `startServer(options: { port: number; root: string; build?: string; bots?: BotSource }): Promise<{ port: number; close(): Promise<void> }>`.
- Produces: a `serveStatic(root, request, response)` helper.
  - It serves files under `root` only, with no path traversal.
  - `/` maps to `index.html`.
  - Files under `/assets/` get `Cache-Control: public, max-age=31536000, immutable`; everything else gets `no-cache`.
  - Unknown paths get 404.
  - MIME types cover html, js, css, json, glb, ktx2, png, jpg, hdr, wasm, svg, ico, mp3/m4a/ogg/wav.
- Produces: `readBuild(root)`. It reads `dist/build.json` `{ build }`, or returns 'dev'.
- Produces: `vite.config.ts`, which:
  - defines `__BUILD_ID__` (`process.env.BUILD_ID`, else the short git hash on a build, else 'dev' when serving);
  - emits `build.json` on build;
  - proxies `/ws` to `ws://localhost:8787`.

- [ ] **Step 1: Write the failing integration test**

```ts
// server/main.test.ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { DEFAULT_SURFER } from '../src/game/SurferChoice';
import { lookFor, type ServerMessage } from '../src/net/protocol';
import { startServer } from './main';

const servers: { close(): Promise<void> }[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => s.close())); });

function nextMessage(socket: WebSocket, type: ServerMessage['type']): Promise<ServerMessage> {
  return new Promise((resolve) => socket.on('message', (data, binary) => {
    if (binary) return;
    const message = JSON.parse(String(data)) as ServerMessage;
    if (message.type === type) resolve(message);
  }));
}

describe('server', () => {
  it('serves the game and runs a room over WebSockets', async () => {
    const root = mkdtempSync(join(tmpdir(), 'breakline-'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>Breakline</title>');
    writeFileSync(join(root, 'build.json'), JSON.stringify({ build: 'b9' }));
    const server = await startServer({ port: 0, root });
    servers.push(server);
    const page = await fetch(`http://localhost:${server.port}/`);
    expect(await page.text()).toContain('Breakline');
    expect((await fetch(`http://localhost:${server.port}/../package.json`)).status).toBe(404);

    const a = new WebSocket(`ws://localhost:${server.port}/ws`);
    await new Promise((resolve) => a.on('open', resolve));
    const welcomed = nextMessage(a, 'welcome');
    a.send(JSON.stringify({ type: 'create', build: 'b9', settings: { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 50 }, name: 'Ana', look: lookFor(DEFAULT_SURFER) }));
    const welcome = await welcomed as Extract<ServerMessage, { type: 'welcome' }>;
    expect(welcome.room.build).toBe('b9');
    a.close();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run server/main.test.ts`
Expected: FAIL (`./main` doesn't exist).

- [ ] **Step 3: Implement** `server/staticFiles.ts` and `server/main.ts`.
- `WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES })`.
- Per socket: a `Connection` adapter, `binaryType = 'nodebuffer'`, and `message` routed to `session.text` or `session.binary`. A `Buffer` becomes a `Uint8Array` view.
- `registry.tick()` every 50 ms, and `registry.sweep()` every 10 s.
- When run directly (`import.meta.url === pathToFileURL(process.argv[1]).href`), it starts on `PORT` (default 8787) with `STATIC_DIR` (default `dist`), and `BOTS=1` enables bots (Task 15).

Then add `vite.config.ts` and the `package.json` scripts:

```json
"server": "npm run build:server && node dist-server/server.mjs",
"build:server": "tsc -p server/tsconfig.json && rolldown server/main.ts -o dist-server/server.mjs --format esm --platform node --external ws",
"typecheck:server": "tsc -p server/tsconfig.json"
```

Add `dist-server/` to `.gitignore`.

- [ ] **Step 4: Run the tests, the build, and a manual check**

Run: `npx vitest run --dir server && npm run build && npm run build:server`
Expected: PASS, and `dist/build.json` exists.

Then `PORT=8787 node dist-server/server.mjs` in the background, and `curl -s localhost:8787/ | head -3`.
Expected: the game's `index.html`.

- [ ] **Step 5: Commit**

```bash
git add server vite.config.ts package.json package-lock.json .gitignore src/vite-env.d.ts
git commit -m "feat: serve the game and its rooms from one Node process"
```

---

### Task 7: Surf zone hooks for online play

**Files:**
- Modify: `src/physics/PhysicalSurfWater.ts` (tally + `applyRemoteReaction` + `drainReaction`)
- Modify: `src/wave/SurfZoneRunner.ts` (`spawnAlong`/`spawnOut` options, `RideRequest.spawnAt`, `reaction` buffer, `advance(steps, input, reactions?)`)
- Modify: `src/game/SurfZoneHost.ts`, `src/game/SurfZoneWorkerCore.ts`, `src/game/WorkerSurfZone.ts` (reactions passed through, `outstandingSteps`, `maxQueuedSteps`)
- Modify: `src/game/PhysicalMode.ts` (`retry(spawnAt?)`, `advance(steps, input, reactions?)`)
- Test: `src/physics/PhysicalSurfWater.test.ts`, `src/wave/SurfZoneRunner.test.ts`, `src/game/WorkerSurfZone.test.ts`

**Interfaces:**
- Produces:
  - `PhysicalSurfWater.drainReaction(out: Float64Array): void` writes `[x, z, jx, jz]`: the impulse-weighted mean point and the summed horizontal impulse since the last drain, or zeros.
  - `PhysicalSurfWater.applyRemoteReaction(x, z, jx, jz): void` pushes the water without tallying.
- Produces: `SurfZoneBuffers.reaction: Float64Array(4)` and `REACTION_STRIDE = 4`.
- Produces:
  - `SurfZoneRunnerOptions.spawnAlong?: number` and `spawnOut?: number`: metres along shore from the take-off, and seaward of the break line.
  - `RideRequest.spawnAt?: { x: number; z: number }`, used with `retry`.
- Produces:
  - `SurfZoneHost.advance(steps, input?, reactions?: Float32Array)`.
  - `SurfZoneHost.outstandingSteps: number` (always 0 for `LocalSurfZone`).
  - `WorkerSurfZone` gains an options argument `{ maxQueuedSteps?: number }`.
  - The worker's `advance` request gains `reactions?: Float32Array`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/physics/PhysicalSurfWater.test.ts (append; reuse the file's small solver fixture)
it('tallies its own reactions for the network, but not remote ones', () => {
  const water = makeWater();           // the file's existing helper building a PhysicalSurfWater on a small wet tank
  water.addReaction(2, -10, 0, 0, 0);
  water.addReaction(4, -10, 6, 0, 0);
  water.addReaction(4, -10, 0, 5, 2);
  water.applyRemoteReaction(3, -10, 100, 100);
  const out = new Float64Array(4);
  water.drainReaction(out);
  expect(out[2]).toBeCloseTo(6, 9);
  expect(out[3]).toBeCloseTo(2, 9);
  expect(out[0]).toBeCloseTo(4, 9);   // weighted by |J| horizontal
  water.drainReaction(out);
  expect([...out]).toEqual([0, 0, 0, 0]);
});
it('pushes the water with a remote reaction', () => {
  const water = makeWater();
  const before = solverOf(water).qx.slice();
  water.applyRemoteReaction(3, -10, 50, 0);
  expect(solverOf(water).qx.some((q, i) => q !== before[i])).toBe(true);
});
```

```ts
// src/wave/SurfZoneRunner.test.ts (append; the file already builds small runners)
it('spawns the rider where asked, relative to the take-off', () => {
  const runner = new SurfZoneRunner(smallConfig, { rider: true, spawnAlong: 12, spawnOut: 20 });
  const buffers = runner.createBuffers();
  runner.fill(buffers);
  expect(buffers.board[0]).toBeCloseTo(runner.focus.x + 12, 0);
  expect(buffers.board[2]).toBeCloseTo(runner.focus.z - 20, 0);
});
it('respawns at a given spot on retry', () => {
  const runner = new SurfZoneRunner(smallConfig, { rider: true });
  runner.advance(1, { paddle: false, popUp: false, steer: 0, retry: true, spawnAt: { x: runner.focus.x - 9, z: runner.focus.z - 15 } });
  const buffers = runner.createBuffers();
  runner.fill(buffers);
  expect(buffers.board[0]).toBeCloseTo(runner.focus.x - 9, 0);
});
it('reports the board\'s push on the water in each snapshot', () => {
  const runner = new SurfZoneRunner(smallConfig, { rider: true });
  runner.advance(30, { paddle: true, popUp: false, steer: 0, retry: false });
  const buffers = runner.createBuffers();
  runner.fill(buffers);
  expect(Math.hypot(buffers.reaction[2], buffers.reaction[3])).toBeGreaterThan(0);
});
```

```ts
// src/game/WorkerSurfZone.test.ts (append; the file has a fake port)
it('counts steps asked for but not yet shown, and passes remote reactions on', () => {
  // start, answer ready; advance(10, input, Float32Array.of(1, 2, 3, 4)) → one request in flight with 10 steps and those reactions;
  // advance(5, undefined, Float32Array.of(5, 6, 7, 8)) → outstandingSteps 15; the snapshot arrives → the next request carries 5 steps and [5,6,7,8]; outstandingSteps 5.
});
it('queues up to maxQueuedSteps', () => {
  // new WorkerSurfZone(config, port, {}, { maxQueuedSteps: 90 }); two advances of 60 while in flight → pending 90.
});
```

(Write these two WorkerSurfZone tests out in full, in the file's existing fake-port style.)

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/physics/PhysicalSurfWater.test.ts src/wave/SurfZoneRunner.test.ts src/game/WorkerSurfZone.test.ts`
Expected: FAIL (the methods and options don't exist).

- [ ] **Step 3: Implement**
- **`PhysicalSurfWater`:** move the momentum push into `private push(x, z, jx, jz)`.
  - `addReaction` tallies (`weight += hypot(jx, jz)`, then `x += x·w`, `z += z·w`, `jx += jx`, `jz += jz`), counts the vertical impulse as now, and calls `push`.
  - `applyRemoteReaction` calls `push` only.
  - `drainReaction` divides the point by the weight (zeros when the weight is 0) and resets the tally.
- **`SurfZoneRunner`:**
  - The constructor's `rideLineup` is `focus + (spawnAlong ?? 0, spawnOut ?? RIDE_LINEUP_OFFSET)`.
  - On a retry carrying `spawnAt`, `rideLineup.set(spawnAt.x, 0, spawnAt.z)` happens before `launchRide()`.
  - `advance`/`advanceAsync(steps, input, reactions?)` applies `reactions` (stride 4) through `water.applyRemoteReaction` before the first step.
  - `fill` calls `this.water.drainReaction(buffers.reaction)`, and `createBuffers` adds `reaction: new Float64Array(4)`.
- **The host and worker:**
  - `transferables` and `emptyLike` include `reaction`.
  - The core passes `request.reactions` to the runner.
  - `WorkerSurfZone` keeps `pendingReactions: number[]`, appended on `advance` and sent and cleared on flush. It tracks `inFlightSteps` and exposes `outstandingSteps = pending + inFlightSteps`, with the queue cap from options (default `MAX_QUEUED_STEPS`).
  - `LocalSurfZone.advance` passes the reactions straight through.
- **`PhysicalMode`:** `retry(spawnAt?)` stores the position; `advance(steps, input?, reactions?)` forwards `spawnAt` with the retry and the reactions to the host.

- [ ] **Step 4: Run the tests** (the whole `src` suite, because the buffers changed)

Run: `npx vitest run --dir src`
Expected: PASS (768 + new).

- [ ] **Step 5: Commit**

```bash
git add src/physics src/wave/SurfZoneRunner.ts src/wave/SurfZoneRunner.test.ts src/game
git commit -m "feat: let the surf zone spawn where asked and trade water pushes"
```

---

### Task 8: Pacing to the room clock, and free lineup spots

**Files:**
- Create: `src/net/OnlinePacer.ts`, `src/net/spawn.ts`
- Test: `src/net/OnlinePacer.test.ts`, `src/net/spawn.test.ts`

**Interfaces:**
- Produces:
  - `OnlinePacer` with `reset()` and `next(target: number, shown: number, outstanding: number, dt: number): { steps: number; resync: boolean; caughtUp: boolean }`.
  - Constants `RESYNC_BEHIND = 1`, `RESYNC_AFTER = 3`, `RESYNC_JUMP = 5`, `MAX_ONLINE_BATCH = 30`, `ONLINE_QUEUE = 90`.
- Produces: `chooseSpawn(area: { focusX: number; focusZ: number; xMin: number; xMax: number }, others: readonly { x: number; z: number }[], random?: () => number): { x: number; z: number }` and `SPAWN_CLEARANCE = 3`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/net/OnlinePacer.test.ts
import { describe, expect, it } from 'vitest';
import { MAX_ONLINE_BATCH, OnlinePacer } from './OnlinePacer';

const STEP = 1 / 60;

describe('OnlinePacer', () => {
  it('asks for the steps that reach the room clock, minus those on their way', () => {
    const pacer = new OnlinePacer();
    expect(pacer.next(10 + 5 * STEP, 10, 0, 1 / 60).steps).toBe(5);
    expect(pacer.next(10 + 5 * STEP, 10, 5, 1 / 60).steps).toBe(0);
  });
  it('asks nothing while ahead of the room', () => {
    expect(new OnlinePacer().next(10, 10.5, 0, 1 / 60).steps).toBe(0);
  });
  it('caps a frame\'s batch', () => {
    expect(new OnlinePacer().next(20, 10, 0, 1 / 60).steps).toBe(MAX_ONLINE_BATCH);
  });
  it('never re-syncs before the first catch-up', () => {
    const pacer = new OnlinePacer();
    let result = pacer.next(20, 10, 0, 1);
    for (let i = 0; i < 10; i += 1) result = pacer.next(20 + i, 10 + i, 0, 1);
    expect(result.resync).toBe(false);
    expect(result.caughtUp).toBe(false);
  });
  it('re-syncs after 3 s more than 1 s behind', () => {
    const pacer = new OnlinePacer();
    pacer.next(10, 10, 0, 0.1);                       // caught up
    let result = pacer.next(11.5, 10, 0, 1);
    result = pacer.next(12.5, 11, 0, 1);
    expect(result.resync).toBe(false);
    result = pacer.next(13.5, 12, 0, 1.1);
    expect(result.resync).toBe(true);
  });
  it('re-syncs at once after a long gap (a background tab), then only once', () => {
    const pacer = new OnlinePacer();
    pacer.next(10, 10, 0, 0.1);
    expect(pacer.next(40, 10, 0, 30).resync).toBe(true);
    pacer.reset();
    expect(pacer.next(40, 40, 0, 0.02).resync).toBe(false);
  });
});
```

```ts
// src/net/spawn.test.ts
import { describe, expect, it } from 'vitest';
import { SPAWN_CLEARANCE, chooseSpawn } from './spawn';

const area = { focusX: 20, focusZ: -100, xMin: -80, xMax: 80 };

describe('chooseSpawn', () => {
  it('spawns near the take-off, outside the break line, in an empty lineup', () => {
    const spot = chooseSpawn(area, [], () => 0.5);
    expect(Math.abs(spot.x - 20)).toBeLessThanOrEqual(30);
    expect(spot.z).toBeLessThanOrEqual(-106);
    expect(spot.z).toBeGreaterThanOrEqual(-130);
  });
  it('keeps clear of other surfers', () => {
    const others = [{ x: 20, z: -106 }, { x: 20, z: -110 }, { x: 23, z: -106 }];
    const spot = chooseSpawn(area, others, () => 0.5);
    for (const other of others) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(SPAWN_CLEARANCE);
  });
  it('stays inside the window', () => {
    const spot = chooseSpawn({ ...area, focusX: 78 }, [], () => 0.99);
    expect(spot.x).toBeLessThanOrEqual(80 - 10);
  });
  it('picks the most open spot in a packed lineup', () => {
    const others = [];
    for (let x = -10; x <= 50; x += 2) for (let z = -130; z <= -106; z += 2) others.push({ x, z });
    const spot = chooseSpawn(area, others, () => 0.5);
    expect(Number.isFinite(spot.x) && Number.isFinite(spot.z)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/net/OnlinePacer.test.ts src/net/spawn.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement**

```ts
// src/net/OnlinePacer.ts
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';

/** Behind the room's clock by more than this, s, for RESYNC_AFTER s: rebuild the sea at the room's time. */
export const RESYNC_BEHIND = 1;
export const RESYNC_AFTER = 3;
/** Behind by more than this at once, s (a background tab, a sleeping laptop): rebuild now. */
export const RESYNC_JUMP = 5;
/** Most steps asked for in one frame. */
export const MAX_ONLINE_BATCH = 30;
/** The worker's queue online: room to catch up on after a join. */
export const ONLINE_QUEUE = 90;

/**
 * Online pacing (spec N1): instead of stepping on the frame's elapsed time, ask
 * for the steps that bring the sea to the room's clock, less those already on
 * their way. Until the sea first catches up (a join spins up behind), it only
 * catches up; after that, staying behind means re-syncing.
 */
export class OnlinePacer {
  private behindFor = 0;
  private caughtUp = false;

  constructor(private readonly step = SURF_ZONE_STEP) {}

  reset(): void {
    this.behindFor = 0;
    this.caughtUp = false;
  }

  next(target: number, shown: number, outstanding: number, dt: number): { steps: number; resync: boolean; caughtUp: boolean } {
    const wanted = Math.floor((target - shown) / this.step + 1e-6) - outstanding;
    const steps = Math.max(0, Math.min(MAX_ONLINE_BATCH, wanted));
    const behind = target - shown;
    if (!this.caughtUp && behind <= RESYNC_BEHIND) this.caughtUp = true;
    this.behindFor = this.caughtUp && behind > RESYNC_BEHIND ? this.behindFor + dt : 0;
    const resync = this.caughtUp && (behind > RESYNC_JUMP || this.behindFor >= RESYNC_AFTER);
    return { steps, resync, caughtUp: this.caughtUp };
  }
}
```

`src/net/spawn.ts`:
- Candidates: x from `focusX − 30` to `focusX + 30` in 3 m steps, clamped to `[xMin + 10, xMax − 10]`; z from `focusZ − 30` to `focusZ − 6` in 4 m steps.
- Score each by its distance to the nearest other surfer (capped at 12 m).
- Take the candidates at or above `SPAWN_CLEARANCE`, and choose among the 5 nearest the take-off with `random`.
- If none clears 3 m, take the candidate with the largest clearance.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/OnlinePacer.test.ts src/net/spawn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/OnlinePacer.ts src/net/OnlinePacer.test.ts src/net/spawn.ts src/net/spawn.test.ts
git commit -m "feat: pace the sea to the room clock and find free lineup spots"
```

---

### Task 9: The WebSocket client

**Files:**
- Create: `src/net/NetClient.ts`
- Test: `src/net/NetClient.test.ts`

**Interfaces:**
- Consumes: `ClockSync`, `parseServerMessage`, `ClientMessage`.
- Produces:
  - `SocketLike` (`binaryType`, `readyState`, `send`, `close`, and `onopen`/`onmessage`/`onclose` handlers).
  - `NetClient(url: string, hello: () => ClientMessage, events: NetEvents, options?: { socket?: (url: string) => SocketLike; now?: () => number; timers?: Timers })`.
  - `NetEvents { message(msg: ServerMessage): void; poses(data: ArrayBuffer): void; status(status: 'connecting' | 'open' | 'reconnecting' | 'closed'): void }`.
  - Methods: `send(msg)`, `sendPose(bytes: Uint8Array)`, `close()`, plus the `clock: ClockSync` field.
  - `onlineUrl(location: { protocol: string; host: string }): string`.

Behaviour:
- **On open:** send `hello()`, and ping at once, then every 500 ms for 3 s, then every 2 s. Each pong goes into `clock.add(t, server, now())`.
- **Refusals:** `refused` → status `closed`, no reconnect. That covers `kicked` too.
- **Other drops:** a close not caused by `close()` or a refusal → status `reconnecting` and reconnect after 1, 2, 4, then 8 s (capped), repeating until `close()`. Each reconnect sends `hello()` again.
- **Traffic:** binary messages go to `events.poses`. `sendPose` sends only while open.

- [ ] **Step 1: Write the failing tests** with a fake socket and fake timers (vi.useFakeTimers):
- hello goes first on open;
- pongs feed the clock;
- a drop reconnects with backoff and says hello again;
- a refusal stops reconnecting;
- `close()` stops everything;
- `onlineUrl({ protocol: 'https:', host: 'x.fly.dev' })` is `'wss://x.fly.dev/ws'`.

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/net/NetClient.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Implement** `NetClient` to the behaviour above.
- **Default socket:** `new WebSocket(url)` with `binaryType = 'arraybuffer'`.
- **Default clock:** `performance.now`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/NetClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/NetClient.ts src/net/NetClient.test.ts
git commit -m "feat: talk to the room server, and reconnect when dropped"
```

---

### Task 10: Remote surfers and the player's own pose

**Files:**
- Create: `src/net/RemoteSurfers.ts`, `src/net/ownPose.ts`
- Test: `src/net/RemoteSurfers.test.ts`, `src/net/ownPose.test.ts`

**Interfaces:**
- Consumes: `SurferPose`, `decodePose`, `readBundle`, `PlayerInfo`, `surferFor`, `SURF_ZONE_STEP`, `RIDER_SNAPSHOT`.
- Produces:
  - Constants: `INTERPOLATION_DELAY = 0.1`, `EXTRAPOLATE_LIMIT = 0.25` and `VANISH_SECONDS = 5`.
  - `RemoteState { x; z; lift; quaternion: [number, number, number, number]; points: Float32Array(21); phase: number; present; boardPresent; paddling; heading }`.
  - Roster: `RemoteSurfers.join(info)`, `leave(id)`, `ids()`, `info(id)`.
  - Poses: `receiveBundle(data, localNow, reactions: number[])` appends each new pose's reaction (x, z, jx, jz) to `reactions`, then `prune(localNow): number[]`.
  - Reading: `sample(id, seaTime, out): boolean` and `latestPositions(): { x; z }[]`.
- Produces:
  - `OwnPoseTracker` with `accumulate(reaction: Float64Array)`, which collects each snapshot's reaction between sends.
  - `write(snapshot, heightAt, seaTime, paddling, out: SurferPose): SurferPose`, which fills the pose and clears the accumulated reaction.

Rules:
- Poses for unknown ids are ignored, and a pose older than the newest held is dropped. Each player keeps its last 8 samples.
- `sample` interpolates at `seaTime` (step × `SURF_ZONE_STEP`):
  - between the two samples around it: positions and points linearly, the quaternion by nlerp on the shortest path, and phase and flags from the nearer sample;
  - before the first sample: that sample;
  - after the last: extrapolate x and z by the last two samples' velocity for at most `EXTRAPOLATE_LIMIT`, then hold.
- `prune` removes players not heard from in `VANISH_SECONDS`, but keeps them on the roster so they reappear when poses resume. It returns the ids it hid, and `sample` returns false for a hidden player.
- `OwnPoseTracker.write` builds the pose from the snapshot:
  - `x`, `z` and the quaternion from `board[0..6]`;
  - `lift` = `board[1] − heightAt(x, z)`;
  - `points` = rider points minus the board position;
  - `phase` from `RIDER_SNAPSHOT.phase` when present, else −1;
  - the flags; `heading`;
  - `step` = `Math.round(seaTime / SURF_ZONE_STEP)`;
  - the accumulated reaction as the impulse-weighted mean point and the summed impulse.

- [ ] **Step 1: Write the failing tests:**
- interpolation halfway between two poses (x, lift, point and quaternion);
- extrapolation capped at 0.25 s;
- a stale pose dropped;
- an unknown id ignored;
- a vanish after 5 s, and reappearance when poses resume;
- reactions appended once per new pose;
- `OwnPoseTracker.write` on a hand-built snapshot: lift = board y − surface; points relative; the reaction summed over two snapshots and cleared after writing.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/net/RemoteSurfers.test.ts src/net/ownPose.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement** both modules.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/net/RemoteSurfers.test.ts src/net/ownPose.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/RemoteSurfers.ts src/net/RemoteSurfers.test.ts src/net/ownPose.ts src/net/ownPose.test.ts
git commit -m "feat: follow other surfers smoothly, and describe our own"
```

---

### Task 11: Drawing remote surfers, name tags and calls

**Files:**
- Create: `src/scene/RemoteSurferViews.ts`, `src/ui/NameTags.ts`
- Modify: `src/scene/character/SkinnedSurfer.ts` (if it re-parses the glTF on every load: cache the parsed template per URL and clone it with `SkeletonUtils.clone`)
- Modify: `src/ui/ui.css` (name tag and bubble styles)
- Test: `src/scene/RemoteSurferViews.test.ts`, `src/ui/NameTags.test.ts`

**Interfaces:**
- Consumes: `RemoteState`, `createBoardMesh`, `buildBoardShape`, `BOARD_DESIGNS`, `SurferView`, `createRiderVisualState`, `readRiderSnapshot`, `outfitFor`, `SUIT_COLORS`, `surferFor`.
- Produces:
  - `RemoteSurferViews(scene: Scene)` with `sync(players: { id: number; look: PlayerLook }[])`, `update(id, state: RemoteState | undefined, surfaceAt: (x: number, z: number) => number, camera: Camera)` and `setDetail(lodDistance, textureCap)`.
  - `worldPosition(id, out: Vector3): boolean`, for the tags: the head point, or the board plus 1.2 m.
  - `dispose()`.
- Produces: `NameTags(container: HTMLElement)` with `update(entries: { id: number; name: string; world: Vector3; call?: string }[], camera: Camera, width: number, height: number, show: boolean)` and `dispose()`.

Rules:
- A remote board is drawn at `(x, surfaceAt(x, z) + lift, z)` with the quaternion, and its rider points at the board position plus the points.
- A synthesized rider array (25) and board array (8) go through `readRiderSnapshot`. `stroking = paddling && phase === 'prone'`.
- Each view's `SurferView` loads its body once, and `dress` applies the look.
- A player without `present` shows the board only.
- **Name tags** use a pool of `div.name-tag` elements, positioned with `transform: translate(…)`:
  - hidden when behind the camera, farther than 150 m, or `show` is false;
  - a call shows as `div.name-tag__call` for 2 s (the controller supplies the text);
  - tags use `textContent`, never `innerHTML`, since names come from other players.

- [ ] **Step 1: Write the failing tests:**
- `RemoteSurferViews`: `sync` adds and removes groups in the scene; `update` places the board at surface + lift; a player without a rider hides the surfer. Use the existing primitive surfer path, since SurferView falls back without assets.
- `NameTags`: projects a point in front of the camera to the right pixel, hides one behind, puts names through `textContent` (a name with `<b>` stays literal), and reuses its pool.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/scene/RemoteSurferViews.test.ts src/ui/NameTags.test.ts`
Expected: FAIL (the modules don't exist).

- [ ] **Step 3: Implement** both modules. Before 49 surfers load, check how `SkinnedSurfer.load` handles repeat loads: cache a template per URL (and texture cap), then clone the skeleton per view.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --dir src`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene src/ui/NameTags.ts src/ui/NameTags.test.ts src/ui/ui.css
git commit -m "feat: draw the other surfers with their name tags and calls"
```

---

### Task 12: The online session in the game

**Files:**
- Create: `src/net/OnlineController.ts`
- Test: `src/net/OnlineController.test.ts`
- Modify: `src/main.ts` (`SurfGame.startOnline`, online pacing in `physicalFrame`, remote views and tags in `physicalRender`, `leaveOnline`, pause keeps stepping online)
- Modify: `src/game/PhysicalMode.ts` (options passed to the worker host: `spawnAlong`, `spawnOut`, `maxQueuedSteps`)
- Modify: `src/ui/App.ts` (`GameHost` gains `startOnline`, `leaveOnline`, `onlineStatus`)

**Interfaces:**
- Consumes: everything above.
- Produces the controller: `OnlineController(options: { url: string; name: string; surfer: SurferSettings; intent: { create: RoomSettings; bots?: number } | { join: string }; token?: string; socket?: …; now?: … })`.
  - Fields: `room?: RoomInfo`, `you?: number`, `creator: boolean`, `token?: string`, `remote: RemoteSurfers`, `players(): PlayerInfo[]`, `feed: FeedEntry[]`, `calls: Map<number, { call: CallId; until: number }>`.
  - Status: `status: 'connecting' | 'open' | 'reconnecting' | 'closed'` and `refusal?: Refusal`.
  - Methods: `seaTimeNow(): number`, `takeReactions(): Float32Array`, `sendPose(pose: SurferPose)` (throttled to 20 Hz by the caller), `call(id: CallId)`, `rideFinished(distance, seconds)`, `kick(id)`, `close()`.
  - Events: `onWelcome`, `onChange`, `onRefused`.
- Produces on `SurfGame`:
  - `startOnline(controller: OnlineController): Promise<boolean>`: builds `roomSurfZoneConfig(room, controller.seaTimeNow() + 0)` with `{ rider: true, spawnAlong, spawnOut, maxQueuedSteps: ONLINE_QUEUE }` and the room's `TIMES[time]` sun.
  - `leaveOnline()`, `onlineRespawn()` (the 3 s countdown), `onlinePhase: 'catching-up' | 'riding' | 'resyncing' | undefined`.

Behaviour in `physicalFrame` while online:
1. `target = controller.seaTimeNow()`, then `pacer.next(target, snapshot.seaTime, host.outstandingSteps, elapsed)`.
2. Input: `controls.rideRequest(…)`, or idle while the pause menu is open.
3. `physicalMode.advance(steps, input, controller.takeReactions())`.
4. Every 50 ms of wall time: `ownPose.accumulate`, then `controller.sendPose(ownPose.write(...))`. Snapshots between sends accumulate their reactions.
5. When the pacer says `resync`, rebuild through `startOnline` (the "Catching up with the sea" notice), and reset the pacer.
6. On first catch-up after start or a re-sync: choose a spawn (`chooseSpawn` with `remote.latestPositions()` and `host.init`), and `physicalMode.retry(spawnAt)`.
7. `physicalRender`: `remote.prune`, then for each id `remote.sample(id, snapshot.seaTime − INTERPOLATION_DELAY, state)` → `views.update(...)`, then the tags.

Also:
- **Settings:** online, `setPaused` never stops stepping. The page ignores `timeScale`. Replay and New wave aren't offered.
- **Ride reports:** a finished ride (`RideTracker` result with `report`) calls `controller.rideFinished(distance, time)` when time ≥ 3 s. The Logbook entry gets `online: true` (Task 14).

- [ ] **Step 1: Write the failing tests** for `OnlineController`, with a fake socket:
- `create` intent → hello `create` with the name and look;
- `welcome` → room set, remote roster filled, creator flag;
- `joined`/`left` update the roster;
- a pose bundle → `remote` fed and `takeReactions()` returns them once;
- `seaTimeNow()` follows `roomSeaTime` via the clock;
- `refused` → `refusal` set and `onRefused` fired;
- after `welcome`, a reconnect sends `join` with the code and token (not a second `create`);
- `call`/`ride` messages land in `calls`/`feed` with expiry times.

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/net/OnlineController.test.ts`
Expected: FAIL (the module doesn't exist).

- [ ] **Step 3: Implement `OnlineController`**, then wire `SurfGame` as above. `main.ts` changes stay in `SurfGame` and don't touch the legacy path.

- [ ] **Step 4: Run all tests and the build**

Run: `npx vitest run --dir src && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/net/OnlineController.ts src/net/OnlineController.test.ts src/main.ts src/game/PhysicalMode.ts src/ui/App.ts
git commit -m "feat: surf a room's sea with the others in it"
```

---

### Task 13: The Multiplayer screen, links and settings

**Files:**
- Create: `src/ui/MultiplayerScreen.ts`
- Test: `src/ui/MultiplayerScreen.test.ts`
- Modify: `src/ui/MainMenu.ts` (+ test): the Multiplayer tile is enabled with no badge.
- Modify: `src/ui/ScreenStack.ts` (+ test): add `'multiplayer'`.
- Modify: `src/ui/App.ts`:
  - `?room=` opens Multiplayer on start with the code filled in;
  - joining shows the loading card ("Joining the lineup…", then "Catching up with the sea…");
  - refusals return to Multiplayer with their message.
- Modify: `src/game/Settings.ts` (+ test): `gameplay.nameTags: boolean` (default true); `online: { name: string; token?: Record<string, string> }` (tokens per room code, the last 10 kept).
- Modify: `src/ui/SettingsScreen.ts`: the name-tags toggle under Gameplay.
- Modify: `src/ui/strings.ts`: every new string.

**Interfaces:**
- Produces: `multiplayerModel(state: { name: string; code: string; settings: RoomSettings; webGpu: boolean | undefined; refusal?: Refusal }): { canCreate: boolean; canJoin: boolean; message?: StringKey; capChoices: number[] }`.
  - `canCreate`/`canJoin` need a clean name, WebGPU, and for joining a valid code.
  - `message` is `online.noWebGpu` without WebGPU, or the refusal's text.
  - `capChoices` is `[2, 5, 10, 20, 30, 40, 50]`.
- Produces: `createMultiplayerScreen(model, handlers: { create(settings: RoomSettings): void; join(code: string): void; name(value: string): void; back(): void }, surferCard: HTMLElement): HTMLElement`.
  - **The layout:** a name field, the surfer card, and a Join section (a code field and a Join button).
  - **Create:** a section reusing `SurfScreen`'s spot cards and condition choices, plus a cap choice.
  - **Share:** after a room is created, its link appears in the pause menu's player list with a Copy button (Task 14).

New strings (in `strings.ts`):

| Key | Text |
|---|---|
| `menu.multiplayer` | Multiplayer (tile, existing) |
| `online.title` | Multiplayer |
| `online.name` | Your name |
| `online.create` | Create room |
| `online.join` | Join |
| `online.code` | Room code |
| `online.cap` | Players |
| `online.joining` | Joining the lineup… |
| `online.catchingUp` | Catching up with the sea… |
| `online.noWebGpu` | This browser can't run the shared sea. Use a current Chrome or Safari. |
| `online.refused.full` | This room is full. |
| `online.refused.version` | A new version is out — reload. |
| `online.refused.notFound` | This room has closed or doesn't exist. |
| `online.refused.kicked` | You were removed from this room. |
| `online.refused.invalid` | That didn't work. Check your name and try again. |
| `online.reconnecting` | Reconnecting… |
| `online.leave` | Leave room |
| `online.players` | Players |
| `online.kick` | Kick |
| `online.copyLink` | Copy link |
| `online.copied` | Link copied |
| `online.respawnIn` | Back in the lineup in {s} s |
| `online.call.left` | Left! |
| `online.call.right` | Right! |
| `online.call.party` | Party wave! |
| `online.call.nice` | Nice one! |
| `settings.nameTags` | Name tags |

- [ ] **Step 1: Write the failing tests:**
- `multiplayerModel`: no WebGPU → no create or join, with the message; a bad code → no join; a blank name → neither; each refusal maps to its string; `capChoices`.
- `menuTiles`: multiplayer enabled.
- Settings: `nameTags` defaults to true and sanitizes; the name is cleaned; the token map is capped at 10.
- `roomCodeFromSearch` wiring: an `App` start-up helper `initialScreen(search)` returns `{ screen: 'multiplayer', code }` for `?room=`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/ui/MultiplayerScreen.test.ts src/ui/MainMenu.test.ts src/game/Settings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the screen, settings, strings and App wiring.
- Creating or joining builds an `OnlineController`. On `welcome`, it calls `game.startOnline` and shows the ride screen.
- `webGpuAvailable()` is checked once when the screen opens.

- [ ] **Step 4: Run all tests and the build**

Run: `npx vitest run --dir src && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/game/Settings.ts src/game/Settings.test.ts
git commit -m "feat: create a room or join one from its link"
```

---

### Task 14: In the room: pause menu, players and Kick, calls, ride feed, Logbook

**Files:**
- Create: `src/ui/OnlineHud.ts`
- Test: `src/ui/OnlineHud.test.ts`
- Modify: `src/ui/PauseMenu.ts`: an online variant with Resume / Players / Settings / Leave room.
- Modify: `src/game/Bindings.ts` (+ test): actions `callLeft`, `callRight`, `callParty`, `callNice` on keys `Digit1`–`Digit4`, with no gamepad default, context `always`.
- Modify: `src/game/Controls.ts`: the call actions as presses.
- Modify: `src/game/Logbook.ts` (+ test): `LoggedRide.online?: boolean`; `LogbookScreen` shows an "online" tag.
- Modify: `src/ui/App.ts`, `src/main.ts`:
  - online, R starts the respawn countdown instead of retrying at once;
  - calls go to the controller;
  - the feed and notices render.

**Interfaces:**
- Produces: `OnlineHud(root: HTMLElement)` with:
  - `feed(entries: { name: string; distance: string; seconds: string; until: number }[], now: number)` for the ride feed, bottom-left, 6 s each;
  - `notice(key?: StringKey, values?: Record<string, string>)` for reconnecting, catching up and the respawn countdown;
  - `players(list: { id: number; name: string; you: boolean }[], creator: boolean, link: string, onKick: (id: number) => void)`: the pause menu's Players panel, with Copy link and Kick.

Rules:
- Kick buttons show only for the creator, never on your own row.
- The feed formats distance with the player's units (`units.ts`) and seconds to one decimal.
- All names go through `textContent`.

- [ ] **Step 1: Write the failing tests:**
- the feed drops expired entries;
- Kick is shown only to the creator and never for yourself;
- names stay literal;
- the four call actions exist with their default keys and don't clash;
- Logbook round-trips `online`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/ui/OnlineHud.test.ts src/game/Bindings.test.ts src/game/Logbook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** and wire up.

- [ ] **Step 4: Run all tests and the build**

Run: `npx vitest run --dir src && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: call waves, see others' rides, and manage the room"
```

---

### Task 15: Dev bots

**Files:**
- Create: `scripts/bot-tracks.ts`, `server/bots.ts`
- Test: `server/bots.test.ts`
- Modify: `package.json` (`bots:record`), `.gitignore` (`server/bots/*.bin`), `server/RoomRegistry.ts` and `server/main.ts` (`BOTS=1` loads the track file)

**Interfaces:**
- Produces:
  - `scripts/bot-tracks.ts` runs the Canyon Medium room sea on the CPU with an `Autopilot` rider for `--minutes` (default 5). It writes `server/bots/canyon-medium.bin`: a u32 frame count, then frames of `POSE_BYTES` at 20 Hz, from `OwnPoseTracker` with `heightAt` from the runner's water.
  - `BotSource { frames: Uint8Array; count: number }`, and `loadBotSource(path): BotSource | undefined`.
- Produces: `Room.addBots(count, source, now)`.
  - Each bot is a player named "Bot 1…n" with a random look, and it counts toward the cap.
  - Each has a random frame offset and an along-shore shift from −60 to 60 m (added to x and the reaction x).
  - On every `tick`, each bot's pose becomes its next frame, with `step` rewritten to the room's current step.
  - Bots never time out.

- [ ] **Step 1: Write the failing tests:**
- a room with 3 bots and one player → the player's bundle holds 3 poses whose steps equal the room's current step;
- bots count toward the cap;
- without a bot source, `create` ignores `bots`.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run server/bots.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**, then record the tracks in the background (`npm run bots:record -- --minutes 5`, about 5 min).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run --dir server`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/bot-tracks.ts server package.json .gitignore
git commit -m "feat: fill a room with bots for testing (dev only)"
```

---

### Task 16: Deploy files

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `fly.toml`
- Modify: `package.json` (`deploy`), `README.md` (an Online section: run locally, create the Fly app, deploy)

**Dockerfile:**

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BUILD_ID=unknown
ENV BUILD_ID=$BUILD_ID
RUN npm run build && npm run build:server

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 STATIC_DIR=/app/dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8080
CMD ["node", "dist-server/server.mjs"]
```

**`fly.toml`:** the app name is filled in by `fly launch --no-deploy`; the region is the user's nearest.

```toml
app = "breakline-surf"
primary_region = "mad"

[build]
  [build.args]
    BUILD_ID = "fly"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

**`package.json`:**

```json
"deploy": "fly deploy --build-arg BUILD_ID=$(git rev-parse --short HEAD)"
```

**`.dockerignore`:** `node_modules`, `dist`, `dist-server`, `.git`, `.claude`, `recordings`, `docs`, `server/bots`.

- [ ] **Step 1: Build the image locally, if Docker is installed; otherwise skip and say so.**

Run: `docker build -t breakline-surf . && docker run --rm -p 8080:8080 breakline-surf`, then `curl -s localhost:8080/build.json`.
Expected: `{"build":"unknown"}` (no build arg locally).

- [ ] **Step 2: Commit**

```bash
git add Dockerfile .dockerignore fly.toml package.json README.md
git commit -m "chore: package the game and its room server for Fly.io"
```

- [ ] **Step 3: Tell the user what they need to do. Never deploy without their yes.**
  - Create a Fly.io account and run `fly auth login` and `fly launch --no-deploy`, choosing the app name and the nearest region.
  - Then say "deploy" to me.

---

### Task 17: Browser check, docs and PR

- [ ] **Step 1: Two-tab check on localhost.**
  - Run `npm run server` (it builds `dist` first via `npm run build`) with `BOTS=1`, and open `http://localhost:8787/`.
  - **Tab A:** Multiplayer → Create room (Canyon, Medium, 50, with `bots` 8 through the dev URL flag `?bots=8`).
  - **Tab B:** open the link.
  - **Check:**
    - both tabs see each other's surfer and name tag;
    - the seas agree;
    - a call shows over the caller;
    - a finished ride shows in the other tab's feed;
    - Kick removes tab B, which cannot rejoin.
  - **Measure:** frame time with 8 and with 49 bots (read from the dev telemetry), and the server's bytes per second (log the socket totals every 10 s under `BOTS=1`).
  - The browser pane is throttled when hidden ([[browser-pane-throttling]]): measure frame times only with the pane shown, and otherwise record them as "left for the playtest".
- [ ] **Step 2: Docs.**
  - `ROADMAP.md`: an **N1 · Online lineup** section with the record (the drift report numbers, the bot-room measurements, what's left for Part B).
  - `README.md`: an Online section.
  - `CONTEXT.md`: glossary terms **Room**, **Room sea time**, **Remote surfer**, **Surf call**, **Re-sync**.
- [ ] **Step 3: Full test run, then the PR.** Run `npx vitest run --dir src && npx vitest run --dir server && npm run build && npm run build:server`, then open the PR, merge it to main (a merge commit, per the user's standing preference), and bind it with the ccd_pr tools.
- [ ] **Step 4: Report to the user.** Cover what works, the drift numbers, and the bot-room numbers. Say what they need for the deploy (the Fly account) and the playtest with about 5 friends.
