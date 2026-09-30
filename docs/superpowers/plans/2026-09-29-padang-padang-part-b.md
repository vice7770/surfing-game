# Padang Padang Part B: the swept barrel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one surface, swept along the breaking crest from our own simulated 2D overturn profiles, that is both drawn and collided. It replaces today's lip strips and carved void, at Padang Padang first, behind a per-spot switch.

**Architecture:**
- **Offline:** Basilisk 2D two-phase runs on the game's own bed transects, from the advisor's toolkit in `tools/basilisk/`. Its `library.py` resamples every frame to 128 points, with crest, lip tip, throat and toe at fixed indices, stamped with τ (the time since the face went vertical). A script converts those libraries into binary cases under `public/barrels/`, with a generated TypeScript index, as the lesson waves are shipped.
- **At runtime:**
  - The solver stays the clock and the mass ledger.
  - A breaking-front line gives every crest slice a clock τ from the crest-speed onset (B = U/C), smoothed so neighbours stay within one library stage.
  - Each slice looks up its profile by slope, height and τ, scaled to the solver's breaking height.
  - The mesh (PR 3) and the rider's contact (PR 4) use the same profiles.

**Tech Stack:**
- TypeScript, Three.js (WebGL2 and WebGPU), vitest;
- node report scripts bundled with rolldown;
- Basilisk (C, GPL-3.0) and Python 3 (numpy, scipy, matplotlib), offline only.

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md`:
- §Part B, decisions 13–18;
- Round 3, decisions 19–21;
- Judging § Part B;
- Delivery § Part B.

The advice it builds on, in `docs/research/water-physics/` on `main`:
- `swept-barrel-build.md`, `tubes.md`, `roller-build.md`, `basilisk-profiles.md`;
- `notes/round6-tube-profiles/tube-profiles.md`.

## Global Constraints

- "every value is sourced or marked provisional, and nothing is hand-shaped".
- "Classic look stays byte-identical" everywhere but a lip or a tube: "Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical" (spec 15).
- "Performance is measured, never a gate. Target an M4 Pro; an M1 Air may run slowly."
- "Don't change the Reef (Teahupo'o)". The Reef switches only in PR 7, after the Reef session agrees (spec 17 and Coordination).
- Work in your own worktree, and never touch other sessions' worktrees under `.claude/worktrees/`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The user merges; on 2026-09-29 they asked for PRs to be merged as soon as they are done.
- **Online determinism:** the swept surface is a function of the sea state, and a late joiner gets the slice clocks with the sea (spec 14). Decision paths use only + − × ÷, √, floor and integer multiply, with no `Math.sin`, `exp` or `hypot` (`roller-build.md`, ECMA-262).
- **Basilisk is GPL-3.0.** The advisor's toolkit on `main` (`tools/basilisk/`: `slope.c` under `COPYING`, `run_padang.sh`, `analysis/*.py`) is reused, not rewritten. It never ships; the profiles are data (`basilisk-profiles.md`, decision 6).
- **Grid level:** at least about 6 cells across the thrown lip. That means level 12 for Padang Padang and the reefs, level 13 for gentle beaches, and level 11 only for quick design sweeps (decision 3).
- **The owner's level-13 Padang Padang run** (decision 2) runs on the M4 Pro via `tools/basilisk/run_padang.sh`; its README estimates 8–35 h on one core, or 3–8 h with libomp. This M1 runs level 12.
- **After touchdown:** the library's tube ends at touchdown and blends into the roller build later (decision 4; spec 14 keeps the roller out of Part B).
- **Solitary-wave runs:** Padang Padang's 14–17 s swell over a shallow reef is close to a solitary train; periodic runs come later (decision 5).
- **The bed:** the wedge is 1:19 along the swell's path (the owner's decision, 2026-09-29). Every run's slope is 0.0526316.

**Decisions adopted:** `basilisk-profiles.md` decisions 3–6 were recommendations. The user asked on 2026-09-29 to start Part B, and has taken every recommendation so far, so they are adopted here and marked provisional.

## Review Focus

1. **A slice outside the library's cases** (a slope or H0/h0 no run covers): the lookup clamps to the nearest case and flags the slice. It never extrapolates, and never returns NaN (Task 2).
2. **A breaking front that splits, merges or reaches the window's edge:** its points keep their IDs, σ stays finite, and a slice's τ tapers to zero over its end metres, so slices appear and vanish unseen (Tasks 5 and 6).
3. **A sea handed over mid-break** (a player joining late): the front and its clocks resume exactly (Task 7, a round trip through `encodeSurfZoneState`).
4. **The lowest spring tide** (the flat 5 cm deep): a profile scaled to a small H stays finite, with its landmarks in order (Task 2).
5. **Two crests breaking in one column** (a set wave behind a closing section): they are two fronts, never one line zig-zagging between them (Tasks 4 and 5).

---

## Part B's PRs (spec, Delivery)

1. **The profile library.** This plan, Tasks 1–3.
2. **The slice clock and onset.** This plan, Tasks 4–7.
3. **The drawn mesh.** The loft, the seam and the mask.
4. **The contact.** Wave-attached signed distance, and the Reef's Part D interface.
5. **The crash curve, parcels and sound.**
6. **The shading** (Rich only): the lip glow and the dark throat.
7. **The switch for every spot** and the deletion of `PlungingLip.ts`, `Overturn.ts`, `tubeTable.ts`, `tubeCarve.ts`, `LipSheetMesh.ts` and `richLip.ts`.

PRs 3–7 each get their own detailed plan, written from what PRs 1–2 actually produce (the skill's scope rule: one plan per subsystem).

## File structure (PRs 1–2)

| File | Responsibility |
|---|---|
| `tools/basilisk/run_padang.sh` | Gains `A0` and `NAME` overrides, so one script runs every Padang Padang swell size; the defaults are unchanged |
| `src/wave/barrel/profileFormat.ts` | The game's binary case format: one encoder and decoder, shared by the script and the game |
| `src/wave/barrel/ProfileLibrary.ts` | Runtime: holds cases, looks up a profile by slope, height and τ, scales it to H |
| `src/wave/barrel/caseFromLibrary.ts` | Pure: one `library.py` JSON into a `BarrelCase` |
| `scripts/barrel-library.ts` | Every finished run into `public/barrels/<id>.bin` + the generated `src/wave/barrel/barrelLibraryIndex.ts`; the validation table |
| `src/wave/barrel/crestOnset.ts` | Per column: the crest and its B = U/C |
| `src/wave/barrel/BreakingFront.ts` | The front lines: points with fixed IDs, σ and positions, updated each step |
| `src/wave/barrel/sliceClock.ts` | Each point's τ: the onset, the neighbour clamp, the end taper |
| `src/wave/SurfZoneSimulation.ts` | Holds a `BreakingFront` behind `SWEPT_BARREL` (Padang Padang only), and hands it over |
| `src/wave/surfZoneState.ts` | Carries the fronts in the handover |
| `docs/research/barrel-library.md` | The library's cases, validation, cost, and the onset's sources |

---

## PR 1 · The profile library

### Task 1: The runs: level 12 here, level 13 on the M4 Pro

**Files:**
- Modify: `tools/basilisk/run_padang.sh`, `tools/basilisk/README.md`

**Interfaces:**
- Produces, per run, `tools/basilisk/runs/<name>_metrics.json` and `<name>_library.json` (git-ignored), in the format of `docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json`:
  - `run: { level, dx_h0, slope, A0, h0_m, time_scale_s, t_vertical, t_impact }`;
  - `indices: { back 0, crest 32, lip 64, throat 88, toe 112, front 127 }`;
  - `frames: [{ t, tau, tau_s, phase, flags, H, tube, profile: [[x, y] × 128] }]`.

**The cases** (provisional; the size report, Part A Task 8, confirms the spread):
- A0 = H0/h0 at the 7 m wedge base: 0.2, 0.3 and 0.45, spanning Padang Padang's Practice to Big sets.
- **Level 12 on this M1**, one core each: Apple's clang has no OpenMP (round 6 §1.4).
- **The owner's level 13** of A0 0.3 replaces the level-12 A0 0.3 case when it lands.

- [ ] **Step 1: Extend `run_padang.sh`:**
  - add `A0="${A0:-0.3}"`, `NAME="${NAME:-pad19_L$LEVEL}"`, `TOUT0="${TOUT0:-18.5}"` and `TMAX="${TMAX:-25}"`;
  - use them in `FLAGS` (`-DA0=$A0 -DTOUT0=$TOUT0 -DTMAX=$TMAX`), in `RUN="$HERE/runs/$NAME"`, and in the `analyse` step's `metrics.py` and `library.py` arguments (their A0 and TMIN).

  The defaults reproduce today's command exactly, so the owner's run is unchanged.
- [ ] **Step 2: Scout each amplitude at level 10,** fast. For example:

```bash
LEVEL=10 A0=0.2 NAME=scout_a20 TOUT0=15 TMAX=34 tools/basilisk/run_padang.sh
LEVEL=10 A0=0.2 NAME=scout_a20 tools/basilisk/run_padang.sh status
```

Read each scout's vertical and impact times from `tools/basilisk/runs/scout_*_metrics.json` after `analyse`. Record per A0, in the README's run table:
- `TOUT0` about 3 time units before the vertical;
- `TMAX` about 3.5 after touchdown (round 6 §7).

- [ ] **Step 3: Start the three level-12 runs** in the background, one per core:

```bash
LEVEL=12 A0=0.2 NAME=pad19_a20_L12 TOUT0=<scouted> TMAX=<scouted> tools/basilisk/run_padang.sh
LEVEL=12 A0=0.3 NAME=pad19_a30_L12 TOUT0=18.5 TMAX=25 tools/basilisk/run_padang.sh
LEVEL=12 A0=0.45 NAME=pad19_a45_L12 TOUT0=<scouted> TMAX=<scouted> tools/basilisk/run_padang.sh
```

They checkpoint every 10 minutes of wall time and resume if stopped.
- [ ] **Step 4:** When each is done, run its `analyse` step. Record in the README's run table:
  - wall time;
  - metrics;
  - landmark cleanliness per phase (`library.py` prints it).
- [ ] **Step 5: Commit** `run_padang.sh` and the README.

### Task 2: The game's case format and its runtime lookup

**Files:**
- Create: `src/wave/barrel/profileFormat.ts`, `src/wave/barrel/ProfileLibrary.ts`, `src/wave/barrel/ProfileLibrary.test.ts`

**Interfaces:**
- Produces:
  - `PROFILE_POINTS = 128`;
  - `LANDMARK = { back: 0, crest: 32, lip: 64, throat: 88, toe: 112, front: 127 } as const`;
  - `interface BarrelCase { id: string; slope: number; nonlinearity: number; flatDepth: number; breakerHeight: number; tauStep: number; tauStart: number; touchdown: number; frames: Float32Array }`. `frames` holds (frame count × 256) floats in h0: x forward from the crest at τ = 0, y up from still water. τ is in √(h0/g); `breakerHeight` H_I is in h0; `touchdown` is τ at touchdown.
  - `encodeCase(c: BarrelCase): Uint8Array` and `decodeCase(bytes: Uint8Array): BarrelCase`;
  - `class ProfileLibrary { constructor(cases: readonly BarrelCase[]); profileAt(query: ProfileQuery, out: Float32Array): ProfileLookup }`, where:
    - `ProfileQuery = { slope: number; nonlinearity: number; height: number; seconds: number }`: `height` is the solver's breaking height in m, `seconds` is τ in s;
    - `ProfileLookup = { caseId: string; clamped: boolean; scale: number; phase: 'pre' | 'open' | 'post' }`;
    - `out` receives 256 floats in metres.

- [ ] **Step 1: Write the failing tests** (`src/wave/barrel/ProfileLibrary.test.ts`):

```ts
import { describe, expect, it } from 'vitest';
import { decodeCase, encodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type BarrelCase } from './ProfileLibrary';

/** A toy case: its lip moves forward with each frame, so interpolation is checkable. */
function toyCase(nonlinearity: number, lipGain: number): BarrelCase {
  const frames = 5;
  const data = new Float32Array(frames * 2 * PROFILE_POINTS);
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      data[(f * PROFILE_POINTS + p) * 2] = p / 32 + (p === LANDMARK.lip ? lipGain * f : 0);
      data[(f * PROFILE_POINTS + p) * 2 + 1] = p === LANDMARK.crest ? 0.5 : 0.1;
    }
  }
  return { id: `toy-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.25, tauStart: -0.5, touchdown: 0.5, frames: data };
}

describe('the barrel profile library', () => {
  it('round-trips a case through its binary form', () => {
    const c = toyCase(0.3, 0.1);
    expect(decodeCase(encodeCase(c))).toEqual(c);
  });

  it('interpolates in τ between frames and scales to the solver’s height (Froude)', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // H = 2 m against H_I 0.5 h0: h0 = 4 m, so τ's unit is √(4 / 9.81) s. τ = 0.125 sits at frame 2.5.
    const lookup = library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 2, seconds: 0.125 * Math.sqrt(4 / 9.81) }, out);
    expect(lookup.scale).toBeCloseTo(4, 9);
    expect(lookup.phase).toBe('open');
    expect(out[2 * LANDMARK.lip]).toBeCloseTo(4 * (LANDMARK.lip / 32 + 0.1 * 2.5), 4);
    expect(out[2 * LANDMARK.crest + 1]).toBeCloseTo(2, 5);
  });

  // Review Focus 1.
  it('blends two cases by nonlinearity, and clamps (flagged) outside them, never extrapolating', () => {
    const library = new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    expect(library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 0.5, seconds: 0 }, out).clamped).toBe(false);
    expect(library.profileAt({ slope: 0.05, nonlinearity: 0.9, height: 0.5, seconds: 0 }, out).clamped).toBe(true);
    expect(library.profileAt({ slope: 0.2, nonlinearity: 0.3, height: 0.5, seconds: 0 }, out).clamped).toBe(true);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  // Review Focus 4: a tiny breaker at the lowest spring tide.
  it('keeps a tiny breaker finite, its landmarks in order', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 0.05, seconds: 3 }, out);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
    expect(out[2 * LANDMARK.crest]).toBeLessThan(out[2 * LANDMARK.toe]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**: `npx vitest run src/wave/barrel/ProfileLibrary.test.ts` (missing modules).
- [ ] **Step 3: Implement `profileFormat.ts`.** Magic `BRL1`, a u32 header length, a UTF-8 JSON header holding every field but `frames`, padding to 4, then the float32 frames. This mirrors `encodeSurfZoneState`:

```ts
import type { BarrelCase } from './ProfileLibrary';

const MAGIC = 0x42524c31; // "BRL1"

export function encodeCase(c: BarrelCase): Uint8Array {
  const { frames, ...meta } = c;
  const header = new TextEncoder().encode(JSON.stringify(meta));
  const start = 8 + Math.ceil(header.length / 4) * 4;
  const bytes = new Uint8Array(start + frames.length * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, header.length, true);
  bytes.set(header, 8);
  new Float32Array(bytes.buffer, start, frames.length).set(frames);
  return bytes;
}

export function decodeCase(bytes: Uint8Array): BarrelCase {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 8 || view.getUint32(0, true) !== MAGIC) throw new Error('Not a barrel case');
  const length = view.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Omit<BarrelCase, 'frames'>;
  const start = 8 + Math.ceil(length / 4) * 4;
  return { ...meta, frames: new Float32Array(bytes.slice(start).buffer) };
}
```

- [ ] **Step 4: Implement `ProfileLibrary.ts`:**

```ts
import { GRAVITY } from '../dispersion';

/**
 * The swept barrel's profile library (the Padang Padang spec, Part B): simulated 2D breakers (Basilisk, the advisor's
 * tools/basilisk) resampled to 128 points with crest, lip tip, throat and toe at fixed indices, so profiles blend point
 * by point (docs/research/water-physics/swept-barrel-build.md). Each case holds its frames in h0 (the depth at the
 * slope's foot) and τ in √(h0/g) from the face going vertical. A slice picks the nearest slope's cases, blends the two
 * bracketing its H0/h0, and scales them by Froude to the solver's breaking height. It never extrapolates: outside the
 * cases it clamps and says so. Only + − × ÷ and √, for online determinism.
 */
export const PROFILE_POINTS = 128;
export const LANDMARK = { back: 0, crest: 32, lip: 64, throat: 88, toe: 112, front: 127 } as const;

export interface BarrelCase {
  id: string;
  slope: number;
  nonlinearity: number;
  flatDepth: number;
  breakerHeight: number;
  tauStep: number;
  tauStart: number;
  touchdown: number;
  frames: Float32Array;
}
export interface ProfileQuery { slope: number; nonlinearity: number; height: number; seconds: number }
export interface ProfileLookup { caseId: string; clamped: boolean; scale: number; phase: 'pre' | 'open' | 'post' }

const FLOATS = 2 * PROFILE_POINTS;
/** A slice whose slope is this far (relative) from every case's is outside the library. */
const SLOPE_TOLERANCE = 0.2;

export class ProfileLibrary {
  private readonly bySlope: BarrelCase[][];
  private readonly scratch = new Float32Array(FLOATS);

  constructor(cases: readonly BarrelCase[]) {
    const groups = new Map<number, BarrelCase[]>();
    for (const c of cases) groups.set(c.slope, [...(groups.get(c.slope) ?? []), c]);
    this.bySlope = [...groups.values()].map((group) => [...group].sort((a, b) => a.nonlinearity - b.nonlinearity));
  }

  profileAt(query: ProfileQuery, out: Float32Array): ProfileLookup {
    let group = this.bySlope[0];
    for (const candidate of this.bySlope) if (Math.abs(candidate[0].slope - query.slope) < Math.abs(group[0].slope - query.slope)) group = candidate;
    let clamped = Math.abs(group[0].slope - query.slope) > SLOPE_TOLERANCE * query.slope;
    let lower = group[0];
    let upper = group[group.length - 1];
    let weight = 0;
    if (query.nonlinearity <= lower.nonlinearity) {
      clamped ||= query.nonlinearity < lower.nonlinearity;
      upper = lower;
    } else if (query.nonlinearity >= upper.nonlinearity) {
      clamped ||= query.nonlinearity > upper.nonlinearity;
      lower = upper;
    } else {
      for (let k = 0; k + 1 < group.length; k += 1) {
        if (group[k].nonlinearity <= query.nonlinearity && query.nonlinearity <= group[k + 1].nonlinearity) {
          lower = group[k];
          upper = group[k + 1];
          weight = (query.nonlinearity - lower.nonlinearity) / (upper.nonlinearity - lower.nonlinearity);
          break;
        }
      }
    }
    const breakerHeight = lower.breakerHeight + weight * (upper.breakerHeight - lower.breakerHeight);
    const scale = query.height / breakerHeight;
    const tau = query.seconds / Math.sqrt(scale / GRAVITY);
    this.frameAt(lower, tau, out);
    if (upper !== lower) {
      this.frameAt(upper, tau, this.scratch);
      for (let i = 0; i < FLOATS; i += 1) out[i] += weight * (this.scratch[i] - out[i]);
    }
    for (let i = 0; i < FLOATS; i += 1) out[i] *= scale;
    const touchdown = lower.touchdown + weight * (upper.touchdown - lower.touchdown);
    const phase = tau < 0 ? 'pre' : tau <= touchdown ? 'open' : 'post';
    return { caseId: weight < 0.5 ? lower.id : upper.id, clamped, scale, phase };
  }

  /** One case's profile at τ (√(h0/g)), linear between its two nearest frames, clamped to its first and last. */
  private frameAt(c: BarrelCase, tau: number, out: Float32Array): void {
    const count = c.frames.length / FLOATS;
    const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(count - 1, f + 1);
    const t = position - f;
    for (let i = 0; i < FLOATS; i += 1) {
      const a = c.frames[f * FLOATS + i];
      out[i] = a + t * (c.frames[next * FLOATS + i] - a);
    }
  }
}
```

- [ ] **Step 5: Run the tests**; expected PASS.
- [ ] **Step 6: Commit** the three files, with the message "feat(barrel): the profile library's binary form and its lookup by slope, height and τ".

### Task 3: The conversion, the index and the validation table

**Files:**
- Create: `src/wave/barrel/caseFromLibrary.ts`, `src/wave/barrel/caseFromLibrary.test.ts`, `scripts/barrel-library.ts`, `docs/research/barrel-library.md`
- Generated: `public/barrels/<id>.bin`, `src/wave/barrel/barrelLibraryIndex.ts`
- Modify: `package.json`: `"barrels": "rolldown scripts/barrel-library.ts -o dist/scripts/barrel-library.mjs --format esm --platform node && node dist/scripts/barrel-library.mjs"`

**Interfaces:**
- Consumes: `library.py` JSON (Task 1); `encodeCase`, `BarrelCase` (Task 2).
- Produces:
  - `caseFromLibrary(json: LibraryJson, id: string, flatDepth: number): { barrel: BarrelCase; refilled: number }`;
  - `BARREL_CASES: readonly { id: string; slope: number; nonlinearity: number; flatDepth: number; asset: string }[]`, generated;
  - `loadBarrelLibrary(): Promise<ProfileLibrary>`: fetch in the browser, `fs` in node, as the lesson waves are read.

- [ ] **Step 1: Write the failing test** on the round-6 sample (`docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json`, on `main`):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { caseFromLibrary } from './caseFromLibrary';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';

const sample = JSON.parse(readFileSync('docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json', 'utf8'));

describe('a Basilisk library as a barrel case', () => {
  it('keeps every frame, re-origins x on the crest at the vertical face, and times touchdown', () => {
    const { barrel, refilled } = caseFromLibrary(sample, 'padang-ray-l11', 0.1785714);
    const frames = barrel.frames.length / (2 * PROFILE_POINTS);
    expect(frames).toBe(sample.frames.length);
    expect(barrel.slope).toBeCloseTo(0.0403226, 7);
    expect(barrel.nonlinearity).toBe(0.3);
    expect(barrel.touchdown).toBeCloseTo(sample.run.t_impact - sample.run.t_vertical, 9);
    expect(barrel.tauStart).toBeCloseTo(sample.frames[0].tau, 9);
    // The frame nearest τ = 0 has its crest at x ≈ 0.
    const zero = Math.round((0 - barrel.tauStart) / barrel.tauStep);
    expect(Math.abs(barrel.frames[(zero * PROFILE_POINTS + LANDMARK.crest) * 2])).toBeLessThan(0.2);
    expect(refilled).toBeGreaterThanOrEqual(0);
    expect(barrel.frames.every((v) => Number.isFinite(v))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail.**
- [ ] **Step 3: Implement `caseFromLibrary`:**
  - frames in order;
  - `tauStep` from the first two frames;
  - `breakerHeight`: H of the last `open` frame;
  - x minus the crest's x at the frame nearest τ = 0;
  - frames with flags filled linearly from their clean neighbours, counted in `refilled`.

  Then implement the script:
  - it reads every `tools/basilisk/runs/*_library.json` it is given (`--run pad19_a30_L12 --flat 0.1785714`);
  - it writes `public/barrels/<id>.bin` and the index, with the generated-file header "Generated by `npm run barrels` — do not edit.", as `lessonWaves.ts` has;
  - it writes the validation table from each `_metrics.json`: A_O/H_I², A_J/H_I², W/L and θ_O at the last frame before touchdown, beside Pick & Feddersen's ψ0 fits (the forms round 6 §2.1 records). For Padang Padang it adds L/W against Mead & Black's 1.42–3.43 and Padang Padang's own 1.97–2.14 (spec, Judging Part B 2).
- [ ] **Step 4: Run the test**; expected PASS. Then run `npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --flat 0.1785714` on the finished runs.
- [ ] **Step 5: Write `docs/research/barrel-library.md`.** It covers:
  - the cases;
  - the validation table;
  - wall times;
  - landmark cleanliness;
  - the level-13 comparison when the owner's run lands;
  - how to add a case.

  Values are tagged measured, modelled or inferred.
- [ ] **Step 6: Commit and open PR 1**, with the `.bin` sizes in the body. It targets `main` once Part A has merged, and stacks on `claude/padang-padang` until then.

---

## PR 2 · The slice clock and onset

> **Revised 2026-09-30, as built (the advisor's rulings and three probes).** Tasks 4–6 changed in four ways:
> - **The onset is the solver's own Kennedy onset, not B = U/C.** At Padang Padang's breaking crests the depth-averaged U/C reads 0.1–0.5, no different from calm crests: q ≈ cη makes U/C ≈ η/(h + η). Derakhti's 0.85/1.0 and Bacigaluppi's 0.75 are for the reconstructed surface velocity (`padangFront` probe).
> - **The breaking age records the event, not the column.** A newly breaking cell takes the oldest age behind its face, including one column along the crest, so age-backdated onsets were equal along 60–90 m of peeling crest. A point's onset is therefore when its own segment first breaks.
> - **The throw lags the onset.** On round 6's transect the solver's crest stands where Basilisk's does, but Kennedy fires 2.3–2.8 √(h0/g) before the face goes vertical (`kennedyLag` probe). This is an upper bound for swell (solitary waves break higher: Grilli et al. 1997).
> - **No stage clamp on the clock.** Mihalef's rule is for the loft's slices (PR 3).

### Task 4: The crest and its breaking, column by column

**Files:** `src/wave/barrel/crestOnset.ts`, `src/wave/barrel/crestOnset.test.ts`

**Interfaces:**
- `ONSET = { join: 0 } as const`: a crest joins its front when its segment's Kennedy strength exceeds this.
- `columnCrests(solver, breaking: { strength }, fromRow, minHeight, out: CrestSample[]): number`. Every column's crests (strict local maxima above `minHeight`), each with its segment's strongest breaking (the crest to 10 m shoreward) and the still depth under it.
- `CrestSample = { column, row, x, z, eta, strength, depth, b, speed }`. `b` = U/C is a logged diagnostic, NaN when the crest is slower than 0.5 √(gh).

- [x] **Tests:** one crest per column at the bump's peak; the segment's strongest breaking (not behind the crest, not past the face's reach); U/C as a diagnostic, NaN below the speed floor; two bumps 15 m apart are two samples (Review Focus 5); the height and first-row filters.

### Task 5: The breaking front as lines

**Files:** `src/wave/barrel/BreakingFront.ts`, `src/wave/barrel/BreakingFront.test.ts`

**Interfaces:**
- `new BreakingFront(cell)`, where `cell` is the rows' spacing, m.
- `update(samples, count, time)`, `points`, `exportState()` and `importState(state)`.
- `FrontPoint = { id, front, column, sigma, x, z, b, height, joined, depth, tau, seen }`.
- `FrontState = { nextId, nextFront, points, held }`.

**The rule:**
- A crest whose segment breaks joins a front. It records `joined` (the time) and `depth` (the still depth under it).
- Neighbouring columns within 3 rows link; a column's own crests never do.
- A point within 2 m plus one row of last step's point in its column keeps its ID, join and clock.
- A point unseen for 0.5 s is dropped. σ is the arc length from the −x end.
- Only + − × ÷ and √.

- [x] **Tests:** an oblique line is one front, σ its arc length; IDs, joins and clocks kept as the crest moves; joins and depths recorded; no join without breaking; a whole-row jump on a 2 m grid kept; two crests are two fronts; a split at five empty columns keeps both sides' IDs; flicker held for 0.5 s, then dropped; export and import.

### Task 6: The slice clock

**Files:** `src/wave/barrel/sliceClock.ts`, `src/wave/barrel/sliceClock.test.ts`

**Interfaces:**
- `CLOCK = { smoothing: 2, bunched: 0.1, earliest: -3 } as const`.
- `onsetTiming(h0): OnsetTiming = { lag(depth), earliest }`. The measured lag (0.237 → 2.34, 0.35 → 2.60, 0.50 → 2.82 √(h0/g), keyed on the join's depth over h0) is interpolated, never extrapolated.
- `advanceClocks(points, time, timing): number` returns the pauses.

**The rule:**
- A point throws at `joined + lag(depth)`. Before that, τ is negative, floored at the library's earliest frame. The front's newest end therefore reads the steepening frames, and PR 3 blends it into the height field over 2–3 m; there is no taper.
- Throw times are fitted along each front by a biweight-weighted local line (2 m standard deviation), clamped to the window's throws. A single point uses its own throw; bunched points use the mean.
- τ = time − the fitted throw. A new point starts there; after that τ never falls, and every pause is counted.

- [x] **Tests:** the throw a lag after the join; the earliest-frame floor; a steady 10 m/s peel exact to its leading edge with no pauses; grouped joins become a 0.1 s/m ramp; never back, pauses counted; one point, and bunched points; fronts independent; the lag table interpolated and clamped.

### Task 7: Padang Padang's front in the simulation, and in the handover

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts`: construction, `afterWater` after `markBreakingOnsets`, and the state's export and import
- Modify: `src/wave/surfZoneState.ts`: `front?: FrontState` in `SurfZoneState`, in the encoder's JSON header and the decoder
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/wave/surfZoneState.test.ts`

**Interfaces:**
- Consumes: Tasks 4–6. The clock no longer needs the library's stage length (Task 6's revision).
- Produces:
  - `SWEPT_BARREL: readonly SpotName[] = ['padang']`;
  - `SurfZoneSimulation.front?: BreakingFront`, present only on those spots;
  - the handover carries `front`.

- [ ] **Step 1: Write the failing tests:**
  - Padang Padang's Small swell, run 60 s, has at least one front whose thrown points' τ spans over 0.5 s;
  - the Canyon has no `front`; Padang Padang's state arrays and lip counters equal a run with the front switched off (`sweptBarrel: false`), so the front only reads the water;
  - a Padang Padang sea exported at 50 s and imported into a fresh simulation steps to 55 s with `front.points` equal to the donor's (Review Focus 3).
- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement.**
  - Construct the front (`new BreakingFront(fineSpacing)`) when `config.sweptBarrel ?? SWEPT_BARREL.includes(config.spot)`.
  - In `afterWater`:
    1. `columnCrests(solver, breaking, …)` from the fine zone's first row, with `minHeight` = 0.25 × the edge height;
    2. `front.update(samples, count, solver.time)`;
    3. `advanceClocks(front.points, solver.time, onsetTiming(PADANG.baseDepth + tide))`, its pauses summed in `frontPauses`.
  - Include the front in the state's export and import.
- [ ] **Step 4: Run the tests, then the suites:** `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "front|Canyon"` and `npx vitest run src/wave/surfZoneState.test.ts`; expected PASS. Then `npx vitest run src/wave src/game` for regressions.
- [ ] **Step 5: Measure the cost** on the M1: the step time with and without the front over 60 s. Report it in `docs/research/barrel-library.md`.
- [ ] **Step 6: Commit and open PR 2**, with the message "feat(barrel): Padang Padang's breaking front and slice clocks, carried in the sea handover".

---

## After PR 2

Write the detailed plans for PRs 3–7 (the mesh, the contact, the crash curve, the shading, the rollout) from the library and clock as built. PR 3's loft takes Mihalef's rule from the clock (the advisor, 2026-09-30):
- neighbouring loft slices differ by at most 2–4 library frames, met by resampling the front finer (0.5 m, down to 0.25 m where the open curl spans under about 8 slices), not by clamping the clock;
- only when the vertex budget would be exceeded is |dτ/dσ| clamped to T_open/(4·Δσ) (at least 4 slices across the curl), and each clamp is counted. Consult the water-physics advisor before settling any shape value (the lip glow's k, the seam's band width, the contact's softness). Open item from the onset's lag (the advisor, 2026-09-30): the solver's Kennedy onset leads the lip by about 2 s and 20 m on Padang Padang's wedge, and the foam, aeration, Kennedy-driven whitewater and crash sound all key on it. Where the swept barrel runs, Rich's whitewater and the sound should start from the barrel's clock (foam from touchdown, as in the roller handover). That is visuals only, so one-water is unaffected. Agree it with the whitewater (G9) owner before building; it belongs with PR 5 or PR 6.

PR 4's interface is agreed with the Reef session, which owns tube riding (Part D):
- water or air at a point, with the surface's height, normal and velocity;
- whether the rider is covered, and the clearance;
- the tube's state at the rider's slice;
- the crash curve.
