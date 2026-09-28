# Teahupo'o Reef Part A (the bed and its peel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the A-frame Reef with a Teahupo'o-style left: deep water, a 1:2.29 forereef, a ~10 m shelf, an oblique ledge rising to a shallow crest, and a pass at the end of the left. Make it peel "fast but makeable", checked with a trustworthy peel measure and the catch and ride reports.

**Architecture:**
- **The bed.** `Bathymetry.ts` gets a parametric Reef. It is the shallower of two surfaces: a shore-parallel shelf and forereef, and an oblique ledge. A pass is blended in at the window's +x edge, and a planar beach face caps everything.
- **Designing the peel.** A small phase-matching predictor (`ledgePeel.ts`) turns the design into the peel speed along the ledge. The rule behind it: a wave's speed along a straight ledge is the shelf's celerity over the sine of the crest's angle to the ledge. It is never slower than the shelf's celerity, whatever the ledge's steepness.
- **Measuring the peel.** The peel meter measures along the break line instead of along x.
- **The Reef's water.** The Reef always runs stage 2, with a 30 m tank edge and the solver's own (Madsen–Sørensen) wave numbers at its boundary. It has its own swells and Practice.
- **Choosing the design.** A sweep of ledge angle and swell direction picks the design. It is confirmed on the wave sizes session's swell-sized tank once that merges.

**Tech Stack:** TypeScript, Vitest, Three.js (untouched here), rolldown report scripts, the stage 2 Boussinesq surf zone (CPU and WGSL).

**Spec:** `docs/superpowers/specs/2026-09-27-teahupoo-reef.md` (Part A). Related: `docs/superpowers/specs/2026-09-27-wave-sizes.md` and its plan (on `claude/wave-sizes`, worktree `.claude/worktrees/g8-water`), whose Part B supplies `tankLayout`, `madsenSorensenWaveNumber`, `edgeHeight`, `heightAt`, `TAKE_OFF_INDEX` and the size report.

## Global Constraints

- **Work in** `.claude/worktrees/teahupoo-reef` on branch `claude/teahupoo-reef`. Run `npm ci` there once before the first test. Never bare `git stash`. Keep `git` commands separate from other shell steps: worktree sessions refuse compound commands that mix them.
- **`<scratchpad>`** below means the session's scratchpad directory (temporary report outputs, scratch scripts, the baseline worktree); never `/tmp`.
- **Tests:** `npx vitest run <paths>`, the whole suite `npx vitest run --dir src`; types `npx tsc -b`.
- **Only the Reef changes.** The Beach, Point and Canyon beds, tanks and seas stay exactly as today. The Canyon is the riding reference and Surf School's sea; the Beach and Point beds are the wave sizes session's.
- **The Reef always runs stage 2**, on every machine and in every mode (Surf, Wave Lab, online, reports).
- **Physics honest:** no value is shaped by hand to get a look. Every bed value is sourced or marked **provisional** in `docs/research/teahupoo-reef-sources.md`.
- **Performance is measured, never a gate.** Record the Reef's step cost against today's Reef.
- **Classic stays byte-identical:** no shader changes in Part A.
- **Player-facing text** goes in `src/ui/strings.ts`, in English.
- **Coordinate with wave sizes:** use its names as its plan defines them. Don't edit its Beach/Point work. The Reef's overrides live in Reef-keyed branches of its functions.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Open the PR and leave the merge to the user.**
- **Stop rule (the spec's risk):** stop and bring the user options, with the evidence, instead of pushing on, if either of these happens:
  - no bed that keeps the forereef's source slope runs stably;
  - no sweep candidate reaches the peel and catch bands in Task 8.

## Review Focus

1. **Big swell on the steep bed:** the Reef at Hs 3 m, Tp 17 s must stay finite, with depth-averaged speeds under 20 m/s (past runaways went to 23 and 112 m/s). Test in Task 7.
2. **Low tide over a 1 m crest** (tide −0.6 m leaves 0.4 m of water): the drying reef flat stays finite and bounded. Test in Task 7.
3. **Oblique swells crossing the open −x edge** (the ledge slopes across that edge): directions −25° and +25° stay finite. Test in Task 7.
4. **"Fast" water or a dev's stage 1 choice never runs the Reef on stage 1:** the built config says stage 2, and the GPU tier is still asked. Test in Task 4.
5. **The take-off sits where waves break:** for every Reef swell it is at a still depth between 0.4 h_b and the shelf depth, never on dry reef or in the pass. Test in Task 6.

---

### Task 1: The research doc (sources and rulings)

**Files:**
- Create: `docs/research/teahupoo-reef-sources.md`

**Interfaces:**
- Produces: a **Rulings** table that Tasks 5–6 copy into `REEF` and `REEF_SWELLS`. Every row is sourced or marked provisional.

- [ ] **Step 1: Write the doc from what is already known**

```markdown
# Teahupo'o Reef: sources and rulings

The [Teahupo'o Reef spec](../superpowers/specs/2026-09-27-teahupoo-reef.md) builds the Reef on Teahupo'o's published shape. This doc holds the sources, what each says, and the values the game takes (the rulings). Values without a source are marked **provisional**.

## What is known

- **Shape and swell** (Shand 2024, The Conversation, "Anatomy of a wave", University of Auckland coastal engineer):
  - swells of two to five metres at 14–20 s periods, from storms south of New Zealand;
  - the bed rises from around 200 m depth a couple of hundred metres offshore;
  - a flatter shelf at around ten metres lets the wave stand up before it breaks where the reef rises again;
  - a deep channel runs beside the shelf (the Passe Hava'e);
  - the wave peels left, looking toward shore;
  - the lip is about half the wave's height thick;
  - the base of the wave appears to drop below sea level;
  - the tidal range is low.
- **Forereef:** Rodríguez-Burguette, Torres-Freyermuth, Franklin & Rendón-Valdez (2025), "Extreme wave transformation and runup on a beach fronted by a very steep forereef profile", Applied Ocean Research, doi:10.1016/j.apor.2025.104648. A physical model of Teahupo'o's reef, forereef 1:2.29.
- **Breaking intensity:** Mead & Black (2001), "Predicting the breaking intensity of surfing waves", J. Coastal Research SI 29. The vortex's length over its width, Y = 0.065X + 0.821, against the orthogonal seabed gradient X.
- **Peel and skill:** Hutt, Black & Mead (2001), J. Coastal Research SI 29. Minimum peel angles by skill: 60° beginner, 40° intermediate, 29° top amateur, 27° professional (`PEEL_SKILL_MINIMUM`).
- **Why a straight reef can't peel slowly** (phase matching; derived in `src/wave/ledgePeel.ts`):
  - along a straight ledge, the along-ledge wave number is conserved;
  - so the break point runs along the ledge at c_shelf / sin φ, with φ the crest's angle to the ledge over the shelf;
  - that is never slower than c_shelf (≈ √(g·10) ≈ 9.6 m/s for a 10 m shelf), whatever the ledge's steepness;
  - the shelf's depth and the ledge's angle set the peel; the forereef's steepness does not.

## Open questions (answer each with a source, or rule it provisional)

1. Mead & Black: what X is (the gradient as 1:X?), which gradients their data covers, and the intensity classes by Y.
2. The inner rise from the shelf to the reef crest: its slope and height.
3. The crest's depth at mean tide, and the tidal range.
4. The shelf's width, and whether its depth varies along the reef.
5. The pass: its depth and width.
6. The reef's angle to the arriving swell (the crest-to-ledge angle φ).
7. Surfer speeds on heavy reefs (for the peel-speed target).
8. Tube-ride durations at Teahupo'o (for Part D).
9. Lab studies of plunging over steep submerged slopes and steps (for Part B), e.g. Blenkinsopp & Chaplin (2008) on relative crest submergence.

## Rulings (the values the game uses)

| Value | Game value | Source |
|---|---|---|
| Tank edge (deep water) | 30 m | Tank limit: kh ≤ 2.5 for 7 s components (the wave-sizes rule); Teahupo'o's is ~200 m |
| Forereef slope | 1 : 2.29 | Rodríguez-Burguette et al. 2025 |
| Shelf depth | 10 m | Shand 2024 |
| Ledge (inner rise) slope | 1 : 2.29 | **provisional** (as the forereef) |
| Crest depth, mid tide | 1 m | **provisional** |
| Ledge angle to the shoreline | 45° | **provisional**, the sweep's choice (Task 8) |
| Reef swell direction | 20° | **provisional**, the sweep's choice (Task 8) |
| Pass depth, half-width | 12 m, 25 m | **provisional** |
| Beach face | 1 : 5 | **provisional** (steep enough to stay shoreward of the forereef) |
| Peel speed target along the ledge | 10–13 m/s | **provisional** until question 7 |
| Faces: Practice / Small / Medium / Big | 1.5–2 / 2–3 / 3–4 / 5–6 m | the spec (decision 4) |
```

- [ ] **Step 2: Research the open questions**

Use web search, papers and reviews (Scarfe et al.'s surf-science review, the Journal of Coastal Research SI 29 papers). For each question, add what the source says with a link, then update its ruling row. A sourced value replaces a provisional one only where the source is about Teahupo'o or a reef of its kind. Otherwise the row stays provisional and the source goes beside it.

- [ ] **Step 3: Commit**

```bash
git add docs/research/teahupoo-reef-sources.md
git commit -m "docs: Teahupo'o Reef sources and the rulings Part A builds on"
```

---

### Task 2: Peel measured along the break line

The peel meter fits onset time against x. On an oblique break line the break point also moves across shore, so the meter overstates the peel angle and understates the speed. It will fit onset z against x too and measure along the line. Break lines parallel to the shore read exactly as before.

**Files:**
- Modify: `src/wave/Breaking.ts` (`PeelTracker`: `onsetZ`, `markOnset(column, time, z = 0)`, `record(time, isBreaking, zOf?)`, `estimate`)
- Modify: `src/wave/SurfZoneSimulation.ts:494` (pass the onset's z)
- Modify: `src/wave/Rideability.ts` (`PeelSample.peelSpeed`, `RideabilityStats.medianPeelSpeed`)
- Modify: `scripts/rideability-report.ts` (a peel-speed column)
- Modify: `scripts/tube-report.ts:80` (its samples carry `peelSpeed`)
- Test: `src/wave/Breaking.test.ts`, `src/wave/Rideability.test.ts` (exists: add to it)

**Interfaces:**
- Produces:
  - `PeelTracker.markOnset(column: number, time: number, z?: number): void`;
  - `PeelTracker.record(time: number, isBreaking: (column: number) => boolean, zOf?: (column: number) => number): void`;
  - `PeelEstimate.peelSpeed`, now along the break line;
  - `PeelEstimate.lineSlope: number` (dz/dx of the fitted break line);
  - `PeelSample.peelSpeed?: number` (optional, so older samples still type-check);
  - `RideabilityStats.medianPeelSpeed: number`.

- [ ] **Step 1: Write the failing tests** (in `Breaking.test.ts`, inside `describe('PeelTracker')`)

```ts
  it('measures the peel along an oblique break line, not along the shore', () => {
    const tracker = new PeelTracker(xs, 10);
    const lineSlope = 0.8;
    const alongLine = 10;
    const celerity = 5;
    const secondsPerX = Math.hypot(1, lineSlope) / alongLine;
    xs.forEach((x, column) => tracker.markOnset(column, 1 + (x + 60) * secondsPerX, lineSlope * x));
    const estimate = tracker.estimate(1 + 120 * secondsPerX, celerity)!;
    expect(estimate.lineSlope).toBeCloseTo(lineSlope, 9);
    expect(estimate.peelSpeed).toBeCloseTo(alongLine, 9);
    expect(estimate.angleDegrees).toBeCloseTo((Math.asin(celerity / alongLine) * 180) / Math.PI, 9);
    expect(estimate.direction).toBe(1);
  });

  it('reads a shore-parallel break line exactly as before', () => {
    const tracker = new PeelTracker(xs, 10);
    xs.forEach((x, column) => tracker.markOnset(column, 1 + (x + 60) / 8));
    const estimate = tracker.estimate(16, 4.2)!;
    expect(estimate.lineSlope).toBe(0);
    expect(estimate.peelSpeed).toBeCloseTo(8, 9);
  });
```

In `Rideability.test.ts`, inside `describe('rideability')`:

```ts
  it('reports the median peel speed of clean waves', () => {
    const stats = rideability([
      { angleDegrees: 30, fit: 0.9, peelSpeed: 11 },
      { angleDegrees: 35, fit: 0.9, peelSpeed: 12 },
      { angleDegrees: 20, fit: 0.1, peelSpeed: 40 },
      undefined,
    ]);
    expect(stats.medianPeelSpeed).toBeCloseTo(11.5, 12);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/wave/Breaking.test.ts src/wave/Rideability.test.ts`
Expected: FAIL (`lineSlope` undefined; `medianPeelSpeed` undefined).

- [ ] **Step 3: Implement**

`Breaking.ts`: add `private readonly onsetZ: Float64Array;` (filled with 0 in the constructor) and:

```ts
  /** Note which columns are breaking at `time`; a column restarting after `quiet` seconds starts a new onset at `zOf(column)`. */
  record(time: number, isBreaking: (column: number) => boolean, zOf?: (column: number) => number): void {
    for (let column = 0; column < this.xs.length; column += 1) {
      if (!isBreaking(column)) continue;
      if (time - this.lastBreaking[column] > this.quiet) this.markOnset(column, time, zOf?.(column) ?? 0);
      this.lastBreaking[column] = time;
    }
  }

  /** Record that a new wave started breaking in `column` at `time`, `z` across shore (on the break line). */
  markOnset(column: number, time: number, z = 0): void {
    this.onset[column] = time;
    this.onsetZ[column] = z;
  }
```

In `estimate`:
- accumulate `sumZ` and `sxz` beside `sumX`, `sumT`, `sxt`;
- set `const lineSlope = sxx > 0 ? sxz / sxx : 0;` and `const stretch = Math.hypot(1, lineSlope);`;
- the break point runs `stretch / |slope|` along the line, so `const sine = Math.min(1, (celerity * Math.abs(slope)) / stretch);`;
- `peelSpeed: Math.abs(slope) > 0 ? stretch / Math.abs(slope) : Infinity`;
- add `lineSlope` to the returned object and to `PeelEstimate`: `/** The fitted break line's dz/dx: 0 when it runs along the shore. */ lineSlope: number;`.
- Update the doc comment above the class: "The break point runs along the fitted break line at V = √(1 + (dz/dx)²) / |dt/dx|, and sin α = c_b / V."

`SurfZoneSimulation.ts`: `this.peel.markOnset(column, solver.time, outer);`

`Rideability.ts`:
- `PeelSample` gains `/** The break point's speed along its line, m/s. */ peelSpeed?: number;`;
- `RideabilityStats` gains `/** Median break-point speed of clean waves, m/s (NaN without any). */ medianPeelSpeed: number;`, computed like `medianAngle` from the clean waves that carry a `peelSpeed`;
- `measureRideability` stores `estimate.peelSpeed` in each sample.

`scripts/tube-report.ts:80`: `samples.push(estimate && { angleDegrees: estimate.angleDegrees, fit: estimate.fit, peelSpeed: estimate.peelSpeed });`

`scripts/rideability-report.ts`: add a "Median peel speed, m/s" column (`stats.medianPeelSpeed.toFixed(1)`) after the median angle column, and to its header rows.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/Breaking.test.ts src/wave/Rideability.test.ts src/wave/SurfZoneSimulation.test.ts src/wave/SurfZoneRunner.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/wave/Breaking.ts src/wave/Breaking.test.ts src/wave/SurfZoneSimulation.ts src/wave/Rideability.ts src/wave/Rideability.test.ts scripts/rideability-report.ts scripts/tube-report.ts
git commit -m "fix: measure the peel along the break line, so an oblique reef reads its real speed"
```

---

### Task 3: The ledge's peel predictor

**Files:**
- Create: `src/wave/ledgePeel.ts`
- Test: `src/wave/ledgePeel.test.ts`

**Interfaces:**
- Consumes: `madsenSorensenCelerity(omega, depth, g?)` from `./BoussinesqSolver`, and `GRAVITY` from `./dispersion`.
- Produces:
  - `interface LedgePeelInput { period: number; deepDepth: number; shelfDepth: number; breakDepth: number; swellDegrees: number; ledgeDegrees: number }`;
  - `interface LedgePeel { shelfDegrees: number; crestToLedgeDegrees: number; peelSpeed: number; angleDegrees: number }`;
  - `ledgePeel(input: LedgePeelInput): LedgePeel`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { madsenSorensenCelerity } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';
import { ledgePeel } from './ledgePeel';

const design = { period: 15, deepDepth: 30, shelfDepth: 10, breakDepth: 2.97, swellDegrees: 20, ledgeDegrees: 45 };
const rad = (degrees: number) => (degrees * Math.PI) / 180;

describe('ledgePeel', () => {
  it('refracts the swell onto the shelf by Snell’s law across the shore-parallel forereef', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(Math.sin(rad(peel.shelfDegrees)) / madsenSorensenCelerity(omega, 10))
      .toBeCloseTo(Math.sin(rad(20)) / madsenSorensenCelerity(omega, 30), 12);
    expect(peel.crestToLedgeDegrees).toBeCloseTo(peel.shelfDegrees + 45, 12);
  });

  it('runs the break point along the ledge at the shelf’s celerity over the sine of the crest’s angle', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(peel.peelSpeed * Math.sin(rad(peel.crestToLedgeDegrees))).toBeCloseTo(madsenSorensenCelerity(omega, 10), 12);
    expect(peel.peelSpeed).toBeCloseTo(11.44, 1);
    expect(Math.sin(rad(peel.angleDegrees))).toBeCloseTo(Math.sqrt(GRAVITY * design.breakDepth) / peel.peelSpeed, 12);
  });

  it('never peels slower than the shelf’s celerity, and closes out on a shore-parallel ledge', () => {
    const omega = (2 * Math.PI) / design.period;
    const along = ledgePeel({ ...design, swellDegrees: 0, ledgeDegrees: 90 });
    expect(along.peelSpeed).toBeCloseTo(madsenSorensenCelerity(omega, 10), 12);
    const straight = ledgePeel({ ...design, swellDegrees: 0, ledgeDegrees: 0 });
    expect(straight.peelSpeed).toBe(Infinity);
    expect(straight.angleDegrees).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/ledgePeel.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
import { madsenSorensenCelerity } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';

/** A reef's design: a shore-parallel forereef up to a shelf, and an oblique ledge rising from the shelf to the crest. */
export interface LedgePeelInput {
  /** Swell period, s. */
  period: number;
  /** Still depth the swell arrives in (the tank's edge), m. */
  deepDepth: number;
  /** The shelf's still depth, m. */
  shelfDepth: number;
  /** Still depth where the wave breaks on the ledge, m. */
  breakDepth: number;
  /** The swell's direction from shore-normal, degrees, positive toward +x. */
  swellDegrees: number;
  /** The ledge's angle to the shoreline, degrees, reaching shoreward toward +x. */
  ledgeDegrees: number;
}

export interface LedgePeel {
  /** The swell's direction on the shelf, degrees from shore-normal. */
  shelfDegrees: number;
  /** The crest's angle to the ledge over the shelf, degrees. */
  crestToLedgeDegrees: number;
  /** How fast the break point runs along the ledge, m/s. */
  peelSpeed: number;
  /** The peel angle α with sin α = √(g h_b) / peelSpeed (Hutt, Black & Mead 2001; the peel meter's measure), degrees. */
  angleDegrees: number;
}

/**
 * The peel a straight ledge makes, by phase matching. The along-ledge wave number
 * is conserved wherever the bed is uniform along the ledge, so the break point
 * runs along it at c_shelf / sin φ whatever the ledge's steepness. Across the
 * shore-parallel forereef, the along-shore wave number is conserved (Snell).
 * Linear and in the solver's own dispersion: a guide for choosing the bed, which
 * the sweep then checks in the solver.
 */
export function ledgePeel(input: LedgePeelInput): LedgePeel {
  const omega = (2 * Math.PI) / input.period;
  const deep = madsenSorensenCelerity(omega, input.deepDepth);
  const shelf = madsenSorensenCelerity(omega, input.shelfDepth);
  const shelfAngle = Math.asin((Math.sin((input.swellDegrees * Math.PI) / 180) * shelf) / deep);
  const crest = shelfAngle + (input.ledgeDegrees * Math.PI) / 180;
  const sine = Math.abs(Math.sin(crest));
  const peelSpeed = sine < 1e-9 ? Infinity : shelf / sine;
  const breaker = Math.sqrt(GRAVITY * input.breakDepth);
  return {
    shelfDegrees: (shelfAngle * 180) / Math.PI,
    crestToLedgeDegrees: (crest * 180) / Math.PI,
    peelSpeed,
    angleDegrees: peelSpeed === Infinity ? 0 : (Math.asin(Math.min(1, breaker / peelSpeed)) * 180) / Math.PI,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/ledgePeel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/ledgePeel.ts src/wave/ledgePeel.test.ts
git commit -m "feat: predict a reef ledge's peel by phase matching"
```

---

### Task 4: The Reef's water: stage 2 always, the solver's own boundary waves

**Files:**
- Modify: `src/wave/BoussinesqSolver.ts` (`madsenSorensenWaveNumber`, **identical** to wave sizes' Task B3 so the later merge is trivial)
- Modify: `src/wave/SurfZoneSimulation.ts` (`STAGE_2_ONLY`, `solverStage`, the constructor's stage, `surfZoneSea`'s wave numbers)
- Modify: `src/game/PhysicalMode.ts:354-368` (the GPU tier and `config.stage`)
- Modify: `src/game/SurfConditions.ts:59-70` (`physicalSettingsFor`'s stage)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/wave/BoussinesqSolver.test.ts`, `src/game/PhysicalMode.test.ts`, `src/game/SurfConditions.test.ts`

**Interfaces:**
- Produces:
  - `madsenSorensenWaveNumber(omega: number, depth: number, g?: number): number`;
  - `STAGE_2_ONLY: readonly SpotName[]` (`['reef']`);
  - `solverStage(spot: SpotName, stage: 1 | 2 | undefined): 1 | 2`.

- [ ] **Step 1: Write the failing tests**

`BoussinesqSolver.test.ts`:

```ts
  it('gives the wave number of its own dispersion', () => {
    const omega = (2 * Math.PI) / 10;
    expect(madsenSorensenWaveNumber(omega, 12)).toBeCloseTo(omega / madsenSorensenCelerity(omega, 12), 12);
  });
```

`SurfZoneSimulation.test.ts`:

```ts
  it('runs the Reef on stage 2 whatever the config asks, forcing the solver’s own waves at its boundary', () => {
    expect(solverStage('reef', 1)).toBe(2);
    expect(solverStage('beach', 1)).toBe(1);
    expect(solverStage('canyon', undefined)).toBe(2);
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', stage: 1 });
    expect(reef.solver).toBeInstanceOf(BoussinesqSolver);
    const omega = reef.sea.components[0].omega;
    expect(reef.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, reef.sea.depth), 10);
    const beach = new SurfZoneSimulation({ ...small, spot: 'beach' });
    expect(beach.sea.components[0].k).toBe(shallowWaterWaveNumber(beach.sea.components[0].omega, beach.sea.depth));
  });
```

Import `BoussinesqSolver`, `madsenSorensenWaveNumber` from `./BoussinesqSolver`, `shallowWaterWaveNumber` from `./dispersion` and `solverStage` from `./SurfZoneSimulation`.

`PhysicalMode.test.ts` (Review Focus 4; import `vi`, `SurfZoneHost` and `SurfZoneConfig` as the file already does):

```ts
  it('builds the Reef on stage 2 even when the water tier or a dev asks for stage 1', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(scene);
    const built: SurfZoneConfig[] = [];
    const gpuTier = vi.fn(async () => false);
    const factory = (config: SurfZoneConfig): SurfZoneHost => {
      built.push(config);
      return new LocalSurfZone(config);
    };
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', stage: 1 }, 5, water, quick, factory, gpuTier)).toBe(true);
    expect(built[0].stage).toBe(2);
    expect(gpuTier).toHaveBeenCalled();
    mode.stop();
  }, 60_000);
```

`SurfConditions.test.ts`: in "turns a big swell at high tide…", change the expected `stage: 1` to `stage: 2`. The Reef ignores the tier's stage 1; `compute: 'cpu'` stays. Add:

```ts
  it('keeps the other spots on the water tier’s stage', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, { stage: 1, compute: 'cpu' }).stage).toBe(1);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/BoussinesqSolver.test.ts src/wave/SurfZoneSimulation.test.ts -t "own|stage 2" src/game/PhysicalMode.test.ts src/game/SurfConditions.test.ts`
Expected: FAIL (`madsenSorensenWaveNumber`, `solverStage` missing; stage 1 built).

- [ ] **Step 3: Implement**

`BoussinesqSolver.ts`, below `madsenSorensenCelerity`:

```ts
/** The wave number ω/c the Madsen–Sørensen equations give at depth d, 1/m (a deep tank's boundary sea). */
export function madsenSorensenWaveNumber(omega: number, depth: number, g = GRAVITY): number {
  return omega / madsenSorensenCelerity(omega, depth, g);
}
```

`SurfZoneSimulation.ts`:

```ts
/**
 * Spots that always run stage 2 (the Teahupo'o Reef spec): shallow water steepens waves far too early
 * in the Reef's 30 m water, so a machine that cannot keep up runs it slower than real time instead.
 */
export const STAGE_2_ONLY: readonly SpotName[] = ['reef'];

export function solverStage(spot: SpotName, stage: 1 | 2 | undefined): 1 | 2 {
  return STAGE_2_ONLY.includes(spot) ? 2 : stage ?? 2;
}
```

- `surfZoneSea(config)`: pass `config.spot === 'reef' ? madsenSorensenWaveNumber : shallowWaterWaveNumber` as the wave-number function. The Reef's deep edge needs the waves the solver carries.
- The constructor: `this.solver = solverStage(config.spot, config.stage) === 2 ? new BoussinesqSolver(…) : new ShallowWaterSolver(…)`.

`PhysicalMode.start`:
- `const stage = solverStage(settings.spot, settings.stage);`
- `const tier = stage === 2 && settings.compute === 'auto' && gpuTier !== undefined && await gpuTier();`
- in `config`: `stage,`

`SurfConditions.physicalSettingsFor`: `stage: solverStage(spot, water.stage),`

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave src/game`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/wave/BoussinesqSolver.ts src/wave/BoussinesqSolver.test.ts src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts src/game/SurfConditions.ts src/game/SurfConditions.test.ts
git commit -m "feat: the Reef always runs stage 2, forcing the solver's own waves at its edge"
```

---

### Task 5: The Reef's swells, its Practice and its menu tile

**Files:**
- Modify: `src/game/SurfConditions.ts` (`REEF_SWELLS`, `swellChoice`, `physicalSettingsFor`)
- Modify: `src/game/PhysicalMode.ts` (`REEF_PRACTICE_SWELL`, `practiceSwell`, `swellFor`)
- Modify: `src/ui/labPanelModel.ts:40` (`practiceNote(units, spot)`) and its caller `src/ui/WaveLabScreen.ts:124`
- Modify: `src/ui/strings.ts:133` (the blurb), `src/ui/SurfScreen.ts:47` (the sketch)
- Modify: `scripts/catch-report.ts`, `scripts/ride-report.ts`, `scripts/tube-report.ts`, `scripts/whitewater-report.ts` (the swell per spot; `--direction` on the catch and ride reports)
- Test: `src/game/SurfConditions.test.ts`, `src/game/PhysicalMode.test.ts`

**Interfaces:**
- Produces:
  - `interface SwellChoice { significantHeight: number; peakPeriod: number; spread: number; directionDegrees?: number }`;
  - `REEF_SWELLS: Record<'small' | 'medium' | 'big', SwellChoice>`;
  - `swellChoice(spot: SpotName, swell: Exclude<SwellSize, 'practice'>): SwellChoice`;
  - `REEF_PRACTICE_SWELL: Readonly<SwellInput>`;
  - `practiceSwell(spot: SpotName): Readonly<SwellInput>`.

Values are the research doc's starting point. They are **provisional** until Task 9 calibrates them on the size report: Teahupo'o's 14–20 s groundswells from the peak's side (20°), with a Big that fits today's 3 m cap (3.5 m once wave sizes raises it to 4).

- [ ] **Step 1: Write the failing tests**

`SurfConditions.test.ts`:

```ts
  it('gives the Reef its own long-period swells from the peak’s side', () => {
    const settings = physicalSettingsFor('reef', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, water);
    expect(settings).toMatchObject({ source: 'buoy', significantHeight: REEF_SWELLS.medium.significantHeight, peakPeriod: REEF_SWELLS.medium.peakPeriod, directionDegrees: 20, stage: 2 });
    expect(physicalSettingsFor('point', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, water).significantHeight).toBe(SWELLS.medium.significantHeight);
    for (const swell of Object.values(REEF_SWELLS)) {
      expect(swell.significantHeight).toBeLessThanOrEqual(TANK_SWELL_LIMITS.height.max);
      expect(swell.peakPeriod).toBeGreaterThanOrEqual(14);
      expect(swell.peakPeriod).toBeLessThanOrEqual(TANK_SWELL_LIMITS.period.max);
    }
  });
```

Update "turns a big swell at high tide…" to expect `REEF_SWELLS.big`'s height and period and `directionDegrees: 20`.

`PhysicalMode.test.ts`:

```ts
  it('practises the Reef on its own groundswell and every other spot on the shared one', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', source: 'practice' })).toEqual(REEF_PRACTICE_SWELL);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', source: 'practice' })).toEqual(PRACTICE_SWELL);
    expect(REEF_PRACTICE_SWELL.bandwidth).toBeLessThan(0.1);
    expect(REEF_PRACTICE_SWELL.directionDegrees).toBe(20);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/SurfConditions.test.ts src/game/PhysicalMode.test.ts`
Expected: FAIL (`REEF_SWELLS`, `REEF_PRACTICE_SWELL` missing).

- [ ] **Step 3: Implement**

`SurfConditions.ts`:

```ts
/** A swell choice: buoy values, and a direction for spots whose swell comes from one side. */
export interface SwellChoice {
  significantHeight: number;
  peakPeriod: number;
  spread: number;
  directionDegrees?: number;
}

/**
 * The Reef's own swells (the Teahupo'o Reef spec, decision 4): long-period groundswells
 * (Teahupo'o's are 2–5 m at 14–20 s, Shand 2024) from the peak's side, for faces of
 * 2–3 / 3–4 / 5–6 m. Provisional until the size report calibrates them.
 */
export const REEF_SWELLS: Record<'small' | 'medium' | 'big', SwellChoice> = {
  small: { significantHeight: 1.3, peakPeriod: 15, spread: 0.2, directionDegrees: 20 },
  medium: { significantHeight: 1.9, peakPeriod: 16, spread: 0.2, directionDegrees: 20 },
  big: { significantHeight: 3, peakPeriod: 17, spread: 0.15, directionDegrees: 20 },
};

export function swellChoice(spot: SpotName, swell: Exclude<SwellSize, 'practice'>): SwellChoice {
  return spot === 'reef' ? REEF_SWELLS[swell] : SWELLS[swell];
}
```

`physicalSettingsFor`:
- `const swell = conditions.swell === 'practice' ? undefined : swellChoice(spot, conditions.swell);`
- spread in `significantHeight`, `peakPeriod` and `spread` as before;
- add `...(swell?.directionDegrees !== undefined ? { directionDegrees: swell.directionDegrees } : {})`.

`PhysicalMode.ts`, below `PRACTICE_SWELL`:

```ts
/**
 * The Reef's practice groundswell: the Practice swell's narrow band and spread at a
 * Teahupo'o period, from the peak's side, for ~1.5–2 m faces (the Teahupo'o Reef spec).
 * The Reef stays fast when small: its break runs along the ledge at no less than the
 * shelf's celerity (src/wave/ledgePeel.ts). Provisional until the size report calibrates it.
 */
export const REEF_PRACTICE_SWELL: Readonly<SwellInput> = { significantHeight: 1, peakPeriod: 14, spreading: 40, bandwidth: 0.08, directionDegrees: 20 };

export function practiceSwell(spot: SpotName): Readonly<SwellInput> {
  return spot === 'reef' ? REEF_PRACTICE_SWELL : PRACTICE_SWELL;
}
```

`swellFor`: `if (settings.source === 'practice') return { ...practiceSwell(settings.spot) };`

`labPanelModel.practiceNote(units: Units, spot: SpotName)`: read `practiceSwell(spot)`. `WaveLabScreen.ts:124`: pass `physical.spot`.

`strings.ts`: `'spot.reef.blurb': 'Heavy left slab over shallow coral',`

`SurfScreen.ts` sketch (seen from above, waves from the top): the shoreline; an oblique dashed ledge running from far out on the left to the shore on the right; the pass's walls on the right; swell lines:

```ts
  reef: '<path d="M4 42c14-2 24-2 36-2s22 0 36 2"/><path d="M8 20L50 40" stroke-dasharray="3 3"/><path d="M60 40V20M70 40V20" stroke-dasharray="3 3" opacity=".6"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
```

The four reports each build one swell from `DEFAULT_PHYSICAL_SETTINGS` (spot `'beach'`) before their spot loop, so `--practice` would never give the Reef its own Practice.
- In each, replace `const swell = swellFor(settings)` with `const swellAt = (spot: SpotName) => swellFor({ ...settings, spot });` and read `swellAt(spot)` inside the loop.
- Where the report's text states the sea, write one line per spot.
- In the catch and ride reports, add a direction override for the sweep: `const directionAt = (spot: SpotName) => option('direction') !== undefined ? Number(option('direction')) : swellAt(spot).directionDegrees ?? settings.directionDegrees;`. Use it wherever `direction` was used.
- Keep `ride-report`'s `--height` override applied on top of `swellAt(spot)`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/game src/ui src/net`, then build each changed script once to catch type errors: `npx rolldown scripts/catch-report.ts -o <scratchpad>/check.mjs --format esm --platform node` (and likewise for the ride, tube and whitewater reports).
Expected: PASS. `SurfScreen.test.ts` and `strings.test.ts` only check ids and keys.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/game/SurfConditions.ts src/game/SurfConditions.test.ts src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts src/ui/labPanelModel.ts src/ui/WaveLabScreen.ts src/ui/strings.ts src/ui/SurfScreen.ts scripts
git commit -m "feat: the Reef's own long-period swells and Practice, and its heavy-left tile"
```

---

### Task 6: The Teahupo'o bed and its take-off at the peak

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`REEF`, `reefCrestZ`, `reefSeaward`, `reef()`; remove `reefEdgeZ` and the A-frame's keys)
- Modify: `src/wave/SurfZoneSimulation.ts` (`OFFSHORE_DEPTH.reef = 30`, `TAKE_OFF.reef = 'peak'`, `takeOffPoint`)
- Modify: `scripts/rideability-report.ts` (its `--reef` example comment), and a new `scripts/reefShape.ts` used by the rideability, catch, ride and tube reports
- Test: `src/wave/Bathymetry.test.ts`, `src/wave/SurfZoneSimulation.test.ts`

**Interfaces:**
- Consumes: `ledgePeel` (Task 3), `REEF_SWELLS` (Task 5), `breakerDepthFor` (`Breaking.ts`).
- Produces:
  - `REEF = { deep, foreSlope, shelfEdge, shelfDepth, ledgeSlope, crestDepth, crestX, crestZ, angle, passX, passHalfWidth, passDepth, shoreSlope, takeOffX }` (mutable numbers, for the sweep);
  - `reefCrestZ(x: number): number`;
  - `reefSeaward(x: number, z: number): number`;
  - `TAKE_OFF: Record<SpotName, 'centre' | 'focus' | 'peak'>`;
  - `applyReefShape(spec: string | undefined): void` (in `scripts/reefShape.ts`).

- [ ] **Step 1: Write the failing tests**

In `Bathymetry.test.ts`, replace the three A-frame tests ("sets the angle of the reef edge's arms…", "runs a single-arm reef edge…", "raises the reef shelf steeply enough to plunge") with:

```ts
  describe("the Teahupo'o Reef", () => {
    const reef = createSpot('reef', 1);
    // At x = 0 the ledge lies well shoreward of the shelf's edge: shelf, forereef and deep water in turn.
    it('drops from a 10 m shelf down a 1:2.29 forereef to deep water', () => {
      expect(reef.depthAt(0, -120)).toBeCloseTo(REEF.shelfDepth, 3);
      expect(slopeZ(reef, 0, REEF.shelfEdge - 20)).toBeCloseTo(REEF.foreSlope, 9);
      expect(reef.depthAt(0, -260)).toBeCloseTo(REEF.deep, 12);
    });

    it('rises from the shelf to its crest up a ledge running at its angle to the shoreline, furthest out toward −x', () => {
      // At x = −40 the crest lies 80 m out, clear of the beach face.
      const crest = reefCrestZ(-40);
      expect(reef.depthAt(-40, crest)).toBeCloseTo(REEF.crestDepth, 9);
      const radians = (REEF.angle * Math.PI) / 180;
      const seaward = { x: Math.sin(radians), z: -Math.cos(radians) };
      const at = (n: number) => reef.depthAt(-40 + n * seaward.x, crest + n * seaward.z);
      expect((at(8) - at(4)) / 4).toBeCloseTo(REEF.ledgeSlope, 9);
      expect((reefCrestZ(-40) - reefCrestZ(-80)) / 40).toBeCloseTo(Math.tan(radians), 12);
      expect(reefCrestZ(-80)).toBeLessThan(reefCrestZ(0));
    });

    it('opens a pass along the window’s +x edge, level across it', () => {
      const edge = ALONG_SHORE / 2;
      expect(REEF.passX).toBe(edge);
      for (let z = -260; z <= -40; z += 20) expect(Math.abs(gradientX(reef, edge, z))).toBeLessThan(1e-3);
      expect(reef.depthAt(edge, -140)).toBeCloseTo(REEF.passDepth, 6);
    });

    it('has no cliff anywhere in the window', () => {
      // The steepest faces are the 1:2.29 forereef and ledge: 0.22 m over half a metre.
      for (let x = -80; x <= 80; x += 2) {
        for (let z = -300; z <= 20; z += 2) {
          expect(Math.abs(reef.depthAt(x, z + 0.5) - reef.depthAt(x, z))).toBeLessThan(0.25);
          expect(Math.abs(reef.depthAt(x + 0.5, z) - reef.depthAt(x, z))).toBeLessThan(0.25);
        }
      }
    });

    it('meets a beach face and dry land shoreward of z = 0', () => {
      for (let x = -80; x <= 80; x += 10) {
        expect(reef.depthAt(x, 5)).toBeLessThan(0);
        expect(reef.depthAt(x, -3)).toBeLessThanOrEqual(3 * REEF.shoreSlope + 1e-12);
      }
    });

    it('is designed to peel fast but makeable on the Small swell (phase matching)', () => {
      const small = REEF_SWELLS.small;
      const peel = ledgePeel({
        period: small.peakPeriod, deepDepth: REEF.deep, shelfDepth: REEF.shelfDepth,
        breakDepth: breakerDepthFor(small.significantHeight, REEF.deep), swellDegrees: small.directionDegrees ?? 0, ledgeDegrees: REEF.angle,
      });
      expect(peel.peelSpeed).toBeGreaterThanOrEqual(10);
      expect(peel.peelSpeed).toBeLessThanOrEqual(13);
    });
  });
```

Update the import line to: `import { BEACH_BAR, CANYON, POINT_HEADLAND, REEF, createSpot, deanDepth, reefCrestZ } from './Bathymetry';`, plus `import { breakerDepthFor } from './Breaking'; import { ledgePeel } from './ledgePeel'; import { REEF_SWELLS } from '../game/SurfConditions';`. Keep `type SurfSpot`.

In `SurfZoneSimulation.test.ts`, replace "keeps the whole reef edge in the fine surf zone…" with:

```ts
  // Stage 2 still needs 1 m cells to break (P3a): every column's Small-swell break lies in the fine surf zone.
  it('builds the Reef on a 30 m tank that stays deep up to its forereef, with every break in the fine surf zone', () => {
    expect(OFFSHORE_DEPTH.reef).toBe(REEF.deep);
    const reef = createSpot('reef', 1);
    const breakDepth = breakerDepthFor(REEF_SWELLS.small.significantHeight, REEF.deep);
    for (let x = -80; x <= 80; x += 4) {
      for (let z = TANK.zoneInner; z <= REEF.shelfEdge - (REEF.deep - REEF.shelfDepth) / REEF.foreSlope; z += 1) {
        expect(tankDepth(reef, OFFSHORE_DEPTH.reef, x, z)).toBeCloseTo(REEF.deep, 3);
      }
      let z = TANK.zoneInner;
      while (tankDepth(reef, OFFSHORE_DEPTH.reef, x, z) > breakDepth) z += 0.5;
      expect(z).toBeGreaterThan(TANK.fineFrom);
    }
  });
```

Replace "finds the reef break on its steep edge inside the fine surf zone" with:

```ts
  it('finds the Reef’s break on its ledge inside the fine surf zone, and it plunges', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'reef', alongShore: 160, significantHeight: REEF_SWELLS.small.significantHeight, peakPeriod: REEF_SWELLS.small.peakPeriod });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.reef, point.x, z);
    expect(point.z).toBeGreaterThan(TANK.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(REEF.crestDepth);
    expect(bed(point.z)).toBeLessThan(REEF.shelfDepth);
    expect(simulation.iribarren().type).toBe('plunging');
  });
```

Change "takes off straight out from the window centre at the other spots" to `['beach', 'point'] as const`, and add (Review Focus 5):

```ts
  it('takes off at the Reef’s peak, where every Reef swell breaks, never on dry reef or in the pass', () => {
    const swells = [REEF_PRACTICE_SWELL, ...Object.values(REEF_SWELLS)];
    for (const swell of swells) {
      const config: SurfZoneConfig = { ...small, spot: 'reef', alongShore: 160, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
      const point = takeOffPoint(config);
      const depth = tankDepth(createSpot('reef', 1), OFFSHORE_DEPTH.reef, point.x, point.z);
      expect(point.x).toBe(REEF.takeOffX);
      expect(depth).toBeGreaterThanOrEqual(0.4 * breakerDepthFor(swell.significantHeight, OFFSHORE_DEPTH.reef));
      expect(depth).toBeLessThanOrEqual(REEF.shelfDepth);
      expect(Math.abs(point.x - REEF.passX)).toBeGreaterThan(2 * REEF.passHalfWidth);
    }
  });
```

Import `REEF_SWELLS` from `../game/SurfConditions` and `REEF_PRACTICE_SWELL` from `../game/PhysicalMode`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/SurfZoneSimulation.test.ts`
Expected: FAIL (`reefCrestZ` missing, the A-frame bed, `OFFSHORE_DEPTH.reef` 10).

- [ ] **Step 3: Implement the bed**

`Bathymetry.ts`: replace the `REEF` block, `reefEdgeZ` and `reef()` with:

```ts
/**
 * The Teahupo'o Reef (the Teahupo'o Reef spec): a left slab. The tank's deep water rises up a
 * 1:2.29 forereef (Rodríguez-Burguette et al. 2025, a model of Teahupo'o's reef) to a shelf
 * about 10 m deep (Shand 2024), where the wave stands up before the reef rises again to its
 * crest. The ledge rises from the shelf, its foot meeting the shelf's edge at the peak (x = crestX), and
 * runs at `angle` degrees to the shoreline, furthest out toward −x, so each
 * wave breaks there first and peels toward +x (a left) at the shelf's celerity over the sine
 * of the crest's angle to it (`ledgePeel`). A pass runs along the window's +x open edge, level
 * across it like the Canyon's axis, where the left ends. A planar beach face caps it all.
 * Sources and provisional values: docs/research/teahupoo-reef-sources.md. Mutable for the sweep.
 */
export const REEF = {
  deep: 30, foreSlope: 1 / 2.29, shelfEdge: -150, shelfDepth: 10,
  ledgeSlope: 1 / 2.29, crestDepth: 1, crestX: -80, crestZ: -120, angle: 45,
  passX: 80, passHalfWidth: 25, passDepth: 12, shoreSlope: 0.2, takeOffX: -50,
};

/** Where the Reef's crest line (the top of its ledge) crosses along-shore position x. */
export function reefCrestZ(x: number): number {
  return REEF.crestZ + (x - REEF.crestX) * Math.tan((REEF.angle * Math.PI) / 180);
}

/** Distance seaward of the Reef's crest line, m, measured across it (negative shoreward of it). */
export function reefSeaward(x: number, z: number): number {
  return (reefCrestZ(x) - z) * Math.cos((REEF.angle * Math.PI) / 180);
}

function reef(): SurfSpot {
  return {
    name: 'reef',
    depthAt(x, z) {
      const r = REEF;
      // The shore-parallel forereef up to the shelf; on the shelf, the ledge rising from it to the crest.
      // The crest line keeps the ledge's foot shoreward of the shelf's edge (at the peak they meet), so the bed has no cliff.
      const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
      const ledge = r.crestDepth + Math.max(0, reefSeaward(x, z)) * r.ledgeSlope;
      const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, ledge) : fore;
      // The pass: no reef, the shelf deepened to passDepth; flat across its axis at the window's edge.
      const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
      const depth = onReef + (Math.max(fore, r.passDepth) - onReef) * pass;
      // A 1:5 beach face (steep enough to stay shoreward of the forereef), and dry land shoreward of z = 0.
      return Math.min(depth, z < 0 ? -z * r.shoreSlope : -z * 0.06);
    },
  };
}
```

`deanDepth` stays (the Beach and Canyon use it).

`SurfZoneSimulation.ts`:
- `OFFSHORE_DEPTH`: `reef: 30`, with a comment that it is `REEF.deep`.
- `TAKE_OFF: Record<SpotName, 'centre' | 'focus' | 'peak'> = { beach: 'centre', point: 'centre', reef: 'peak', canyon: 'focus' };`
- In `takeOffPoint`, right after the existing `if (TAKE_OFF[config.spot] === 'centre' || reach === 0) …` line (a narrow test window still takes off at its centre):

```ts
  if (TAKE_OFF[config.spot] === 'peak') {
    const x = Math.min(reach, Math.max(-reach, REEF.takeOffX));
    return { x, z: breakZ(x) };
  }
```

  Import `REEF` from `./Bathymetry`.

`scripts/reefShape.ts`:

```ts
import { REEF } from '../src/wave/Bathymetry';

/** Reshape the Reef for a report run (its shape is read when a spot is built): `--reef angle=50,crestZ=-125`. */
export function applyReefShape(spec: string | undefined): void {
  if (!spec) return;
  for (const pair of spec.split(',')) {
    const [key, value] = pair.split('=');
    if (!(key in REEF)) throw new Error(`No reef parameter ${key}`);
    (REEF as Record<string, number>)[key] = Number(value);
  }
}
```

- Replace the inline loop in `scripts/rideability-report.ts` with `applyReefShape(option('reef'))`, and fix its example comment to `--reef angle=50,crestZ=-125`.
- Call `applyReefShape(option('reef'))` near the top of `scripts/catch-report.ts`, `scripts/ride-report.ts` and `scripts/tube-report.ts`, which all define `option`.

- [ ] **Step 4: Run the whole wave and game suites, and sort every failure**

Run: `npx vitest run src/wave src/game src/scene src/physics`

For each failing test that builds the Reef:
- **It asserts the A-frame's geometry** (edge, arms, 1 m shelf numbers): rewrite it to the new bed's invariant, in this task.
- **It asserts physics**: lips thrown, the carve, tube shape ranges (`TubeShape.test.ts`), the practice Reef's steady water (`SurfZoneHost.test.ts`), the menu Reef's spin-up, finite seas. **Do not edit its threshold.** Diagnose with superpowers:systematic-debugging. A real fault in the new bed or the solver is fixed here. If the test's intent was "a plunging reef edge" and the new Reef plunges differently for a sourced reason, bring it to the user with the evidence.

Expected at the end: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts scripts
git commit -m "feat: the Teahupo'o Reef bed: deep water, a 1:2.29 forereef, a 10 m shelf, an oblique ledge and a pass"
```

---

### Task 7: The steep reef holds (stability probe)

**Files:**
- Test: `src/wave/SurfZoneSimulation.test.ts`
- Record: `docs/research/teahupoo-reef-report.md` (created here, extended by Tasks 8–10)

**Interfaces:**
- Consumes: the bed (Task 6), `REEF_SWELLS` (Task 5).

- [ ] **Step 1: Write the tests** (Review Focus 1–3)

```ts
  describe('the steep Reef holds', () => {
    const run = (overrides: Partial<SurfZoneConfig>) => {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'reef', significantHeight: REEF_SWELLS.big.significantHeight, peakPeriod: REEF_SWELLS.big.peakPeriod,
        directionDegrees: 20, spreading: 24, dx: 1, fineSpacing: 1, ...overrides,
      });
      const { solver } = simulation;
      let fastest = 0;
      for (let frame = 0; frame < 20 * 30; frame += 1) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          expect(Number.isFinite(solver.h[i]) && solver.h[i] >= 0).toBe(true);
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
      }
      expect(fastest).toBeLessThan(20);
      expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
    };

    it('stays finite and bounded under the Big swell', () => run({}), 180_000);
    it('stays finite over the drying reef flat at low tide', () => run({ tide: -0.6 }), 180_000);
    it('stays finite with oblique swells across the open −x edge', () => {
      run({ directionDegrees: -25, alongShore: 60 });
      run({ directionDegrees: 25, alongShore: 60 });
    }, 360_000);
  });
```

The per-cell `expect` inside the loop is slow. If the suite exceeds its timeout, collect a boolean and assert it once after the loop.

- [ ] **Step 2: Run them**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef"`
Expected: PASS.

If one fails, use superpowers:systematic-debugging:
- locate where and when it diverges (ledge, forereef, reef flat, open edge);
- check `maxStableStep` against the step taken;
- try the slope terms at the 1:2.29 face.

The rule is the stop rule: a fix that keeps the sourced slopes is fine (a stability bug, a boundary rule). Smoothing or softening the bed is a design change, so bring it to the user with the evidence.

- [ ] **Step 3: GPU parity in the browser**

1. From the worktree, start `npx vite --port 5192 --strictPort --host localhost` in a terminal tab (check `lsof -iTCP:5192` first).
2. Open `http://localhost:5192/gpu-check.html?spot=reef` in the browser pane.
3. Read its report with `get_page_text`: CPU against GPU, the largest depth difference, and breaking cells that disagree.

Expected: the same agreement the other spots show (see `docs/superpowers/plans/2026-09-26-p6-webgpu-tier.md`'s table). A hidden pane is slow but still correct for this page.

- [ ] **Step 4: Measure the cost**

Run `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction 20 --spread 0.2 --seeds 1 --periods 4 --out <scratchpad>/reef-cost.md` here. Run the same command on today's Reef from a detached worktree of `origin/main` in the scratchpad: `git worktree add <scratchpad>/main-reef origin/main --detach`, then `npm ci` there. Compare the reports' step ms.

- [ ] **Step 5: Start the report and commit**

Create `docs/research/teahupoo-reef-report.md` with:
- a "Stability" section: the three probes, the GPU check's numbers, and the step cost against today's Reef;
- the commands used.

```bash
git add src/wave/SurfZoneSimulation.test.ts docs/research/teahupoo-reef-report.md
git commit -m "test: the steep Reef holds under the Big swell, at low tide and with oblique swells"
```

---

### Task 8: The design sweep (on today's tank)

Today's tank has a 60 m relaxation zone, about 0.2 of a 30 m, 15 s wavelength. It absorbs reflections from the reef less well than wave sizes' tank will (0.75 of the wavelength). The sweep ranks designs here, and Task 9 confirms the winner there.

**Files:**
- Modify: `docs/research/teahupoo-reef-report.md` (the sweep), `docs/research/teahupoo-reef-sources.md` (rulings), `src/wave/Bathymetry.ts` and `src/game/SurfConditions.ts` / `src/game/PhysicalMode.ts` (the winning values)

- [ ] **Step 1: Baseline today's Reef**

In the `main-reef` worktree from Task 7 (use a distinct `--out` in the scratchpad; other sessions may kill reports by name):
- `npm run report:rideability -- --spots reef --seeds 2 --periods 12 --out <scratchpad>/base-rideability.md`
- `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3 --out <scratchpad>/base-catch.md`

- [ ] **Step 2: Screen the candidates with the predictor**

With a scratch script over `ledgePeel`, tabulate every angle in {40, 45, 50, 55}° × every direction in {10, 20, 25}° at each Reef swell. Show the predicted peel speed and α. Keep candidates whose Small-swell speed is 10–13 m/s. For example, 45° from 20° predicts 11.4 m/s and α 28° at Small, and 41° at Big.

- [ ] **Step 3: Run the kept candidates in the solver**

For each kept candidate:

`npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction <dir> --spread 0.2 --seeds 2 --periods 12 --reef angle=<angle> --out <scratchpad>/sweep-<angle>-<dir>.md`

Record the median peel angle, median peel speed, close-out and mixed shares, lip launches and step ms.

- [ ] **Step 4: Check catching on the top three**

For the three best by the rule below:

`npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3 --reef angle=<angle> --out <scratchpad>/catch-<angle>-<dir>.md`

Add `--direction <dir>` to set the Reef practice's direction (Task 5).

- [ ] **Step 5: Choose by the rule**

A candidate qualifies when:
- all its runs stay finite;
- its measured median peel speed is 10–13 m/s;
- its close-out share is ≤ 35 %;
- its catch report lights at least as many cues and stands as many riders as today's Reef.

Among qualifiers, the most stands wins. Ties go to the design closest to 45° from 20°.

**Stop rule:** if none qualifies, stop. Bring the user the sweep table and the options: a shallower shelf than the source's 10 m, a wider window, the swell direction range, or accepting a faster peel.

- [ ] **Step 6: Set the winner, record, commit**

1. Put the winning `angle` in `REEF`, and its direction in `REEF_SWELLS` and `REEF_PRACTICE_SWELL`.
2. Update the rulings rows (the sweep's choice).
3. Add the sweep table, the baseline and the choice to the report.
4. Run `npx vitest run src/wave src/game` to confirm the design test and the take-off test still pass.

```bash
git add src docs
git commit -m "feat: the Reef's ledge angle and swell direction, chosen by the peel and catch sweep"
```

---

### Task 9: On wave sizes' tank (after its Part B merges)

**Blocked until** the wave sizes session reports that Part B has merged to `main` (it said it will send a line). Until then, Tasks 1–8 are the deliverable. Check with `git log origin/main --oneline | grep -i "wave sizes\|tank sized"`.

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (`tankLayout`'s Reef branch, `surfZoneSea`'s wave-number rule, `TAKE_OFF_INDEX.reef`), `src/wave/BoussinesqSolver.ts` (drop the duplicate `madsenSorensenWaveNumber` if the merge leaves two), `src/game/SurfConditions.ts` (`REEF_SWELLS.big`), `src/game/PhysicalMode.ts` (Practice's `heightAt`)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/game/SurfConditions.test.ts`

**Interfaces:**
- Consumes (wave sizes Part B, per its plan):
  - `TankLayout`, `tankLayout(config)`, `ZONE_WAVELENGTHS = 0.75`;
  - `tankDepth(spot, edgeDepth, x, z, layout)`;
  - `edgeHeight`, `SurfZoneConfig.heightAt`;
  - `TAKE_OFF_INDEX`, `swellHeightLimit`, `TANK_SWELL_LIMITS.height.max === 4`;
  - `npm run report:sizes`.
- Produces: the Reef's layout, today's inner tank with its relaxation zone lengthened to `max(60, 0.75 L)` at the 30 m edge.

- [ ] **Step 1: Bring the branch up to date**

```bash
git fetch origin
```

```bash
git merge origin/main
```

Resolve the conflicts:
- **`madsenSorensenWaveNumber`:** keep one copy (they are identical).
- **`surfZoneSea`'s wave numbers:** `(config.spot === 'reef' || tank.edgeDepth > OFFSHORE_DEPTH[config.spot]) && solverStage(config.spot, config.stage) === 2 ? madsenSorensenWaveNumber : shallowWaterWaveNumber`.
- **Wave sizes' "builds today's tanks exactly as before" test:** it asserts shallow-water wave numbers on the Reef; point it at the Beach. The wave sizes session was told.

- [ ] **Step 2: Write the failing test**

```ts
  it('gives the Reef today’s inner tank with a relaxation zone three quarters of its edge wavelength long', () => {
    const config: SurfZoneConfig = { ...small, spot: 'reef', significantHeight: REEF_SWELLS.small.significantHeight, peakPeriod: REEF_SWELLS.small.peakPeriod };
    const layout = tankLayout(config);
    expect(layout.edgeDepth).toBe(REEF.deep);
    expect({ zoneInner: layout.zoneInner, blendEnd: layout.blendEnd, fineFrom: layout.fineFrom, shore: layout.shore })
      .toEqual({ zoneInner: TANK.zoneInner, blendEnd: TANK.blendEnd, fineFrom: TANK.fineFrom, shore: TANK.shore });
    expect(layout.zoneInner - layout.offshore).toBeCloseTo(Math.max(60, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, REEF.deep).wavelength), 6);
  });
```

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "three quarters"`
Expected: FAIL (today's layout returned, 60 m zone).

- [ ] **Step 3: Implement the Reef's layout**

In `tankLayout`, before the shared early return:

```ts
  // The Reef's edge is always deep (REEF.deep): keep today's inner tank, whose forereef sits inside the fine zone,
  // and lengthen the zone to absorb the Reef's long waves (the Teahupo'o Reef spec).
  if (config.spot === 'reef') {
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { ...today, offshore: TANK.zoneInner - zone };
  }
```

Run: `npx vitest run src/wave src/game src/physics`
Expected: PASS.

- [ ] **Step 4: Swell sizes, Practice and the take-off**

- `REEF_SWELLS.big.significantHeight` becomes 3.5, now within the 4 m cap.
- The Reef's buoy swells are deep-water values (`heightAt` `'deep'`, the default). Its Practice is `'edge'`, like every Practice in wave sizes.
- `TAKE_OFF_INDEX.reef`: set it so the take-off's z matches the Small swell's median measured break z (from `report:sizes`) within 5 m, keeping `x = REEF.takeOffX`.

- [ ] **Step 5: Confirm the winner on the long-zone tank**

Rerun Task 8 Step 3 for the three finalists on this tank. If the ranking changes, re-apply the rule and take the new winner. Record both rankings.

- [ ] **Step 6: Calibrate the faces**

1. Run `npm run report:sizes -- --spots reef` for the Reef's four swells.
2. Adjust only each swell's height (keep the periods) until its measured H1/3–H1/10 faces fall in the spec's targets: Practice 1.5–2, Small 2–3, Medium 3–4, Big 5–6 m.
3. Stop after three rounds and report what remains.
4. Update the rulings and `REEF_SWELLS` / `REEF_PRACTICE_SWELL`, whose "provisional" notes say "calibrated on the size report".

- [ ] **Step 7: Run the suite and commit**

Run `npx vitest run --dir src` and then `npx tsc -b`, expecting both to pass.

```bash
git add src docs
git commit -m "feat: the Reef on the swell-sized tank: a long relaxation zone, calibrated faces, its take-off on the measured break"
```

---

### Task 10: Reports, roadmap and the PR

**Files:**
- Modify: `docs/research/rideability-report.md` (regenerated, all spots, the new peel measure), `docs/research/teahupoo-reef-report.md`, `ROADMAP.md`

- [ ] **Step 1: Regenerate the shared rideability report**

Run: `npm run report:rideability -- --seeds 2 --periods 12`

Every spot now reads its peel along its break line. Note in the report how much the Beach, Point and Canyon moved (they should barely move, since their break lines run along the shore).

- [ ] **Step 2: The Reef's own reports, into the Reef report**

Write each to the scratchpad and summarise it in `teahupoo-reef-report.md` beside today's Reef:
- `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3`
- `npm run report:ride -- --practice --ghosts --spots reef --seeds 2 --minutes 3`
- `npm run report:tubes -- --practice --spots reef` (the tube baseline before Part B)
- `npm run report:whitewater -- --spots reef --periods 4`

For each Reef swell, add the predicted and measured peel speed, the Mead & Black vortex ratio its ledge implies against the tube report's width-to-length, and the lip-thickness baseline for Part B.

- [ ] **Step 3: ROADMAP**

Add a "Teahupo'o Reef" section under the current milestone:
- the spec link;
- Part A's status (what landed; the chosen design; the numbers);
- Parts B–D as `Backlog`, D waiting on Compress, Regular/Goofy and PR #43.

- [ ] **Step 4: Verify and open the PR**

Run: `npx vitest run --dir src`, then `npx tsc -b`, then `npm run build`
Expected: all pass. Report the test count.

```bash
git add docs ROADMAP.md
git commit -m "docs: the Teahupo'o Reef's Part A reports and roadmap"
```

```bash
git push -u origin claude/teahupoo-reef
```

```bash
gh pr create --title "Teahupo'o Reef, Part A: the bed and its peel" --body-file <scratchpad>/pr-body.md
```

The PR body covers:
- what changed: the bed, the peel measure, stage 2, the Reef's swells, the tank;
- the sweep's choice and its numbers against today's Reef;
- the stability and GPU checks;
- the cost;
- what is left for Parts B–D.

It ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Report the link, bind it with the ccd_pr tools, and leave the merge to the user.
