# Teahupo'o Reef Part B (slab tube physics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a reef's breaks a sourced thick lip and round tube. Mead & Black's vortex ratio sets the tube's roundness from the gradient the wave actually climbs, and Shand's "lip about half the wave's height" sets its thickness. This replaces Part A's provisional "a break over a submerged crest plunges at ξ = 2" rule, and the tube report measures the result against the sources.

**Architecture:**
- **Two overturns.** A break over a submerged crest (Part A's `submergedCrest`) is a reef break, and takes a new `reefOverturn(orthogonalGradient)`: aspect from Mead & Black, jet from the lip's sourced thickness, void area and tilt at Pick & Feddersen's steepest fit (provisional). Every other break keeps Pick & Feddersen's `overturn(ψ)`, so the Beach, Point and Canyon throw exactly as before.
- **The gradient the wave climbs.** It is the bed's slope along the crest's travel (the "orthogonal" gradient), not the steepest slope.
- **The jet's water.** It comes from the crest over the overturn's length, each cell still giving at most 20 % of its water. The report records how much of the asked-for jet was thrown, so a crest too thin to hold a thick lip shows as such instead of being drawn thicker than its water.

**Tech Stack:** TypeScript, Vitest, the stage 2 surf zone (CPU and WGSL, no shader changes here), rolldown report scripts.

**Spec:** `docs/superpowers/specs/2026-09-27-teahupoo-reef.md` (decision 7, Judging, Part B). Part A's report and sources: `docs/research/teahupoo-reef-report.md`, `docs/research/teahupoo-reef-sources.md`.

## Global Constraints

- **Workspace:** `.claude/worktrees/teahupoo-reef`, branch `claude/teahupoo-reef-b` (off main aa71add). Never bare `git stash`. Keep `git` commands separate from other shell steps.
- **Tests:** `npx vitest run <paths>`; the suite is `npx vitest run --dir src`; types `npx tsc -b`.
- **`<scratchpad>`** is the session's scratchpad directory.
- **Physics honest:**
  - every constant is sourced or marked **provisional** in `docs/research/teahupoo-reef-sources.md`;
  - nothing is shaped by hand to look thicker;
  - the lip is drawn as thick as its water;
  - the solver's water is only ever taken for the jet, conserving momentum, as today.
- **Only reef breaks change.** Breaks on plane slopes keep Pick & Feddersen exactly, so the Beach, Point and Canyon throw the same lips as before at the Wave Lab defaults (Part A measured 91 / 726 / 12 per minute).
- **Performance** is measured, never a gate.
- **Classic** stays byte-identical.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. The PR is left for the user to merge.

## Review Focus

1. **The other spots throw exactly as before.** At the Beach, Point and Canyon, over plane slopes, the lip is the same, whatever the swell. Test in Task 3.
2. **A wave travelling along the ledge** climbs a near-zero orthogonal gradient. It must not produce a huge vortex ratio, a flat void, NaN or a division by zero: gentler than Mead & Black's range, the break falls back to the plane-slope rule. Test in Task 2.
3. **A wave hitting the ledge head-on** (orthogonal gradient ≈ 1:2.3) is steeper than Mead & Black's "extreme". It collapses without a tube instead of throwing an impossible tall void (aspect > 1). Test in Task 2.
4. **Bigger jets must not drain the crest or run the water away.** The practice Reef's collapse test and the Big / low-tide / oblique probes still hold, and no source cell loses more than 20 % of its water to one throw. Tests in Tasks 4 and 5.
5. **The carve stays valid for round tubes** (aspect up to 1). The void's floor is finite across its length, and the GPU carve reads the same tube table. Test in Task 2.

---

### Task 1: Slab sources (the Part B research)

**Files:**
- Modify: `docs/research/teahupoo-reef-sources.md` (a "Part B: slab tubes" section and rulings)

**Interfaces:**
- Produces: the Part B rulings rows that Task 2's `REEF_OVERTURN` copies:
  - `area`: the void's area over H²;
  - `lipThickness`: over H;
  - `tiltDegrees`;
  - `extremeRatio`: the smallest vortex ratio that still makes a tube;
  - `gentlestRun`: the gentlest orthogonal gradient, as 1:X, that Mead & Black's fit covers.

- [ ] **Step 1: Research, time-boxed to the question list**

For each question, find a source, or rule the value provisional:
1. **Mead & Black (2001) / Mead's thesis (Waikato 2000):**
   - what X is (the orthogonal gradient written 1:X?);
   - the gradients their surf breaks span;
   - the five intensity classes' vortex-ratio limits;
   - what lies "greater than extreme" (collapse).

   Try the Journal of Coastal Research SI 29 copies, Scarfe et al.'s reviews and the "Design of Surfing Reefs" paper.
2. **Blenkinsopp & Chaplin (2008), Coastal Engineering 55:** the cavity (void) area against relative crest submergence h_c/H₀, and its size relative to H.
3. **The lip's thickness at breaking over a reef or slab:** Shand (2024) gives about half the wave height. Look for a lab or field measurement (plunging-jet thickness at impact, e.g. PIV studies).
4. **Where a plunging jet's water comes from:** the crest's upper part over what length. This decides Task 4's source rows.

- [ ] **Step 2: Write the section and its rulings**

Add "## Part B: slab tubes" to `teahupoo-reef-sources.md`: what each source says, with links, then this table. It starts with the plan's values, each replaced only where a source is about reef or plunging breakers:

```markdown
| Value | Game value | Source |
|---|---|---|
| Vortex ratio | Y = 0.065 X + 0.821, X = 1 / orthogonal gradient | Mead & Black 2001 (X read as 1:X, provisional) |
| Tube aspect (width / length) | 1 / Y | the same |
| Collapse below | Y < 1 (a vortex taller than long) | **provisional**; beyond "extreme" waves collapse (Mead & Black) |
| Gentlest gradient the fit covers | 1:50 | **provisional**; surfed breaks average Y ≈ 3 (X ≈ 33) |
| Void area | 0.43 H² | **provisional**: Pick & Feddersen's steepest fit, until a slab source (Blenkinsopp & Chaplin) |
| Lip thickness | 0.5 H | Shand 2024 (a coastal engineer's article; **provisional** until a measurement) |
| Void tilt | 23° | **provisional**: Pick & Feddersen's tilt at their steepest fit |
```

- [ ] **Step 3: Commit**

```bash
git add docs/research/teahupoo-reef-sources.md
git commit -m "docs: slab tube sources and the rulings Part B builds on"
```

---

### Task 2: The reef overturn

**Files:**
- Modify: `src/wave/Overturn.ts` (`REEF_OVERTURN`, `vortexRatio`, `reefOverturn`)
- Test: `src/wave/Overturn.test.ts` (exists: add a `describe` block and extend its imports)

**Interfaces:**
- Consumes: Task 1's rulings (copied into `REEF_OVERTURN`), `LH82_AREA`, `OverturnShape`, `tubeGeometry`, `tubeFloorDepth` (this file).
- Produces:
  - `REEF_OVERTURN: { area: number; lipThickness: number; tiltDegrees: number; extremeRatio: number; gentlestRun: number }`;
  - `vortexRatio(orthogonalGradient: number): number`, Mead & Black's Y;
  - `reefOverturn(orthogonalGradient: number): OverturnShape | 'collapse' | undefined`. It returns undefined when the gradient is gentler than the fit covers, so the caller falls back to the plane-slope rule.

- [ ] **Step 1: Write the failing tests**

Extend the file's `./Overturn` import with `LH82_AREA, REEF_OVERTURN, reefOverturn, tubeFloorDepth, tubeGeometry, vortexRatio` (keeping what it already imports), then add:

```ts
describe('the reef overturn (Teahupo\'o Reef, Part B)', () => {
  it('rounds the tube by Mead & Black\'s vortex ratio for the gradient the wave climbs', () => {
    expect(vortexRatio(1 / 4)).toBeCloseTo(0.065 * 4 + 0.821, 12);
    const shape = reefOverturn(1 / 4);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    expect(shape.aspect).toBeCloseTo(1 / vortexRatio(1 / 4), 12);
    expect(shape.area).toBe(REEF_OVERTURN.area);
    expect(shape.tilt).toBeCloseTo((REEF_OVERTURN.tiltDegrees * Math.PI) / 180, 12);
  });

  it('throws a lip as thick as its sourced share of the wave, over the void\'s length', () => {
    const shape = reefOverturn(1 / 4);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    const lengthOverHeight = Math.sqrt(shape.area / (LH82_AREA * shape.aspect));
    expect(shape.jetArea).toBeCloseTo(REEF_OVERTURN.lipThickness * lengthOverHeight, 12);
  });

  it('collapses without a tube beyond extreme, where a vortex would stand taller than long', () => {
    expect(vortexRatio(1 / 2.29)).toBeLessThan(REEF_OVERTURN.extremeRatio);
    expect(reefOverturn(1 / 2.29)).toBe('collapse');
  });

  it('leaves gradients gentler than the fit covers, and none at all, to the plane-slope rule', () => {
    expect(reefOverturn(1 / (REEF_OVERTURN.gentlestRun + 1))).toBeUndefined();
    expect(reefOverturn(0)).toBeUndefined();
    expect(reefOverturn(-0.1)).toBeUndefined();
    expect(reefOverturn(Number.NaN)).toBeUndefined();
  });

  it('draws a finite void floor along a round tube\'s whole length', () => {
    const shape = reefOverturn(1 / 3);
    if (shape === 'collapse' || shape === undefined) throw new Error('expected a tube');
    expect(shape.aspect).toBeLessThanOrEqual(1);
    const tube = tubeGeometry(shape, 4);
    for (let ahead = 0; ahead <= tube.length * Math.cos(tube.tilt); ahead += 0.1) {
      expect(Number.isFinite(tubeFloorDepth(tube, ahead))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Overturn.test.ts -t "reef overturn"`
Expected: FAIL (`REEF_OVERTURN`, `vortexRatio`, `reefOverturn` are not exported).

- [ ] **Step 3: Implement** (in `Overturn.ts`, after `overturn`)

```ts
/**
 * A reef break's overturn (the Teahupo'o Reef spec, Part B), from docs/research/teahupoo-reef-sources.md:
 * the tube's width over its length is 1 / Mead & Black's (2001) vortex ratio for the gradient the wave
 * climbs; the lip is `lipThickness` of the wave's height thick (Shand 2024) over the void's length; the
 * void's area and tilt are Pick & Feddersen's at their steepest fit (provisional). Beyond `extremeRatio`
 * a vortex would stand taller than long: the wave collapses without a tube. Gentler than `gentlestRun`
 * (1:X) the fit does not reach, and the break is a plane slope's.
 */
export const REEF_OVERTURN = { area: 0.43, lipThickness: 0.5, tiltDegrees: 23, extremeRatio: 1, gentlestRun: 50 };

/** Mead & Black's (2001) vortex ratio, the tube's length over its width, for an orthogonal gradient (rise over run). */
export function vortexRatio(orthogonalGradient: number): number {
  return 0.065 * (1 / orthogonalGradient) + 0.821;
}

export function reefOverturn(orthogonalGradient: number): OverturnShape | 'collapse' | undefined {
  if (!(orthogonalGradient > 1 / REEF_OVERTURN.gentlestRun)) return undefined;
  const ratio = vortexRatio(orthogonalGradient);
  if (ratio < REEF_OVERTURN.extremeRatio) return 'collapse';
  const aspect = 1 / ratio;
  const lengthOverHeight = Math.sqrt(REEF_OVERTURN.area / (LH82_AREA * aspect));
  return {
    area: REEF_OVERTURN.area,
    jetArea: REEF_OVERTURN.lipThickness * lengthOverHeight,
    aspect,
    tilt: (REEF_OVERTURN.tiltDegrees * Math.PI) / 180,
  };
}
```

If Task 1 changed any ruling, copy the new values into `REEF_OVERTURN` and cite them in its doc comment.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/Overturn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/Overturn.ts src/wave/Overturn.test.ts
git commit -m "feat: a reef break's overturn: Mead & Black's round tube and a lip half the wave thick"
```

---

### Task 3: Reef breaks take the reef overturn

This replaces Part A's ξ cap. Over a submerged crest, the lip follows `reefOverturn` with the orthogonal gradient; elsewhere, Pick & Feddersen exactly as before.

**Files:**
- Modify: `src/wave/PlungingLip.ts` (`LipConditions.reef?`, `lipThrow`)
- Modify: `src/wave/SurfZoneSimulation.ts` (`throwLip`: the crest's motion before the form, the orthogonal gradient, the reef path; `lipCollapses` counter)
- Modify: `src/wave/CrestKinematics.ts` (`breakerForm`'s comment: a submerged crest's steep break is a reef break)
- Test: `src/wave/PlungingLip.test.ts`, `src/wave/SurfZoneSimulation.test.ts`

**Interfaces:**
- Consumes: `reefOverturn`, `vortexRatio` (Task 2); `submergedCrest` (CrestKinematics).
- Produces:
  - `LipConditions.reef?: { orthogonalGradient: number }`;
  - `LipThrow.reef?: { vortexRatio: number }`;
  - `SurfZoneSimulation.lipCollapses: number` (breaks beyond extreme);
  - `SurfZoneSimulation.onThrow?: (event: LipThrowEvent) => void`;
  - `interface LipThrowEvent { asked: number; thrown: number; height: number; tube: TubeGeometry; vortexRatio?: number }`, for Task 5's report.

- [ ] **Step 1: Write the failing tests**

`PlungingLip.test.ts` (extend its `./Overturn` import with `reefOverturn, vortexRatio, type OverturnShape`):

```ts
  it('throws a reef break\'s lip from the reef overturn, and a plane slope\'s exactly as before', () => {
    const base = { iribarren: 3, slope: 0.44, nonlinearity: 0.05, breakerHeight: 4, windOverCelerity: 0, width: 1 };
    const reef = lipThrow({ ...base, reef: { orthogonalGradient: 1 / 4 } })!;
    const shape = reefOverturn(1 / 4) as OverturnShape;
    expect(reef.shape.aspect).toBeCloseTo(shape.aspect, 12);
    expect(reef.volume).toBeCloseTo(shape.jetArea * 16, 9);
    expect(reef.reef?.vortexRatio).toBeCloseTo(vortexRatio(1 / 4), 12);
    // Without `reef`, a surging ξ throws nothing, as today; a plunging ξ follows Pick & Feddersen.
    expect(lipThrow(base)).toBeUndefined();
    const plane = lipThrow({ ...base, iribarren: 1, slope: 0.08 })!;
    expect(plane.shape).toEqual(overturn(overturnParameter(0.08, 0.05)));
  });

  it('throws nothing where the reef break collapses beyond extreme', () => {
    const base = { iribarren: 3, slope: 0.44, nonlinearity: 0.05, breakerHeight: 4, windOverCelerity: 0, width: 1 };
    expect(lipThrow({ ...base, reef: { orthogonalGradient: 1 / 2.29 } })).toBeUndefined();
  });
```

`SurfZoneSimulation.test.ts` (Review Focus 1: the other spots throw exactly as before):

```ts
  it('throws the Reef\'s ledge breaks as reef breaks and every other spot\'s by Pick & Feddersen', () => {
    const reef = new SurfZoneSimulation({ ...small, spot: 'reef', significantHeight: 1.8, peakPeriod: 12, dx: 1, fineSpacing: 1 });
    const ratios: number[] = [];
    reef.onThrow = (event) => { if (event.vortexRatio !== undefined) ratios.push(event.vortexRatio); };
    for (let frame = 0; frame < 60 * 30 && ratios.length === 0; frame += 1) reef.step(1 / 30);
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(REEF_OVERTURN.extremeRatio);
    const point = new SurfZoneSimulation({ ...small, spot: 'point', dx: 1, fineSpacing: 1, directionDegrees: 20, spreading: 24 });
    let reefBreaks = 0;
    point.onThrow = (event) => { if (event.vortexRatio !== undefined) reefBreaks += 1; };
    for (let frame = 0; frame < 20 * 30; frame += 1) point.step(1 / 30);
    expect(point.lipLaunches).toBeGreaterThan(0);
    expect(reefBreaks).toBe(0);
  }, 240_000);
```

Import `REEF_OVERTURN` from `./Overturn`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/PlungingLip.test.ts src/wave/SurfZoneSimulation.test.ts -t "reef overturn|reef break|reef breaks"`
Expected: FAIL (`reef` is not a `LipConditions` field; `onThrow` is not called).

- [ ] **Step 3: Implement**

`PlungingLip.ts` (extend its `./Overturn` import with `reefOverturn, vortexRatio`):

```ts
export interface LipConditions {
  // … the existing fields …
  /** A break over a submerged crest (a reef break): the gradient it climbs along its travel, rise over run. */
  reef?: { orthogonalGradient: number };
}

export interface LipThrow {
  // … the existing fields …
  /** A reef break's vortex ratio (Mead & Black 2001). */
  reef?: { vortexRatio: number };
}
```

In `lipThrow`, before the Iribarren gate:

```ts
  if (conditions.reef) {
    const reef = reefOverturn(conditions.reef.orthogonalGradient);
    if (reef === 'collapse') return undefined;
    if (reef) {
      const shape: OverturnShape = { ...reef, aspect: clamp(reef.aspect - 0.18 * windOverCelerity, 0.2, 1) };
      return {
        volume: shape.jetArea * breakerHeight * breakerHeight * width,
        relativeSpeed: jetRelativeSpeed(shape, breakerHeight),
        shape,
        reef: { vortexRatio: vortexRatio(conditions.reef.orthogonalGradient) },
      };
    }
  }
```

The wind's aspect shift is the same as for the plane-slope overturn (Feddersen et al. 2023). The existing Pick & Feddersen path follows unchanged.

`SurfZoneSimulation.ts`:
- Add `lipCollapses = 0;` and `onThrow?: (event: LipThrowEvent) => void;`. Export `LipThrowEvent` as in Interfaces; import `TubeGeometry` from `./Overturn`.
- In `throwLip`:
  1. Move `const motion = crestMotion(solver, crest); if (!motion) return;` above the form decision.
  2. Compute the gradient the wave climbs: `const orthogonal = slopeX * motion.direction.x + slopeZ * motion.direction.z;` (the bed rising along the travel; `slopeX` and `slopeZ` are the bed-elevation gradients already computed).
  3. Replace Part A's ξ cap with:

     ```ts
     const iribarren = slope / Math.sqrt(breakerHeight / deepWavelength);
     const reefBreak = overCrest ? reefOverturn(orthogonal) : undefined;
     if (reefBreak === 'collapse') { this.lipCollapses += 1; return; }
     const form = reefBreak ? 'jet' : breakerForm(iribarren);
     ```

  4. Pass `reef: reefBreak ? { orthogonalGradient: orthogonal } : undefined` into `lipThrow`.
  5. After `const thrown = this.lip.launch(...)`, call:

     ```ts
     this.onThrow?.({ asked: shape.volume, thrown, height, tube: tubeGeometry(shape.shape, height), vortexRatio: shape.reef?.vortexRatio });
     ```

- A plane slope with ξ > 2 now throws nothing again, as before Part A. Its submerged-crest case goes through `reefOverturn`, which returns undefined for gradients gentler than 1:50; there `breakerForm(iribarren)` decides as on any slope.

`CrestKinematics.ts`: update `breakerForm`'s comment. The `overSubmergedCrest` argument stays, for the readout's `describeSwell` (`iribarren()`), and its doc now points to `reefOverturn` as the lip's rule.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave`
Expected: PASS. The tube shape tests on the Reef (`TubeShape.test.ts`) now measure round reef tubes. If one fails, check the new aspect lies inside the measured 0.25–1 (it should). Diagnose with superpowers:systematic-debugging; do not loosen a range.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/wave/PlungingLip.ts src/wave/PlungingLip.test.ts src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts src/wave/CrestKinematics.ts
git commit -m "feat: reef breaks throw the reef overturn by the gradient they climb, replacing the ξ cap"
```

---

### Task 4: The jet's water from the crest over the overturn's length

**Files:**
- Modify: `src/wave/PlungingLip.ts` (`launch`: source rows across the overturn's length; `SOURCE_SHARE` unchanged)
- Test: `src/wave/PlungingLip.test.ts`

**Interfaces:**
- Consumes: `TubeGeometry` (already passed to `launch` as `tube`).
- Produces: `launch` draws from the crest row and the rows within half the void's length of it (at least one each side, as today), each at most `SOURCE_SHARE` of its water.

- [ ] **Step 1: Write the failing test** (Review Focus 4)

```ts
  it('draws a long overturn\'s jet from the crest across its length, no cell giving more than its share, momentum kept', () => {
    const solver = new ShallowWaterSolver(
      { nx: 3, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'wall' }, () => 4, { manning: 0 },
    );
    solver.h.fill(4);
    const lip = new PlungingLip(solver);
    const crest = 20 * solver.nx + 1;
    const before = Float64Array.from(solver.h);
    const tube = { length: 6, width: 5, tilt: 0.4 };
    const velocity = { x: 0, z: 8 };
    const thrown = lip.launch(crest, velocity, 4, 10, 6, tube);
    let drawn = 0;
    let momentum = 0;
    let rows = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      const removed = before[i] - solver.h[i];
      if (removed <= 0) continue;
      rows += 1;
      drawn += removed * solver.dx * solver.dz[Math.floor(i / solver.nx)];
      momentum += -solver.qz[i] * solver.dx * solver.dz[Math.floor(i / solver.nx)];
      expect(removed).toBeLessThanOrEqual(0.2 * before[i] + 1e-12);
    }
    expect(rows).toBeGreaterThanOrEqual(5); // ±3 m around the crest, not only its neighbours
    expect(drawn).toBeCloseTo(thrown, 9);
    expect(momentum).toBeCloseTo(8 * thrown, 9);
  });
```

The file already imports `ShallowWaterSolver` and `uniformEdges`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/PlungingLip.test.ts -t "across its length"`
Expected: FAIL (only 3 rows drawn).

- [ ] **Step 3: Implement** (in `launch`)

Replace the source list `[cell - nx, cell, cell + nx]` with the crest's column over the rows within half the overturn's length:

```ts
    // The jet is the crest's water over the overturn's length (at least the crest's neighbours).
    const reach = Math.max(1, tube ? Math.ceil(tube.length / 2 / solver.dz[row]) : 1);
    for (let k = -reach; k <= reach; k += 1) {
      const index = cell + k * nx;
      if (index < 0 || index >= h.length) continue;
      sources.push(index);
      available += SOURCE_SHARE * h[index] * dx * dz[Math.floor(index / nx)];
    }
```

The rest of `launch` (the share, the momentum removal) is unchanged.

- [ ] **Step 4: Run the lip, whitewater and host tests**

Run: `npx vitest run src/wave src/game/SurfZoneHost.test.ts`
Expected: PASS. This includes "the practice Reef's water steady while its tubes collapse" and the steep-Reef probes: Review Focus 4.

- [ ] **Step 5: Commit**

```bash
git add src/wave/PlungingLip.ts src/wave/PlungingLip.test.ts
git commit -m "feat: draw the jet's water from the crest across the overturn's length"
```

---

### Task 5: The tube report against the sources, and the Reef holds

**Files:**
- Modify: `scripts/tube-report.ts` (columns: vortex ratio predicted against measured length/width for reef breaks, lip thickness / H, thrown / asked)
- Modify: `docs/research/teahupoo-reef-report.md` ("Part B" section)

**Interfaces:**
- Consumes: `SurfZoneSimulation.onThrow`, `LipThrowEvent`, `lipCollapses` (Task 3).

- [ ] **Step 1: Add the report's measures**

In `tube-report.ts`, per spot, hook `simulation.onThrow` and collect:
- `ask = event.thrown / event.asked`;
- `lip = event.thrown / (simulation.solver.dx * event.tube.length) / event.height` (the lip's thickness over H: its water per metre of crest spread over the void's length);
- for reef breaks, `predicted = event.vortexRatio` against `measured = event.tube.length / event.tube.width`.

Add these columns to the table:
- median thrown/asked;
- median lip / H;
- median predicted Y;
- median measured L/W of reef breaks;
- collapses (`simulation.lipCollapses`).

Also fix the note that says jets only leave for ξ 0.4–2 (a deferred minor from Part A): reef breaks follow Mead & Black. Type-check the script with the scratch config from Part A (`.superpowers/sdd/2026-09-27-teahupoo-reef-part-a/tsconfig.scripts.json`).

- [ ] **Step 2: Run the reports**

- `npm run report:tubes -- --practice --spots reef --seeds 2 --periods 12 --out <scratchpad>/b-tubes-reef.md`
- `npm run report:tubes -- --spots beach,point,canyon --seeds 1 --periods 6 --out <scratchpad>/b-tubes-others.md`, whose lip throws and volumes are compared with Part A's same-settings numbers (Review Focus 1)
- `npm run report:whitewater -- --spots reef --periods 4 --out <scratchpad>/b-whitewater.md`: the bigger jets' aeration, splash-up and spray pool
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef holds"` and `npx vitest run src/game/SurfZoneHost.test.ts -t "practice Reef"`, Review Focus 4

- [ ] **Step 3: Read them against the sources, and rule**

- **Tube shape:** the measured L/W of reef breaks should lie near Mead & Black's Y. Part A measured 1.41 against 1.10.
- **Lip thickness:** should lie near 0.5 H where the crest holds the water. Part A's lip was capped at under half its asked volume.
- **Thrown/asked:** if it stays well under 1, the crest's water limits the lip. Record that plainly in the report, and do not raise `SOURCE_SHARE` without a source: that is the spec's "never thicker than its water".
- **The other spots:** the Beach, Point and Canyon's throws must be unchanged. A difference is a bug in Task 3's split; debug it.

- [ ] **Step 4: Write the report's Part B section and commit**

In `teahupoo-reef-report.md`, add "## Part B: slab tubes":
- the numbers above against Part A's;
- the constants' sources;
- what remains provisional;
- the stability results.

```bash
git add scripts/tube-report.ts docs/research/teahupoo-reef-report.md
git commit -m "docs: the Reef's slab tubes against Mead & Black and the lip's sourced thickness"
```

---

### Task 6: Pictures, roadmap and the PR

- [ ] **Step 1: Pictures**

1. Re-render the overhead sea and the side view at the Big swell's biggest throw on the ledge.
2. Use Part A's scratch renderer (`<scratchpad>/zz-render-reef.ts`): copy it into `scripts/`, bundle it, run it, and delete the copy. Keep it out of the commit.
3. Send them to the user with the report's numbers.

- [ ] **Step 2: ROADMAP**

Tick Part B in the "Teahupo'o Reef" section, with the measured tube shape, lip thickness and what stays provisional.

- [ ] **Step 3: Verify and open the PR**

Run: `npx vitest run --dir src`, then `npx tsc -b`, then `npm run build`
Expected: all pass. Report the counts.

```bash
git add ROADMAP.md
git commit -m "docs: the Teahupo'o Reef's Part B on the roadmap"
```

```bash
git push -u origin claude/teahupoo-reef-b
```

```bash
gh pr create --title "Teahupo'o Reef, Part B: slab tube physics" --body-file <scratchpad>/pr-body-b.md
```

The PR body covers:
- the reef overturn and its sources;
- the orthogonal gradient;
- the jet's water;
- the measured tube shape and lip against the sources;
- the other spots unchanged;
- stability;
- what stays provisional.

It ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Bind it with the ccd_pr tools and leave the merge to the user.
