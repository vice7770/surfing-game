# Wave Sizes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surf as big as the swell says (deep-water buoy input, deeper swell-sized tanks and outer bathymetry), measured and read the way surfers read it (face range, body-relative name, Hawaiian scale), checked against empirical breaker heights.

**Architecture:** Part A adds a `SurfMeter` fed by the surf zone's breaking onsets, surf readouts in the UI, an empirical-formula module with a forecast calibrated by a new size report, all on today's tank. Part B makes the input deep-water Hs shoaled to the tank's edge, sizes the tank to the swell (a `TankLayout` from the config), deepens each spot's outer bed, places the take-off at the measured break, and gates the size report. Part C adds a size sheet (a surfer on a set wave's face, face height marked) and checks the camera.

**Tech Stack:** TypeScript, Vitest, Three.js, rolldown (report scripts), the existing Boussinesq surf zone.

**Spec:** `docs/superpowers/specs/2026-09-27-wave-sizes.md`

## Global Constraints

- Keep edits to `src/main.ts`, `src/game/PhysicalMode.ts` and the settings files small.
- Classic stays byte-identical (shaders untouched here).
- Performance is measured, never a gate (M4 Pro target; M1 Air may be slow).
- The Canyon's tank, bed and sea stay exactly as today; Practice's sea stays exactly as today.
- One spec, three PRs (A, B, C), each merged when its checks pass. If `gh pr merge` is blocked by the auto-mode classifier, do not work around it; ask the user.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The worktree hook rejects complex or chained bash: use script files in the scratchpad and simple commands. Never bare `git stash`.
- English only; player-facing text goes in `src/ui/strings.ts`.
- Test command: `npx vitest run <paths>`; whole suite `npx vitest run`; types `npx tsc -b`.

## Review Focus

1. **A surf zone after a handover or restart has no measured waves:** the readout says "measuring…" (never NaN, 0 m or a stale reading) until 3 waves have broken at the take-off. Test in Task A2.
2. **Hawaiian and imperial rounding of small surf:** 0.3 m faces read "0–1 ft Hawaiian"/"1–1 ft", never negative or NaN; ranges keep low ≤ high. Test in Task A3.
3. **Old saves without the new setting** load with `surfScale: 'face'`. Test in Task A4.
4. **Canyon, Practice and small days are unchanged by Part B:** the Canyon's and Practice's configs build the same sea and tank as today (component amplitudes and wave numbers equal, layout equal to `TANK`). Tests in Tasks B1 and B3.
5. **A swell-sized tank's grid stays sane:** every layout has `offshore < zoneInner < blendEnd < fineFrom < shore`, a relaxation zone of at least 60 m, and a finite bed; the solver steps a 4 m / 18 s Beach without NaN. Tests in Task B3.

---

# Part A · Measure

### Task A1: The surf meter

**Files:**
- Create: `src/wave/SurfMeter.ts`
- Test: `src/wave/SurfMeter.test.ts`

**Interfaces:**
- Produces: `interface BreakingWave { time: number; x: number; z: number; face: number }`; `interface SurfReading { typical: number; sets: number; waves: number }`; `SURF_WINDOW = 120`; `MIN_SURF_WAVES = 3`; `TAKE_OFF_BAND = 10`; `highestMean(values: readonly number[], fraction: number): number`; `class SurfMeter { constructor(bands: readonly { xMin: number; xMax: number }[], period: number, keep?: number); add(wave: BreakingWave): void; waves(since?: number): BreakingWave[]; reading(now: number, window?: number): SurfReading | undefined }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { MIN_SURF_WAVES, SurfMeter, highestMean } from './SurfMeter';

describe('highestMean', () => {
  it('averages the highest share of the values, at least one', () => {
    expect(highestMean([1, 2, 3, 4, 5, 6], 1 / 3)).toBeCloseTo(5.5, 12);
    expect(highestMean([1, 2, 3, 4, 5, 6], 1 / 10)).toBe(6);
    expect(highestMean([2], 1 / 3)).toBe(2);
    expect(highestMean([], 1 / 3)).toBeNaN();
  });
});

describe('SurfMeter', () => {
  const band = [{ xMin: -10, xMax: 10 }];

  it('reads one wave from the onsets within half a period of its first, keeping the largest face', () => {
    const meter = new SurfMeter(band, 12);
    meter.add({ time: 0, x: -5, z: -100, face: 1.5 });
    meter.add({ time: 3, x: 0, z: -104, face: 2.2 });
    meter.add({ time: 5.9, x: 5, z: -98, face: 1.8 });
    meter.add({ time: 6.1, x: 0, z: -101, face: 1.0 });
    const waves = meter.waves();
    expect(waves).toHaveLength(2);
    expect(waves[0]).toEqual({ time: 0, x: 0, z: -104, face: 2.2 });
    expect(waves[1].face).toBe(1.0);
  });

  it('ignores onsets outside its bands', () => {
    const meter = new SurfMeter(band, 12);
    meter.add({ time: 0, x: 30, z: -100, face: 3 });
    expect(meter.waves()).toHaveLength(0);
  });

  it('reads nothing until enough waves have broken, then H1/3 and H1/10 over the window', () => {
    const meter = new SurfMeter(band, 10);
    const faces = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    faces.forEach((face, i) => {
      if (i === MIN_SURF_WAVES - 1) expect(meter.reading(i * 10)).toBeUndefined();
      meter.add({ time: i * 10, x: 0, z: -100, face });
    });
    const reading = meter.reading(95)!;
    expect(reading.waves).toBe(10);
    expect(reading.typical).toBeCloseTo((10 + 9 + 8 + 7) / 4, 12);
    expect(reading.sets).toBe(10);
    // A 30 s window holds the last waves only (times 70, 80, 90).
    expect(meter.reading(95, 30)!.waves).toBe(3);
  });

  it('forgets waves older than it keeps', () => {
    const meter = new SurfMeter(band, 10, 60);
    for (let i = 0; i < 20; i += 1) meter.add({ time: i * 10, x: 0, z: -100, face: 1 });
    expect(meter.waves().length).toBeLessThanOrEqual(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/SurfMeter.test.ts`
Expected: FAIL, cannot resolve `./SurfMeter`.

- [ ] **Step 3: Write minimal implementation**

```ts
/** A wave measured as it starts to break (the wave-sizes spec): when, where, and its face (crest to the trough ahead), m. */
export interface BreakingWave {
  time: number;
  x: number;
  z: number;
  face: number;
}

/** The surf over a window, as forecasts give it: the typical face (H1/3), the sets (H1/10), m, and how many waves they come from. */
export interface SurfReading {
  typical: number;
  sets: number;
  waves: number;
}

/** Forecasts read the surf over the last 2 minutes, s. */
export const SURF_WINDOW = 120;
/** Fewer waves than this still read as measuring. */
export const MIN_SURF_WAVES = 3;
/** The take-off's band: columns this far either side of it along shore, m. */
export const TAKE_OFF_BAND = 10;

/** Mean of the highest `fraction` of the values, at least one: H1/3 with 1/3, H1/10 with 1/10. */
export function highestMean(values: readonly number[], fraction: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => b - a);
  const count = Math.max(1, Math.ceil(sorted.length * fraction));
  let sum = 0;
  for (let i = 0; i < count; i += 1) sum += sorted[i];
  return sum / count;
}

/**
 * Measures the waves breaking in along-shore bands. The onsets in a band
 * within half a period of a wave's first onset are that wave; its face is the
 * largest of theirs, and it is placed where that face was.
 */
export class SurfMeter {
  private readonly bands: { xMin: number; xMax: number; waves: BreakingWave[] }[];

  constructor(bands: readonly { xMin: number; xMax: number }[], private readonly period: number, private readonly keep = SURF_WINDOW) {
    this.bands = bands.map(({ xMin, xMax }) => ({ xMin, xMax, waves: [] }));
  }

  add(wave: BreakingWave): void {
    const band = this.bands.find(({ xMin, xMax }) => wave.x >= xMin && wave.x <= xMax);
    if (!band) return;
    const last = band.waves.at(-1);
    if (last && wave.time - last.time < 0.5 * this.period) {
      if (wave.face > last.face) Object.assign(last, { x: wave.x, z: wave.z, face: wave.face });
      return;
    }
    band.waves.push({ ...wave });
    while (band.waves.length && band.waves[0].time < wave.time - this.keep) band.waves.shift();
  }

  /** Every band's waves that started breaking at or after `since`. */
  waves(since = -Infinity): BreakingWave[] {
    return this.bands.flatMap((band) => band.waves.filter((wave) => wave.time >= since));
  }

  /** The surf over the last `window` seconds, or undefined while fewer than MIN_SURF_WAVES have broken. */
  reading(now: number, window = SURF_WINDOW): SurfReading | undefined {
    const faces = this.waves(now - window).map((wave) => wave.face);
    if (faces.length < MIN_SURF_WAVES) return undefined;
    return { typical: highestMean(faces, 1 / 3), sets: highestMean(faces, 1 / 10), waves: faces.length };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/SurfMeter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/SurfMeter.ts src/wave/SurfMeter.test.ts
git commit -m "feat: measure breaking waves' faces into a surf reading"
```

### Task A2: The surf zone measures its breaks

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (constructor; `markBreakingOnsets`; new `measureBreak`)
- Modify: `src/wave/SurfZoneRunner.ts` (`SurfZoneStatus.surf`, `status()`)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/wave/SurfZoneRunner.test.ts`

**Interfaces:**
- Consumes: `SurfMeter`, `BreakingWave`, `SurfReading`, `TAKE_OFF_BAND` (Task A1).
- Produces: `SurfZoneSimulation.surf: SurfMeter` (the take-off band); `SurfZoneSimulation.onBreak?: (wave: BreakingWave) => void`; `SurfZoneStatus.surf?: SurfReading`.

- [ ] **Step 1: Write the failing tests**

In `src/wave/SurfZoneSimulation.test.ts`, add (import `waveHeightAt` is not needed; import `TAKE_OFF_BAND` from `./SurfMeter`):

```ts
  it('measures each wave breaking at the take-off: its face and where it broke (wave sizes)', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const measured: { x: number; face: number; z: number }[] = [];
    simulation.onBreak = (wave) => measured.push(wave);
    expect(simulation.surf.reading(simulation.solver.time)).toBeUndefined();
    for (let frame = 0; frame < 40 * 30; frame += 1) simulation.step(1 / 30);
    expect(measured.length).toBeGreaterThan(0);
    for (const wave of measured) {
      expect(wave.face).toBeGreaterThan(0.2);
      expect(wave.face).toBeLessThan(4);
      expect(wave.z).toBeGreaterThan(TANK.fineFrom - 5);
    }
    const takeOff = simulation.breakPoint();
    for (const wave of simulation.surf.waves()) expect(Math.abs(wave.x - takeOff.x)).toBeLessThanOrEqual(TAKE_OFF_BAND);
    const reading = simulation.surf.reading(simulation.solver.time);
    expect(reading).toBeDefined();
    expect(reading!.sets).toBeGreaterThanOrEqual(reading!.typical);
  }, 90_000);
```

In `src/wave/SurfZoneRunner.test.ts`, add a test that a fresh runner's status carries `surf: undefined` (build the runner the way the file's other tests do, e.g. `new SurfZoneRunner(config)`):

```ts
  it('reports the measured surf, measuring until waves have broken (wave sizes)', () => {
    const runner = new SurfZoneRunner({ ...CONFIG, spot: 'reef' });
    expect(runner.status()).toHaveProperty('surf', undefined);
  });
```

(`CONFIG` is the file's existing small config; use whatever name that file already uses.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "measures each wave" src/wave/SurfZoneRunner.test.ts -t "measured surf"`
Expected: FAIL (`simulation.surf` undefined; status has no `surf` key).

- [ ] **Step 3: Implement**

In `SurfZoneSimulation.ts`:
- import `{ SurfMeter, TAKE_OFF_BAND, type BreakingWave } from './SurfMeter'`;
- fields:

```ts
  /** The waves breaking at the take-off, as surf reports measure them (the wave-sizes spec). */
  readonly surf: SurfMeter;
  /** Called with every wave measured starting to break, anywhere in the window (reports listen here). */
  onBreak?: (wave: BreakingWave) => void;
```

- in the constructor, after `this.lastOnset = …`:

```ts
    const takeOff = this.breakPoint();
    this.surf = new SurfMeter([{ xMin: takeOff.x - TAKE_OFF_BAND, xMax: takeOff.x + TAKE_OFF_BAND }], config.peakPeriod);
```

- in `markBreakingOnsets`, inside the onset branch, before `this.throwLip(column, row);`: `this.measureBreak(column, row);`
- new method after `newBreaker`:

```ts
  /**
   * Measure a wave starting to break in `column` (the wave-sizes spec): its crest is the highest surface up to
   * four cells seaward of the outermost breaking cell, as for the lip, and its face runs from that crest to the
   * lowest water within half a wavelength ahead (√(g h) Tp / 2 at the crest's still depth).
   */
  private measureBreak(column: number, row: number): void {
    const { solver } = this;
    const { nx } = solver;
    let crest = row * nx + column;
    for (let iz = row - 1; iz >= Math.max(1, row - 4); iz -= 1) {
      if (solver.surfaceAt(iz * nx + column) > solver.surfaceAt(crest)) crest = iz * nx + column;
    }
    const stillDepth = Math.max(WET, solver.restLevel - solver.bed[crest]);
    const wave: BreakingWave = {
      time: solver.time,
      x: solver.xCenters[column],
      z: solver.zCenters[Math.floor(crest / nx)],
      face: waveHeightAt(solver, crest, 0.5 * this.config.peakPeriod * Math.sqrt(GRAVITY * stillDepth)),
    };
    this.surf.add(wave);
    this.onBreak?.(wave);
  }
```

In `SurfZoneRunner.ts`: add to `SurfZoneStatus` after `breakingFraction`:

```ts
  /** The surf at the take-off over the last 2 minutes (the wave-sizes spec); undefined while measuring. */
  surf?: SurfReading;
```

and in `status()` after `breakingFraction: …,`: `surf: simulation.surf.reading(simulation.solver.time),` (import `type SurfReading` from `./SurfMeter`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts src/wave/SurfZoneRunner.test.ts src/game/WorkerSurfZone.test.ts src/game/SurfZoneHost.test.ts`
Expected: PASS. (Status now carries `surf`; structured clones pass it to the page unchanged.)

- [ ] **Step 5: Commit**

```bash
git add src/wave/SurfZoneSimulation.ts src/wave/SurfZoneRunner.ts src/wave/SurfZoneSimulation.test.ts src/wave/SurfZoneRunner.test.ts
git commit -m "feat: measure the surf at the take-off as waves start to break"
```

### Task A3: Surf in surfers' words

**Files:**
- Create: `src/ui/surfHeight.ts`
- Modify: `src/game/SurferChoice.ts` (`SURFER_HEIGHTS`, `surferHeight`)
- Modify: `src/ui/strings.ts`
- Test: `src/ui/surfHeight.test.ts`, `src/game/SurferChoice.test.ts`

**Interfaces:**
- Consumes: `SurfReading` (A1), `Units` (`src/ui/units.ts`).
- Produces: `type SurfScale = 'face' | 'hawaiian'`; `interface SurfWords { units: Units; scale: SurfScale; surferHeight: number }`; `DEFAULT_SURFER_HEIGHT = 1.75`; `HAWAIIAN_SHARE = 0.5`; `SURF_NAMES`; `surfName(face: number, surferHeight?: number): string`; `formatSurfRange(low: number, high: number, units: Units, scale: SurfScale): string`; `describeSurf(reading: Pick<SurfReading, 'typical' | 'sets'> | undefined, words: SurfWords): string`; `SURFER_HEIGHTS: Record<SurferBody, number>`; `surferHeight(body?: SurferBody): number`.

- [ ] **Step 1: Write the failing tests**

`src/ui/surfHeight.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER_HEIGHT, describeSurf, formatSurfRange, surfName } from './surfHeight';

describe('surf in surfers\' words', () => {
  it('names the typical face by the surfer\'s height', () => {
    expect(surfName(0.3)).toBe('ankle high');
    expect(surfName(0.5)).toBe('knee high');
    expect(surfName(1.0)).toBe('waist high');
    expect(surfName(1.75)).toBe('head high');
    expect(surfName(2.4)).toBe('overhead');
    expect(surfName(3.6)).toBe('double overhead');
    expect(surfName(5.5)).toBe('triple overhead');
    expect(surfName(7)).toBe('bigger than triple overhead');
    // A shorter surfer finds the same wave bigger.
    expect(surfName(1.9, 1.65)).toBe('overhead');
    expect(surfName(1.9, DEFAULT_SURFER_HEIGHT)).toBe('head high');
  });

  it('gives the range in metres, feet, or the Hawaiian scale (half the face in feet)', () => {
    expect(formatSurfRange(2.14, 2.71, 'metric', 'face')).toBe('2.1–2.7 m');
    expect(formatSurfRange(2.14, 2.71, 'imperial', 'face')).toBe('7–9 ft');
    expect(formatSurfRange(3.05, 3.9, 'metric', 'hawaiian')).toBe('5–6 ft Hawaiian');
  });

  it('never reads small surf as negative, NaN or backwards', () => {
    expect(formatSurfRange(0.1, 0.3, 'imperial', 'hawaiian')).toBe('0–0 ft Hawaiian');
    expect(formatSurfRange(0.3, 0.3, 'imperial', 'face')).toBe('1–1 ft');
    expect(formatSurfRange(0.04, 0.3, 'metric', 'face')).toBe('0.0–0.3 m');
  });

  it('describes a reading in one line, or says it is still measuring', () => {
    const words = { units: 'metric' as const, scale: 'face' as const, surferHeight: 1.75 };
    expect(describeSurf({ typical: 2.4, sets: 3.1 }, words)).toBe('2.4–3.1 m · overhead');
    expect(describeSurf(undefined, words)).toBe('measuring…');
  });
});
```

In `src/game/SurferChoice.test.ts` add:

```ts
import { readFileSync } from 'node:fs';
// …
  it('knows each committed surfer\'s height, and 1.75 m for no one in particular', () => {
    const manifest = JSON.parse(readFileSync('public/assets/surfers/surfers.json', 'utf8')) as { surfers: { id: SurferBody; height: number }[] };
    for (const { id, height } of manifest.surfers) expect(surferHeight(id)).toBeCloseTo(height, 3);
    expect(surferHeight()).toBe(1.75);
  });
```

(import `surferHeight` and `type SurferBody` from `./SurferChoice`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/surfHeight.test.ts src/game/SurferChoice.test.ts`
Expected: FAIL (module missing; `surferHeight` not exported).

- [ ] **Step 3: Implement**

`src/game/SurferChoice.ts`, after `SURFER_BODIES`:

```ts
/** Each committed surfer's standing height, m (`surfers.json`): the surf's names compare the waves to it. */
export const SURFER_HEIGHTS: Record<SurferBody, number> = { surfer1: 1.654, surfer2: 1.657, surfer3: 1.734, surfer4: 1.719 };

/** The surfer's height, m, or 1.75 m when no surfer is chosen. */
export function surferHeight(body?: SurferBody): number {
  return body ? SURFER_HEIGHTS[body] : 1.75;
}
```

`src/ui/strings.ts` (after the `lab.info.*` keys):

```ts
  'surf.measuring': 'measuring…',
  'surf.hawaiian': '{low}–{high} ft Hawaiian',
  'surf.name.ankle': 'ankle high',
  'surf.name.knee': 'knee high',
  'surf.name.thigh': 'thigh high',
  'surf.name.waist': 'waist high',
  'surf.name.chest': 'chest high',
  'surf.name.shoulder': 'shoulder high',
  'surf.name.head': 'head high',
  'surf.name.overhead': 'overhead',
  'surf.name.wellOverhead': 'well overhead',
  'surf.name.double': 'double overhead',
  'surf.name.triple': 'triple overhead',
  'surf.name.bigger': 'bigger than triple overhead',
```

`src/ui/surfHeight.ts`:

```ts
import type { SurfReading } from '../wave/SurfMeter';
import { t, type StringKey } from './strings';
import type { Units } from './units';

/** How the surf's height reads (the wave-sizes spec): faces in the player's units, or the Hawaiian scale. */
export type SurfScale = 'face' | 'hawaiian';

/** What the surf's words need: the units, the scale, and the height of the surfer the names compare to, m. */
export interface SurfWords {
  units: Units;
  scale: SurfScale;
  surferHeight: number;
}

const FEET_PER_METRE = 3.28084;
/** Who the names compare the surf to when no surfer is chosen, m. */
export const DEFAULT_SURFER_HEIGHT = 1.75;
/** The Hawaiian scale reads about half the face: trough-to-crest is twice it (Caldwell & Aucan 2007). */
export const HAWAIIAN_SHARE = 0.5;

/** The body-relative names, by the typical face over the surfer's height: each name holds below its bound. */
export const SURF_NAMES: readonly { below: number; key: StringKey }[] = [
  { below: 0.2, key: 'surf.name.ankle' },
  { below: 0.35, key: 'surf.name.knee' },
  { below: 0.5, key: 'surf.name.thigh' },
  { below: 0.65, key: 'surf.name.waist' },
  { below: 0.78, key: 'surf.name.chest' },
  { below: 0.9, key: 'surf.name.shoulder' },
  { below: 1.15, key: 'surf.name.head' },
  { below: 1.5, key: 'surf.name.overhead' },
  { below: 1.85, key: 'surf.name.wellOverhead' },
  { below: 2.5, key: 'surf.name.double' },
  { below: 3.5, key: 'surf.name.triple' },
  { below: Infinity, key: 'surf.name.bigger' },
];

/** The surf's name for a typical face, m, against the surfer's height, m. */
export function surfName(face: number, surferHeight = DEFAULT_SURFER_HEIGHT): string {
  const ratio = Math.max(0, face) / surferHeight;
  return t(SURF_NAMES.find((name) => ratio < name.below)!.key);
}

const whole = (value: number) => Math.max(0, Math.round(value));

/** A range of faces as surf reports give it: "2.1–2.7 m", "7–9 ft", or "5–6 ft Hawaiian". */
export function formatSurfRange(low: number, high: number, units: Units, scale: SurfScale): string {
  const [from, to] = [Math.max(0, Math.min(low, high)), Math.max(0, low, high)];
  if (scale === 'hawaiian') {
    return t('surf.hawaiian', { low: whole(from * FEET_PER_METRE * HAWAIIAN_SHARE), high: whole(to * FEET_PER_METRE * HAWAIIAN_SHARE) });
  }
  if (units === 'imperial') return `${whole(from * FEET_PER_METRE)}–${whole(to * FEET_PER_METRE)} ft`;
  return `${from.toFixed(1)}–${to.toFixed(1)} m`;
}

/** The surf in one line, its range and its name ("2.4–3.1 m · overhead"), or "measuring…". */
export function describeSurf(reading: Pick<SurfReading, 'typical' | 'sets'> | undefined, words: SurfWords): string {
  if (!reading) return t('surf.measuring');
  return `${formatSurfRange(reading.typical, reading.sets, words.units, words.scale)} · ${surfName(reading.typical, words.surferHeight)}`;
}
```

(If `t` takes only string values, pass the numbers through `String(...)`; match `t`'s signature in `strings.ts`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/surfHeight.test.ts src/game/SurferChoice.test.ts src/ui/strings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/surfHeight.ts src/ui/surfHeight.test.ts src/game/SurferChoice.ts src/game/SurferChoice.test.ts src/ui/strings.ts
git commit -m "feat: read surf as a face range and a body-relative name"
```

### Task A4: The Surf height setting

**Files:**
- Modify: `src/game/Settings.ts` (`GameplaySettings.surfScale`, defaults, sanitising)
- Modify: `src/ui/settingsModel.ts` (row, `GAMEPLAY` set)
- Modify: `src/ui/strings.ts`
- Test: `src/game/Settings.test.ts`, `src/ui/settingsModel.test.ts`

**Interfaces:**
- Consumes: `SurfScale` (A3).
- Produces: `GameplaySettings.surfScale: SurfScale` (default `'face'`).

- [ ] **Step 1: Write the failing tests**

In `src/game/Settings.test.ts` (use the file's existing sanitise/load helper; below it is called `sanitizeSettings` — use the real name):

```ts
  it('reads surf as faces unless the player chose the Hawaiian scale, and old saves as faces', () => {
    expect(defaultSettings().gameplay.surfScale).toBe('face');
    expect(sanitizeSettings({ gameplay: { surfScale: 'hawaiian' } }).gameplay.surfScale).toBe('hawaiian');
    expect(sanitizeSettings({ gameplay: { units: 'imperial' } }).gameplay.surfScale).toBe('face');
    expect(sanitizeSettings({ gameplay: { surfScale: 'feet' } }).gameplay.surfScale).toBe('face');
  });
```

In `src/ui/settingsModel.test.ts`:

```ts
  it('offers the surf height as faces or the Hawaiian scale, after the units', () => {
    const rows = settingsModel('gameplay', defaultSettings(), CONTEXT);
    const index = rows.findIndex((row) => row.id === 'surfScale');
    expect(rows[index - 1].id).toBe('units');
    expect(rows[index]).toMatchObject({ kind: 'choice', value: 'face' });
    expect(applyRow(defaultSettings(), 'surfScale', 'hawaiian')).toEqual({ tab: 'gameplay', patch: { surfScale: 'hawaiian' } });
  });
```

(`CONTEXT` is the file's existing settings context; use its real name.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/Settings.test.ts src/ui/settingsModel.test.ts`
Expected: FAIL (`surfScale` undefined; no row).

- [ ] **Step 3: Implement**

- `Settings.ts`: `import type { SurfScale } from '../ui/surfHeight';`; in `GameplaySettings` after `units`: `/** How the surf's height reads (the wave-sizes spec): faces, or the Hawaiian scale. */ surfScale: SurfScale;`; defaults `surfScale: 'face'` after `units: 'metric'`; sanitising after units: `surfScale: oneOf(gameplay.surfScale, ['face', 'hawaiian'] as const, defaults.gameplay.surfScale),`.
- `settingsModel.ts`: after the units row: `{ kind: 'choice', id: 'surfScale', label: t('settings.surfScale'), value: g.surfScale, options: options('settings.surfScale', ['face', 'hawaiian']) },`; add `'surfScale'` to `GAMEPLAY`.
- `strings.ts` after `'settings.units.*'`: `'settings.surfScale': 'Surf height', 'settings.surfScale.face': 'Face', 'settings.surfScale.hawaiian': 'Hawaiian',`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/Settings.test.ts src/ui/settingsModel.test.ts src/ui/strings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/Settings.ts src/ui/settingsModel.ts src/ui/strings.ts src/game/Settings.test.ts src/ui/settingsModel.test.ts
git commit -m "feat: a Surf height setting, faces or the Hawaiian scale"
```

### Task A5: Sources and empirical surf heights

**Files:**
- Create: `docs/research/surf-size-sources.md`
- Create: `src/wave/surfForecast.ts`
- Test: `src/wave/surfForecast.test.ts`

**Interfaces:**
- Produces: `SETS_OVER_TYPICAL = 1.27`; `komarGaughan(significantHeight: number, period: number): number` (H1/3 breaker, m); `caldwellAucan(significantHeight: number, period: number): number` (H1/10, m); `interface SurfForecast { typical: number; sets: number }`; `interface ForecastFit { a: number; sets: number }`; `fitForecast(runs: readonly { significantHeight: number; period: number; typical: number; sets: number }[]): ForecastFit`; `SURF_FORECAST: Record<SpotName, ForecastFit>`; `PRACTICE_SURF: Record<SpotName, SurfForecast>`; `forecastSurf(spot: SpotName, significantHeight: number, period: number): SurfForecast`.

- [ ] **Step 1: Write the sources doc**

`docs/research/surf-size-sources.md`, with these sections and values (cite each):
- **Statistics:** Hs = H1/3 (mean of the highest third; 4√m0 for a narrow spectrum). In a Rayleigh sea H1/10 ≈ 1.27 H1/3 and H_max(N waves) ≈ H1/3 √(ln N / 2) (Longuet-Higgins 1952; Holthuijsen 2007, *Waves in Oceanic and Coastal Waters*, §4.2).
- **Komar & Gaughan (1972/1973):** H_b = 0.39 g^0.2 (T H0²)^0.4, H0 deep-water, gives ≈ 4.0 m at Hs 3 m / 12 s. Caldwell & Aucan write the same energy-flux relation as H_b = H0^(4/5) [(1/√g)(gP/4π)]^(2/5) (their eq. 1), 7 % below the 0.39 form.
- **Caldwell & Aucan (2007), J. Coastal Res. 23(5):1237–1244, doi 10.2112/04-0397R.1:** Waimea buoy vs North Shore observations; trough-to-crest ≈ 2 × Hawaii scale (±10–20 %); refraction coefficient K_r(H_b) = −0.0003 H_b³ + 0.0099 H_b² − 0.025 H_b + 1.0747 with H_b in feet, fixed at 2.145 above 21 ft (eq. 2); H_surf = H_b K_r(H_b) is the H1/10 of the highest-refraction outer reefs (eq. 3).
- **Body-relative names:** the game's thresholds (spec) and the surf-report convention they follow.
- **Why the reference is Komar–Gaughan at all three spots** (spec, Checks).

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SETS_OVER_TYPICAL, caldwellAucan, fitForecast, forecastSurf, komarGaughan } from './surfForecast';

describe('empirical surf heights', () => {
  it('breaks Hs 3 m at 12 s at about 4 m (Komar & Gaughan)', () => {
    expect(komarGaughan(3, 12)).toBeCloseTo(0.39 * 9.81 ** 0.2 * (12 * 9) ** 0.4, 10);
    expect(komarGaughan(3, 12)).toBeGreaterThan(3.9);
    expect(komarGaughan(3, 12)).toBeLessThan(4.1);
  });

  it('gives Hawaii\'s outer-reef sets from shoaling and refraction (Caldwell & Aucan)', () => {
    const shoaled = 3 ** 0.8 * ((Math.sqrt(9.81) * 12) / (4 * Math.PI)) ** 0.4;
    const feet = shoaled * 3.28084;
    const kr = -0.0003 * feet ** 3 + 0.0099 * feet ** 2 - 0.025 * feet + 1.0747;
    expect(caldwellAucan(3, 12)).toBeCloseTo(shoaled * kr, 10);
    // Above 21 ft the refraction is fixed at 2.145.
    const big = 8 ** 0.8 * ((Math.sqrt(9.81) * 16) / (4 * Math.PI)) ** 0.4;
    expect(caldwellAucan(8, 16)).toBeCloseTo(big * 2.145, 10);
  });

  it('fits a spot\'s forecast to measured runs in the Komar-Gaughan form', () => {
    const runs = [1, 2, 3, 4].flatMap((significantHeight) => [10, 14, 18].map((period) => {
      const typical = 0.6 * significantHeight ** 0.8 * period ** 0.4;
      return { significantHeight, period, typical, sets: 1.3 * typical };
    }));
    const fit = fitForecast(runs);
    expect(fit.a).toBeCloseTo(0.6, 6);
    expect(fit.sets).toBeCloseTo(1.3, 6);
  });

  it('forecasts sets no smaller than the typical face', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const surf = forecastSurf(spot, 2, 12);
      expect(surf.typical).toBeGreaterThan(0);
      expect(surf.sets).toBeGreaterThanOrEqual(surf.typical);
    }
    expect(SETS_OVER_TYPICAL).toBe(1.27);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/wave/surfForecast.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 4: Implement**

```ts
import type { SpotName } from './Bathymetry';
import { GRAVITY } from './dispersion';

/** H1/10 over H1/3 in a Rayleigh sea (docs/research/surf-size-sources.md). */
export const SETS_OVER_TYPICAL = 1.27;
const FEET_PER_METRE = 3.28084;

/** Komar & Gaughan's breaker height from a deep-water height and period, m: H_b = 0.39 g^0.2 (T H0²)^0.4. */
export function komarGaughan(significantHeight: number, period: number): number {
  return 0.39 * GRAVITY ** 0.2 * (period * significantHeight ** 2) ** 0.4;
}

/**
 * Caldwell & Aucan's (2007) surf for Hawaii's highest-refraction outer reefs, an H1/10, m: the shoaling-only
 * breaker height H_b = H0^(4/5) (√g P / 4π)^(2/5) times their refraction K_r(H_b) (H_b in feet, 2.145 above 21 ft).
 */
export function caldwellAucan(significantHeight: number, period: number): number {
  const shoaled = significantHeight ** 0.8 * ((Math.sqrt(GRAVITY) * period) / (4 * Math.PI)) ** 0.4;
  const feet = shoaled * FEET_PER_METRE;
  const refraction = feet > 21 ? 2.145 : -0.0003 * feet ** 3 + 0.0099 * feet ** 2 - 0.025 * feet + 1.0747;
  return shoaled * refraction;
}

/** The surf a swell makes: the typical face (H1/3) and the sets (H1/10), m. */
export interface SurfForecast {
  typical: number;
  sets: number;
}

/** A spot's forecast in the Komar–Gaughan form: H1/3 = a Hs^0.8 Tp^0.4, and the sets `sets` times that. */
export interface ForecastFit {
  a: number;
  sets: number;
}

/** Least squares in log space of measured runs to the Komar–Gaughan form. */
export function fitForecast(runs: readonly { significantHeight: number; period: number; typical: number; sets: number }[]): ForecastFit {
  const usable = runs.filter((run) => run.typical > 0 && run.sets > 0);
  const logA = usable.reduce((sum, run) => sum + Math.log(run.typical / (run.significantHeight ** 0.8 * run.period ** 0.4)), 0) / usable.length;
  const logSets = usable.reduce((sum, run) => sum + Math.log(run.sets / run.typical), 0) / usable.length;
  return { a: Math.exp(logA), sets: Math.exp(logSets) };
}

/**
 * Each spot's forecast, fitted by the size report on the tank (`npm run report:sizes`), at mid tide with
 * the Wave Lab's default direction and spread. Until the report runs, the Komar–Gaughan values.
 */
export const SURF_FORECAST: Record<SpotName, ForecastFit> = {
  beach: { a: 0.39 * GRAVITY ** 0.2, sets: SETS_OVER_TYPICAL },
  point: { a: 0.39 * GRAVITY ** 0.2, sets: SETS_OVER_TYPICAL },
  reef: { a: 0.39 * GRAVITY ** 0.2, sets: SETS_OVER_TYPICAL },
  canyon: { a: 0.39 * GRAVITY ** 0.2, sets: SETS_OVER_TYPICAL },
};

/** The practice groundswell's measured surf at each spot (the size report). */
export const PRACTICE_SURF: Record<SpotName, SurfForecast> = {
  beach: { typical: 1.5, sets: 1.9 },
  point: { typical: 1.5, sets: 1.9 },
  reef: { typical: 1.5, sets: 1.9 },
  canyon: { typical: 1.5, sets: 1.9 },
};

/** The surf a buoy swell will make at a spot, from its calibrated fit. */
export function forecastSurf(spot: SpotName, significantHeight: number, period: number): SurfForecast {
  const { a, sets } = SURF_FORECAST[spot];
  const typical = a * significantHeight ** 0.8 * period ** 0.4;
  return { typical, sets: Math.max(1, sets) * typical };
}
```

(The `SURF_FORECAST` and `PRACTICE_SURF` values are replaced by the report's measured fit in Task A7.)

- [ ] **Step 5: Run test to verify it passes, then commit**

Run: `npx vitest run src/wave/surfForecast.test.ts`
Expected: PASS (4 tests).

```bash
git add docs/research/surf-size-sources.md src/wave/surfForecast.ts src/wave/surfForecast.test.ts
git commit -m "feat: empirical surf heights and a forecast fitted per spot"
```

### Task A6: The size report

**Files:**
- Create: `src/wave/sizeReport.ts` (pure: summarising a run, the Markdown, the gates)
- Create: `scripts/size-report.ts`
- Modify: `package.json` (`report:sizes`)
- Test: `src/wave/sizeReport.test.ts`
- Output: `docs/research/sizes/<spot>.json`, `docs/research/size-report.md`

**Interfaces:**
- Consumes: `SurfMeter`, `highestMean`, `BreakingWave` (A1); `SurfZoneSimulation.onBreak`, `breakPoint()` (A2); `komarGaughan`, `caldwellAucan`, `fitForecast` (A5).
- Produces:
  - `SIZE_GRID = { heights: [1, 1.5, 2, 3, 4], periods: [10, 14, 18] }`, `SIZE_SEA_SECONDS = 240`, `SIZE_BAND_WIDTH = 20`, `SIZE_EDGE_MARGIN = 20`;
  - `interface SizeRun { spot: SpotName; source: 'buoy' | 'practice'; significantHeight: number; period: number; heightAt: 'deep' | 'edge'; typical: number; sets: number; waves: number; setBreakZ: number; takeOffZ: number; stepMs: number; cells: number }`;
  - `summariseRun(input: Omit<SizeRun, 'typical' | 'sets' | 'waves' | 'setBreakZ'>, waves: readonly BreakingWave[], takeOffWaves: readonly BreakingWave[]): SizeRun`;
  - `interface SizeGate { name: string; pass: boolean; detail: string }`;
  - `sizeGates(runs: readonly SizeRun[], baseline: readonly SizeRun[]): SizeGate[]` (used by Part B; Part A reports without gating);
  - `sizeMarkdown(runs: readonly SizeRun[], gates: readonly SizeGate[] | undefined, command: string): string`.
  - `SizeRun.heightAt` is written `'edge'` for every Part A run (today's tank takes its swell at the edge).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import type { BreakingWave } from './SurfMeter';
import { sizeGates, sizeMarkdown, summariseRun, type SizeRun } from './sizeReport';
import { komarGaughan } from './surfForecast';

const wave = (time: number, face: number, z = -100): BreakingWave => ({ time, x: 0, z, face });
const base = { spot: 'reef' as const, source: 'buoy' as const, significantHeight: 3, period: 12, heightAt: 'deep' as const, takeOffZ: -100, stepMs: 5, cells: 1000 };

describe('size report', () => {
  it('summarises a run: H1/3 and H1/10 of its waves, and where its sets broke at the take-off', () => {
    const faces = [1, 2, 3, 4, 5, 6];
    const takeOff = [wave(0, 6, -110), wave(12, 5, -106), wave(24, 1, -60), wave(36, 2, -70), wave(48, 1.5, -65), wave(60, 1.2, -62)];
    const run = summariseRun(base, faces.map((face, i) => wave(i * 12, face)), takeOff);
    expect(run.typical).toBeCloseTo(5.5, 12);
    expect(run.sets).toBe(6);
    expect(run.waves).toBe(6);
    // The sets are the take-off's highest third: 6 and 5, broken at −110 and −106.
    expect(run.setBreakZ).toBeCloseTo(-108, 12);
  });

  it('passes big days within 20 % of Komar-Gaughan and fails them outside', () => {
    const kg = komarGaughan(3, 12);
    const near: SizeRun = { ...summariseRun(base, [], []), typical: 1.1 * kg, sets: 1.4 * kg, waves: 30, setBreakZ: -104 };
    const far: SizeRun = { ...near, spot: 'point', typical: 0.5 * kg };
    const gates = sizeGates([near, far], []);
    expect(gates.find((gate) => gate.name === 'reef Hs 3 m Tp 12 s')!.pass).toBe(true);
    expect(gates.find((gate) => gate.name === 'point Hs 3 m Tp 12 s')!.pass).toBe(false);
    expect(gates.find((gate) => gate.name === 'reef Hs 3 m Tp 12 s take-off')!.pass).toBe(true);
  });

  it('holds small days to within 5 % of the baseline, and the Canyon to the same faces', () => {
    const small: SizeRun = { ...summariseRun({ ...base, significantHeight: 1, heightAt: 'edge' }, [], []), typical: 1.0, sets: 1.3, waves: 20, setBreakZ: -90 };
    const canyon: SizeRun = { ...small, spot: 'canyon', significantHeight: 2, heightAt: 'edge' };
    const gates = sizeGates([{ ...small, typical: 1.04 }, { ...canyon, typical: 1.2 }], [small, canyon]);
    expect(gates.find((gate) => gate.name === 'reef Hs 1 m Tp 12 s small day')!.pass).toBe(true);
    expect(gates.find((gate) => gate.name === 'canyon Hs 2 m Tp 12 s unchanged')!.pass).toBe(false);
  });

  it('writes a table per spot with the empirical references', () => {
    const run: SizeRun = { ...summariseRun(base, [], []), typical: 4, sets: 5, waves: 30, setBreakZ: -104 };
    const markdown = sizeMarkdown([run], undefined, 'npm run report:sizes');
    expect(markdown).toContain('## reef');
    expect(markdown).toContain(komarGaughan(3, 12).toFixed(2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/sizeReport.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/wave/sizeReport.ts`**

```ts
import type { SpotName } from './Bathymetry';
import { highestMean, type BreakingWave } from './SurfMeter';
import { caldwellAucan, komarGaughan } from './surfForecast';

/** The report's seas (the wave-sizes spec, Checks): buoy heights, m, by peak periods, s. */
export const SIZE_GRID = { heights: [1, 1.5, 2, 3, 4], periods: [10, 14, 18] } as const;
/** Sea time each run measures, s. */
export const SIZE_SEA_SECONDS = 240;
/** The report measures faces in bands this wide along shore, m, clear of the window's open edges by SIZE_EDGE_MARGIN. */
export const SIZE_BAND_WIDTH = 20;
export const SIZE_EDGE_MARGIN = 20;
/** Gates: big days within 20 % of Komar–Gaughan, small days within 5 % of the baseline, the take-off within 15 m of the sets' break. */
export const BIG_DAY = 2;
export const SMALL_DAY = 1.5;
export const BIG_TOLERANCE = 0.2;
export const SMALL_TOLERANCE = 0.05;
export const TAKE_OFF_TOLERANCE = 15;

export interface SizeRun {
  spot: SpotName;
  source: 'buoy' | 'practice';
  significantHeight: number;
  period: number;
  /** Where the run's height was given: in deep water (shoaled to the edge) or at the tank's edge. */
  heightAt: 'deep' | 'edge';
  typical: number;
  sets: number;
  waves: number;
  /** Median across-shore position where the take-off's sets (its highest third) started breaking, m. */
  setBreakZ: number;
  takeOffZ: number;
  stepMs: number;
  cells: number;
}

const median = (values: number[]) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** A run's faces (every band) and its take-off's sets. */
export function summariseRun(
  input: Omit<SizeRun, 'typical' | 'sets' | 'waves' | 'setBreakZ'>, waves: readonly BreakingWave[], takeOffWaves: readonly BreakingWave[],
): SizeRun {
  const faces = waves.map((wave) => wave.face);
  const byFace = [...takeOffWaves].sort((a, b) => b.face - a.face);
  const sets = byFace.slice(0, Math.max(1, Math.ceil(byFace.length / 3)));
  return {
    ...input,
    typical: highestMean(faces, 1 / 3),
    sets: highestMean(faces, 1 / 10),
    waves: faces.length,
    setBreakZ: median(sets.map((wave) => wave.z)),
  };
}

export interface SizeGate {
  name: string;
  pass: boolean;
  detail: string;
}

const label = (run: SizeRun) => (run.source === 'practice' ? `${run.spot} practice` : `${run.spot} Hs ${run.significantHeight} m Tp ${run.period} s`);
const same = (a: SizeRun, b: SizeRun) => a.spot === b.spot && a.source === b.source && a.significantHeight === b.significantHeight
  && a.period === b.period && a.heightAt === b.heightAt;

/** The spec's gates, for the runs they apply to. */
export function sizeGates(runs: readonly SizeRun[], baseline: readonly SizeRun[]): SizeGate[] {
  const gates: SizeGate[] = [];
  for (const run of runs) {
    const reference = baseline.find((old) => same(old, run));
    if (run.spot === 'canyon') {
      if (reference) {
        const pass = run.typical === reference.typical && run.sets === reference.sets && run.waves === reference.waves;
        gates.push({ name: `${label(run)} unchanged`, pass, detail: `H1/3 ${run.typical.toFixed(3)} against ${reference.typical.toFixed(3)} m` });
      }
      continue;
    }
    if (run.source === 'buoy' && run.heightAt === 'deep' && run.significantHeight >= BIG_DAY) {
      const empirical = komarGaughan(run.significantHeight, run.period);
      const ratio = run.typical / empirical;
      gates.push({ name: label(run), pass: Math.abs(ratio - 1) <= BIG_TOLERANCE, detail: `H1/3 ${run.typical.toFixed(2)} m, ${(ratio * 100).toFixed(0)} % of Komar–Gaughan ${empirical.toFixed(2)} m` });
      const off = Math.abs(run.setBreakZ - run.takeOffZ);
      gates.push({ name: `${label(run)} take-off`, pass: off <= TAKE_OFF_TOLERANCE, detail: `take-off ${off.toFixed(0)} m from the sets' break` });
    }
    if ((run.source === 'practice' || (run.heightAt === 'edge' && run.significantHeight <= SMALL_DAY)) && reference) {
      const ratio = run.typical / reference.typical;
      gates.push({ name: run.source === 'practice' ? label(run) : `${label(run)} small day`, pass: Math.abs(ratio - 1) <= SMALL_TOLERANCE, detail: `H1/3 ${run.typical.toFixed(2)} m, ${(ratio * 100).toFixed(1)} % of today's ${reference.typical.toFixed(2)} m` });
    }
  }
  return gates;
}

/** The report: a table per spot with the empirical references, then the gates if any. */
export function sizeMarkdown(runs: readonly SizeRun[], gates: readonly SizeGate[] | undefined, command: string): string {
  const lines = [
    '# Size report',
    '',
    `Generated by \`${command}\` on ${new Date().toISOString().slice(0, 10)} (the wave-sizes spec). Faces are measured as each wave starts to break, crest to the trough ahead, in 20 m bands across the window; H1/3 and H1/10 over ${SIZE_SEA_SECONDS} s of sea. Komar–Gaughan is the H1/3 reference; Caldwell & Aucan the H1/10 of Hawaii's highest-refraction outer reefs.`,
  ];
  for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
    const rows = runs.filter((run) => run.spot === spot);
    if (!rows.length) continue;
    lines.push('', `## ${spot}`, '', '| Sea | Given at | Waves | H1/3 (m) | H1/10 (m) | Komar–Gaughan H_b (m) | H1/3 ÷ K–G | Caldwell–Aucan H1/10 (m) | Sets break z (m) | Take-off z (m) | Cells | Step (ms) |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const run of rows) {
      const kg = run.source === 'practice' ? Number.NaN : komarGaughan(run.significantHeight, run.period);
      const ca = run.source === 'practice' ? Number.NaN : caldwellAucan(run.significantHeight, run.period);
      const cell = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
      lines.push(`| ${label(run)} | ${run.heightAt} | ${run.waves} | ${cell(run.typical)} | ${cell(run.sets)} | ${cell(kg)} | ${cell(run.typical / kg)} | ${cell(ca)} | ${cell(run.setBreakZ, 0)} | ${cell(run.takeOffZ, 0)} | ${run.cells} | ${cell(run.stepMs, 1)} |`);
    }
  }
  if (gates) {
    lines.push('', '## Gates', '', '| Gate | Result | Detail |', '|---|---|---|');
    for (const gate of gates) lines.push(`| ${gate.name} | ${gate.pass ? 'pass' : '**fail**'} | ${gate.detail} |`);
  }
  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/sizeReport.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `scripts/size-report.ts`**

```ts
/**
 * Size report (the wave-sizes spec): runs each spot's surf zone over the size grid and the practice
 * groundswell, measures the breaking faces (H1/3, H1/10) and where the sets break, and sets them beside
 * Komar & Gaughan and Caldwell & Aucan. Each spot writes docs/research/sizes/<spot>.json, then the
 * Markdown is rebuilt from every spot's file, so spots can run in parallel processes.
 *
 *   npm run report:sizes -- --spots reef
 *   npm run report:sizes -- --spots beach --gates        (Part B: gate against docs/research/sizes/baseline/)
 *   npm run report:sizes -- --spots point --heights 3 --periods 14 --seconds 120
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, PRACTICE_SWELL, spreadingFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { SurfMeter, TAKE_OFF_BAND, type BreakingWave } from '../src/wave/SurfMeter';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { SIZE_BAND_WIDTH, SIZE_EDGE_MARGIN, SIZE_GRID, SIZE_SEA_SECONDS, sizeGates, sizeMarkdown, summariseRun, type SizeRun } from '../src/wave/sizeReport';
import { fitForecast } from '../src/wave/surfForecast';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const list = (name: string, fallback: readonly number[]) => option(name)?.split(',').map(Number) ?? [...fallback];
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon']) as SpotName[];
const heights = list('heights', SIZE_GRID.heights);
const periods = list('periods', SIZE_GRID.periods);
const seconds = Number(option('seconds') ?? SIZE_SEA_SECONDS);
const gating = process.argv.includes('--gates');
const directory = 'docs/research/sizes';
const STEP = 1 / 30;

function measure(config: SurfZoneConfig, source: SizeRun['source'], heightAt: SizeRun['heightAt']): SizeRun {
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const xMin = simulation.windowXMin + SIZE_EDGE_MARGIN;
  const xMax = simulation.windowXMin + solver.nx * solver.dx - SIZE_EDGE_MARGIN;
  const bands = [];
  for (let x = xMin; x + SIZE_BAND_WIDTH <= xMax + 1e-9; x += SIZE_BAND_WIDTH) bands.push({ xMin: x, xMax: x + SIZE_BAND_WIDTH });
  const takeOff = simulation.breakPoint();
  const faces = new SurfMeter(bands, config.peakPeriod, Infinity);
  const atTakeOff = new SurfMeter([{ xMin: takeOff.x - TAKE_OFF_BAND, xMax: takeOff.x + TAKE_OFF_BAND }], config.peakPeriod, Infinity);
  simulation.onBreak = (wave: BreakingWave) => {
    faces.add(wave);
    atTakeOff.add(wave);
  };
  let stepMs = 0;
  const steps = Math.round(seconds / STEP);
  for (let step = 0; step < steps; step += 1) {
    simulation.step(STEP);
    stepMs += simulation.lastStepMs;
  }
  return summariseRun({
    spot: config.spot, source, significantHeight: config.significantHeight, period: config.peakPeriod, heightAt,
    takeOffZ: takeOff.z, stepMs: stepMs / steps, cells: solver.nx * solver.nz,
  }, faces.waves(), atTakeOff.waves());
}

const settings = DEFAULT_PHYSICAL_SETTINGS;
const base = (spot: SpotName): Omit<SurfZoneConfig, 'significantHeight' | 'peakPeriod'> => ({
  spot, seed: 1, directionDegrees: settings.directionDegrees, spreading: spreadingFor(settings.spread), tide: 0, windSpeed: 0,
});
mkdirSync(`${directory}/baseline`, { recursive: true });
for (const spot of spots) {
  const started = Date.now();
  const runs: SizeRun[] = [];
  runs.push(measure({ ...base(spot), ...PRACTICE_SWELL, spreading: PRACTICE_SWELL.spreading, heightAt: 'edge' }, 'practice', 'edge'));
  for (const significantHeight of heights) {
    for (const peakPeriod of periods) {
      runs.push(measure({ ...base(spot), significantHeight, peakPeriod }, 'buoy', 'deep'));
      console.log(`${spot} Hs ${significantHeight} Tp ${peakPeriod}: H1/3 ${runs.at(-1)!.typical.toFixed(2)} m (${((Date.now() - started) / 60000).toFixed(1)} min)`);
    }
  }
  writeFileSync(`${directory}/${spot}.json`, `${JSON.stringify(runs, null, 1)}\n`);
  const fit = fitForecast(runs.filter((run) => run.source === 'buoy'));
  const practice = runs.find((run) => run.source === 'practice')!;
  console.log(`${spot}: { a: ${fit.a.toFixed(4)}, sets: ${fit.sets.toFixed(3)} }; practice { typical: ${practice.typical.toFixed(2)}, sets: ${practice.sets.toFixed(2)} }`);
}
const all: SizeRun[] = readdirSync(directory).filter((name) => name.endsWith('.json'))
  .flatMap((name) => JSON.parse(readFileSync(`${directory}/${name}`, 'utf8')) as SizeRun[]);
const baseline: SizeRun[] = existsSync(`${directory}/baseline`) ? readdirSync(`${directory}/baseline`).filter((name) => name.endsWith('.json'))
  .flatMap((name) => JSON.parse(readFileSync(`${directory}/baseline/${name}`, 'utf8')) as SizeRun[]) : [];
const gates = gating ? sizeGates(all, baseline) : undefined;
writeFileSync('docs/research/size-report.md', sizeMarkdown(all, gates, `npm run report:sizes -- ${process.argv.slice(2).join(' ')}`));
if (gates?.some((gate) => !gate.pass)) {
  console.log(`${gates.filter((gate) => !gate.pass).length} gate(s) fail`);
  process.exitCode = 1;
}
```

Notes for this step:
- `heightAt` is a `SurfZoneConfig` field only from Task B1. In Part A, leave the `heightAt: 'edge'` key out of the practice config and write `'edge'` for every Part A run's `SizeRun.heightAt` (change the `'deep'` argument in the grid loop to `'edge'`); Task B7 restores the code above.
- `spreadingFor` must be exported from `PhysicalMode.ts` (it is a module function today; export it, one word).

`package.json`: `"report:sizes": "rolldown scripts/size-report.ts -o dist/scripts/size-report.mjs --format esm --platform node && node dist/scripts/size-report.mjs",`

- [ ] **Step 6: Smoke-run one short case**

Run: `npm run report:sizes -- --spots reef --heights 1 --periods 10 --seconds 60`
Expected: prints a reef line with a finite H1/3 and the fit line; writes `docs/research/sizes/reef.json` and `docs/research/size-report.md`. Delete `docs/research/sizes/reef.json` afterwards (the full run replaces it).

- [ ] **Step 7: Commit**

```bash
git add src/wave/sizeReport.ts src/wave/sizeReport.test.ts scripts/size-report.ts package.json src/game/PhysicalMode.ts
git commit -m "feat: a size report measuring each spot's surf against empirical breaker heights"
```

### Task A7: Today's sizes, recorded and calibrated

**Files:**
- Output: `docs/research/sizes/{beach,point,reef,canyon}.json`, `docs/research/sizes/baseline/*.json`, `docs/research/size-report.md`
- Modify: `src/wave/surfForecast.ts` (`SURF_FORECAST`, `PRACTICE_SURF`)
- Test: `src/wave/surfForecast.test.ts`

- [ ] **Step 1: Run the full report, one background process per spot**

Run each in the background (four commands, four processes):
`npm run report:sizes -- --spots beach` (and `point`, `reef`, `canyon`), logging to the scratchpad.
Expected: each prints 15 grid lines plus its fit line; the four JSON files exist. Record the wall time per spot in the ledger.

- [ ] **Step 2: Copy the results as the baseline**

Copy `docs/research/sizes/<spot>.json` to `docs/research/sizes/baseline/<spot>.json` for all four spots (these are "today's" for Part B's small-day and Canyon gates).

- [ ] **Step 3: Write the failing calibration test**

```ts
import { readFileSync } from 'node:fs';
import type { SizeRun } from './sizeReport';
// …
  it('forecasts every measured run of the report within 25 %', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const runs = JSON.parse(readFileSync(`docs/research/sizes/${spot}.json`, 'utf8')) as SizeRun[];
      for (const run of runs.filter((r) => r.source === 'buoy' && r.waves >= 10)) {
        expect(forecastSurf(spot, run.significantHeight, run.period).typical / run.typical).toBeGreaterThan(0.75);
        expect(forecastSurf(spot, run.significantHeight, run.period).typical / run.typical).toBeLessThan(1.25);
      }
      const practice = runs.find((r) => r.source === 'practice')!;
      expect(PRACTICE_SURF[spot].typical).toBeCloseTo(practice.typical, 1);
    }
  });
```

Run: `npx vitest run src/wave/surfForecast.test.ts`
Expected: FAIL (the placeholder Komar–Gaughan fit does not match today's small tank).

- [ ] **Step 4: Paste the fitted values**

Set `SURF_FORECAST` and `PRACTICE_SURF` to the `{ a, sets }` and practice values each spot's run printed. Update the doc comment: "fitted on today's tank (Part A, <date>)".

- [ ] **Step 5: Run the test; if a run misses 25 %, record it**

Run: `npx vitest run src/wave/surfForecast.test.ts`
Expected: PASS. If a spot's small or long-period runs fall outside 25 % (the power law cannot fit a saturated tank), ledger a `Ruling:` that narrows that test to the spot's runs with `waves ≥ 10` and `significantHeight ≥ 1.5`, naming the runs left out; Part B's deeper tanks are expected to fit.

- [ ] **Step 6: Commit**

```bash
git add docs/research/sizes docs/research/size-report.md src/wave/surfForecast.ts src/wave/surfForecast.test.ts
git commit -m "docs: today's surf sizes per spot, and the forecast fitted to them"
```

### Task A8: The readouts

**Files:**
- Modify: `src/game/waveLab/waveInfo.ts`, `src/game/waveLab/WaveLab.ts`, `src/main.ts` (one line), `src/ui/App.ts`, `src/ui/labPanelModel.ts`, `src/ui/WaveLabScreen.ts`, `src/game/SurfConditions.ts`, `src/ui/SurfScreen.ts`, `src/ui/PauseMenu.ts`, `src/ui/strings.ts`
- Test: `src/game/waveLab/waveInfo.test.ts`, `src/ui/labPanelModel.test.ts`, `src/game/SurfConditions.test.ts`, `src/ui/SurfScreen.test.ts`

**Interfaces:**
- Consumes: `describeSurf`, `formatSurfRange`, `SurfWords`, `DEFAULT_SURFER_HEIGHT` (A3); `forecastSurf`, `PRACTICE_SURF` (A5/A7); `SurfZoneStatus.surf` (A2); `surferHeight` (A3); `GameplaySettings.surfScale` (A4).
- Produces: `WaveInfoInput.surf?: SurfReading`; `waveInfo(input, units, words?: Omit<SurfWords, 'units'>)`; `labSliders(physical, units, scale?: SurfScale)`; `surfForecastFor(spot: SpotName, swell: SwellSize): SurfForecast`; `createSurfChoices(initial, change, forecast?: (choice: SurfChoice) => string)`; `createPauseMenu(handlers, viewName, surf?: string)`.

- [ ] **Step 1: Write the failing tests**

`src/game/waveLab/waveInfo.test.ts`:

```ts
  it('leads with the measured surf, in the player\'s words (wave sizes)', () => {
    const info = waveInfo({ ...INPUT, surf: { typical: 2.4, sets: 3.1, waves: 12 } }, 'metric', { scale: 'face', surferHeight: 1.75 });
    expect(info.rows[0]).toEqual({ label: 'Surf', value: '2.4–3.1 m · overhead' });
    expect(waveInfo({ ...INPUT, surf: undefined }, 'imperial').rows[0].value).toBe('measuring…');
  });
```

(`INPUT` is the file's existing input fixture; use its real name.)

`src/ui/labPanelModel.test.ts`:

```ts
  it('shows the surf a buoy height will make beside the Height slider (wave sizes)', () => {
    const physical = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy' as const, spot: 'reef' as const, significantHeight: 3, peakPeriod: 14 };
    const height = labSliders(physical, 'metric').find((slider) => slider.key === 'significantHeight')!;
    const surf = forecastSurf('reef', 3, 14);
    expect(height.text).toBe(`3.0 m · surf ${formatSurfRange(surf.typical, surf.sets, 'metric', 'face')}`);
    expect(labSliders(physical, 'imperial', 'hawaiian').find((slider) => slider.key === 'significantHeight')!.text).toContain('Hawaiian');
  });
```

`src/game/SurfConditions.test.ts`:

```ts
  it('forecasts each swell size\'s surf at each spot, the practice groundswell as measured (wave sizes)', () => {
    for (const spot of SURF_SPOTS) {
      expect(surfForecastFor(spot, 'practice')).toEqual(PRACTICE_SURF[spot]);
      expect(surfForecastFor(spot, 'big')).toEqual(forecastSurf(spot, SWELLS.big.significantHeight, SWELLS.big.peakPeriod));
      expect(surfForecastFor(spot, 'big').typical).toBeGreaterThan(surfForecastFor(spot, 'small').typical);
    }
  });
```

`src/ui/SurfScreen.test.ts`:

```ts
  it('says the surf the chosen spot and swell will make, and follows the choices (wave sizes)', () => {
    const [, rows] = createSurfChoices({ spot: 'reef', conditions: DEFAULT_CONDITIONS }, () => {}, (choice) => `${choice.spot} ${choice.conditions.swell}`);
    const note = rows.querySelector('.choice-note')!;
    expect(note.textContent).toBe('reef practice');
    const big = [...rows.querySelectorAll('button')].find((button) => button.textContent === 'Big')!;
    big.dispatchEvent(new MouseEvent('click'));
    expect(note.textContent).toBe('reef big');
  });
```

(Check whether `SurfScreen.test.ts` runs with a DOM environment, e.g. a `// @vitest-environment happy-dom` header; copy the header the file's DOM tests use.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/waveLab/waveInfo.test.ts src/ui/labPanelModel.test.ts src/game/SurfConditions.test.ts src/ui/SurfScreen.test.ts`
Expected: FAIL (no Surf row; slider text without surf; `surfForecastFor` missing; no `.choice-note`).

- [ ] **Step 3: Implement**

- `strings.ts`: `'lab.info.surf': 'Surf',`, `'lab.surfForecast': '{height} · surf {surf}',`, `'surf.forecast': 'Surf: {surf}',`, `'pause.surf': 'Surf: {surf}',`.
- `waveInfo.ts`: `WaveInfoInput.surf?: SurfReading;` (import type from `../../wave/SurfMeter`); signature `waveInfo(input: WaveInfoInput, units: Units, words: Omit<SurfWords, 'units'> = { scale: 'face', surferHeight: DEFAULT_SURFER_HEIGHT })`; first row `{ label: t('lab.info.surf'), value: describeSurf(input.surf, { ...words, units }) },`.
- `WaveLab.ts` `info(sea, units, words?)`: pass `surf: status.surf` and `words` through to `waveInfo`.
- `main.ts`: `info: (units, words) => waveLab.info(mode(), units, words),`.
- `App.ts`: the lab interface's `info(units: Units, words?: Omit<SurfWords, 'units'>)`; a private helper

```ts
  /** How this player reads surf (the wave-sizes spec): the chosen scale, against the chosen surfer's height. */
  private surfWords(): SurfWords {
    const { gameplay, surfer } = this.settings.value;
    return { units: gameplay.units, scale: gameplay.surfScale, surferHeight: surferHeight(surfer.body) };
  }
```

  `labView`: `info: lab.info(this.settings.value.gameplay.units, this.surfWords()),`; `frame(intervalMs, status)` already receives the running sea's status each frame: keep `this.surf = status?.surf;` there (a new `private surf?: SurfReading`), and the pause menu gets `createPauseMenu({...}, this.viewLabel(), describeSurf(this.surf, this.surfWords()))`; Surf screen: pass `(choice) => { const surf = surfForecastFor(choice.spot, choice.conditions.swell); return t('surf.forecast', { surf: describeSurf(surf, this.surfWords()) }); }` as `createSurfChoices`'s third argument where the Surf screen is built (via `createSurfScreen`, add the same optional parameter and pass it through).
- `labPanelModel.ts`: `labSliders(physical, units, scale: SurfScale = 'face')`; the Height slider text:

```ts
      swell('significantHeight', t('lab.height'), 0.3, 3, 0.1, t('lab.surfForecast', {
        height: formatHeight(physical.significantHeight, units),
        surf: (({ typical, sets }) => formatSurfRange(typical, sets, units, scale))(forecastSurf(physical.spot, physical.significantHeight, physical.peakPeriod)),
      })),
```

  `WaveLabScreen.ts`: take `scale` in its options next to `units` and pass it to both `labSliders` calls; `App` passes `scale: this.settings.value.gameplay.surfScale`.
- `SurfConditions.ts`:

```ts
/** The surf a swell size makes at a spot (the wave-sizes spec): the practice groundswell as measured, the others forecast. */
export function surfForecastFor(spot: SpotName, swell: SwellSize): SurfForecast {
  if (swell === 'practice') return { ...PRACTICE_SURF[spot] };
  const { significantHeight, peakPeriod } = SWELLS[swell];
  return forecastSurf(spot, significantHeight, peakPeriod);
}
```

- `SurfScreen.ts` `createSurfChoices(initial, change, forecast?)`: when `forecast` is given, make `const note = el('p', { class: 'choice-note', text: forecast(choice) })` and put it last inside the `choice-rows` div (`el('div', { class: 'choice-rows' }, ...rows, note)`); in every `change(...)` path set `note.textContent = forecast(choice)` first.
- `PauseMenu.ts` `createPauseMenu(handlers, viewName, surf?: string)`: when `surf` is given, put `el('p', { class: 'pause-note', text: t('pause.surf', { surf }) })` first inside the panel. Add `.choice-note, .pause-note { color: var(--muted); margin: 0.5rem 0 0; }` to `ui.css` (use the file's existing muted colour variable).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/waveLab src/ui src/game/SurfConditions.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`
Expected: no errors.

```bash
git add src/game/waveLab src/ui src/game/SurfConditions.ts src/game/SurfConditions.test.ts src/main.ts
git commit -m "feat: show the measured and forecast surf in the Wave Lab, the Surf screen and the pause card"
```

### Part A finish

- [ ] Run `npx vitest run` (whole suite) and `npx tsc -b`; both green (load-sensitive timeouts that pass alone are noted, not failures).
- [ ] Final whole-branch review (executing-plans: a fresh reviewer on the most capable model), fix pass, ledger.
- [ ] ROADMAP: add the wave-sizes entry (Part A done: meter, readouts, size report and today's sizes table).
- [ ] Push, open PR A ("Wave sizes Part A: measure the surf"), merge when checks pass (ask if the merge is blocked).

---

# Part B · Bigger surf

### Task B1: Deep-water input, shoaled to the edge

**Files:**
- Modify: `src/wave/dispersion.ts` (`shoalingCoefficient`)
- Modify: `src/wave/SurfZoneSimulation.ts` (`SurfZoneConfig.heightAt`, `edgeHeight`, `surfZoneSea`, lip nonlinearity, `breakerDepth`)
- Modify: `src/game/PhysicalMode.ts` (Practice's config `heightAt: 'edge'`)
- Test: `src/wave/dispersion.test.ts`, `src/wave/SurfZoneSimulation.test.ts`, `src/game/PhysicalMode.test.ts`

**Interfaces:**
- Produces: `shoalingCoefficient(period: number, depth: number): number`; `SurfZoneConfig.heightAt?: 'deep' | 'edge'` (default `'deep'`); `edgeHeight(config: SurfZoneConfig, edgeDepth?: number): number`.

- [ ] **Step 1: Write the failing tests**

`dispersion.test.ts`:

```ts
  it('shoals a deep-water wave by √(cg∞ / cg(h)): about 1 in deep water, dipping in between, growing in shallow water', () => {
    expect(shoalingCoefficient(8, 500)).toBeCloseTo(1, 6);
    expect(shoalingCoefficient(12, 30)).toBeLessThan(1);
    const shallow = shoalingCoefficient(12, 5);
    const deepGroup = (9.81 * 12) / (4 * Math.PI);
    expect(shallow).toBeCloseTo(Math.sqrt(deepGroup / waveKinematics(12, 5).groupSpeed), 12);
    expect(shallow).toBeGreaterThan(1.1);
  });
```

`SurfZoneSimulation.test.ts`:

```ts
  it('takes a buoy height in deep water and shoals it to the tank\'s edge (wave sizes)', () => {
    const config: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 2, peakPeriod: 12 };
    expect(edgeHeight(config)).toBeCloseTo(2 * shoalingCoefficient(12, OFFSHORE_DEPTH.point), 12);
    expect(surfZoneSea(config).components[0].amplitude).toBeCloseTo(edgeHeight(config) / Math.sqrt(8 * small.componentCount!), 12);
    // Practice gives its height at the edge, and the Canyon always takes its swell there: their seas stay as they were.
    expect(edgeHeight({ ...config, heightAt: 'edge' })).toBe(2);
    expect(edgeHeight({ ...config, spot: 'canyon' })).toBe(2);
  });
```

`PhysicalMode.test.ts`: assert the config PhysicalMode builds for `source: 'practice'` carries `heightAt: 'edge'` and for `'buoy'` omits it or sets `'deep'` (use the function the file's tests use to build a config, e.g. `surfZoneConfigFor`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/dispersion.test.ts src/wave/SurfZoneSimulation.test.ts -t "shoal" src/game/PhysicalMode.test.ts`
Expected: FAIL (`shoalingCoefficient`, `edgeHeight` missing).

- [ ] **Step 3: Implement**

`dispersion.ts`:

```ts
/** Linear shoaling from deep water to depth h at period T: K_s = √(c_g∞ / c_g(h)), c_g∞ = gT/4π. */
export function shoalingCoefficient(period: number, depth: number, g = GRAVITY): number {
  return Math.sqrt((g * period) / (4 * Math.PI) / waveKinematics(period, depth, g).groupSpeed);
}
```

`SurfZoneSimulation.ts`:
- `SurfZoneConfig.significantHeight` doc: "Significant wave height Hs, m: the buoy's, in deep water, unless `heightAt` is 'edge'."; new field `/** Where Hs is given: in deep water, shoaled to the tank's edge (the default), or at the edge (Practice). The Canyon always takes it at the edge. */ heightAt?: 'deep' | 'edge';`
- 

```ts
/** The sea's Hs at the tank's edge, m: the buoy's deep-water height shoaled by linear theory, unless given at the edge. */
export function edgeHeight(config: SurfZoneConfig, edgeDepth = OFFSHORE_DEPTH[config.spot]): number {
  if (config.spot === 'canyon' || config.heightAt === 'edge') return config.significantHeight;
  return config.significantHeight * shoalingCoefficient(config.peakPeriod, edgeDepth + config.tide);
}
```

- `surfZoneSea`: `significantHeight: edgeHeight(config),`.
- `breakerDepth()`: `breakerDepthFor(edgeHeight(this.config), this.sea.depth)`; `takeOffPoint`: `breakerDepthFor(edgeHeight(config), offshoreDepth + config.tide)`; the lip's `nonlinearity: edgeHeight(this.config) / (OFFSHORE_DEPTH[this.config.spot] + this.config.tide)`.

`PhysicalMode.ts`: where the `SurfZoneConfig` is built from `swellFor(settings)`, add `...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {})`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave src/game/PhysicalMode.test.ts`
Expected: PASS. The existing "finds the break line at the shoaled breaker depth" test builds a Beach config without `heightAt`: its expected value becomes `breakerDepthFor(edgeHeight(config), …)`; update that line (ledger it).

- [ ] **Step 5: Commit**

```bash
git add src/wave/dispersion.ts src/wave/dispersion.test.ts src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts
git commit -m "feat: take the buoy's height in deep water and shoal it to the tank's edge"
```

### Task B2: The 4 m storm cap

**Files:**
- Modify: `src/game/PhysicalMode.ts` (`TANK_SWELL_LIMITS.height.max` 4, `swellHeightLimit(spot)`, the storm clamp)
- Modify: `src/game/waveLab/labSettings.ts`, `src/ui/labPanelModel.ts`
- Test: `src/game/PhysicalMode.test.ts`, `src/game/waveLab/labSettings.test.ts`, `src/ui/labPanelModel.test.ts`

**Interfaces:**
- Produces: `swellHeightLimit(spot: SpotName): number` (4, the Canyon 3); `TANK_SWELL_LIMITS.height.max === 4`.

- [ ] **Step 1: Write the failing tests**

```ts
  it('lets buoys and storms reach 4 m, and the Canyon 3 m as before (wave sizes)', () => {
    expect(TANK_SWELL_LIMITS.height.max).toBe(4);
    expect(swellHeightLimit('reef')).toBe(4);
    expect(swellHeightLimit('canyon')).toBe(3);
    const storm = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm' as const, stormWindSpeed: 30, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 0 };
    expect(swellFor({ ...storm, spot: 'point' }).significantHeight).toBe(4);
    expect(swellFor({ ...storm, spot: 'canyon' }).significantHeight).toBe(3);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', spot: 'canyon', significantHeight: 3.8 }).significantHeight).toBe(3);
  });
```

`labPanelModel.test.ts`: the Height slider's `max` is 4 at the Reef and 3 at the Canyon. `labSettings.test.ts`: a saved 3.8 m loads as 3.8 (not clamped to 3).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/PhysicalMode.test.ts src/game/waveLab/labSettings.test.ts src/ui/labPanelModel.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`PhysicalMode.ts`:

```ts
export const TANK_SWELL_LIMITS = { height: { min: 0.3, max: 4 }, period: { min: 6, max: 18 } };
/** The Canyon keeps its tank and sea as they were (the wave-sizes spec), and so its 3 m cap. */
export function swellHeightLimit(spot: SpotName): number {
  return spot === 'canyon' ? 3 : TANK_SWELL_LIMITS.height.max;
}
```

In `swellFor`: buoy `significantHeight: Math.min(settings.significantHeight, swellHeightLimit(settings.spot))`; storm `clamp(storm.significantHeight, { min: TANK_SWELL_LIMITS.height.min, max: swellHeightLimit(settings.spot) })`.
`labPanelModel.ts`: Height slider max `swellHeightLimit(physical.spot)`. `labSettings.ts` keeps using `TANK_SWELL_LIMITS` (now 4).

- [ ] **Step 4: Run tests to verify they pass, then commit**

Run: `npx vitest run src/game src/ui`
Expected: PASS.

```bash
git add src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts src/game/waveLab src/ui/labPanelModel.ts src/ui/labPanelModel.test.ts
git commit -m "feat: raise the swell cap to 4 m, the Canyon staying at 3 m"
```

### Task B3: The tank sized to the swell

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (`TankLayout`, `tankLayout`, `tankDepth`'s layout parameter, every `TANK`/`OFFSHORE_DEPTH` use, the boundary's wave numbers, `readonly tank`)
- Modify: `src/wave/BoussinesqSolver.ts` (`madsenSorensenWaveNumber`)
- Modify: `src/physics/PhysicalBodyWaterField.ts`, `src/game/waveLab/WaveLab.ts`, `src/game/PhysicalMode.ts` (far field and seabed from the layout)
- Modify: scripts that call `tankDepth` or read `TANK` (find them with `grep -rn "tankDepth\|TANK\." scripts src/dev`)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/wave/BoussinesqSolver.test.ts`

**Interfaces:**
- Consumes: `edgeHeight` (B1), `komarGaughan`, `SETS_OVER_TYPICAL` (A5), `BREAKER_INDEX`.
- Produces: `interface TankLayout { offshore: number; zoneInner: number; blendEnd: number; fineFrom: number; shore: number; edgeDepth: number }`; `EDGE_DEPTH_PER_HS = 3.3`; `EDGE_DEPTH_MAX_WAVELENGTHS = 0.4`; `ZONE_WAVELENGTHS = 0.75`; `SET_FINE_MARGIN = 40`; `tankLayout(config: SurfZoneConfig): TankLayout`; `tankDepth(spot, edgeDepth, x, z, layout: Pick<TankLayout, 'zoneInner' | 'blendEnd'> = TANK)`; `SurfZoneSimulation.tank: TankLayout`; `madsenSorensenWaveNumber(omega: number, depth: number): number`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('the tank sized to the swell (wave sizes)', () => {
  const config = (spot: SpotName, significantHeight: number, peakPeriod = 14): SurfZoneConfig => ({ ...small, spot, significantHeight, peakPeriod });

  it('keeps today\'s tank for small days, Practice and the Canyon', () => {
    for (const spot of ['beach', 'point', 'reef'] as const) {
      expect(tankLayout(config(spot, 1.5, 18))).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
      expect(tankLayout({ ...config(spot, 1.4, 12), heightAt: 'edge' })).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH[spot] });
    }
    expect(tankLayout(config('canyon', 3))).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH.canyon });
  });

  it('deepens the edge to 3.3 Hs, within 0.4 of the deep-water wavelength, and lengthens the tank to reach it', () => {
    const layout = tankLayout(config('beach', 4, 14));
    expect(layout.edgeDepth).toBeCloseTo(13.2, 6);
    const spot = createSpot('beach', small.seed);
    expect(spot.depthAt(0, layout.zoneInner)).toBeGreaterThanOrEqual(layout.edgeDepth - 0.05);
    expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(Math.max(60, 0.75 * waveKinematics(14, layout.edgeDepth).wavelength) - 1e-6);
    expect(layout.blendEnd - layout.zoneInner).toBe(TANK.blendEnd - TANK.zoneInner);
    // A short-period storm sea keeps kh ≤ 2.5 at the edge.
    expect(tankLayout(config('reef', 4, 6)).edgeDepth).toBeLessThanOrEqual(0.4 * (9.81 * 36) / (2 * Math.PI) + 1e-9);
  });

  it('starts the fine zone 40 m seaward of where the sets break, never shoreward of −150', () => {
    for (const spot of ['beach', 'point', 'reef'] as const) {
      const layout = tankLayout(config(spot, 4, 18));
      const sets = SETS_OVER_TYPICAL * komarGaughan(4, 18) / BREAKER_INDEX;
      const bed = createSpot(spot, small.seed);
      let setBreak = layout.blendEnd;
      while (bed.depthAt(0, setBreak) > sets && setBreak < TANK.shore) setBreak += 1;
      expect(layout.fineFrom).toBeLessThanOrEqual(Math.min(TANK.fineFrom, setBreak - 40) + 1);
    }
  });

  it('keeps every layout ordered with a finite bed', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      for (const significantHeight of [0.3, 1, 2, 3, 4]) {
        for (const peakPeriod of [6, 10, 14, 18]) {
          const layout = tankLayout(config(spot, significantHeight, peakPeriod));
          expect(layout.offshore).toBeLessThan(layout.zoneInner);
          expect(layout.zoneInner).toBeLessThan(layout.blendEnd);
          expect(layout.blendEnd).toBeLessThan(layout.fineFrom);
          expect(layout.fineFrom).toBeLessThan(layout.shore);
          expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(60);
          expect(Number.isFinite(tankDepth(createSpot(spot, 1), layout.edgeDepth, 0, layout.offshore, layout))).toBe(true);
        }
      }
    }
  });

  it('builds and steps the deepest Beach tank, its boundary forcing the solver\'s own waves', () => {
    const simulation = new SurfZoneSimulation({ ...config('beach', 4, 18), alongShore: 20, dx: 2 });
    expect(simulation.tank).toEqual(tankLayout({ ...config('beach', 4, 18), alongShore: 20, dx: 2 }));
    expect(simulation.solver.zCenters[0]).toBeLessThan(simulation.tank.zoneInner);
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, simulation.sea.depth), 10);
    for (let frame = 0; frame < 60; frame += 1) simulation.step(1 / 30);
    for (const value of simulation.solver.h) expect(Number.isFinite(value)).toBe(true);
  }, 120_000);

  it('builds today\'s tanks exactly as before', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef' });
    expect(simulation.tank).toEqual({ ...TANK, edgeDepth: OFFSHORE_DEPTH.reef });
    const omega = simulation.sea.components[0].omega;
    expect(simulation.sea.components[0].k).toBe(shallowWaterWaveNumber(omega, simulation.sea.depth));
  });
});
```

`BoussinesqSolver.test.ts`:

```ts
  it('gives the wave number of its own dispersion', () => {
    const omega = (2 * Math.PI) / 10;
    expect(madsenSorensenWaveNumber(omega, 12)).toBeCloseTo(omega / madsenSorensenCelerity(omega, 12), 12);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "tank" src/wave/BoussinesqSolver.test.ts -t "wave number"`
Expected: FAIL (`tankLayout`, `madsenSorensenWaveNumber` missing).

- [ ] **Step 3: Implement**

`BoussinesqSolver.ts`:

```ts
/** The wave number ω/c the Madsen–Sørensen equations give at depth d, 1/m (a deep tank's boundary sea). */
export function madsenSorensenWaveNumber(omega: number, depth: number, g = GRAVITY): number {
  return omega / madsenSorensenCelerity(omega, depth, g);
}
```

`SurfZoneSimulation.ts`:

```ts
/** A tank's layout across shore, m, and the still depth of its flat edge under the relaxation zone, m below datum. */
export interface TankLayout {
  offshore: number;
  zoneInner: number;
  blendEnd: number;
  fineFrom: number;
  shore: number;
  edgeDepth: number;
}

/** A big day's edge is this many buoy heights deep, so the zone's linear sea stays near linear (the wave-sizes spec). */
export const EDGE_DEPTH_PER_HS = 3.3;
/** …and at most this share of the deep-water wavelength, keeping kh ≤ 2.5 where the solver's dispersion holds. */
export const EDGE_DEPTH_MAX_WAVELENGTHS = 0.4;
/** A deeper tank's relaxation zone is at least this share of the edge wavelength long. */
export const ZONE_WAVELENGTHS = 0.75;
/** The fine zone starts this far seaward of where the sets break, m. */
export const SET_FINE_MARGIN = 40;
/** The furthest a tank reaches offshore, m. */
const TANK_REACH = -3000;

/**
 * The tank for a swell (the wave-sizes spec): today's for small days, Practice and the Canyon; for a big day,
 * its edge where the take-off transect's bed first reaches the edge depth, a relaxation zone at least 60 m and
 * 0.75 of the edge wavelength long, and the 1 m zone from 40 m seaward of where the sets break.
 */
export function tankLayout(config: SurfZoneConfig): TankLayout {
  const today: TankLayout = { ...TANK, edgeDepth: OFFSHORE_DEPTH[config.spot] };
  if (config.spot === 'canyon') return today;
  const deepWavelength = (GRAVITY * config.peakPeriod ** 2) / (2 * Math.PI);
  const edgeDepth = Math.max(today.edgeDepth, Math.min(EDGE_DEPTH_PER_HS * config.significantHeight, EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength));
  if (edgeDepth <= today.edgeDepth) return today;
  const spot = createSpot(config.spot, config.seed);
  let zoneInner = TANK.zoneInner;
  while (spot.depthAt(0, zoneInner) < edgeDepth && zoneInner > TANK_REACH) zoneInner -= 1;
  const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, edgeDepth).wavelength);
  const blendEnd = zoneInner + (TANK.blendEnd - TANK.zoneInner);
  const setDepth = (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX;
  let setBreak = blendEnd;
  while (spot.depthAt(0, setBreak) > setDepth && setBreak < TANK.fineFrom) setBreak += 1;
  // Sets breaking right at the blend would put the fine zone over it; keep 20 m of the spot's own bed coarse.
  const fineFrom = Math.max(blendEnd + 20, Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN));
  return { offshore: zoneInner - zone, zoneInner, blendEnd, fineFrom, shore: TANK.shore, edgeDepth };
}
```

- `tankDepth(spot, edgeDepth, x, z, layout: Pick<TankLayout, 'zoneInner' | 'blendEnd'> = TANK)`: blend with `layout.zoneInner`, `layout.blendEnd`.
- `surfZoneSea(config)`: `const tank = tankLayout(config);` depth `tank.edgeDepth + config.tide`, `significantHeight: edgeHeight(config, tank.edgeDepth)`, and wave numbers `tank.edgeDepth > OFFSHORE_DEPTH[config.spot] && (config.stage ?? 2) === 2 ? madsenSorensenWaveNumber : shallowWaterWaveNumber`.
- `SurfZoneSimulation`: `readonly tank: TankLayout` set first in the constructor (`this.tank = tankLayout(config)`); every `TANK.x` becomes `this.tank.x` and every `OFFSHORE_DEPTH[config.spot]` becomes `this.tank.edgeDepth` (grid `zEdges`, `depthAt`, `planSetRun`, `warmStart`, the boundary's zone weights, `iribarren`, `breakingFraction`, the lip's nonlinearity). `takeOffPoint(config)` uses `tankLayout(config)` the same way.
- `PhysicalBodyWaterField.ts`: `this.simulation.tank.offshore` / `.shore` for the bounds and the cross steps.
- `WaveLab.ts` bounds: `const tank = tankLayout(host.config)`; `zMin: tank.offshore`, `zMax: tank.shore + BEACH_MARGIN`.
- `PhysicalMode.ts` (keep the diff small): `const tank = tankLayout(config); const offshoreDepth = tank.edgeDepth;`, then `TANK.offshore`/`TANK.shore` → `tank.offshore`/`tank.shore`, `tankDepth(spot, offshoreDepth, …, tank)`, the seabed axis from `Math.min(-900, tank.offshore - 300)`, and `offshoreZ: Math.min(-FAR_EXTENT, tank.offshore - 300)`.
- Scripts and `src/dev` found by the grep: pass the simulation's `tank` (or `tankLayout(config)`) where they read `TANK`/`OFFSHORE_DEPTH` for a running sea.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave src/physics src/game`
Expected: PASS. Existing tests that assert `TANK` for small seas stay green (today's layout is unchanged).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`
Expected: no errors.

```bash
git add src scripts
git commit -m "feat: size the tank to the swell: a deeper edge, a longer zone, the fine zone from where sets break"
```

### Task B4: Real outer profiles (research)

**Files:**
- Create: `docs/research/outer-profiles.md`

- [ ] **Step 1: Research and write the doc**

Find measured cross-shore profiles (surveys, papers, agency data; cite each with its URL or DOI) for:
- a **double-barred beach** (Duck, NC, USACE FRF; Birkemeier 1985 or Ruessink/Plant bar studies): outer bar crest depth, distance offshore, height; the offshore slope to 10–20 m;
- a **point** (Rincon, Malibu, Jeffreys Bay, or similar): slope off the tip to 10–30 m, and where it flattens;
- a **steep reef** (Pipeline/Ehukai, Teahupo'o, or similar): depths of the reef steps and the drop to 20–30 m, with distances.

For each, state the range the shapes below must fall in, and whether the initial values in Task B5 are inside it. Where a value falls outside, give the in-range value Task B5 uses instead (and ledger a `Ruling:`).

- [ ] **Step 2: Commit**

```bash
git add docs/research/outer-profiles.md
git commit -m "docs: measured outer surf-zone profiles for the Beach, Point and Reef"
```

### Task B5: Deeper outer bathymetry

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`BEACH_OUTER`, `POINT_OUTER`, `REEF_OUTER`; the beach, point and reef `depthAt`)
- Test: `src/wave/Bathymetry.test.ts`

**Interfaces:**
- Produces: `BEACH_OUTER = { barOffshore: 320, barHeight: 1.3, barWidth: 45, maxDepth: 30 }`; `POINT_OUTER = { slope: 0.015, maxDepth: 30 }`; `REEF_OUTER = { start: -270, length: 120, depth: 30 }` (values as confirmed or replaced by Task B4's rulings).

- [ ] **Step 1: Write the failing tests**

```ts
import { BEACH_BAR, BEACH_OUTER, POINT_HEADLAND, POINT_OUTER, REEF, REEF_OUTER, createSpot, deanDepth, reefEdgeZ, smoothstep } from './Bathymetry';
import { seededRandom } from './random';

/** Today's beds, copied, for the inner zone that must not change. */
const todayBeach = (seed: number) => {
  const random = seededRandom(seed, 0xbeac4);
  const rips: number[] = [];
  for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
  return (x: number, z: number) => {
    let gap = 0;
    for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
    return deanDepth(-z) - BEACH_BAR.height * Math.exp(-(((-z - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
  };
};
const todayPoint = (x: number, z: number) => {
  const { center, halfWidth, protrusion, slope } = POINT_HEADLAND;
  const offshore = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x) - z;
  return offshore <= 0 ? offshore * 0.06 : Math.min(12, slope * offshore);
};
const todayReef = (x: number, z: number) => {
  const edgeZ = reefEdgeZ(x);
  const onReef = smoothstep(edgeZ - REEF.edgeWidth / 2, edgeZ + REEF.edgeWidth / 2, z);
  const channel = Math.max(deanDepth(-z), REEF.channelDepth);
  const shelf = Math.min(deanDepth(-z, REEF.beachA), REEF.shelfDepth);
  return channel + (shelf - channel) * onReef;
};

describe('outer bathymetry (wave sizes)', () => {
  it('leaves every spot\'s bed shoreward of −150 m as it was', () => {
    const beach = createSpot('beach', 1);
    const beachToday = todayBeach(1);
    const point = createSpot('point', 1);
    const reef = createSpot('reef', 1);
    for (let x = -80; x <= 80; x += 8) {
      for (let z = -150; z <= 30; z += 3) {
        expect(point.depthAt(x, z)).toBeCloseTo(todayPoint(x, z), 9);
        expect(reef.depthAt(x, z)).toBeCloseTo(todayReef(x, z), 9);
        // The outer bar's tail reaches the inner zone by under 1 cm.
        expect(Math.abs(beach.depthAt(x, z) - beachToday(x, z))).toBeLessThan(0.01);
      }
    }
  });

  it('gives the Beach an outer bar and a deepening shelf beyond it', () => {
    const beach = createSpot('beach', 1);
    const crest = beach.depthAt(0, -BEACH_OUTER.barOffshore);
    expect(crest).toBeLessThan(beach.depthAt(0, -BEACH_OUTER.barOffshore + 2 * BEACH_OUTER.barWidth));
    expect(crest).toBeLessThan(beach.depthAt(0, -BEACH_OUTER.barOffshore - 2 * BEACH_OUTER.barWidth));
    expect(beach.depthAt(0, -1300)).toBeGreaterThan(13.2);
  });

  it('carries the Point\'s shelf past 12 m on a gentler slope, and drops the Reef steeply seaward of −270 m', () => {
    const point = createSpot('point', 1);
    expect(point.depthAt(0, -400)).toBeCloseTo(12 + POINT_OUTER.slope * (-60 - -400 - 12 / POINT_HEADLAND.slope), 6);
    const reef = createSpot('reef', 1);
    expect(reef.depthAt(0, REEF_OUTER.start)).toBeCloseTo(REEF.channelDepth, 6);
    expect(reef.depthAt(0, REEF_OUTER.start - REEF_OUTER.length)).toBeCloseTo(REEF_OUTER.depth, 6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/Bathymetry.test.ts`
Expected: FAIL (the new constants are missing).

- [ ] **Step 3: Implement**

```ts
/** The Beach's outer bar and shelf (the wave-sizes spec; docs/research/outer-profiles.md): a bar crest ~4 m deep ~320 m out, Dean's profile beyond it. */
export const BEACH_OUTER = { barOffshore: 320, barHeight: 1.3, barWidth: 45, maxDepth: 30 };
/** The Point's shelf past its 12 m: a gentler slope to 30 m. */
export const POINT_OUTER = { slope: 0.015, maxDepth: 30 };
/** The Reef's drop from its 10 m channel to deep water, seaward of today's tank edge. */
export const REEF_OUTER = { start: -270, length: 120, depth: 30 };
```

- beach `depthAt`: `return deanDepth(offshore, 0.12, BEACH_OUTER.maxDepth) - bar - outerBar;` with `outerBar = BEACH_OUTER.barHeight * Math.exp(-(((offshore - BEACH_OUTER.barOffshore) / BEACH_OUTER.barWidth) ** 2));`
- point `depthAt`: `if (offshore <= 0) return offshore * 0.06; const shelf = maxDepth / slope; return offshore <= shelf ? slope * offshore : Math.min(POINT_OUTER.maxDepth, maxDepth + POINT_OUTER.slope * (offshore - shelf));`
- reef `depthAt`: after `channel`, `const drop = smoothstep(REEF_OUTER.start, REEF_OUTER.start - REEF_OUTER.length, z); const outer = channel + (Math.max(channel, REEF_OUTER.depth) - channel) * drop;` and use `outer` in place of `channel`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave`
Expected: PASS, including the existing reef test "keeps the whole reef edge in the fine surf zone" (the drop starts at −270, outside it).

- [ ] **Step 5: Commit**

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts
git commit -m "feat: deepen each spot's outer bed to real profiles, the inner bed unchanged"
```

### Task B6: The take-off follows the measured break

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (`TAKE_OFF_INDEX`, `takeOffPoint`)
- Test: `src/wave/SurfZoneSimulation.test.ts`

**Interfaces:**
- Produces: `TAKE_OFF_INDEX: Record<SpotName, number>` (all `BREAKER_INDEX` until the report calibrates them in Task B7), used as γ in `takeOffPoint` for swell-sized tanks only.

- [ ] **Step 1: Write the failing test**

```ts
  it('places a big day\'s take-off by the spot\'s calibrated breaker index, and today\'s tanks as before (wave sizes)', () => {
    const big: SurfZoneConfig = { ...small, spot: 'point', significantHeight: 3, peakPeriod: 14, alongShore: 160 };
    const tank = tankLayout(big);
    const target = breakerDepthFor(edgeHeight(big, tank.edgeDepth), tank.edgeDepth + big.tide, TAKE_OFF_INDEX.point);
    const point = takeOffPoint(big);
    expect(tankDepth(createSpot('point', big.seed), tank.edgeDepth, point.x, point.z, tank)).toBeCloseTo(target, 0);
    const todays: SurfZoneConfig = { ...small, spot: 'point', alongShore: 160 };
    expect(tankDepth(createSpot('point', 1), OFFSHORE_DEPTH.point, 0, takeOffPoint(todays).z)).toBeCloseTo(breakerDepthFor(edgeHeight(todays), OFFSHORE_DEPTH.point), 0);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "take-off by the spot"`
Expected: FAIL (`TAKE_OFF_INDEX` missing).

- [ ] **Step 3: Implement**

```ts
/**
 * The breaker index a big day's take-off is placed with, per spot: the size report measures where each spot's
 * sets break and sets these so the take-off lands there (the wave-sizes spec). Today's tanks keep BREAKER_INDEX.
 */
export const TAKE_OFF_INDEX: Record<SpotName, number> = { beach: BREAKER_INDEX, point: BREAKER_INDEX, reef: BREAKER_INDEX, canyon: BREAKER_INDEX };
```

In `takeOffPoint`: `const tank = tankLayout(config); const deep = tank.edgeDepth > OFFSHORE_DEPTH[config.spot];` and `const target = breakerDepthFor(edgeHeight(config, tank.edgeDepth), tank.edgeDepth + config.tide, deep ? TAKE_OFF_INDEX[config.spot] : BREAKER_INDEX);`; scan from `tank.zoneInner` with `tankDepth(spot, tank.edgeDepth, x, z, tank)`; the fallback is `tank.fineFrom`.

- [ ] **Step 4: Run tests, then commit**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts`
Expected: PASS.

```bash
git add src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts
git commit -m "feat: place a big day's take-off by each spot's calibrated breaker index"
```

### Task B7: Gate the sizes and calibrate

**Files:**
- Modify: `scripts/size-report.ts` (deep-water runs, small-day edge runs, `--gates`)
- Modify: `src/wave/surfForecast.ts` (`SURF_FORECAST` refit), `src/wave/SurfZoneSimulation.ts` (`TAKE_OFF_INDEX`)
- Possibly modify (tuning knobs, below): `src/wave/Bathymetry.ts` outer constants, `EDGE_DEPTH_PER_HS`, `ZONE_WAVELENGTHS`
- Output: `docs/research/sizes/*.json`, `docs/research/size-report.md`

- [ ] **Step 1: Make the report's runs match the gates**

In `scripts/size-report.ts`: practice with `heightAt: 'edge'`; the grid's big days (`significantHeight ≥ 2`) as `'deep'`; the small days (`≤ 1.5`) twice, `'deep'` (what a player gets) and `'edge'` at the baseline's edge height (for the ±5 % gate: the same sea entering today's tank). The Canyon's runs stay `'edge'` (it always takes its swell at the edge). Test `sizeGates` again: `npx vitest run src/wave/sizeReport.test.ts` → PASS.

- [ ] **Step 2: Run the gated report, one background process per spot**

`npm run report:sizes -- --spots <spot> --gates` for all four.
Expected: finishes; the Gates table lists every gate. Record the wall time and the cells per big-day tank (the performance measure).

- [ ] **Step 3: Calibrate the take-off**

For each spot, set `TAKE_OFF_INDEX[spot]` to the median of `H_edge-shoaled breaker height / measured still depth at setBreakZ` over its big-day runs (compute it from the JSON in a scratch script; the depth at `setBreakZ` is `tankDepth` of the run's layout at the take-off x). Rerun that spot's big days. Expected: take-off gates pass.

- [ ] **Step 4: Tune within the allowed knobs until the big-day gates pass**

Allowed, in this order, each change ledgered with its before/after gate results:
1. the outer shapes' parameters, within the ranges `docs/research/outer-profiles.md` gives;
2. `EDGE_DEPTH_PER_HS` from 3.3 up to 5 (small days must stay on today's tank: check the small-day gates after);
3. `ZONE_WAVELENGTHS` from 0.75 up to 1.5.

Not allowed: the inner bed (shoreward of −150), breaking or solver parameters, the Canyon, Practice. If the big-day gates still fail after these, stop and report to the user with the report (this is a physics question for them, per the spec's scope).

- [ ] **Step 5: Refit the forecast**

Paste the fitted `SURF_FORECAST` values the report printed (big and small `'deep'` runs); `PRACTICE_SURF` stays (Practice is unchanged). Run `npx vitest run src/wave/surfForecast.test.ts`; Expected: PASS (the 25 % test reads the new JSON). The layout's fine zone uses Komar–Gaughan, not the fit, so the refit does not move the tanks.

- [ ] **Step 6: Commit**

```bash
git add scripts/size-report.ts src docs/research
git commit -m "feat: gate the surf sizes against Komar-Gaughan and calibrate the forecast and take-off"
```

### Part B finish

- [ ] Whole suite and `npx tsc -b` green.
- [ ] Measure the live frame cost on this machine at a big Beach and Reef (the dev server, the Wave Lab at Hs 4 m / 14 s, the pane shown): record the step ms and fps in ROADMAP (measured, not a gate).
- [ ] Final whole-branch review, fix pass, ledger.
- [ ] ROADMAP: Part B done, with the gate table's summary; memory note updated.
- [ ] Push, PR B, merge when checks pass.

---

# Part C · The size sheet and the camera

### Task C1: The size sheet

**Files:**
- Create: `src/dev/sizeSheet.ts` (the sheet), `src/dev/sizeSheetShots.ts` (pure helpers)
- Modify: `src/main.ts` (one line: `?sizeSheet` loads it, like `?waterSheet`)
- Test: `src/dev/sizeSheetShots.test.ts`

**Interfaces:**
- Consumes: `SurfZoneStatus.surf`, `SurfZoneSimulation`/host snapshot, `sampleSurfaceHeight`, `SkinnedSurfer.load`, `posturePoints('standing', …)`, `surferHeight` (A3), the water sheet's hooks (`start`, `step`, `render`, `renderView`, `setWaterLook`, `water`, `canvas`).
- Produces: `faceUnderCrest(height: (x: number, z: number) => number, x: number, zFrom: number, zTo: number): { crest: Vector3; trough: Vector3; face: number } | undefined`; `sizeShots(face: { crest: Vector3; trough: Vector3 }): { name: 'channel' | 'beach' | 'in the water'; eye: Vector3; target: Vector3 }[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { faceUnderCrest, sizeShots } from './sizeSheetShots';

describe('size sheet shots', () => {
  // A wave running toward +z: a 4 m crest at z = 0 over a trough 1 m deep 20 m ahead.
  const height = (_x: number, z: number) => (z < 0 ? 3 * Math.exp(-((z / 15) ** 2)) : 3 - 4 * Math.min(1, z / 20));

  it('finds the crest and the trough ahead of it, and the face between', () => {
    const face = faceUnderCrest(height, 5, -40, 40)!;
    expect(face.crest.z).toBeCloseTo(0, 0);
    expect(face.trough.z).toBeCloseTo(20, 0);
    expect(face.face).toBeCloseTo(4, 1);
    expect(face.crest.x).toBe(5);
  });

  it('shoots the face from the channel, the beach and the water, all looking at its middle', () => {
    const face = faceUnderCrest(height, 5, -40, 40)!;
    const middle = face.crest.clone().add(face.trough).multiplyScalar(0.5);
    const shots = sizeShots(face);
    expect(shots.map((shot) => shot.name)).toEqual(['channel', 'beach', 'in the water']);
    for (const shot of shots) expect(shot.target.distanceTo(middle)).toBeLessThan(1e-9);
    expect(shots[0].eye.x).not.toBeCloseTo(middle.x, 0);
    expect(shots[1].eye.z).toBeGreaterThan(face.trough.z);
    expect(shots[2].eye.y).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/dev/sizeSheetShots.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the helpers**

```ts
import { Vector3 } from 'three';

/** The highest crest between zFrom and zTo along x, the lowest water within 40 m ahead of it, and the face between, m. */
export function faceUnderCrest(height: (x: number, z: number) => number, x: number, zFrom: number, zTo: number) {
  let crestZ = zFrom;
  for (let z = zFrom; z <= zTo; z += 0.25) if (height(x, z) > height(x, crestZ)) crestZ = z;
  let troughZ = crestZ;
  for (let z = crestZ; z <= crestZ + 40; z += 0.25) if (height(x, z) < height(x, troughZ)) troughZ = z;
  const crest = new Vector3(x, height(x, crestZ), crestZ);
  const trough = new Vector3(x, height(x, troughZ), troughZ);
  const face = crest.y - trough.y;
  return face > 0 ? { crest, trough, face } : undefined;
}

/** Shots of a face (waves run toward +z): side-on from the channel, from the beach, and at the water in front of it. */
export function sizeShots(face: { crest: Vector3; trough: Vector3 }) {
  const target = face.crest.clone().add(face.trough).multiplyScalar(0.5);
  const size = face.crest.y - face.trough.y;
  return [
    { name: 'channel' as const, eye: target.clone().add(new Vector3(12 * size + 30, 1.5, 0)), target },
    { name: 'beach' as const, eye: new Vector3(target.x + 20, 4, Math.max(face.trough.z + 60, 35)), target },
    { name: 'in the water' as const, eye: new Vector3(target.x + 8, 0.5, face.trough.z + 12), target },
  ];
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/dev/sizeSheetShots.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the sheet**

`src/dev/sizeSheet.ts`, modelled on `src/dev/waterSheet.ts` (same hooks, `breathe`, `post` to the receiver, `sheetReady`):
- `?inpage&sizeSheet&spot=reef&height=4&period=14` (defaults Reef, 4 m, 14 s): start a buoy sea there; step until the host's `status.surf` is defined and a face within 20 m of the take-off exceeds that reading's `typical` (a set wave), capped at 240 s of sea;
- measure it with `faceUnderCrest` along the take-off's x, from the take-off z − 60 to + 30;
- load `surfers.json`'s `surfer3` with `SkinnedSurfer.load`, pose it standing with `posturePoints('standing', 'regular', board, quaternion, state)` on a board at the face's middle, facing along the crest, and add it to the scene;
- draw the face as a white line from trough to crest with 1 m ticks (a `LineSegments`), added to the scene;
- render the three `sizeShots` in Classic and in Rich (2 rows × 3 tiles, 480 × 270 each), label each tile `look · shot · face F m · surfer 1.73 m`, post the sheet as `size-sheet-<spot>.png`.
`src/main.ts`: one line beside the water sheet's: `if (devFlag('sizeSheet')) void import('./dev/sizeSheet').then(({ renderSizeSheet }) => renderSizeSheet(game.recording));` (and add `sizeSheet` wherever `waterSheetRequested` stops the frame loop and starts on the stage: extend that flag, `devFlag('waterSheet') || devFlag('sizeSheet')`).

- [ ] **Step 6: Render the sheets**

With the dev server and receiver running and the browser pane shown (a hidden pane runs at ~1.5 fps), open `http://localhost:5181/?inpage&sizeSheet&spot=reef`, then `&spot=point`, then `&spot=beach&height=3&period=12`.
Expected: three PNGs in `recordings/`; each shows the surfer on a face whose marked height matches the report's sets for that sea within ~25 %. Read each image and describe it in the ledger.

- [ ] **Step 7: Commit**

```bash
git add src/dev/sizeSheet.ts src/dev/sizeSheetShots.ts src/dev/sizeSheetShots.test.ts src/main.ts
git commit -m "feat: a size sheet with a surfer on a set wave's face, its height marked"
```

### Task C2: The camera check

**Files:**
- Modify: `src/dev/sizeSheet.ts` (a row of the game's own ride views)
- Possibly modify: the ride camera's constants (only if the sheet shows shrinking; see below)

- [ ] **Step 1: Add the game's views to the sheet**

Add a third row: the game's front, behind and side ride views at the same moment (`hooks.mode.camera.setView(view)` then render with `hooks.render`), labelled with each view's vertical FOV and eye height above the water.

- [ ] **Step 2: Judge and rule**

A view shrinks waves when its vertical FOV is above 60° or its eye stands higher than the face over the surfer, so the face fills less of the frame than in the "in the water" shot at 40°. Record per view: FOV, eye height, the face's share of frame height, and the in-water shot's share. If a view shrinks waves by that test, narrow its FOV toward 50° (or lower its eye) in the camera's constants with a test pinning the new value, and re-render; otherwise change nothing. Ledger a `Ruling:` either way, with the numbers.

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "chore: check the ride views against the size sheet"
```

### Part C finish

- [ ] Whole suite and `npx tsc -b` green.
- [ ] Final whole-branch review, fix pass, ledger.
- [ ] ROADMAP: Part C done, the sheet's images described, the camera ruling; Backlog: big-wave surf (10 m+, tow-in); memory updated.
- [ ] Push, PR C with the sheet images described, merge when checks pass. The user's playtest judges the sizes.
