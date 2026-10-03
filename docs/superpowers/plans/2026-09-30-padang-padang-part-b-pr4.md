# Padang Padang Part B, PR 4 (the contact) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At Padang Padang the board and rider collide with the same swept surface that PR 3 draws: a wave-attached signed distance (by parity along a vertical line) through `SurfWater`, with the lip's own flow and the fields Part D's tube riding needs.

**Architecture:** The worker builds the same `SweptLoft` each step from the same front records (in a contact mode: the geometry held one frame before touchdown, overturned slices under full weight cut at 0.5), and `SweptContact` answers a point's water or air by counting the lofted triangles a vertical line crosses above it (half-open, closed down to the seabed). `PhysicalSurfWater` asks the contact instead of carving at a swept spot; the rider feels the curl's water from below through a ceiling share. The page fetches the barrel case bytes once and hands them to the worker for the contact and to `SweptBarrel` for the drawing.

**Tech Stack:** TypeScript, Vitest, three.js (untouched here), Web Worker structured clone.

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md` (§Part B 13.5 "the rider collides with the same surface, in wave-attached coordinates"; Judging Part B 3 "Drawing and contact agree"; Coordination "what Part D's tube riding needs from the contact"). The advisor's PR 4 rulings (2026-09-30, their consult log) are quoted in each task.

## Global Constraints

- Every value is sourced or marked provisional, and nothing is hand-shaped.
- Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical. PR 4 draws nothing new.
- Performance is measured, never a gate. Target an M4 Pro; an M1 Air may run slowly.
- Don't change the Reef (Teahupo'o): the contact runs only where `BARREL_SLOPE` has the spot (Padang Padang).
- The loft and the contact use only + − × ÷ and √ (online determinism: each client runs its own sea).
- Work in `.claude/worktrees/padang-barrel` on `claude/padang-contact`, stacked on `claude/padang-mesh` (#92). Never touch other sessions' worktrees.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A point exactly on a shared triangle edge, or on the lip's fold line**: counted once across neighbours, both or neither at a fold, so parity holds (Task 3 pins it).
2. **A front's ends and fading slices**: an overturned slice under full weight is either whole or gone in the contact, never a squashed lip; the cuts are counted (Task 2 pins it).
3. **The barrel files fail to load (offline, 404)**: the start still succeeds and the rider rides the carved water as before (Task 6 pins it).
4. **A sea handover or a restore mid-tube**: the contact holds no state of its own; the same records give the same answers in a fresh contact (Task 3 pins it).
5. **The rider's feet or head inside the lip's water**: the lip's force acts, but "feet under water" is kept for real submersion (Task 5 pins it).

---

## File Structure

- Modify `src/wave/barrel/ProfileLibrary.ts`: `BarrelCase.tipVelocity`; `ProfileLookup.tipAlong/tipUp/clearSeconds`; `profileTimes().clearSeconds`.
- Modify `src/wave/barrel/caseFromLibrary.ts`: `tipVelocities()` (±4-frame local line).
- Modify `src/wave/barrel/profileFormat.ts`: BRL2 (tip velocities after the frames); BRL1 still decodes.
- Modify `src/wave/barrel/toyCase.ts`: `tubeCase()` (an overturned toy with a known tube).
- Modify `scripts/barrel-library.ts`: the tip table; rebuild `public/barrels/*.bin`, `docs/research/barrel-cases.md`.
- Modify `src/wave/barrel/sweptLoft.ts`: contact mode, per-slice ray/weight/overturn/tip/anchor velocity/joins, heights only where needed.
- Create `src/wave/barrel/sweptContact.ts`: `SweptContact`, `ContactHit`, `CONTACT`, `tubeState()`.
- Create `src/wave/barrel/nodeBarrelCases.ts`: `readBarrelCases()` for node tests and probes.
- Modify `src/wave/barrel/barrelLibrary.ts`: `loadBarrelCaseBytes()`, `libraryFromBytes()`.
- Modify `src/physics/SurfWater.ts`: the optional layer and Part D fields, `TubeState`.
- Modify `src/physics/PhysicalSurfWater.ts`: `swept` option, `plainSurfaceAt`, the contact in `sampleAt`/`surfaceAt`, the lip flow ramp.
- Modify `src/physics/AttachedRider.ts`: the floor and ceiling wet shares; the feet rule.
- Modify `src/wave/SurfZoneRunner.ts`: `barrelCases` option, the contact per step, no parcel strikes at a swept spot.
- Modify `src/game/PhysicalMode.ts`, `src/main.ts`, `src/scene/barrel/SweptBarrel.ts`: the bytes fetched once, handed to the host and the drawing.
- Create `src/wave/probes/padangContact.probe.test.ts`: cost and diagnostics.
- Modify `docs/research/barrel-library.md`: "The contact".

---

### Task 1: The lip tip's velocity in the library

The advisor's ruling 1: "Take the TIP landmark's velocity, smoothed OFFLINE ... Smooth with a local linear fit over ±4 frames (±0.1 τ). Store it in the converter: two floats per frame (a smoothed tip velocity), interpolated by τ. Scale it by √(g·h0_slice) × the slice clock's rate". The clock's rate is 1 (τ runs with time; pauses hold it), a ledger ruling.

**Files:**
- Modify: `src/wave/barrel/ProfileLibrary.ts`, `src/wave/barrel/caseFromLibrary.ts`, `src/wave/barrel/profileFormat.ts`, `src/wave/barrel/toyCase.ts`, `scripts/barrel-library.ts`
- Test: `src/wave/barrel/caseFromLibrary.test.ts`, `src/wave/barrel/ProfileLibrary.test.ts`, `src/wave/barrel/profileFormat.test.ts` (create if absent; else add to the existing format test)
- Regenerate: `public/barrels/*.bin`, `src/wave/barrel/barrelLibraryIndex.ts`, `docs/research/barrel-cases.md`

**Interfaces:**
- Produces: `BarrelCase.tipVelocity?: Float32Array` (frames × 2, √(g h0)); `tipVelocities(frames: Float32Array, step: number): Float32Array`; `TIP_FIT_FRAMES = 4`; `ProfileLookup.tipAlong: number`, `tipUp: number` (m/s), `clearSeconds: number`; `profileTimes(...)` also returns `clearSeconds`; `tubeCase(nonlinearity: number): BarrelCase`.

- [ ] **Step 1: Write the failing tests**

In `caseFromLibrary.test.ts`:

```ts
import { tipVelocities, TIP_FIT_FRAMES } from './caseFromLibrary';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';

describe('the lip tip’s velocity', () => {
  it('recovers a steady tip’s velocity by a local line, one-sided at the ends', () => {
    const count = 12;
    const step = 0.025;
    const frames = new Float32Array(count * 2 * PROFILE_POINTS);
    for (let f = 0; f < count; f += 1) {
      frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip] = 0.8 * f * step;
      frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip + 1] = 1 - 0.3 * f * step;
    }
    const v = tipVelocities(frames, step);
    for (let f = 0; f < count; f += 1) {
      expect(v[2 * f]).toBeCloseTo(0.8, 4);
      expect(v[2 * f + 1]).toBeCloseTo(-0.3, 4);
    }
    expect(TIP_FIT_FRAMES).toBe(4);
  });

  it('smooths a tip that steps a cell at a time', () => {
    const count = 20;
    const frames = new Float32Array(count * 2 * PROFILE_POINTS);
    // A landmark stepping 0.01 h0 every other frame: 0.2 h0/τ on average at a 0.025 step.
    for (let f = 0; f < count; f += 1) frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip] = 0.01 * Math.floor(f / 2);
    const v = tipVelocities(frames, 0.025);
    for (let f = TIP_FIT_FRAMES; f < count - TIP_FIT_FRAMES; f += 1) expect(v[2 * f]).toBeCloseTo(0.2, 1);
  });
});
```

and in the existing conversion test on round 6's sample, `expect(barrel.tipVelocity!.length).toBe(2 * barrel.frames.length / (2 * PROFILE_POINTS))`.

In `ProfileLibrary.test.ts`:

```ts
import { GRAVITY } from '../dispersion';
import { tubeCase } from './toyCase';

it('gives the tip’s velocity in m/s, scaled by √(g h0), and the last clear time a frame before touchdown', () => {
  const c = tubeCase(0.3);
  const library = new ProfileLibrary([c]);
  const out = new Float32Array(2 * PROFILE_POINTS);
  const lookup = library.profileAt({ slope: c.slope, footHeight: 2.1, footDepth: 7, seconds: 0.1 }, out);
  // One case: h0 = 2.1 / 0.3 = 7 m.
  expect(lookup.tipAlong).toBeCloseTo(0.9 * Math.sqrt(GRAVITY * 7), 4);
  expect(lookup.tipUp).toBeCloseTo(-0.3 * Math.sqrt(GRAVITY * 7), 4);
  expect(lookup.clearSeconds).toBeCloseTo((c.touchdown - c.tauStep) * Math.sqrt(7 / GRAVITY), 6);
  expect(library.profileTimes({ slope: c.slope, footHeight: 2.1, footDepth: 7 }).clearSeconds).toBe(lookup.clearSeconds);
});
```

In the format test:

```ts
import { decodeCase, encodeCase } from './profileFormat';
import { tubeCase } from './toyCase';

it('round-trips a case with its tip velocities (BRL2), and reads a BRL1 file with none', () => {
  const c = tubeCase(0.3);
  const back = decodeCase(encodeCase(c));
  expect(Array.from(back.frames)).toEqual(Array.from(c.frames));
  expect(Array.from(back.tipVelocity!)).toEqual(Array.from(c.tipVelocity!));
  const old = encodeCase(c).slice();
  new DataView(old.buffer).setUint32(0, 0x42524c31, true);
  const trimmed = old.subarray(0, old.length - c.tipVelocity!.length * 4);
  const legacy = decodeCase(trimmed);
  expect(legacy.frames.length).toBe(c.frames.length);
  expect(legacy.tipVelocity).toBeUndefined();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/wave/barrel`
Expected: FAIL (`tipVelocities`, `tubeCase`, `tipAlong` undefined).

- [ ] **Step 3: The toy tube**

Append to `src/wave/barrel/toyCase.ts`:

```ts
/**
 * An overturned toy for the contact's tests (h0 units, x forward from the crest): before τ = 0 a tent, from τ = 0 a
 * tube whose lip's top runs (0, 0.8) → tip (1.2, 0.5), its underside back to the throat (0.6, 0.6), the face down to the
 * toe (0.8, 0) and on flat to (2, 0). The back rises from (−2, 0). Straight segments between landmarks, so the tube's
 * crossings are known: at x = 1 h0 the flat at 0, the underside at 0.7 − 1/6 and the top at 0.55. The tip runs at
 * (0.9, −0.3) √(g h0) throughout.
 */
export function tubeCase(nonlinearity: number): BarrelCase {
  const frames = 5;
  const floats = 2 * PROFILE_POINTS;
  const data = new Float32Array(frames * floats);
  const line = (i: number, from: number, to: number, a: [number, number], b: [number, number]): [number, number] => {
    const t = (i - from) / (to - from);
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  };
  const tube = (i: number): [number, number] =>
    i <= LANDMARK.crest ? line(i, 0, LANDMARK.crest, [-2, 0], [0, 0.8])
      : i <= LANDMARK.lip ? line(i, LANDMARK.crest, LANDMARK.lip, [0, 0.8], [1.2, 0.5])
        : i <= LANDMARK.throat ? line(i, LANDMARK.lip, LANDMARK.throat, [1.2, 0.5], [0.6, 0.6])
          : i <= LANDMARK.toe ? line(i, LANDMARK.throat, LANDMARK.toe, [0.6, 0.6], [0.8, 0])
            : line(i, LANDMARK.toe, LANDMARK.front, [0.8, 0], [2, 0]);
  const tent = (i: number): [number, number] =>
    i <= LANDMARK.crest ? line(i, 0, LANDMARK.crest, [-2, 0], [0, 0.8]) : line(i, LANDMARK.crest, LANDMARK.front, [0, 0.8], [2, 0]);
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      const [x, y] = f < 2 ? tent(p) : tube(p);
      data[f * floats + 2 * p] = x;
      data[f * floats + 2 * p + 1] = y;
    }
  }
  const tipVelocity = new Float32Array(2 * frames);
  for (let f = 0; f < frames; f += 1) {
    tipVelocity[2 * f] = 0.9;
    tipVelocity[2 * f + 1] = -0.3;
  }
  return {
    id: `tube-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.8, tauStep: 0.25, tauStart: -0.5,
    touchdown: 0.5, frames: data, tipVelocity,
  };
}
```

- [ ] **Step 4: The converter**

In `caseFromLibrary.ts`, export and use:

```ts
/** The tip's fit: a least-squares line over ±this many frames (±0.1 τ at the cases' 0.025 step; the advisor, 2026-09-30). */
export const TIP_FIT_FRAMES = 4;

/**
 * The lip tip's velocity per frame, in √(g h0): the slope of a least-squares line through its positions over
 * ±TIP_FIT_FRAMES frames, fewer at the ends. Landmarks step a cell at a time, so frame-to-frame differences quantise
 * at about 0.33 C (the advisor's ruling 1).
 */
export function tipVelocities(frames: Float32Array, step: number): Float32Array {
  const floats = 2 * PROFILE_POINTS;
  const count = frames.length / floats;
  const out = new Float32Array(2 * count);
  for (let i = 0; i < count; i += 1) {
    const from = Math.max(0, i - TIP_FIT_FRAMES);
    const to = Math.min(count - 1, i + TIP_FIT_FRAMES);
    if (to === from) continue;
    const mean = (from + to) / 2;
    let sxx = 0;
    let sx = 0;
    let sy = 0;
    for (let k = from; k <= to; k += 1) {
      const d = k - mean;
      sxx += d * d;
      sx += d * frames[k * floats + 2 * LANDMARK.lip];
      sy += d * frames[k * floats + 2 * LANDMARK.lip + 1];
    }
    out[2 * i] = sx / sxx / step;
    out[2 * i + 1] = sy / sxx / step;
  }
  return out;
}
```

and in `caseFromLibrary`'s returned barrel: `tipVelocity: tipVelocities(frames, step),` (after the re-origin; a shift doesn't change a slope).

- [ ] **Step 5: The format (BRL2)**

In `profileFormat.ts`: `const MAGIC = 0x42524c32; // "BRL2"` and `const LEGACY = 0x42524c31; // "BRL1": frames only`. The layout comment gains `· float32 tip velocities (2 per frame)`. `encodeCase` writes `const tip = c.tipVelocity ?? new Float32Array(2 * (frames.length / (2 * PROFILE_POINTS)));` after the frames (`bytes` length `start + (frames.length + tip.length) * 4`), with `const { frames, tipVelocity, ...meta } = c;` so the header stays metadata. `decodeCase` accepts either magic:

```ts
const magic = view.getUint32(0, true);
if (bytes.byteLength < 8 || (magic !== MAGIC && magic !== LEGACY)) throw new Error('Not a barrel case');
...
const floats = new Float32Array(bytes.slice(start).buffer);
if (magic === LEGACY) return { ...meta, frames: floats };
const count = floats.length / (2 * PROFILE_POINTS + 2);
return { ...meta, frames: floats.slice(0, count * 2 * PROFILE_POINTS), tipVelocity: floats.slice(count * 2 * PROFILE_POINTS) };
```

- [ ] **Step 6: The lookup**

In `ProfileLibrary.ts`: add the fields to `ProfileLookup`:

```ts
  /** The lip tip's velocity, m/s: along the profile's x (the slice's shoreward ray) and up (the advisor's ruling 1). */
  tipAlong: number;
  tipUp: number;
  /**
   * The last τ, s, one frame before touchdown in each case the slice blends: its frames there stand clear of the face
   * (the jet ≥ 2 cells off at level 12), so the contact holds its geometry there after touchdown, never self-crossing.
   */
  clearSeconds: number;
```

In `bracket`: `clear: Math.min(lower.touchdown - lower.tauStep, upper.touchdown - upper.tauStep)`. In `profileAt`, after the frames: `const tip = this.tipAt(b.lower, tau); ... if (b.upper !== b.lower) blend by b.weight`, then `const speed = b.scale / b.unit;` (√(g h0)), returning `tipAlong: tipX * speed, tipUp: tipY * speed, clearSeconds: b.clear * b.unit`. `profileTimes` returns `clearSeconds: b.clear * b.unit` too. The private reader:

```ts
  /** One case's tip velocity at τ, √(g h0), linear between frames as `frameAt` (zero for a BRL1 case). */
  private tipAt(c: BarrelCase, tau: number, into: Float64Array): void {
    into[0] = 0;
    into[1] = 0;
    if (!c.tipVelocity) return;
    const count = c.tipVelocity.length / 2;
    const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
    const f = Math.floor(position);
    const next = Math.min(count - 1, f + 1);
    const t = position - f;
    into[0] = c.tipVelocity[2 * f] + t * (c.tipVelocity[2 * next] - c.tipVelocity[2 * f]);
    into[1] = c.tipVelocity[2 * f + 1] + t * (c.tipVelocity[2 * next + 1] - c.tipVelocity[2 * f + 1]);
  }
```

(two `Float64Array(2)` scratch fields, `tipLower` and `tipUpper`).

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/wave/barrel src/scene/barrel`
Expected: PASS (the loft and mesh tests unchanged).

- [ ] **Step 8: The tip table and the rebuilt cases**

In `scripts/barrel-library.ts`, per case, over its open frames (`phase === 'open'` in the kept library frames, by index into `barrel.tipVelocity`): the median horizontal tip speed, the largest |v|, and the vertical acceleration (a least-squares line of the vertical velocity against τ, in g), all in √(g h0); a `tips` table after Validation:

```md
## The lip tip

The tip landmark's velocity over the open time, a local line over ±4 frames (the contact's lip flow; the advisor's ruling 1), in √(g h0), and its fall in g. The advisor measured padang19s's crest at C = 0.83 √(g h0), the tip at 0.87–0.98 C horizontally and falling at about 0.57 g; Erinin 2023's lips run at 1.1–1.3 C.

| Case | Median horizontal | Largest |v| | Fall (g) |
|---|---|---|---|
```

Then rebuild:

Run: `npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --run periodic_padang19s_L12 --a0 periodic_padang19s_L12=0.1414 --flat 0.1785714`
Expected: `4 cases: pad19-a20-l12, pad19-a30-l12, pad19-a45-l12, periodic-padang19s-l12`; `git diff --stat public/barrels` shows four changed .bin files a few KB larger; the validation table's other columns unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/wave/barrel scripts/barrel-library.ts public/barrels docs/research/barrel-cases.md
git commit -m "feat(barrel): the lip tip's velocity in the library, a local line over ±4 frames (BRL2)"
```

---

### Task 2: The loft in contact mode

The advisor's ruling 2: "Close down AFTER the seam's pinning ... After touchdown the curve must not self-cross ... If an overturned slice has weight < 1, cut at 0.5 deterministically and count it." Trimming the jet needs frames past touchdown the cases don't keep (one past touchdown), so the contact holds each slice's geometry at its last clear frame (`clearSeconds`, a frame before touchdown) and keeps its clock for the tube's state: a ledger ruling, sent to the advisor.

**Files:**
- Modify: `src/wave/barrel/sweptLoft.ts`
- Test: `src/wave/barrel/sweptLoft.test.ts`

**Interfaces:**
- Consumes: Task 1's `tubeCase`, `ProfileLookup.tipAlong/tipUp/clearSeconds`, `profileTimes().clearSeconds`.
- Produces: `new SweptLoft(library, slope, { contact?: boolean })`; `LoftResult` gains `sliceJoined: Uint8Array` (1 when slice s is triangulated to s + 1), `sliceRayX/sliceRayZ: Float32Array`, `sliceWeight: Float32Array`, `sliceOverturned: Uint8Array`, `sliceTipAlong/sliceTipUp: Float32Array` (m/s), `sliceAnchorVX/sliceAnchorVZ: Float32Array` (m/s), `cuts: number`.

- [ ] **Step 1: Write the failing tests**

Append to `sweptLoft.test.ts` (`records`, `flat`, `TOUCHDOWN` as defined there):

```ts
import { tubeCase } from './toyCase';

const tubes = () => new ProfileLibrary([tubeCase(0.3)]);
/** The toy tube's touchdown, s, and its last clear time, at h0 = 7 m. */
const TUBE_UNIT = Math.sqrt(7 / 9.81);

describe('the loft’s slices, for the contact', () => {
  it('records each slice’s ray, weight, joins and whether it overhangs', () => {
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const middle = Math.floor(loft.sliceCount / 2);
    expect(loft.sliceRayX[middle]).toBeCloseTo(0, 6);
    expect(loft.sliceRayZ[middle]).toBeCloseTo(1, 6);
    expect(loft.sliceWeight[middle]).toBe(1);
    expect(loft.sliceOverturned[middle]).toBe(1);
    expect(loft.sliceJoined[middle]).toBe(1);
    expect(loft.sliceJoined[loft.sliceCount - 1]).toBe(0);
    expect(new SweptLoft(tubes(), 0.05).build(records(21, () => -0.2), 21, 0.5, flat).sliceOverturned[middle]).toBe(0);
  });

  it('carries the tip’s velocity, and the anchor’s while it hands over', () => {
    const open = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const middle = Math.floor(open.sliceCount / 2);
    expect(open.sliceTipAlong[middle]).toBeCloseTo(0.9 * Math.sqrt(9.81 * 7), 3);
    expect(open.sliceAnchorVZ[middle]).toBe(0);
    // Thrown 3 m behind the solver's crest, handing over: the anchor runs toward the crest at 3 m / 0.3 s.
    const handing = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.85 * 0.5 * TUBE_UNIT, -103), 21, 0.5, flat);
    expect(handing.sliceAnchorVZ[middle]).toBeGreaterThan(0);
  });

  it('asks the water’s height only where a vertex rests on it', () => {
    let calls = 0;
    const counted = (x: number, z: number) => {
      calls += 1;
      return flat(x, z);
    };
    const loft = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, counted);
    expect(calls).toBeLessThan(loft.vertexCount / 2);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    // The crest: still level + 0.8 h0, exactly.
    expect(loft.positions[3 * (middle + LOFT.extensionSamples + 32) + 1]).toBe(Math.fround(0.5 + 0.8 * 7));
  });

  it('in contact mode cuts overturned slices under full weight at 0.5, and counts them', () => {
    const drawn = new SweptLoft(tubes(), 0.05).build(records(21, () => 0.1), 21, 0.5, flat);
    const contact = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.1), 21, 0.5, flat);
    expect(contact.cuts).toBeGreaterThan(0);
    expect(contact.sliceCount).toBeLessThan(drawn.sliceCount);
    for (let s = 0; s < contact.sliceCount; s += 1) if (contact.sliceOverturned[s]) expect(contact.sliceWeight[s]).toBe(1);
    expect(drawn.cuts).toBe(0);
  });

  it('in contact mode holds the geometry at the last clear frame after touchdown, but keeps the clock', () => {
    const clear = (0.5 - 0.25) * TUBE_UNIT;
    const late = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => 0.5 * TUBE_UNIT + 0.1), 21, 0.5, flat);
    const held = new SweptLoft(tubes(), 0.05, { contact: true }).build(records(21, () => clear), 21, 0.5, flat);
    const middle = Math.floor(late.sliceCount / 2);
    expect(late.sliceTau[middle]).toBeCloseTo(0.5 * TUBE_UNIT + 0.1, 5);
    expect(late.slicePhase[middle]).toBe(2);
    const at = (loft: typeof late) => loft.positions.subarray(3 * middle * LOFT_SAMPLES, 3 * (middle + 1) * LOFT_SAMPLES);
    expect(Array.from(at(late))).toEqual(Array.from(at(held)));
  });
});
```

(The last test's fade: 0.1 s past touchdown gives wFade = 1 − 0.1/0.3 ≈ 0.67 ≥ 0.5, so the overturned slice is kept whole.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/wave/barrel/sweptLoft.test.ts`
Expected: FAIL (`sliceRayX` undefined, constructor takes no options).

- [ ] **Step 3: Implement**

In `sweptLoft.ts`:

1. `export interface LoftOptions { /** Build for the contact (PR 4): see the class comment. */ contact?: boolean }`; the constructor takes `options: LoftOptions = {}` and keeps `private readonly contact: boolean`.
2. `LoftResult` gains the per-slice arrays and `cuts` (documented as in Interfaces), allocated at `MAX_SLICES + 1`; `build` resets `r.cuts = 0`.
3. In `loftFront`, restructure one slice's start:

```ts
      let tau = s.tau;
      // (the budget's clamp, unchanged)
      const times = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth });
      // The contact holds its geometry at the last clear frame, never self-crossing (the advisor's ruling 2); its clock runs on.
      const shapeTau = this.contact ? Math.min(tau, times.clearSeconds) : tau;
      const lookup = this.library.profileAt({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth, seconds: shapeTau }, profile);
      const touchdown = lookup.touchdownSeconds;
      const wFade = tau <= touchdown ? 1 : Math.max(0, 1 - (tau - touchdown) / LOFT.handover);
      if (wFade === 0) {
        closeRun();
        continue;
      }
      const d = Math.min(sigma - f.first, f.last - sigma);
      const r0 = Math.min(1, d / LOFT.endBlend);
      const wEnd = d <= 0 ? 0 : r0 * r0 * (3 - 2 * r0);
      let w = wEnd * wFade;
      let overturned = 0;
      for (let i = LOFT.pinned; i < LAST - LOFT.pinned; i += 1) {
        if (profile[2 * (i + 1)] < profile[2 * i]) {
          overturned = 1;
          break;
        }
      }
      if (this.contact && overturned && w < 1) {
        // A squashed lip is no water: whole from half weight, gone below (the advisor's ruling 2).
        r.cuts += 1;
        if (w < 0.5) {
          closeRun();
          continue;
        }
        w = 1;
      }
      if (r.sliceCount >= MAX_SLICES) break;
```

(the old `wEnd`/`w` lines further down are removed; `maskSlice` keeps using `wFade` and `d`.)

4. The phase: `r.slicePhase[slice] = tau > touchdown ? PHASE.post : PHASE[lookup.phase];`
5. The anchor velocity, in the throw branch:

```ts
        let anchorVX = 0;
        let anchorVZ = 0;
        ...
        } else {
          const u = Math.min(1, (tau - start) / LOFT.handover);
          ax = throwX + u * (crestX - throwX);
          az = throwZ + u * (crestZ - throwZ);
          // The anchor's own motion while it hands over; the solver's crest's is left out (a ledger ruling).
          if (u < 1) {
            anchorVX = (crestX - throwX) / LOFT.handover;
            anchorVZ = (crestZ - throwZ) / LOFT.handover;
          }
        }
```

(declared before the `if (tau >= 0 && ...)`; written to `r.sliceAnchorVX/VZ[slice]`.)
6. Per slice: `r.sliceRayX[slice] = nx; r.sliceRayZ[slice] = nz; r.sliceWeight[slice] = w; r.sliceOverturned[slice] = overturned; r.sliceTipAlong[slice] = lookup.tipAlong; r.sliceTipUp[slice] = lookup.tipUp; r.sliceJoined[slice] = 0;`
7. Heights only where needed, per vertex:

```ts
        const e = w * (1 - pin);
        r.positions[3 * v] = px;
        if (e === 1) {
          r.positions[3 * v + 1] = stillLevel + above;
        } else {
          const h = heightAt(px, pz);
          r.positions[3 * v + 1] = e === 0 ? h : h + e * (stillLevel + above - h);
        }
```

8. `finishRun`: `for (let s = firstSlice; s < lastSlice; s += 1) r.sliceJoined[s] = 1;`
9. The class comment gains: "**Contact mode** (PR 4, the advisor's ruling 2): each slice's geometry is held at its last clear frame after touchdown (its clock and phase run on), and an overturned slice under full weight is whole from half weight and dropped below, counted in `cuts`."

- [ ] **Step 4: Run the loft, mesh and mask tests**

Run: `npx vitest run src/wave/barrel src/scene/barrel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/barrel/sweptLoft.ts src/wave/barrel/sweptLoft.test.ts
git commit -m "feat(barrel): the loft's contact mode: geometry held clear of touchdown, squashed lips cut at 0.5, per-slice rays and velocities"
```

---

### Task 3: The swept contact

The advisor's rulings 2, 5 and 6: close the surface down to the seabed after pinning, count crossings half-open, a vertex once; 'closing' from its own 0.8 T_open (provisional), 'closed' from touchdown until the slice fades, no field at τ < 0; covered = any water above the point in the curl's air, before touchdown.

A vertical line through the loft's triangles (the drawn triangulation, the same code and records) gives the crossings; the closing walls are vertical, so a vertical line never crosses them, and parity needs no seabed test. Crossings at or below the point count as below. Overlapping fronts: the first front's strip that holds the point wins (a ledger ruling).

**Files:**
- Create: `src/wave/barrel/sweptContact.ts`
- Test: `src/wave/barrel/sweptContact.test.ts`

**Interfaces:**
- Consumes: Task 2's `SweptLoft(…, { contact: true })` and `LoftResult` fields; `LOFT`, `LOFT_SAMPLES`; `LANDMARK`.
- Produces:

```ts
export const CONTACT: { cell: 2; closing: 0.8; crossings: 16 };
export type TubeState = 'open' | 'closing' | 'closed';
export function tubeState(life: number): TubeState | undefined;
export interface ContactHit {
  inWater: boolean; surfaceY: number; normalX: number; normalY: number; normalZ: number; floorY: number;
  waterFloorY: number; ceilingY: number; ceilingTopY: number;
  lipShare: number; lipVX: number; lipVY: number; lipVZ: number; tangentX: number; tangentZ: number; life: number;
}
export function createContactHit(): ContactHit;
export class SweptContact {
  constructor(library: ProfileLibrary, slope: number);
  readonly stats: { queries: number; hits: number; anomalies: number };
  last: LoftResult | undefined;
  update(records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number): void;
  query(x: number, y: number, z: number, hit: ContactHit): boolean;
  floorAt(x: number, z: number): number; // NaN where the loft is not
}
```

(`TubeState` lives here; `SurfWater.ts` re-exports it in Task 4.)

- [ ] **Step 1: Write the failing tests**

`src/wave/barrel/sweptContact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { CONTACT, createContactHit, SweptContact, tubeState } from './sweptContact';
import { LOFT, SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';

const STILL = 0.5;
const flat = () => STILL;
const H0 = 7;
const UNIT = Math.sqrt(H0 / 9.81);
/** A straight front along +x at z = −100, thrown there (so the tube stands on z = −100 + along). */
function records(n: number, tau: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
  }
  return out;
}
const library = () => new ProfileLibrary([tubeCase(0.3)]);
const contactAt = (tau: number) => {
  const contact = new SweptContact(library(), 0.05);
  contact.update(records(21, tau), 21, STILL, flat);
  return contact;
};
// The toy at x = 1 h0 (along 7 m, z = −93): the flat, the underside and the top.
const UNDER = STILL + (0.7 - 1 / 6) * H0;
const TOP = STILL + 0.55 * H0;

describe('the swept contact', () => {
  it('reads the tube’s air as air, over the face, under the lip', () => {
    const hit = createContactHit();
    expect(contactAt(0.1).query(10.3, 2.5, -93, hit)).toBe(true);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.ceilingY).toBeCloseTo(UNDER, 3);
    expect(hit.ceilingTopY).toBeCloseTo(TOP, 3);
    expect(hit.floorY).toBeCloseTo(STILL, 4);
    expect(hit.normalY).toBeCloseTo(1, 4);
  });

  it('reads the lip as water with air beneath it, ramped toward the tip’s flow', () => {
    const hit = createContactHit();
    contactAt(0.1).query(10.3, (UNDER + TOP) / 2, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.waterFloorY).toBeCloseTo(UNDER, 3);
    // The top crosses x = 1 h0 at profile index 32 + 32 / 1.2: 5/6 of the way from the crest to the tip.
    expect(hit.lipShare).toBeCloseTo(5 / 6, 2);
    expect(hit.lipVZ).toBeCloseTo(0.9 * Math.sqrt(9.81 * H0), 2);
    expect(hit.lipVY).toBeCloseTo(-0.3 * Math.sqrt(9.81 * H0), 2);
    expect(hit.tangentX).toBeCloseTo(1, 6);
  });

  it('reads under the face as water, and over the lip as air resting on its top', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    contact.query(10.3, 0, -93, hit);
    expect(hit.inWater).toBe(true);
    expect(hit.surfaceY).toBeCloseTo(STILL, 4);
    expect(hit.waterFloorY).toBeNaN();
    contact.query(10.3, 9, -93, hit);
    expect(hit.inWater).toBe(false);
    expect(hit.surfaceY).toBeCloseTo(TOP, 3);
    expect(hit.ceilingY).toBeNaN();
    expect(contact.floorAt(10.3, -93)).toBeCloseTo(STILL, 4);
  });

  it('leaves the water alone beyond the loft', () => {
    const contact = contactAt(0.1);
    const hit = createContactHit();
    expect(contact.query(10.3, 0, -150, hit)).toBe(false);
    expect(contact.query(60, 0, -93, hit)).toBe(false);
    expect(contact.floorAt(60, -93)).toBeNaN();
  });

  it('agrees with the drawing: just above and below each drawn triangle, parity flips there', () => {
    const drawn = new SweptLoft(library(), 0.05).build(records(21, 0.1), 21, STILL, flat);
    const contact = contactAt(0.1);
    const hit = createContactHit();
    const p = drawn.positions;
    let checked = 0;
    for (let t = 0; t < drawn.indexCount; t += 3) {
      const [a, b, c] = [drawn.indices[t], drawn.indices[t + 1], drawn.indices[t + 2]];
      const slice = Math.floor(a / (drawn.vertexCount / drawn.sliceCount));
      if (drawn.sliceWeight[slice] !== 1 || drawn.sliceWeight[slice + 1] !== 1) continue;
      // The tip's fold, where the lip is thinner than the probe's step, is left out.
      const j = a % (drawn.vertexCount / drawn.sliceCount) - LOFT.extensionSamples;
      if (Math.abs(j - 64) <= 1) continue;
      const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
      if (Math.abs(area) < 1e-6) continue;
      const x = (p[3 * a] + p[3 * b] + p[3 * c]) / 3;
      const y = (p[3 * a + 1] + p[3 * b + 1] + p[3 * c + 1]) / 3;
      const z = (p[3 * a + 2] + p[3 * b + 2] + p[3 * c + 2]) / 3;
      expect(contact.query(x, y + 1e-4, z, hit)).toBe(true);
      const above = hit.inWater;
      expect(contact.query(x, y - 1e-4, z, hit)).toBe(true);
      expect(hit.inWater).toBe(!above);
      const nearest = hit.inWater ? hit.surfaceY : hit.ceilingY;
      expect(nearest).toBeCloseTo(y, 3);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('counts a point on an edge two triangles share once, and keeps parity on the fold', () => {
    const contact = contactAt(0.1);
    const loft = contact.last!;
    const hit = createContactHit();
    // The shared diagonal of a face quad (v00 + 1 → v10) under the lip, at its midpoint, 1 m below the surface.
    const slice = Math.floor(loft.sliceCount / 2);
    const v00 = slice * (loft.vertexCount / loft.sliceCount) + LOFT.extensionSamples + 100;
    const v10 = v00 + loft.vertexCount / loft.sliceCount;
    const x = (loft.positions[3 * (v00 + 1)] + loft.positions[3 * v10]) / 2;
    const z = (loft.positions[3 * (v00 + 1) + 2] + loft.positions[3 * v10 + 2]) / 2;
    const y = (loft.positions[3 * (v00 + 1) + 1] + loft.positions[3 * v10 + 1]) / 2;
    contact.query(x, y - 1, z, hit);
    expect(hit.inWater).toBe(true);
    contact.query(x, y + 0.01, z, hit);
    expect(hit.inWater).toBe(false);
    // On the fold: the tip's edge between two slices, shared by the lip's top and underside. Below it the tube's air
    // (the fold counts both or neither), above it air over the lip.
    const tip = slice * (loft.vertexCount / loft.sliceCount) + LOFT.extensionSamples + 64;
    const next = tip + loft.vertexCount / loft.sliceCount;
    const mid = (k: number) => (loft.positions[3 * tip + k] + loft.positions[3 * next + k]) / 2;
    contact.query(mid(0), mid(1) - 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
    contact.query(mid(0), mid(1) + 0.5, mid(2), hit);
    expect(hit.inWater).toBe(false);
  });

  it('gives the tube’s state from its clock, and none before the throw', () => {
    expect(tubeState(Number.NaN)).toBeUndefined();
    expect(tubeState(0.2)).toBe('open');
    expect(tubeState(CONTACT.closing)).toBe('closing');
    expect(tubeState(1)).toBe('closed');
    const hit = createContactHit();
    contactAt(0.1).query(10.3, 2.5, -93, hit);
    expect(hit.life).toBeCloseTo(0.1 / (0.5 * UNIT), 3);
    // τ −0.3 s is −0.36 in the toy's units: between its two tent frames.
    contactAt(-0.3).query(10.3, 0, -100, hit);
    expect(hit.life).toBeNaN();
  });

  it('holds no state of its own: the same records answer the same in a fresh contact', () => {
    const a = contactAt(0.3);
    const b = contactAt(0.1);
    b.update(records(21, 0.3), 21, STILL, flat);
    const ha = createContactHit();
    const hb = createContactHit();
    for (const [x, y, z] of [[10.3, 2.5, -93], [5.2, 4.1, -92.5], [12.7, 0.1, -95]]) {
      expect(a.query(x, y, z, ha)).toBe(b.query(x, y, z, hb));
      expect(hb).toEqual(ha);
    }
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/wave/barrel/sweptContact.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `sweptContact.ts`**

```ts
import { LANDMARK, type ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

/**
 * The contact's constants (the Padang Padang spec, Part B, PR 4):
 * - `cell`, m: the strips' index grid [inferred];
 * - `closing`: a tube is closing from this share of its open time (the advisor's ruling 5: its own constant, provisional);
 * - `crossings`: the most a vertical line meets in one strip (a tube has three; folds add two each) [inferred].
 */
export const CONTACT = { cell: 2, closing: 0.8, crossings: 16 } as const;

export type TubeState = 'open' | 'closing' | 'closed';

/** A tube's state from its life, τ over touchdown (the advisor's ruling 5); none before the throw (NaN). */
export function tubeState(life: number): TubeState | undefined {
  if (!(life >= 0)) return undefined;
  return life < CONTACT.closing ? 'open' : life < 1 ? 'closing' : 'closed';
}

/** What the swept surface says at a point (NaN where a field does not apply). */
export interface ContactHit {
  /** The point lies in the swept surface's water: an odd number of crossings above it. */
  inWater: boolean;
  /** The surface the point answers to: the nearest crossing above in water, below in air; and its normal (out of the water). */
  surfaceY: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  /** The lowest crossing: the face (the water's `surfaceAt`). */
  floorY: number;
  /** In water over air (the curl's water): the curl's underside below the point. */
  waterFloorY: number;
  /** In air under the curl: the curl's underside and top above the point. */
  ceilingY: number;
  ceilingTopY: number;
  /** In the curl's water: its top's place from the crest landmark (0) to the lip tip (1), and the lip's velocity, m/s. */
  lipShare: number;
  lipVX: number;
  lipVY: number;
  lipVZ: number;
  /** The front's tangent at the point (x, z): the solver's flow along it is kept. */
  tangentX: number;
  tangentZ: number;
  /** τ over touchdown where the tube has thrown (NaN before). */
  life: number;
}

export function createContactHit(): ContactHit {
  return {
    inWater: false, surfaceY: Number.NaN, normalX: 0, normalY: 1, normalZ: 0, floorY: Number.NaN, waterFloorY: Number.NaN,
    ceilingY: Number.NaN, ceilingTopY: Number.NaN, lipShare: 0, lipVX: 0, lipVY: 0, lipVZ: 0, tangentX: 1, tangentZ: 0, life: Number.NaN,
  };
}

const S = LOFT_SAMPLES;
const E = LOFT.extensionSamples;

/**
 * The swept barrel's contact (the Padang Padang spec, Part B, PR 4; the advisor's rulings, 2026-09-30): the loft the
 * page draws, built again in the worker from the same front records in contact mode, and a point's water or air by
 * the parity of the lofted triangles a vertical line crosses above it.
 * - **Closing** (ruling 2): each slice's curve is closed down to the seabed past its pinned ends, by vertical walls a
 *   vertical line never crosses, so the crossings alone decide. They are half-open: at or below the point counts as
 *   below, and a point on an edge two triangles share counts in exactly one (on a fold, in both or neither).
 * - **Layers:** in water, the surface is the nearest crossing above (the curl's top in its water, the face under it)
 *   and a crossing below is the curl's underside; in air, the surface is the nearest below and the two above are the
 *   curl's underside and top.
 * - **The lip's flow** (ruling 1): in the curl's water, from the crest landmark (0) to the tip (1) by where its top is.
 * Only + − × ÷ and √. It keeps nothing between steps but the loft.
 */
export class SweptContact {
  readonly stats = { queries: 0, hits: 0, anomalies: 0 };
  last: LoftResult | undefined;
  private readonly loft: SweptLoft;
  /** Per vertex, its along-ray coordinate on its own slice's ray, and (for a joined slice's next) on the previous slice's. */
  private own = new Float32Array(0);
  private prior = new Float32Array(0);
  /** The strips (joined slices s → s + 1) by grid cell: counting-sorted slice indices. */
  private cellStart = new Int32Array(0);
  private cellStrips = new Int32Array(0);
  private x0 = 0;
  private z0 = 0;
  private nx = 0;
  private nz = 0;
  /** One strip's crossings: y, the triangle's first vertex, and the barycentric weights. */
  private readonly ys = new Float64Array(CONTACT.crossings);
  private readonly at = new Int32Array(3 * CONTACT.crossings);
  private readonly weights = new Float64Array(3 * CONTACT.crossings);
  private count = 0;

  constructor(library: ProfileLibrary, slope: number) {
    this.loft = new SweptLoft(library, slope, { contact: true });
  }

  /** Loft the fronts over the water (`heightAt`, uncarved) and index the strips for this step's queries. */
  update(records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number): void {
    const loft = this.loft.build(records, count, stillLevel, heightAt);
    this.last = loft;
    const { positions: p, sliceCount } = loft;
    if (this.own.length < loft.vertexCount) {
      this.own = new Float32Array(loft.positions.length / 3);
      this.prior = new Float32Array(loft.positions.length / 3);
    }
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (let s = 0; s < sliceCount; s += 1) {
      const o = s * S;
      const rx = loft.sliceRayX[s];
      const rz = loft.sliceRayZ[s];
      for (let j = 0; j < S; j += 1) {
        const v = o + j;
        this.own[v] = (p[3 * v] - p[3 * o]) * rx + (p[3 * v + 2] - p[3 * o + 2]) * rz;
        if (s > 0 && loft.sliceJoined[s - 1]) {
          const q = o - S;
          this.prior[v] = (p[3 * v] - p[3 * q]) * loft.sliceRayX[s - 1] + (p[3 * v + 2] - p[3 * q + 2]) * loft.sliceRayZ[s - 1];
        }
        minX = Math.min(minX, p[3 * v]);
        maxX = Math.max(maxX, p[3 * v]);
        minZ = Math.min(minZ, p[3 * v + 2]);
        maxZ = Math.max(maxZ, p[3 * v + 2]);
      }
    }
    this.index(loft, minX, minZ, maxX, maxZ);
  }

  /** The swept surface at (x, y, z) into `hit`; false where the loft is not (the water answers as before). */
  query(x: number, y: number, z: number, hit: ContactHit): boolean {
    this.stats.queries += 1;
    const strip = this.strip(x, z);
    if (strip < 0) return false;
    const loft = this.last!;
    const n = this.count;
    const { ys } = this;
    let above = 0;
    for (let k = 0; k < n; k += 1) if (ys[k] > y) above += 1;
    const below = n - above;
    hit.inWater = (above & 1) === 1;
    hit.floorY = ys[0];
    hit.waterFloorY = Number.NaN;
    hit.ceilingY = Number.NaN;
    hit.ceilingTopY = Number.NaN;
    hit.lipShare = 0;
    let surface: number;
    if (hit.inWater) {
      surface = below;
      if (below > 0) hit.waterFloorY = ys[below - 1];
    } else {
      if (below === 0) {
        // Air under every crossing: the strip is not closed here (a fold at its edge); the water answers.
        this.stats.anomalies += 1;
        return false;
      }
      surface = below - 1;
      if (above >= 2) {
        hit.ceilingY = ys[below];
        hit.ceilingTopY = ys[below + 1];
      }
    }
    hit.surfaceY = ys[surface];
    this.normalAt(loft, surface, hit);
    const f = this.fraction(loft, strip, x, z);
    const rayX = loft.sliceRayX[strip] + f * (loft.sliceRayX[strip + 1] - loft.sliceRayX[strip]);
    const rayZ = loft.sliceRayZ[strip] + f * (loft.sliceRayZ[strip + 1] - loft.sliceRayZ[strip]);
    const length = Math.sqrt(rayX * rayX + rayZ * rayZ);
    hit.tangentX = rayZ / length;
    hit.tangentZ = -rayX / length;
    const la = loft.sliceLife[strip];
    const lb = loft.sliceLife[strip + 1];
    hit.life = la === la ? (lb === lb ? la + f * (lb - la) : la) : lb;
    if (hit.inWater && below > 0) {
      const index = this.profileIndex(surface) - E;
      hit.lipShare = Math.min(1, Math.max(0, (index - LANDMARK.crest) / (LANDMARK.lip - LANDMARK.crest)));
      const lerp = (values: Float32Array) => values[strip] + f * (values[strip + 1] - values[strip]);
      const along = lerp(loft.sliceTipAlong);
      hit.lipVX = (along * rayX) / length + lerp(loft.sliceAnchorVX);
      hit.lipVZ = (along * rayZ) / length + lerp(loft.sliceAnchorVZ);
      hit.lipVY = lerp(loft.sliceTipUp);
    }
    this.stats.hits += 1;
    return true;
  }

  /** The lowest crossing at (x, z): the face; NaN where the loft is not. */
  floorAt(x: number, z: number): number {
    return this.strip(x, z) < 0 ? Number.NaN : this.ys[0];
  }

  /**
   * The strip (joined slices s → s + 1) whose rays bracket (x, z) half-open (on ray s, off ray s + 1) and that a
   * vertical line there crosses, its crossings sorted up in `ys`; −1 if none. The first front's strip wins.
   */
  private strip(x: number, z: number): number {
    const loft = this.last;
    if (!loft || this.nx === 0) return -1;
    const cx = Math.floor((x - this.x0) / CONTACT.cell);
    const cz = Math.floor((z - this.z0) / CONTACT.cell);
    if (cx < 0 || cz < 0 || cx >= this.nx || cz >= this.nz) return -1;
    const cell = cz * this.nx + cx;
    const p = loft.positions;
    for (let k = this.cellStart[cell]; k < this.cellStart[cell + 1]; k += 1) {
      const s = this.cellStrips[k];
      const a = s * S;
      const b = a + S;
      const sideA = (x - p[3 * a]) * loft.sliceRayZ[s] - (z - p[3 * a + 2]) * loft.sliceRayX[s];
      if (sideA < 0) continue;
      const sideB = (x - p[3 * b]) * loft.sliceRayZ[s + 1] - (z - p[3 * b + 2]) * loft.sliceRayX[s + 1];
      if (sideB >= 0) continue;
      if (this.crossings(loft, s, x, z) > 0) return s;
    }
    return -1;
  }

  /** The strip's crossings with the vertical line at (x, z), sorted up; how many. */
  private crossings(loft: LoftResult, s: number, x: number, z: number): number {
    const p = loft.positions;
    const o = s * S;
    const q = (x - p[3 * o]) * loft.sliceRayX[s] + (z - p[3 * o + 2]) * loft.sliceRayZ[s];
    this.count = 0;
    for (let j = 0; j < S - 1; j += 1) {
      const v00 = o + j;
      const v10 = v00 + S;
      const a = this.own[v00];
      const b = this.own[v00 + 1];
      const c = this.prior[v10];
      const d = this.prior[v10 + 1];
      if (q < Math.min(a, b, c, d) || q > Math.max(a, b, c, d)) continue;
      // The drawn quad's two triangles, as the loft winds them.
      this.triangle(p, v00, v10, v00 + 1, x, z);
      this.triangle(p, v00 + 1, v10, v10 + 1, x, z);
    }
    // Insertion sort, keeping each crossing's triangle and weights with its y.
    const { ys, at, weights } = this;
    for (let i = 1; i < this.count; i += 1) {
      for (let k = i; k > 0 && ys[k - 1] > ys[k]; k -= 1) {
        const y = ys[k]; ys[k] = ys[k - 1]; ys[k - 1] = y;
        for (let m = 0; m < 3; m += 1) {
          const t = at[3 * k + m]; at[3 * k + m] = at[3 * k - 3 + m]; at[3 * k - 3 + m] = t;
          const w = weights[3 * k + m]; weights[3 * k + m] = weights[3 * k - 3 + m]; weights[3 * k - 3 + m] = w;
        }
      }
    }
    return this.count;
  }

  /**
   * Whether the vertical line at (x, z) meets triangle (a, b, c), by edge functions computed with each edge's lower
   * vertex first, so neighbours see exactly opposite values; a zero counts for the triangle whose winding runs the
   * edge upward from its lower vertex (with a positive area), so a shared edge counts once and a fold both or neither.
   */
  private triangle(p: Float32Array, a: number, b: number, c: number, x: number, z: number): void {
    const area = this.edge(p, a, b, p[3 * c], p[3 * c + 2]);
    if (area === 0 || this.count >= CONTACT.crossings) return;
    const sign = area > 0 ? 1 : -1;
    const wa = this.edge(p, b, c, x, z);
    if (!this.inside(wa, b, c, sign)) return;
    const wb = this.edge(p, c, a, x, z);
    if (!this.inside(wb, c, a, sign)) return;
    const wc = this.edge(p, a, b, x, z);
    if (!this.inside(wc, a, b, sign)) return;
    const k = this.count;
    this.ys[k] = (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
    this.at[3 * k] = a;
    this.at[3 * k + 1] = b;
    this.at[3 * k + 2] = c;
    this.weights[3 * k] = wa / area;
    this.weights[3 * k + 1] = wb / area;
    this.weights[3 * k + 2] = wc / area;
    this.count += 1;
  }

  /** (v − u) × (point − u) in xz, computed from the lower-numbered vertex so (u, v) and (v, u) differ only in sign. */
  private edge(p: Float32Array, u: number, v: number, x: number, z: number): number {
    const lo = u < v ? u : v;
    const hi = u < v ? v : u;
    const value = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
    return u < v ? value : -value;
  }

  private inside(value: number, u: number, v: number, sign: number): boolean {
    return value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
  }

  /** The crossing's normal: the loft's vertex normals by its weights, normalised. */
  private normalAt(loft: LoftResult, k: number, hit: ContactHit): void {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let m = 0; m < 3; m += 1) {
      const v = this.at[3 * k + m];
      const w = this.weights[3 * k + m];
      nx += w * loft.normals[3 * v];
      ny += w * loft.normals[3 * v + 1];
      nz += w * loft.normals[3 * v + 2];
    }
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    hit.normalX = length > 1e-12 ? nx / length : 0;
    hit.normalY = length > 1e-12 ? ny / length : 1;
    hit.normalZ = length > 1e-12 ? nz / length : 0;
  }

  /** The crossing's place along the loft's samples (its vertices' column indices by its weights). */
  private profileIndex(k: number): number {
    let index = 0;
    for (let m = 0; m < 3; m += 1) index += this.weights[3 * k + m] * (this.at[3 * k + m] % S);
    return index;
  }

  /** How far (x, z) lies from slice s's ray toward s + 1's, 0–1. */
  private fraction(loft: LoftResult, s: number, x: number, z: number): number {
    const p = loft.positions;
    const a = s * S;
    const b = a + S;
    const sideA = (x - p[3 * a]) * loft.sliceRayZ[s] - (z - p[3 * a + 2]) * loft.sliceRayX[s];
    const sideB = (x - p[3 * b]) * loft.sliceRayZ[s + 1] - (z - p[3 * b + 2]) * loft.sliceRayX[s + 1];
    return sideA - sideB > 0 ? sideA / (sideA - sideB) : 0;
  }

  /** Bucket each strip into the grid cells its xz box touches (counting sort). */
  private index(loft: LoftResult, minX: number, minZ: number, maxX: number, maxZ: number): void {
    const strips: number[] = [];
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) if (loft.sliceJoined[s]) strips.push(s);
    if (strips.length === 0) {
      this.nx = 0;
      return;
    }
    this.x0 = minX;
    this.z0 = minZ;
    this.nx = Math.floor((maxX - minX) / CONTACT.cell) + 1;
    this.nz = Math.floor((maxZ - minZ) / CONTACT.cell) + 1;
    const cells = this.nx * this.nz;
    if (this.cellStart.length < cells + 1) this.cellStart = new Int32Array(cells + 1);
    this.cellStart.fill(0, 0, cells + 1);
    const p = loft.positions;
    const box = (s: number) => {
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (let v = s * S; v < (s + 2) * S; v += 1) {
        x0 = Math.min(x0, p[3 * v]);
        x1 = Math.max(x1, p[3 * v]);
        z0 = Math.min(z0, p[3 * v + 2]);
        z1 = Math.max(z1, p[3 * v + 2]);
      }
      return [Math.floor((x0 - this.x0) / CONTACT.cell), Math.floor((x1 - this.x0) / CONTACT.cell), Math.floor((z0 - this.z0) / CONTACT.cell), Math.floor((z1 - this.z0) / CONTACT.cell)];
    };
    const boxes = strips.map(box);
    for (const [a, b, c, d] of boxes) for (let cz = c; cz <= d; cz += 1) for (let cx = a; cx <= b; cx += 1) this.cellStart[cz * this.nx + cx + 1] += 1;
    for (let k = 0; k < cells; k += 1) this.cellStart[k + 1] += this.cellStart[k];
    if (this.cellStrips.length < this.cellStart[cells]) this.cellStrips = new Int32Array(this.cellStart[cells]);
    const fill = this.cellStart.slice(0, cells);
    strips.forEach((s, i) => {
      const [a, b, c, d] = boxes[i];
      for (let cz = c; cz <= d; cz += 1) for (let cx = a; cx <= b; cx += 1) this.cellStrips[fill[cz * this.nx + cx]++] = s;
    });
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/barrel/sweptContact.test.ts`
Expected: PASS. If the drawing test fails on triangles adjacent to the extensions' ends or the pinned samples, check that the drawn and contact lofts share `heightAt` (both `flat`), then that the ledger's cut didn't drop a slice the drawn one kept (the test only takes full-weight slices).

- [ ] **Step 5: Run the barrel tests and commit**

Run: `npx vitest run src/wave/barrel`

```bash
git add src/wave/barrel/sweptContact.ts src/wave/barrel/sweptContact.test.ts
git commit -m "feat(barrel): the swept contact, water or air by the parity of the lofted triangles above a point"
```

---

### Task 4: The water answers from the contact

`SurfWater`'s callers read `surfaceY` as the surface a point answers to; at a swept spot it becomes the contact's (the advisor's endorsed design: "surfaceY switches above and below by parity"), and `surfaceAt` the face (the lowest crossing, as the carve returned the void's floor). The slope comes from the normal with n_y held at 0.1 or more (a ledger value, as the carve's steepest face).

**Files:**
- Modify: `src/physics/SurfWater.ts`, `src/physics/PhysicalSurfWater.ts`
- Test: `src/physics/PhysicalSurfWater.test.ts`

**Interfaces:**
- Consumes: Task 3's `SweptContact`, `createContactHit`, `tubeState`, `TubeState`.
- Produces: `WaterSample.waterFloorY?`, `ceilingY?`, `ceilingTopY?`, `covered?`, `clearance?`, `tube?: TubeState` (reset on every swept sample); `PhysicalSurfWaterOptions.swept?: SweptContact`; `PhysicalSurfWater.plainSurfaceAt(x, z)`; `PhysicalSurfWater.forSimulation(simulation, swept?: SweptContact)` (no carve with a contact).

- [ ] **Step 1: Write the failing tests**

In `PhysicalSurfWater.test.ts` (using the file's `channel()` helper; its domain spans x −10…10, z −10…10; check which way its current runs and put the front's tangent along it):

```ts
import { FRONT_FIELD, FRONT_STRIDE } from '../wave/barrel/frontRecords';
import { ProfileLibrary } from '../wave/barrel/ProfileLibrary';
import { SweptContact } from '../wave/barrel/sweptContact';
import { tubeCase } from '../wave/barrel/toyCase';

/** The toy tube (h0 3 m: foot crest 0.9 m at A0 0.3) on a straight front along +x at z = 0, thrown there. */
function sweptChannel() {
  const { solver, breaking } = channel(3, 1);
  const contact = new SweptContact(new ProfileLibrary([tubeCase(0.3)]), 0.05);
  const water = new PhysicalSurfWater(solver, { peakPeriod: 10, breaking, swept: contact });
  const n = 17;
  const records = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    records[o + FRONT_FIELD.x] = k - 8; records[o + FRONT_FIELD.z] = 0; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
    records[o + FRONT_FIELD.tau] = 0.05; records[o + FRONT_FIELD.footHeight] = 0.9; records[o + FRONT_FIELD.footDepth] = 3;
    records[o + FRONT_FIELD.throwZ] = 0;
  }
  contact.update(records, n, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z));
  return { water, solver };
}
// At x = 0.9 h0 = 2.7 m ahead (z 2.7): the flat below, the underside at 0.55 h0 and the top at 0.575 h0 over still
// water; the top crosses there at profile index 32 + 32 × 0.75, three quarters of the way to the tip.
const UNDER = 0.55 * 3;
const TOP = 0.575 * 3;

describe('the swept contact through the water', () => {
  it('answers the tube’s air with the face below and the curl above, covered and open', () => {
    const { water, solver } = sweptChannel();
    const sample = water.sampleAt(0, solver.restLevel + 1, 2.7, createWaterSample());
    expect(sample.surfaceY).toBeCloseTo(water.plainSurfaceAt(0, 2.7), 2);
    expect(sample.ceilingY).toBeCloseTo(solver.restLevel + UNDER, 2);
    expect(sample.clearance).toBeCloseTo(sample.ceilingY! - (solver.restLevel + 1), 6);
    expect(sample.covered).toBe(true);
    expect(sample.tube).toBe('open');
    expect(sample.waterFloorY).toBeUndefined();
    expect(water.surfaceAt(0, 2.7)).toBeCloseTo(sample.surfaceY, 4);
  });

  it('gives the curl’s water the lip’s flow across the crest, keeping the solver’s along it', () => {
    const { water, solver } = sweptChannel();
    const y = solver.restLevel + (UNDER + TOP) / 2;
    const sample = water.sampleAt(0, y, 2.7, createWaterSample());
    expect(sample.waterFloorY).toBeCloseTo(solver.restLevel + UNDER, 2);
    const plain = new PhysicalSurfWater(solver, { peakPeriod: 10 }).sampleAt(0, y, 2.7, createWaterSample());
    // Along the crest (x) the solver's flow is kept; across it, 3/4 of the way to the tip's 0.9 √(g h0) shoreward, and down.
    expect(sample.flowX).toBeCloseTo(plain.flowX, 6);
    expect(sample.flowZ).toBeCloseTo(0.25 * plain.flowZ + 0.75 * 0.9 * Math.sqrt(9.81 * 3), 1);
    expect(sample.flowY).toBeLessThan(0);
  });

  it('leaves every field out where the loft is not, and a water without a contact as it was', () => {
    const { water } = sweptChannel();
    const far = water.sampleAt(0, 0, 9.5, createWaterSample());
    expect(far.ceilingY).toBeUndefined();
    expect(far.tube).toBeUndefined();
    expect(far.surfaceY).toBe(water.plainSurfaceAt(0, 9.5));
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/physics/PhysicalSurfWater.test.ts`
Expected: FAIL (`swept` option unknown, `plainSurfaceAt` missing).

- [ ] **Step 3: The sample's fields**

In `SurfWater.ts` (import and re-export `TubeState` from `../wave/barrel/sweptContact`):

```ts
  /**
   * Where the swept barrel's surface lies over itself (the Padang Padang spec, Part B, PR 4; absent elsewhere). In the
   * curl's water, its underside below the point, m; in the tube's air, its underside and top above the point.
   */
  waterFloorY?: number;
  ceilingY?: number;
  ceilingTopY?: number;
  /**
   * Part D's tube riding (the Coordination section): the curl's water is above the point before touchdown; the air
   * between the point and the curl's underside, m; and the tube's state where it has thrown.
   */
  covered?: boolean;
  clearance?: number;
  tube?: TubeState;
```

`createWaterSample` sets all six to `undefined` (a stable shape).

- [ ] **Step 4: The water**

In `PhysicalSurfWater.ts`:

```ts
/** A contact normal's least upward part: the slope stays under 10 on a vertical or overhanging face [inferred]. */
const MIN_NORMAL_Y = 0.1;
```

`PhysicalSurfWaterOptions` gains `/** The swept barrel's contact (Part B, PR 4): answers where its loft is, in place of a carve. */ swept?: SweptContact;`. `forSimulation(simulation, swept?: SweptContact)` passes `swept` and passes `carve` only when `swept` is undefined. A field `private readonly hit = createContactHit();`.

`sampleAt`: at its top, `const { swept } = this.options; if (swept) this.clearLayers(out);`; after `this.surface(x, z, out);`:

```ts
    const contact = swept !== undefined && swept.query(x, y, z, this.hit);
    if (contact) this.fromContact(y, out);
```

and before its final `return out;` (the wet path):

```ts
    if (contact && out.waterFloorY !== undefined) this.lipFlow(out);
```

with

```ts
  private clearLayers(out: WaterSample): void {
    out.waterFloorY = undefined;
    out.ceilingY = undefined;
    out.ceilingTopY = undefined;
    out.covered = undefined;
    out.clearance = undefined;
    out.tube = undefined;
  }

  /** The swept surface in place of the render nodes' (the Padang Padang spec, Part B, PR 4). */
  private fromContact(y: number, out: WaterSample): void {
    const hit = this.hit;
    out.surfaceY = hit.surfaceY;
    const up = Math.max(MIN_NORMAL_Y, hit.normalY);
    out.slopeX = -hit.normalX / up;
    out.slopeZ = -hit.normalZ / up;
    out.normalX = hit.normalX;
    out.normalY = hit.normalY;
    out.normalZ = hit.normalZ;
    if (hit.waterFloorY === hit.waterFloorY) out.waterFloorY = hit.waterFloorY;
    if (hit.ceilingY === hit.ceilingY) {
      out.ceilingY = hit.ceilingY;
      out.ceilingTopY = hit.ceilingTopY;
      out.clearance = hit.ceilingY - y;
    }
    out.tube = tubeState(hit.life);
    out.covered = !hit.inWater && hit.ceilingY === hit.ceilingY && !(hit.life >= 1);
  }

  /**
   * The curl's water moves with its lip (the advisor's ruling 1): across the crest and up, the solver's flow ramps to
   * the tip's velocity by where the curl's top is (crest landmark 0, tip 1); along the crest the solver's is kept.
   */
  private lipFlow(out: WaterSample): void {
    const { lipShare: r, tangentX: tx, tangentZ: tz, lipVX, lipVY, lipVZ } = this.hit;
    const along = out.flowX * tx + out.flowZ * tz;
    const lipAlong = lipVX * tx + lipVZ * tz;
    out.flowX = along * tx + (1 - r) * (out.flowX - along * tx) + r * (lipVX - lipAlong * tx);
    out.flowZ = along * tz + (1 - r) * (out.flowZ - along * tz) + r * (lipVZ - lipAlong * tz);
    out.flowY = (1 - r) * out.flowY + r * lipVY;
  }
```

`surfaceAt` becomes:

```ts
  surfaceAt(x: number, z: number): number {
    const { swept } = this.options;
    if (swept && !this.outside(x, z)) {
      const floor = swept.floorAt(x, z);
      if (floor === floor) return floor;
    }
    return this.plainSurfaceAt(x, z);
  }

  /** The render nodes' surface, never the swept contact's: what the contact lofts over. */
  plainSurfaceAt(x: number, z: number): number {
    ...today's surfaceAt body...
  }
```

- [ ] **Step 5: Run the physics tests**

Run: `npx vitest run src/physics`
Expected: PASS (the existing samples are unchanged without a contact).

- [ ] **Step 6: Commit**

```bash
git add src/physics/SurfWater.ts src/physics/PhysicalSurfWater.ts src/physics/PhysicalSurfWater.test.ts
git commit -m "feat(physics): the water answers from the swept contact at a swept spot, with the lip's flow and Part D's fields"
```

---

### Task 5: The rider feels the curl

The advisor's ruling 4: "no new trigger ... A body part whose sphere reaches the lip's underside from the air (clearance < r) must feel it: count its wet share between the underside and the lip's top, the way applyWater subtracts the deck ... If a rule fells the rider when the head reads under water, don't let the lip's water trip it". The attached rider's only such rule is "feet under water".

**Files:**
- Modify: `src/physics/AttachedRider.ts`
- Test: `src/physics/AttachedRider.test.ts`

**Interfaces:**
- Consumes: Task 4's `WaterSample.waterFloorY/ceilingY/ceilingTopY`.
- Produces: nothing new outside the class.

- [ ] **Step 1: Write the failing tests**

In `AttachedRider.test.ts` (beside `WallWater`):

```ts
/** Flat water with a curl overhead from y = `under` to `top` (the tube's air below it), whose water falls at `flow`. */
class CurlWater extends PlaneWater {
  constructor(private readonly under: number, private readonly top: number, private readonly flow: { x: number; y: number; z: number }) {
    super();
  }

  override sampleAt(x: number, y: number, z: number, out: WaterSample) {
    super.sampleAt(x, y, z, out);
    out.waterFloorY = undefined;
    out.ceilingY = undefined;
    out.ceilingTopY = undefined;
    if (y > this.under && y < this.top) {
      out.surfaceY = this.top;
      out.waterFloorY = this.under;
      out.flowX = this.flow.x;
      out.flowY = this.flow.y;
      out.flowZ = this.flow.z;
    } else if (y <= this.under) {
      out.ceilingY = this.under;
      out.ceilingTopY = this.top;
    }
    return out;
  }
}

describe('the curl overhead (the swept barrel, Part B, PR 4)', () => {
  const standing = () => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 6));
    const rider = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(rider);
    run(board, new PlaneWater(), 0.3);
    return { board, rider };
  };

  it('pushes the head down when the curl’s underside reaches it, and not when it clears it', () => {
    const force = (under: number) => {
      const { board, rider } = standing();
      board.step(STEP, new CurlWater(under, under + 0.4, { x: 0, y: -4, z: 6 }));
      return rider.waterForce.y;
    };
    const { rider } = standing();
    const head = rider.partPosition(2, new Vector3()).y;
    expect(force(head + 0.05)).toBeLessThan(force(head + 2) - 50);
  });

  it('keeps “feet under water” for real water: a foot in the curl’s water is not submerged', () => {
    const { board, rider } = standing();
    const foot = board.position.y + 0.2;
    // The curl's water around the feet, air beneath it: no fall for feet under water.
    board.step(STEP, new CurlWater(foot - 0.1, foot + 0.5, { x: 0, y: 0, z: 6 }));
    expect(rider.fallCause).not.toBe('feet under water');
  });
});
```

(Adapt `rider.waterForce` and `rider.fallCause` to the class's actual public names while implementing: grep `waterForce` and the `'feet under water'` return's consumer; if the force is private, read it through the board's reaction totals the other tests use.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/physics/AttachedRider.test.ts -t "curl overhead"`
Expected: the head test FAILS (no ceiling share yet); the feet test may FAIL with 'feet under water'.

- [ ] **Step 3: Implement**

In `applyWater`, replace the wet share and split the force into a helper:

```ts
  private applyWater(slot: number, water: SurfWater, radius: number, volume: number, dragArea: number, h: number, shelter: number, deckY = -Infinity): void {
    const p = this.partWorld;
    const sample = water.sampleAt(p.x, p.y, p.z, this.sample);
    if (!sample.wet || sample.outsideDomain) return;
    // Wet between the surface and what lies under the part: the deck it rests on, or the curl's underside where the
    // part is in the curl's water (the swept barrel, Part B, PR 4).
    const bottom = Math.min(sample.surfaceY, Math.max(deckY, sample.waterFloorY ?? -Infinity));
    const wet = submergedFraction(sample.surfaceY - p.y, radius) - (Number.isFinite(bottom) ? submergedFraction(bottom - p.y, radius) : 0);
    if (wet > 0) this.wetForce(slot, sample, wet, volume, dragArea, h, shelter);
    // A part in the tube's air whose sphere reaches the curl's underside feels the lip: its share between the underside
    // and the top, with the curl's water's own flow (the advisor's ruling 4). Centre-only sampling would jump.
    if (sample.ceilingY !== undefined && sample.ceilingTopY !== undefined && sample.ceilingY - p.y < radius) {
      const share = submergedFraction(sample.ceilingTopY - p.y, radius) - submergedFraction(sample.ceilingY - p.y, radius);
      if (share > 0) {
        const lip = water.sampleAt(p.x, (sample.ceilingY + sample.ceilingTopY) / 2, p.z, this.lipSample);
        if (lip.wet && !lip.outsideDomain) this.wetForce(slot, lip, share, volume, dragArea, h, shelter);
      }
    }
  }

  /** Buoyancy and drag from `sample` on the `wet` share of one body point at `partWorld`, moving at `partVelocity`. */
  private wetForce(slot: number, sample: WaterSample, wet: number, volume: number, dragArea: number, h: number, shelter: number): void {
    const p = this.partWorld;
    ...today's applyWater body from `if (slot >= RIDER_PARTS.length) this.stroking = true;` to its end...
  }
```

with `private readonly lipSample = createWaterSample();`. The bottom's `Math.min(surfaceY, Math.max(deckY, −∞))` equals today's `Math.min(deckY, surfaceY)`, so a water without the fields gives bitwise today's forces.

In the stand check: `if (sample.waterFloorY === undefined && sample.surfaceY - this.footWorld.y > FEET_DEPTH) return 'feet under water';` with the comment "A foot in the curl's water, with air beneath it, is struck by the lip, not sunk (the advisor's ruling 4)."

- [ ] **Step 4: Run the rider and board tests**

Run: `npx vitest run src/physics`
Expected: PASS, the rest bitwise as before.

- [ ] **Step 5: Commit**

```bash
git add src/physics/AttachedRider.ts src/physics/AttachedRider.test.ts
git commit -m "feat(physics): the rider feels the curl's underside from the tube's air, and a foot in the lip isn't sunk"
```

---

### Task 6: The contact in the surf zone

The advisor's ruling 3 ("No extra substeps") and 4 ("At swept spots, stop the solver's lip parcels striking the rider (strikeBy): their strips are off, so they would hit from where nothing is drawn"). The worker gets the case bytes in its start options; the page fetches them once and reuses them for the drawing.

**Files:**
- Create: `src/wave/barrel/nodeBarrelCases.ts`
- Modify: `src/wave/barrel/barrelLibrary.ts`, `src/wave/SurfZoneRunner.ts`, `src/game/PhysicalMode.ts`, `src/main.ts`, `src/scene/barrel/SweptBarrel.ts`
- Test: `src/wave/barrel/barrelLibrary.test.ts`, `src/wave/SurfZoneRunner.test.ts` (or the file holding the runner's Padang cases), `src/game/PhysicalMode.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces: `loadBarrelCaseBytes(cases?, fetcher?): Promise<Uint8Array[]>`; `libraryFromBytes(bytes: readonly Uint8Array[]): ProfileLibrary`; `readBarrelCases(): Uint8Array[]` (node); `SurfZoneRunnerOptions.barrelCases?: readonly Uint8Array[]`; `SurfZoneRunner.contact?: SweptContact`, `contactMs: number`; `HostExtras { barrelCases?: readonly Uint8Array[] }`; `SurfZoneHostFactory = (config: SurfZoneConfig, extra?: HostExtras) => SurfZoneHost`; `barrelCaseBytes(): Promise<Uint8Array[] | undefined>` (PhysicalMode, cached).

- [ ] **Step 1: Write the failing tests**

`barrelLibrary.test.ts`:

```ts
it('fetches the case bytes once and builds the same library from them', async () => {
  const bytes = encodeCase(caseFromLibrary(sample, 'test', 0.18).barrel);
  const fetcher = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes.slice().buffer });
  const loaded = await loadBarrelCaseBytes([entry], fetcher as unknown as typeof fetch);
  expect(Array.from(loaded[0])).toEqual(Array.from(bytes));
  expect(libraryFromBytes(loaded)).toBeInstanceOf(ProfileLibrary);
});
```

The runner (a small Padang sea, as the loft probe builds it; mark it with the long timeout the Padang cases use):

```ts
import { readBarrelCases } from './barrel/nodeBarrelCases';

describe('the swept contact in the surf zone', () => {
  const config = {
    spot: 'padang' as const, seed: 3, significantHeight: PADANG_SWELLS.small.significantHeight, peakPeriod: PADANG_SWELLS.small.peakPeriod,
    directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24, alongShore: PADANG.alongShore,
    dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
  };

  it('rides the swept surface at Padang Padang with the cases, and the lip parcels strike no one', () => {
    const runner = new SurfZoneRunner(config, { rider: true, barrelCases: readBarrelCases() });
    expect(runner.contact).toBeDefined();
    const strike = vi.spyOn(runner.session!, 'strike');
    runner.advance(30);
    expect(strike).not.toHaveBeenCalled();
    expect(runner.contact!.last).toBeDefined();
  }, 600_000);

  it('rides the carved water, struck by parcels, without the cases', () => {
    const runner = new SurfZoneRunner(config, { rider: true });
    expect(runner.contact).toBeUndefined();
    const strike = vi.spyOn(runner.session!, 'strike');
    runner.advance(2);
    expect(strike).toHaveBeenCalled();
  }, 600_000);
});
```

`PhysicalMode.test.ts` (with the file's fake host factory; mock the loader):

```ts
vi.mock('../wave/barrel/barrelLibrary', async (actual) => ({
  ...(await actual<typeof import('../wave/barrel/barrelLibrary')>()),
  loadBarrelCaseBytes: vi.fn(async () => [new Uint8Array([1, 2, 3])]),
}));

it('hands the barrel case bytes to the host at a swept spot, and none elsewhere', async () => {
  const extras: (HostExtras | undefined)[] = [];
  const factory: SurfZoneHostFactory = (config, extra) => {
    extras.push(extra);
    return fakeHost(config);
  };
  await mode.start({ ...settings, spot: 'padang' }, 1, water, {}, factory);
  await mode.start({ ...settings, spot: 'reef' }, 1, water, {}, factory);
  expect(extras[0]?.barrelCases?.[0]).toEqual(new Uint8Array([1, 2, 3]));
  expect(extras[1]?.barrelCases).toBeUndefined();
});

it('starts a swept spot without the contact when the cases fail to load', async () => {
  vi.mocked(loadBarrelCaseBytes).mockRejectedValueOnce(new Error('offline'));
  resetBarrelCaseBytes();
  ...start padang: resolves true; the factory got no barrelCases...
});
```

(`fakeHost`, `settings`, `water`, `mode`: the names the existing PhysicalMode tests use; adapt.)

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/wave/barrel/barrelLibrary.test.ts src/game/PhysicalMode.test.ts`
Expected: FAIL (`loadBarrelCaseBytes` missing, `extra` never passed).

- [ ] **Step 3: The loaders**

`barrelLibrary.ts`:

```ts
/** Every case's bytes in the index, fetched: the page's drawing and the worker's contact share them (Part B, PR 4). */
export async function loadBarrelCaseBytes(
  cases: readonly BarrelCaseEntry[] = BARREL_CASES,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<Uint8Array[]> {
  if (cases.length === 0) throw new Error('The barrel library has no cases; run npm run barrels');
  return Promise.all(cases.map(async (entry) => {
    const response = await fetcher(entry.asset);
    if (!response.ok) throw new Error(`The barrel case ${entry.asset} did not load (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }));
}

export function libraryFromBytes(bytes: readonly Uint8Array[]): ProfileLibrary {
  return new ProfileLibrary(bytes.map(decodeCase));
}

export async function loadBarrelLibrary(cases = BARREL_CASES, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<ProfileLibrary> {
  return libraryFromBytes(await loadBarrelCaseBytes(cases, fetcher));
}
```

`nodeBarrelCases.ts` (node only: tests and probes):

```ts
import { readFileSync } from 'node:fs';
import { BARREL_CASES } from './barrelLibraryIndex';

/** The index's case files from public/, for node tests and probes (the page fetches them). */
export function readBarrelCases(): Uint8Array[] {
  return BARREL_CASES.map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
```

- [ ] **Step 4: The runner**

In `SurfZoneRunner.ts`: the option

```ts
  /**
   * The barrel library's case files (public/barrels, in the index's order). At a swept spot the board and rider
   * collide with the swept surface the page draws (the Padang Padang spec, Part B, PR 4); without them they ride the
   * carved water, as before.
   */
  barrelCases?: readonly Uint8Array[];
```

the fields `readonly contact?: SweptContact; contactMs = 0; private readonly contactRecords = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);`, and in the constructor, before `this.water = …`:

```ts
    const slope = BARREL_SLOPE[config.spot];
    if (options.barrelCases && (options.rider || options.board) && sweptBarrelOn(config) && slope !== undefined && this.simulation.front) {
      this.contact = new SweptContact(libraryFromBytes(options.barrelCases), slope);
    }
    this.water = PhysicalSurfWater.forSimulation(this.simulation, this.contact);
```

At the top of `afterWater`: `this.updateContact();` with

```ts
  /** The swept surface after the water's step, before any body samples it (no extra substeps: the advisor's ruling 3). */
  private updateContact(): void {
    const { contact, simulation } = this;
    if (!contact || !simulation.front) return;
    const start = performance.now();
    const count = writeFrontRecords(simulation.front.points, this.contactRecords);
    contact.update(this.contactRecords, count, this.config.tide, (x, z) => this.water.plainSurfaceAt(x, z));
    this.contactMs = performance.now() - start;
  }
```

and `if (!this.contact) session.strike(this.simulation.lip);` with the comment "At a swept spot the lip's force comes through the contact; its parcels' strips are off, so they would strike from where nothing is drawn (the advisor's ruling 4)."

- [ ] **Step 5: The page**

`PhysicalMode.ts`:

```ts
/** What a start hands its surf zone beyond the config: the barrel case files at a swept spot (Part B, PR 4). */
export interface HostExtras {
  barrelCases?: readonly Uint8Array[];
}
export type SurfZoneHostFactory = (config: SurfZoneConfig, extra?: HostExtras) => SurfZoneHost;
export const localSurfZone: SurfZoneHostFactory = (config, extra) => new LocalSurfZone(config, { rider: true, ...extra });

let barrelBytes: Promise<Uint8Array[] | undefined> | undefined;
/** The barrel case files, fetched once for the drawing and the contact; a failed fetch is retried at the next start. */
export function barrelCaseBytes(): Promise<Uint8Array[] | undefined> {
  barrelBytes ??= loadBarrelCaseBytes().catch((error: unknown) => {
    console.warn('The barrel library did not load; the swept barrel stays off.', error);
    barrelBytes = undefined;
    return undefined;
  });
  return barrelBytes;
}
/** Forget the fetched files (tests). */
export function resetBarrelCaseBytes(): void {
  barrelBytes = undefined;
}
```

In `start`, before `const host = createHost(config);`:

```ts
    // A swept spot's contact needs the barrel files in the surf zone (Part B, PR 4).
    const barrelCases = sweptBarrelOn(config) ? await barrelCaseBytes() : undefined;
    if (start !== this.starts) return false;
    const host = createHost(config, barrelCases ? { barrelCases } : undefined);
```

and the drawing reuses them: `new SweptBarrel(water, async () => { const bytes = await barrelCaseBytes(); if (!bytes) throw new Error('No barrel cases'); return libraryFromBytes(bytes); })`.

`main.ts`: each factory takes `(config, extra)` and spreads `...extra` into its runner options (`{ rider, renderSpacing, stance, ...extra }` and so on); the worker's start message carries them by structured clone.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/wave/barrel src/game src/scene/barrel` then `npx vitest run src/wave/SurfZoneRunner.test.ts -t "swept contact"`
Expected: PASS.

- [ ] **Step 7: Type-check, build, commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add src/wave src/game src/main.ts src/scene/barrel
git commit -m "feat(barrel): the surf zone rides the swept contact at Padang Padang; the page fetches the cases once for both"
```

---

### Task 7: Measure, document, open the PR

The advisor's ruling 3: "Measure the cost: 32 substeps × every hull point and body part. If heavy: build each body's slice at the step's start and end, lerp the profile per substep".

**Files:**
- Create: `src/wave/probes/padangContact.probe.test.ts`
- Modify: `docs/research/barrel-library.md`

- [ ] **Step 1: The probe**

Opt-in (`PROBE=1`; `SECONDS`, `SWELL`, `LOG`), on the loft probe's sea (Small swell, 1 m cells). Each step at 1/60 s: the runner with a standing rider (`barrelCases: readBarrelCases()`), and it logs:

- `contactMs` per step (the loft and the index), its median and 90th percentile, and the loft's `cuts`;
- the water's `sampleAt` calls per step, counted by wrapping the runner's water (`vi.spyOn(runner.water, 'sampleAt')`), and the contact's `stats` (queries, hits, anomalies);
- the query's own cost: 10,000 points a step drawn inside the open slices' tubes (between each open slice's toe and lip, uniformly in y from the face to 1 m over the top), timed with `performance.now()` around the batch, in µs per query;
- the rider's step (`boardMs`) against the same run without the cases;
- 32 substeps × the counted calls per substep × µs per hit query = the contact's worst share of a standing step.

Run: `PROBE=1 SECONDS=120 npx vitest run src/wave/probes/padangContact.probe.test.ts`

- [ ] **Step 2: The doc**

`docs/research/barrel-library.md` gains "## The contact" with: how it answers (parity, layers, the lip's flow, the fields), the rulings as applied (the advisor's 1–6 with their ledger calls: the clock's rate 1; the anchor's motion only while it hands over; the geometry held at the last clear frame after touchdown; overlapping fronts' first strip wins; n_y ≥ 0.1), and the probe's numbers.

- [ ] **Step 3: Run the suite that covers the change**

Run: `npx vitest run src/wave/barrel src/scene src/game src/physics` and `npx tsc --noEmit`, `npm run build`.

- [ ] **Step 4: Commit, push, open the PR stacked on #92**

```bash
git add src/wave/probes/padangContact.probe.test.ts docs/research/barrel-library.md
git commit -m "docs(barrel): the contact's rulings and its measured cost"
git push -u origin claude/padang-contact
gh pr create --base claude/padang-mesh --title "Padang Padang Part B, PR 4: the swept contact" --body-file <scratchpad>/pr4-body.md
```

The PR body opens "> Stacked on vice7770/surfing-game#92 (PR 3) ... merge those first, then retarget this to `main`", lists the rulings and the measured cost, and ends with the Claude Code line.

- [ ] **Step 5: Send the advisor the contact's shape before settling**

SendMessage to "Water physics research": the rules as built and the ledger calls, above all the cut at 0.5 (the drawn weight's vertical lerp keeps a lip over its face, so the contact could follow the drawing exactly instead) and the geometry held at the last clear frame after touchdown in place of the trim.
