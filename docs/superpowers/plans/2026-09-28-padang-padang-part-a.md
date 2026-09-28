# Padang Padang Part A (the spot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth spot, Padang Padang (Bali): a fast, hollow left over a shallow coral shelf, tuned to its real conditions. It needs its own swells, tides and winds, runs on stage 2, appears everywhere but Surf School, and is judged by the peel, catch, ride and size reports.

**Architecture:**
- **The bed.** `Bathymetry.ts` gets a parametric Padang Padang. The swell arrives over a platform, which is the tank's edge. It climbs a ramp at Mead & Black's inferred orthogonal gradient (about 1:19) to a reef flat that nearly dries at the lowest spring tides.
  - The ramp's top edge (the crest line) runs obliquely from the peak toward +x, so the wave peels left.
  - A channel as deep as the platform sits at the +x open edge.
  - Upcoast of the peak the crest line turns along shore, so the bed is level at the −x open edge.
- **Why a platform.** Along a straight edge the break point runs at c / sin φ, and that ratio is set where the contours change direction (phase matching, `ledgePeel`). A 1:19 ramp straight out of deep water peels too fast to make (a screen of the predictor gave α ≤ 22° at Small). A platform about 10 m deep with the edge 35–45° to the swell reaches 27–32°. The platform's depth is provisional and the sweep picks it.
- **The tank.** A 1:19 ramp across 9 m of depth is about 170 m wide, and oblique, so Padang Padang gets its own layout. Its fine zone starts 40 m seaward of where its sets first break, over a relaxation zone at least 0.75 of the edge wavelength long.
- **The sea.** Padang Padang has its own swells, Practice, tides and winds, stage 2 always, and a take-off at its peak. The peel meter measures its reef only.
- **Choosing the design.** A sweep of the platform's depth, the edge's angle and the swell's direction, screened by the predictor and checked by the peel, catch and ride reports. The size report then calibrates the faces.

**Tech Stack:** TypeScript, Vitest, rolldown report scripts, the stage 2 Boussinesq surf zone (CPU and WGSL), Three.js (untouched).

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md` (Part A). Template: the Reef's Part A (`docs/superpowers/plans/2026-09-27-teahupoo-reef-part-a.md`), its sources doc and report.

## Global Constraints

- **Workspace:** `.claude/worktrees/quirky-greider-1364d8`, branch `claude/padang-padang` (off main aa71add).
  - `npm ci` has run.
  - Never use a bare `git stash`.
  - Keep `git` commands separate from other shell steps.
- **`<scratchpad>`** means the session's scratchpad directory (report outputs, scratch scripts), never `/tmp`.
- **Tests:** `npx vitest run <paths>`; the suite is `npx vitest run --dir src`; types `npx tsc -b`.
- **Only Padang Padang is added.** The Beach, Point, Reef and Canyon beds, tanks, seas and looks stay exactly as today.
- **Don't edit the Reef's code paths:** `REEF`, `reef()`, `reefLedgeAt`, and the tube rules on `claude/teahupoo-reef-b`. The Reef session owns them.
- **Padang Padang always runs stage 2,** on every machine and in every mode.
- **Physics honest:**
  - every value is sourced or marked **provisional** in `docs/research/padang-padang-sources.md`;
  - nothing is shaped by hand for a look;
  - the level strip at the −x edge is a numerical boundary treatment, stated as one.
- **Performance is measured, never a gate.** Record the step cost against the Reef's.
- **Classic stays byte-identical for the existing spots:** no shader changes.
- **Player-facing text** goes in `src/ui/strings.ts`, in English.
- **The advisor:** before a condition or shape value is settled (the Task 1 rulings, the Task 7 choice, the Task 8 Practice call), send it to the "Water physics research" session with SendMessage and fold in its answer.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Open the PR and leave the merge to the user.
- **Stop rule (the spec):** stop and bring the user options with the evidence, instead of pushing on, if either of these happens:
  - no bed candidate runs stably;
  - no sweep candidate reaches the peel and catch bands in Task 7.

## Review Focus

1. **The lowest spring tide on the Big swell.** At −1.2 m the reef flat carries 5 cm of water. The Reef's draining trough once ran its backwash to 112 m/s and NaN. It must stay finite, with speeds under 30 m/s. Test in Task 6.
2. **The open −x edge.** Oblique swells cross the window's −x edge, where a sloping bed ran the Reef's Big swell to NaN. The level strip must keep the full 160 m window finite at the sweep's extreme directions. Test in Task 6.
3. **Saved and shared state from before Padang Padang.** Older Logbooks, Wave Lab settings and online rooms must still load. A Padang Padang ride, lab setting or room must round-trip. Tests in Task 5.
4. **"Fast" water or a dev's stage 1 choice never runs Padang Padang on stage 1,** and the GPU tier is still asked. Tests in Task 4.
5. **The take-off sits where waves break** for every Padang Padang swell at every tide: never on the dry flat at Low, never in the channel. Test in Task 4.

---

### Task 1: Sources and rulings

**Files:**
- Create: `docs/research/padang-padang-sources.md`

**Interfaces:**
- Produces: the **Rulings** table that Tasks 2–4 copy into `PADANG`, `PADANG_SWELLS`, `PADANG_PRACTICE_SWELL`, `PADANG_TIDES`, `PADANG_WINDS`, `SPOT_OPTICS.padang` and `FOAM_DECAY.padang`. Every row is sourced or marked provisional.

- [ ] **Step 1: Write the doc from what is known**

````markdown
# Padang Padang: sources and rulings

The [Padang Padang spec](../superpowers/specs/2026-09-28-padang-padang.md) builds a fifth spot on Padang Padang's real conditions. This doc holds the sources, what each says, and the values the game takes (the rulings). Values without a source are marked **provisional**. The "Water physics research" session advises; its findings are in the Claude Doc "Wave Physics Research" (the Padang Padang tab).

## What is known

- **The break** ([Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts), [Mondo Surf](https://www.mondo.surf/surf-spot/padang-padang/guide/11668)):
  - a left-hand reef break over a shallow, very sharp coral shelf;
  - the swell arrives from deep water and meets the reef abruptly;
  - a deep channel with a strong rip ends the ride;
  - a ride of 50–150 m with two to four barrel sections.
- **Swell:** south-south-west to south-west groundswell, periods often over 16 s. It works from about 4 ft and is best at 6–10 ft, "double to triple overhead". The feet are read as Hawaiian (face ≈ 2 × the number; Caldwell & Aucan 2007). That reading is inferred, not stated: it is the one consistent with "double to triple overhead" (the advisor, 2026-09-28).
- **Wind:** the south-east trade blows offshore in the dry season, April–October.
- **Tide:** low tide gives the biggest top-to-bottom barrels, mid is good, high is surfable. Very low spring tides expose the reef (surf guides; anecdotal, no datum).
  - The Benoa gauge (UH Sea Level Center data) is mixed semidiurnal.
  - Its highest ranges were 2.46 m (December 2020) and 2.3 m (2022) ([IOP Conf. Ser. Earth Environ. Sci. 1350, 012016, 2024](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016)).
  - Predictions for Nusa Dua put springs at about 2.7–2.8 m and neaps at 0.6–0.7 m ([tidechecker](https://tidechecker.com/indonesia/bali/nusa-dua/), secondary).
- **Tube:** Mead & Black (2001, J. Coastal Res. SI 29, [Table 6.1](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf)) fitted three photos of Padang Padang:
  - vortex ratios 1.97, 2.14 and 2.02 ("very hollow", 1.91–2.2);
  - vortex angles 29°, 33° and 41°;
  - about 0.78 H long and 0.4 H wide (the third photo).
- **Orthogonal gradient, inferred:** inverting Y = 0.065X + 0.821 gives X = 17.7–20.3, so about 1:18–1:20. It is averaged along the wave's path over the breaking depth ± 2–3 m. No survey confirms it.
- **Peel:** at least 27–29° (`PEEL_SKILL_MINIMUM`, Hutt, Black & Mead 2001).
- **Phase matching** (`src/wave/ledgePeel.ts`): along a straight edge the break point runs at c / sin φ, set where the contours turn. A 1:19 ramp out of 30 m of water peels at α ≤ 22° on the Small swell. A platform of 8–12 m with the edge 35–45° to the swell gives 27–32° (screen of 2026-09-28).

## Open questions (answer each with a source, or rule it provisional)

1. Mead & Black (2001), "Field studies leading to the bathymetric classification of world-class surfing breaks" (J. Coastal Res. SI 29: 5–20): Padang Padang's reef components, if listed.
2. Mead & Black (1999), the Bingin survey: the neighbouring reef's platform depth, ramp and flat.
3. The depth seaward of the reef (the platform), from a chart, GEBCO or the Bingin survey.
4. The reef edge's and the coast's orientation to the SSW–SW swell (a map or satellite source), and the swell's direction on the platform by Snell's law.
5. The channel's depth and width.
6. The dry season's south-east trade and the wet season's westerly monsoon at Bali: speeds, and their components across Padang Padang's shore.
7. The water's clarity over Bali's reefs (particle scattering, m⁻¹) and a coral reef flat's albedo.

## Rulings (the values the game uses)

| Value | Game value | Source |
|---|---|---|
| Platform depth (the tank's edge) | 10 m | **provisional**, the sweep's choice (Task 7) |
| Orthogonal gradient over h_b ± 2.5 m | 1:19 | Mead & Black 2001, inverted |
| Ramp's steepest slope | 1:19 | **provisional**: set in Task 7 so the waves climb 1:18–1:20 along their paths |
| Reef flat depth, mean sea level | 1.25 m | **provisional**: wet at Low (−0.8 m), nearly dry at the lowest springs (−1.2 m) |
| Crest line's angle to the shoreline | 35° | **provisional**, the sweep's choice (Task 7) |
| Peak | x −50 m, z −90 m | **provisional**: fits the ride in the 160 m window |
| Level strip upcoast of the peak | 20 m | numerical: open edges copy their neighbours |
| Channel | axis at the +x edge, half-width 20 m, platform-deep | **provisional** |
| Beach face | 1:5 | **provisional** (as the Reef's) |
| Swell direction on the platform | 20° | **provisional**: SW groundswell refracted to the platform; the sweep's (Task 7) |
| Swells, buoy Hs / Tp / spread | Small 1.6 m / 16 s / 0.2; Medium 2.2 m / 17 s / 0.2; Big 3.0 m / 18 s / 0.15 | Komar & Gaughan inverted to the face targets; **provisional** until the size report (Task 8) |
| Practice | Hs 1.5 m at the edge, 16 s, band ±8 %, spreading s 40 | **provisional** until the size report (Task 8) |
| Faces, Practice / Small / Medium / Big | 2–2.5 / 2.5–3.5 / 3.5–4.5 / 4.5–6 m | the spec (decision 4) |
| Tides, Low / Mid / High | −0.8 / 0 / +0.9 m | Benoa gauge; the advisor's ruling |
| Winds, Offshore / Onshore | −5 / +6 m/s | the shared values until question 6 is sourced |
| Water: particle scattering, bed albedo | 0.15 m⁻¹, [0.5, 0.47, 0.36] | the Reef's until question 7 is sourced |
| Foam decay, dense / lace | 3 s / 20 s | the advisor's Foam tab: a reef's foam lasts at least as long as the Beach's (Callaghan et al. 2012, 2013) |
| Breaking onset | 0.65 √(gh) | Kennedy et al. 2000, as on plain and steep beds |
````

- [ ] **Step 2: Research the open questions**

Work through the questions with web search and the papers:
- read HTML pages with WebFetch;
- ask before downloading a PDF: state its name, source and size, and read it only once the user agrees;
- the advisor is already researching questions 1–5; fold in its answers when they arrive.

For each question, add what the source says with a link, then update its ruling row. A sourced value replaces a provisional one only where the source is about Padang Padang or the Bukit's reefs; otherwise the row stays provisional with the source beside it.

- [ ] **Step 3: Check the rulings with the advisor**

SendMessage to "Water physics research" with the Rulings table and the question: "Any row you would change before I build the bed and sea on it?" Fold in the answer; say in the doc which rows it changed.

- [ ] **Step 4: Commit**

```bash
git add docs/research/padang-padang-sources.md
git commit -m "docs: Padang Padang sources and the rulings Part A builds on"
```

---

### Task 2: The Padang Padang bed

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`SpotName`, `PADANG`, `padangCrestZ`, `padangSeaward`, `padangReefAt`, `padang()`, `createSpot`)
- Modify, so every `Record<SpotName, …>` has a Padang Padang entry:
  - `src/wave/SurfZoneSimulation.ts` (`OFFSHORE_DEPTH`, `BREAKING_ONSET`, `FOAM_DECAY`, `TAKE_OFF`, `TAKE_OFF_INDEX`, and a `peakTakeOffX` used by `takeOffPoint`);
  - `src/wave/surfForecast.ts` (`SURF_FORECAST`, `PRACTICE_SURF`);
  - `src/scene/waterOptics.ts` (`SPOT_OPTICS`);
  - `src/ui/SurfScreen.ts` (`SKETCHES`).
- Test: `src/wave/Bathymetry.test.ts`, `src/wave/ShallowWaterSolver.test.ts`, `src/wave/BoussinesqSolver.test.ts`

**Interfaces:**
- Consumes: the rulings (Task 1).
- Produces:
  - `type SpotName = 'beach' | 'point' | 'reef' | 'canyon' | 'padang'`;
  - `PADANG = { platformDepth, rampSlope, crestDepth, peakX, peakZ, angle, levelWidth, channelX, channelHalfWidth, shoreSlope, takeOffX }` (mutable numbers, for the sweep);
  - `padangCrestZ(x: number): number`;
  - `padangSeaward(x: number, z: number): number`;
  - `padangReefAt(x: number): boolean`;
  - `peakTakeOffX(spot: SpotName): number` (in `SurfZoneSimulation.ts`).

- [ ] **Step 1: Write the failing tests**

In `Bathymetry.test.ts`, extend the import to `import { BEACH_BAR, BEACH_OUTER, CANYON, PADANG, POINT_HEADLAND, POINT_OUTER, REEF, createSpot, deanDepth, padangCrestZ, padangReefAt, padangSeaward, reefCrestZ, reefLedgeAt, smoothstep, type SurfSpot } from './Bathymetry';`, and add after the Reef's `describe`:

```ts
  describe('Padang Padang', () => {
    const padang = createSpot('padang', 1);
    const radians = (PADANG.angle * Math.PI) / 180;
    // At x = −40 the crest line is past the peak, oblique, and well clear of the beach face and the channel.
    const x = -40;

    it('climbs from its platform up its ramp to the reef flat, across its crest line', () => {
      const crest = padangCrestZ(x);
      expect(padang.depthAt(x, crest)).toBeCloseTo(PADANG.crestDepth, 9);
      const seaward = { x: Math.sin(radians), z: -Math.cos(radians) };
      const at = (n: number) => padang.depthAt(x + n * seaward.x, crest + n * seaward.z);
      expect((at(30) - at(10)) / 20).toBeCloseTo(PADANG.rampSlope, 9);
      expect(padangSeaward(x + 30 * seaward.x, crest + 30 * seaward.z)).toBeCloseTo(30, 9);
      expect(padang.depthAt(x, crest - 400)).toBeCloseTo(PADANG.platformDepth, 12);
      expect(padang.depthAt(x, crest + 10)).toBeCloseTo(PADANG.crestDepth, 12);
    });

    it('runs its crest line at its angle from the peak toward +x, and along shore upcoast of it', () => {
      expect((padangCrestZ(0) - padangCrestZ(-40)) / 40).toBeCloseTo(Math.tan(radians), 12);
      expect(padangCrestZ(-80)).toBeCloseTo(padangCrestZ(PADANG.peakX - PADANG.levelWidth), 12);
      expect(padangCrestZ(-80)).toBeLessThan(padangCrestZ(PADANG.peakX));
      // Level along shore at the window's −x open edge (an open edge copies its neighbours).
      for (let z = -300; z <= -20; z += 10) expect(Math.abs(gradientX(padang, -79, z))).toBeLessThan(1e-9);
    });

    it('opens a channel along the window’s +x edge, level across it and as deep as the platform', () => {
      const edge = ALONG_SHORE / 2;
      expect(PADANG.channelX).toBe(edge);
      for (let z = -300; z <= -40; z += 20) expect(Math.abs(gradientX(padang, edge, z))).toBeLessThan(1e-3);
      expect(padang.depthAt(edge, -150)).toBeCloseTo(PADANG.platformDepth, 6);
    });

    it('rides its reef from the peak to the channel', () => {
      expect(padangReefAt(PADANG.peakX)).toBe(true);
      expect(padangReefAt(PADANG.peakX - 1)).toBe(false);
      expect(padangReefAt(PADANG.channelX - 2 * PADANG.channelHalfWidth)).toBe(false);
      expect(PADANG.channelX - 2 * PADANG.channelHalfWidth - PADANG.peakX).toBeGreaterThanOrEqual(50);
    });

    it('has no cliff anywhere in the window', () => {
      for (let px = -80; px <= 80; px += 2) {
        for (let z = -400; z <= 20; z += 2) {
          expect(Math.abs(padang.depthAt(px, z + 0.5) - padang.depthAt(px, z))).toBeLessThan(0.25);
          expect(Math.abs(padang.depthAt(px + 0.5, z) - padang.depthAt(px, z))).toBeLessThan(0.25);
        }
      }
    });

    it('meets a beach face and dry land shoreward of z = 0, with the crest line seaward of the face', () => {
      for (let px = -80; px <= 80; px += 10) {
        expect(padang.depthAt(px, 5)).toBeLessThan(0);
        expect(padang.depthAt(px, -3)).toBeLessThanOrEqual(3 * PADANG.shoreSlope + 1e-12);
        if (padangReefAt(px)) expect(padangCrestZ(px)).toBeLessThan(-PADANG.crestDepth / PADANG.shoreSlope);
      }
    });
  });
```

Add `'padang'` to the spot lists of "puts dry land shoreward of every shoreline and stays finite" (`Bathymetry.test.ts`), "keeps a lake at rest over every spot…" (`ShallowWaterSolver.test.ts`) and "keeps a lake at rest over every spot, dry shoreline included, with breaking on" (`BoussinesqSolver.test.ts`).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.test.ts src/wave/BoussinesqSolver.test.ts`
Expected: FAIL (`PADANG` is not exported; `createSpot('padang')` has no case).

- [ ] **Step 3: Implement the bed**

`Bathymetry.ts`:
- `export type SpotName = 'beach' | 'point' | 'reef' | 'canyon' | 'padang';`
- after `reefSeaward`:

```ts
/**
 * Padang Padang (the Padang Padang spec): a left over a shallow coral shelf on the west coast of Bali's Bukit.
 * The swell arrives over a platform `platformDepth` deep (the tank's edge), then climbs a ramp at Mead & Black's
 * orthogonal gradient, inferred from the measured vortex ratios of its tubes (about 1:19; Mead & Black 2001), to a
 * reef flat `crestDepth` deep that nearly dries at the lowest spring tides. The ramp's top edge (the crest line) runs
 * at `angle` degrees to the shoreline from the peak (x = peakX), so each wave breaks there first and peels toward +x
 * (a left) at the platform's celerity over the sine of the crest's angle to the edge (`ledgePeel`). A channel as
 * deep as the platform runs along the window's +x open edge, level across its axis, where the left ends. Upcoast of
 * the peak the crest line eases to run along shore, so the bed is level along shore at the window's −x open edge
 * (an open edge copies its neighbours: a bed sloping across it ran the Reef's Big swell to NaN). A planar beach face
 * caps it all. Sources and provisional values: docs/research/padang-padang-sources.md. Mutable for the design sweep
 * (`scripts/padangShape.ts`).
 */
export const PADANG = {
  platformDepth: 10, rampSlope: 1 / 19, crestDepth: 1.25, peakX: -50, peakZ: -90, angle: 35, levelWidth: 20,
  channelX: 80, channelHalfWidth: 20, shoreSlope: 0.2, takeOffX: -40,
};

/** The crest line's along-shore coordinate: x past the peak, eased (C¹) into a level strip `levelWidth` wide upcoast of it. */
function padangAlong(x: number): number {
  const { peakX, levelWidth } = PADANG;
  if (x >= peakX) return x;
  const into = Math.max(0, x - (peakX - levelWidth));
  return peakX - levelWidth / 2 + (into * into) / (2 * levelWidth);
}

/** Where Padang Padang's crest line (the top of its ramp) crosses along-shore position x. */
export function padangCrestZ(x: number): number {
  return PADANG.peakZ + (padangAlong(x) - PADANG.peakX) * Math.tan((PADANG.angle * Math.PI) / 180);
}

/** Distance seaward of Padang Padang's crest line, m, measured across it (negative shoreward of it). */
export function padangSeaward(x: number, z: number): number {
  const { peakX, levelWidth, angle } = PADANG;
  // The line's local dz/dx: tan(angle) past the peak, easing to 0 across the level strip.
  const ease = x >= peakX ? 1 : Math.max(0, x - (peakX - levelWidth)) / levelWidth;
  return (padangCrestZ(x) - z) / Math.hypot(1, ease * Math.tan((angle * Math.PI) / 180));
}

/** Whether Padang Padang's reef is ridden at along-shore position x: from its peak to where the channel begins (two half-widths from its axis). */
export function padangReefAt(x: number): boolean {
  return x >= PADANG.peakX && x < PADANG.channelX - 2 * PADANG.channelHalfWidth;
}
```

- after `reef()`:

```ts
function padang(): SurfSpot {
  return {
    name: 'padang',
    depthAt(x, z) {
      const p = PADANG;
      // The ramp from the reef flat down to the platform, across the crest line.
      const reef = Math.min(p.platformDepth, p.crestDepth + Math.max(0, padangSeaward(x, z)) * p.rampSlope);
      // The channel: no reef, as deep as the platform, flat across its axis at the window's edge.
      const channel = Math.exp(-(((x - p.channelX) / p.channelHalfWidth) ** 2));
      const depth = reef + (p.platformDepth - reef) * channel;
      // A beach face, and dry land shoreward of z = 0.
      return Math.min(depth, z < 0 ? -z * p.shoreSlope : -z * 0.06);
    },
  };
}
```

- in `createSpot`: `case 'padang': return padang();`

The per-spot tables (their values are the rulings'):
- `SurfZoneSimulation.ts`:
  - `OFFSHORE_DEPTH`: add `get padang() { return PADANG.platformDepth; }`, a getter so the sweep's platform follows. Its comment says Padang Padang's edge is its platform.
  - `BREAKING_ONSET`: `padang: 0.65`.
  - `FOAM_DECAY`: `padang: { dense: 3, residual: 20 }`, with the comment "a reef's foam lasts at least as long as the Beach's (the advisor's Foam tab)".
  - `TAKE_OFF`: `padang: 'peak'`.
  - `TAKE_OFF_INDEX`: `padang: BREAKER_INDEX`.
  - Import `PADANG` from `./Bathymetry`.
- In `takeOffPoint`, replace `REEF.takeOffX` in the `'peak'` branch with `peakTakeOffX(config.spot)`, defined above it:

```ts
/** Where a peak take-off waits along shore: at the Reef's or Padang Padang's own peak. */
export function peakTakeOffX(spot: SpotName): number {
  return spot === 'padang' ? PADANG.takeOffX : REEF.takeOffX;
}
```

- `surfForecast.ts`:
  - `SURF_FORECAST`: `padang: { a: 0.616, sets: 1.27 }`, commented "Komar & Gaughan's own forecast and a Rayleigh sea's sets until the size report fits Padang Padang (its plan, Task 8)";
  - `PRACTICE_SURF`: `padang: { typical: 2, sets: 2.5 }`, commented "the spec's Practice target until the size report measures it (Task 8)".
- `waterOptics.ts`: `padang: { turbidity: 0.15, bedAlbedo: [0.5, 0.47, 0.36] }`, or the values in the rulings if Task 1 sourced them.
- `SurfScreen.ts` `SKETCHES` (seen from above, waves from the top). It shows a cove's shoreline, the reef edge running along shore from the left then turning oblique toward the shore, the channel's walls on the right, and swell lines:

```ts
  padang: '<path d="M4 42c10-6 22-8 36-8s26 2 36 8"/><path d="M4 18h14L58 34" stroke-dasharray="3 3"/><path d="M64 40V16M74 40V16" stroke-dasharray="3 3" opacity=".6"/><path d="M4 10c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.test.ts src/wave/BoussinesqSolver.test.ts src/ui/SurfScreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors (every `Record<SpotName, …>` has its entry).

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.test.ts src/wave/BoussinesqSolver.test.ts src/wave/SurfZoneSimulation.ts src/wave/surfForecast.ts src/scene/waterOptics.ts src/ui/SurfScreen.ts
git commit -m "feat: the Padang Padang bed: a platform, a 1:19 ramp to a shallow reef flat, an oblique crest line and a channel"
```

---

### Task 3: Its sea: swells, Practice, tides and winds

**Files:**
- Modify: `src/game/SurfConditions.ts` (`PADANG_SWELLS`, `SPOT_SWELLS`, `swellChoice`, `PADANG_TIDES`, `tideFor`, `PADANG_WINDS`, `windFor`, `physicalSettingsFor`)
- Modify: `src/game/PhysicalMode.ts` (`PADANG_PRACTICE_SWELL`, `practiceSwell`)
- Modify: `src/wave/ledgePeel.ts` (`rayAngleAt`)
- Test: `src/game/SurfConditions.test.ts`, `src/game/PhysicalMode.test.ts`, `src/wave/ledgePeel.test.ts`, `src/wave/Bathymetry.test.ts` (the design test)

**Interfaces:**
- Consumes: `PADANG` (Task 2), `ledgePeel`, `breakerDepthFor`, `edgeHeight`, `OFFSHORE_DEPTH`.
- Produces:
  - `PADANG_SWELLS: Record<'small' | 'medium' | 'big', SwellChoice>`;
  - `swellChoice(spot, swell)` reading `SPOT_SWELLS: Partial<Record<SpotName, Record<'small' | 'medium' | 'big', SwellChoice>>>`;
  - `PADANG_TIDES: Record<TideLevel, number>` and `tideFor(spot: SpotName, level: TideLevel): number`;
  - `PADANG_WINDS: Record<WindKind, number>` and `windFor(spot: SpotName, kind: WindKind): number`;
  - `PADANG_PRACTICE_SWELL: Readonly<SwellInput>`;
  - `rayAngleAt(input: LedgePeelInput, depth: number): number`: the ray's angle to the edge's normal at a still depth on the ramp, degrees.

- [ ] **Step 1: Write the failing tests**

`SurfConditions.test.ts` (import `PADANG_SWELLS`, `PADANG_TIDES`, `PADANG_WINDS`, `tideFor`, `windFor`):

```ts
  it('gives Padang Padang its own long-period swells, tides and winds', () => {
    const settings = physicalSettingsFor('padang', { swell: 'medium', tide: 'low', wind: 'offshore', time: 'midday' }, water);
    expect(settings).toMatchObject({
      source: 'buoy', significantHeight: PADANG_SWELLS.medium.significantHeight, peakPeriod: PADANG_SWELLS.medium.peakPeriod,
      directionDegrees: PADANG_SWELLS.medium.directionDegrees, tide: PADANG_TIDES.low, windSpeed: PADANG_WINDS.offshore,
    });
    for (const swell of Object.values(PADANG_SWELLS)) {
      expect(swell.significantHeight).toBeLessThanOrEqual(TANK_SWELL_LIMITS.height.max);
      expect(swell.peakPeriod).toBeGreaterThanOrEqual(16);
      expect(swell.peakPeriod).toBeLessThanOrEqual(TANK_SWELL_LIMITS.period.max);
    }
    // Bali's range (the Benoa gauge): lower and higher than the shared tides, within the Wave Lab's −1…1 m slider.
    expect(PADANG_TIDES.low).toBeLessThan(TIDES.low);
    expect(PADANG_TIDES.high).toBeGreaterThan(TIDES.high);
    for (const tide of Object.values(PADANG_TIDES)) expect(Math.abs(tide)).toBeLessThanOrEqual(1);
    for (const wind of Object.values(PADANG_WINDS)) expect(Math.abs(wind)).toBeLessThanOrEqual(12);
    expect(PADANG_WINDS.offshore).toBeLessThan(0);
    expect(PADANG_WINDS.onshore).toBeGreaterThan(0);
  });

  it('keeps every other spot on the shared tides and winds', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      for (const level of ['low', 'mid', 'high'] as const) expect(tideFor(spot, level)).toBe(TIDES[level]);
      for (const kind of ['offshore', 'calm', 'onshore'] as const) expect(windFor(spot, kind)).toBe(WINDS[kind]);
    }
  });
```

`PhysicalMode.test.ts` (import `PADANG_PRACTICE_SWELL`):

```ts
  it('practises Padang Padang on its own long-period groundswell', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'padang', source: 'practice' })).toEqual(PADANG_PRACTICE_SWELL);
    expect(PADANG_PRACTICE_SWELL.bandwidth).toBeLessThan(0.1);
    expect(PADANG_PRACTICE_SWELL.peakPeriod).toBeGreaterThanOrEqual(16);
  });
```

`ledgePeel.test.ts`:

```ts
  it('turns the ray toward the edge’s normal as the wave climbs the ramp (Snell along the edge)', () => {
    const omega = (2 * Math.PI) / design.period;
    const peel = ledgePeel(design);
    expect(rayAngleAt(design, design.shelfDepth)).toBeCloseTo(peel.crestToLedgeDegrees, 9);
    const sine = Math.sin((rayAngleAt(design, 3) * Math.PI) / 180);
    expect(sine / madsenSorensenCelerity(omega, 3)).toBeCloseTo(Math.sin((peel.crestToLedgeDegrees * Math.PI) / 180) / madsenSorensenCelerity(omega, design.shelfDepth), 12);
    expect(rayAngleAt(design, 3)).toBeLessThan(peel.crestToLedgeDegrees);
  });
```

`Bathymetry.test.ts`, inside `describe('Padang Padang')` (import `PADANG_SWELLS` from `../game/SurfConditions`, `OFFSHORE_DEPTH` and `edgeHeight` from `./SurfZoneSimulation`, `PEEL_SKILL_MINIMUM` from `./Breaking`):

```ts
    it('is designed to peel fast but makeable on the Small swell (phase matching)', () => {
      const small = PADANG_SWELLS.small;
      const config = { spot: 'padang' as const, seed: 1, significantHeight: small.significantHeight, peakPeriod: small.peakPeriod, directionDegrees: 0, spreading: 24, tide: 0 };
      const peel = ledgePeel({
        period: small.peakPeriod, deepDepth: OFFSHORE_DEPTH.padang, shelfDepth: PADANG.platformDepth,
        breakDepth: breakerDepthFor(edgeHeight(config), OFFSHORE_DEPTH.padang), swellDegrees: small.directionDegrees ?? 0, ledgeDegrees: PADANG.angle,
      });
      expect(peel.angleDegrees).toBeGreaterThanOrEqual(PEEL_SKILL_MINIMUM.professional);
    });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game/SurfConditions.test.ts src/game/PhysicalMode.test.ts src/wave/ledgePeel.test.ts src/wave/Bathymetry.test.ts`
Expected: FAIL (the new names are missing).

- [ ] **Step 3: Implement**

`SurfConditions.ts`:

```ts
/**
 * Padang Padang's own swells (the Padang Padang spec, decision 4): long-period SSW–SW groundswells (periods
 * often over 16 s) for faces of 2.5–3.5 / 3.5–4.5 / 4.5–6 m, arriving on its platform from the peak's side.
 * Heights from Komar & Gaughan inverted to the faces; provisional until the size report calibrates them.
 */
export const PADANG_SWELLS: Record<'small' | 'medium' | 'big', SwellChoice> = {
  small: { significantHeight: 1.6, peakPeriod: 16, spread: 0.2, directionDegrees: 20 },
  medium: { significantHeight: 2.2, peakPeriod: 17, spread: 0.2, directionDegrees: 20 },
  big: { significantHeight: 3, peakPeriod: 18, spread: 0.15, directionDegrees: 20 },
};

/** Spots with swells of their own; the rest take the shared buoy values. */
const SPOT_SWELLS: Partial<Record<SpotName, Record<'small' | 'medium' | 'big', SwellChoice>>> = { reef: REEF_SWELLS, padang: PADANG_SWELLS };
```

`swellChoice` becomes `return SPOT_SWELLS[spot]?.[swell] ?? SWELLS[swell];` (the Reef reads exactly as before).

After `TIDES` and `WINDS`:

```ts
/**
 * Padang Padang's tides, m (the Padang Padang spec, decision 5): Bali's spring range is about ±1.2 m (the Benoa
 * gauge's highest ranges, 2.3–2.46 m). Low is a normal low, where the best barrels are; provisional (the advisor's ruling).
 */
export const PADANG_TIDES: Record<TideLevel, number> = { low: -0.8, mid: 0, high: 0.9 };
/** A spot's tide for a level: Padang Padang's own, or the shared ones. */
export function tideFor(spot: SpotName, level: TideLevel): number {
  return (spot === 'padang' ? PADANG_TIDES : TIDES)[level];
}

/** Padang Padang's winds, m/s, positive onshore (decision 6): the dry season's SE trade offshore, the wet season's westerly onshore. Provisional until sourced. */
export const PADANG_WINDS: Record<WindKind, number> = { offshore: -5, calm: 0, onshore: 6 };
/** A spot's wind for a kind: Padang Padang's own, or the shared ones. */
export function windFor(spot: SpotName, kind: WindKind): number {
  return (spot === 'padang' ? PADANG_WINDS : WINDS)[kind];
}
```

Use the rulings' values if Task 1 sourced them. In `physicalSettingsFor`: `tide: tideFor(spot, conditions.tide)` and `windSpeed: windFor(spot, conditions.wind)`.

`PhysicalMode.ts`, below `REEF_PRACTICE_SWELL`:

```ts
/**
 * Padang Padang's practice groundswell: the Practice swell's narrow band and spread at a Padang Padang period,
 * from the peak's side, given at its platform edge, for faces of 2–2.5 m (the Padang Padang spec). It "works from
 * about 4 ft" (about 2.4 m faces), so this is its smallest honest size. Provisional until the size report.
 */
export const PADANG_PRACTICE_SWELL: Readonly<SwellInput> = { significantHeight: 1.5, peakPeriod: 16, spreading: 40, bandwidth: 0.08, directionDegrees: 20 };
```

`practiceSwell` becomes `return spot === 'reef' ? REEF_PRACTICE_SWELL : spot === 'padang' ? PADANG_PRACTICE_SWELL : PRACTICE_SWELL;`.

`ledgePeel.ts`:

```ts
/**
 * The ray's angle to the edge's normal where the still depth is `depth` on the ramp, degrees: the along-edge wave
 * number is conserved, so sin β / c(depth) = sin φ / c_shelf (Snell along the edge). Mead & Black's gradient is
 * the bed's slope along this ray: the ramp's steepest slope times cos β.
 */
export function rayAngleAt(input: LedgePeelInput, depth: number): number {
  const omega = (2 * Math.PI) / input.period;
  const { crestToLedgeDegrees } = ledgePeel(input);
  const sine = (Math.sin((crestToLedgeDegrees * Math.PI) / 180) * madsenSorensenCelerity(omega, depth)) / madsenSorensenCelerity(omega, input.shelfDepth);
  return (Math.asin(Math.min(1, Math.abs(sine))) * 180) / Math.PI;
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/game src/ui src/net src/wave/ledgePeel.test.ts src/wave/Bathymetry.test.ts`
Expected: PASS. The Reef's swell tests are unchanged.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/game/SurfConditions.ts src/game/SurfConditions.test.ts src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts src/wave/ledgePeel.ts src/wave/ledgePeel.test.ts src/wave/Bathymetry.test.ts
git commit -m "feat: Padang Padang's own long-period swells, Practice, tides and winds"
```

---

### Task 4: Its water: stage 2, its own tank, the take-off at the peak, the peel on its reef

**Files:**
- Modify: `src/wave/SurfZoneSimulation.ts` (`STAGE_2_ONLY`, `tankLayout`, `surfZoneSea`, the `PeelTracker`'s include)
- Test: `src/wave/SurfZoneSimulation.test.ts`, `src/game/SurfConditions.test.ts`

**Interfaces:**
- Consumes: `PADANG`, `padangReefAt`, `peakTakeOffX` (Task 2); `PADANG_SWELLS`, `PADANG_PRACTICE_SWELL`, `PADANG_TIDES` (Task 3).
- Produces: Padang Padang's `TankLayout`, whose edge is its platform. Its fine zone starts `SET_FINE_MARGIN` seaward of where its sets first break anywhere in the window, and its relaxation zone is at least `ZONE_WAVELENGTHS` of the edge wavelength long.

- [ ] **Step 1: Write the failing tests**

`SurfZoneSimulation.test.ts` (import `PADANG`, `padangReefAt` from `./Bathymetry`; `PADANG_SWELLS`, `PADANG_TIDES` from `../game/SurfConditions`; `PADANG_PRACTICE_SWELL` from `../game/PhysicalMode`; `SET_FINE_MARGIN`, `ZONE_WAVELENGTHS`, `edgeHeight` from `./SurfZoneSimulation`):

```ts
  it('runs Padang Padang on stage 2 whatever the config asks, forcing the solver’s own waves at its boundary', () => {
    expect(solverStage('padang', 1)).toBe(2);
    const padang = new SurfZoneSimulation({ ...small, spot: 'padang', stage: 1 });
    expect(padang.solver).toBeInstanceOf(BoussinesqSolver);
    const omega = padang.sea.components[0].omega;
    expect(padang.sea.components[0].k).toBeCloseTo(madsenSorensenWaveNumber(omega, padang.sea.depth), 10);
  });

  it('gives Padang Padang a tank on its platform whose fine zone reaches past its sets’ first break at every tide', () => {
    const bed = createSpot('padang', 1);
    const swells = [{ ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, ...Object.values(PADANG_SWELLS)];
    for (const swell of swells) {
      for (const tide of Object.values(PADANG_TIDES)) {
        const config: SurfZoneConfig = { ...small, spot: 'padang', alongShore: 160, tide, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod };
        const layout = tankLayout(config);
        expect(layout.edgeDepth).toBe(PADANG.platformDepth);
        const sets = Math.min(0.9 * (PADANG.platformDepth + tide), (SETS_OVER_TYPICAL * komarGaughan(swell.significantHeight, swell.peakPeriod)) / BREAKER_INDEX);
        for (let x = -80; x <= 80; x += 5) {
          let z = layout.shore;
          while (z > -2000 && bed.depthAt(x, z) + tide < sets) z -= 1;
          expect(z, `x ${x}`).toBeGreaterThanOrEqual(layout.fineFrom + SET_FINE_MARGIN - 1);
        }
        expect(layout.blendEnd).toBeLessThanOrEqual(layout.fineFrom - 20);
        expect(layout.zoneInner - layout.offshore).toBeGreaterThanOrEqual(ZONE_WAVELENGTHS * waveKinematics(swell.peakPeriod, layout.edgeDepth).wavelength - 1e-9);
      }
    }
  });

  it('finds Padang Padang’s break on its ramp inside the fine surf zone, and it plunges', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang', alongShore: 160, significantHeight: PADANG_SWELLS.small.significantHeight, peakPeriod: PADANG_SWELLS.small.peakPeriod });
    const point = simulation.breakPoint();
    const bed = (z: number) => tankDepth(simulation.spot, OFFSHORE_DEPTH.padang, point.x, z, simulation.tank);
    expect(point.z).toBeGreaterThan(simulation.tank.fineFrom);
    expect(bed(point.z)).toBeGreaterThan(PADANG.crestDepth);
    expect(bed(point.z)).toBeLessThan(PADANG.platformDepth);
    expect(simulation.iribarren().type).toBe('plunging');
  });

  // Review Focus 5.
  it('takes off at Padang Padang’s peak, where every swell breaks at every tide, never on the dry flat or in the channel', () => {
    const swells = [{ ...PADANG_PRACTICE_SWELL, heightAt: 'edge' as const }, ...Object.values(PADANG_SWELLS)];
    for (const swell of swells) {
      for (const tide of Object.values(PADANG_TIDES)) {
        const config: SurfZoneConfig = {
          ...small, spot: 'padang', alongShore: 160, tide, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
          ...('heightAt' in swell ? { heightAt: swell.heightAt } : {}),
        };
        const tank = tankLayout(config);
        const point = takeOffPoint(config);
        const depth = tankDepth(createSpot('padang', 1), tank.edgeDepth, point.x, point.z, tank) + tide;
        expect(point.x).toBe(PADANG.takeOffX);
        expect(padangReefAt(point.x)).toBe(true);
        expect(depth).toBeGreaterThanOrEqual(0.4 * breakerDepthFor(edgeHeight(config, tank.edgeDepth), tank.edgeDepth + tide));
        expect(depth).toBeLessThan(PADANG.platformDepth + tide);
      }
    }
  });

  it('measures Padang Padang’s peel on its reef only', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'padang', alongShore: 160 });
    const xs = simulation.solver.xCenters;
    for (let column = 0; column < xs.length; column += 1) expect(simulation.peel.measures(column)).toBe(padangReefAt(xs[column]));
  });
```

Add `'padang'` to "builds a finite, wave-filled surf zone for every spot and hands over before the set" and "keeps every layout ordered with a finite bed".

`SurfConditions.test.ts` (Review Focus 4):

```ts
  it('lets Padang Padang ask for the GPU when it raises the Fast tier’s stage', () => {
    expect(physicalSettingsFor('padang', DEFAULT_CONDITIONS, { stage: 1, compute: 'cpu' })).toMatchObject({ stage: 2, compute: 'auto' });
    expect(physicalSettingsFor('padang', DEFAULT_CONDITIONS, { stage: 2, compute: 'cpu' })).toMatchObject({ stage: 2, compute: 'cpu' });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts src/game/SurfConditions.test.ts -t "Padang|every spot|every layout"`
Expected: FAIL (stage 1 kept, today's tank, the peel counted everywhere).

- [ ] **Step 3: Implement**

`SurfZoneSimulation.ts`:
- `STAGE_2_ONLY: readonly SpotName[] = ['reef', 'padang'];`. Its comment gains Padang Padang: its 16–18 s swells steepen far too early on stage 1 too.
- In `tankLayout`, after the Reef's branch:

```ts
  // Padang Padang's edge is its platform (the Padang Padang spec). Its 1:19 ramp is wide, so the fine zone starts
  // SET_FINE_MARGIN seaward of where its sets first reach their breaker depth anywhere in the window (never deeper
  // than 0.9 of the platform's water: a bigger swell breaks at the ramp's foot), and the zone absorbs its long waves.
  if (config.spot === 'padang') {
    const spot = createSpot('padang', config.seed);
    const sets = Math.min(0.9 * (today.edgeDepth + config.tide), (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX);
    const reach = (config.alongShore ?? ALONG_SHORE) / 2;
    let setBreak = TANK.fineFrom + SET_FINE_MARGIN;
    for (let x = -reach; x <= reach; x += 5) {
      let z = TANK.shore;
      while (z > TANK_REACH && spot.depthAt(x, z) + config.tide < sets) z -= 1;
      setBreak = Math.min(setBreak, z);
    }
    const fineFrom = Math.min(TANK.fineFrom, setBreak - SET_FINE_MARGIN);
    const blend = TANK.blendEnd - TANK.zoneInner;
    const zoneInner = fineFrom - 20 - blend;
    const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
    return { offshore: zoneInner - zone, zoneInner, blendEnd: zoneInner + blend, fineFrom, shore: TANK.shore, edgeDepth: today.edgeDepth };
  }
```

- `surfZoneSea`: the wave numbers become `deeper || STAGE_2_ONLY.includes(config.spot) ? madsenSorensenWaveNumber : shallowWaterWaveNumber`. The Reef is already on the list, so it reads the same.
- The peel tracker's include becomes `config.spot === 'reef' ? (column) => reefLedgeAt(xCenters[column]) : config.spot === 'padang' ? (column) => padangReefAt(xCenters[column]) : undefined`. Its comment adds "Padang Padang's is its reef's, from the peak to the channel."

- [ ] **Step 4: Run the wave and game suites**

Run: `npx vitest run src/wave src/game src/physics`

For any failure outside the new tests, use superpowers:systematic-debugging. A test of another spot must not change (only Padang Padang's code paths moved).
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts src/game/SurfConditions.test.ts
git commit -m "feat: Padang Padang's water: stage 2, its own tank on its platform, the take-off at its peak"
```

---

### Task 5: The fifth spot everywhere

**Files:**
- Modify: `src/game/SurfConditions.ts` (`SURF_SPOTS`), `src/game/Logbook.ts` (`SPOTS`), `src/net/protocol.ts` (`SPOTS`), `src/ui/strings.ts` (`spot.padang`, `spot.padang.blurb`), `src/dev/waterSheet.ts` (`spot=padang`)
- Create: `scripts/padangShape.ts`
- Modify: `scripts/rideability-report.ts`, `scripts/catch-report.ts`, `scripts/ride-report.ts`, `scripts/tube-report.ts`, `scripts/whitewater-report.ts`, `scripts/size-report.ts`, `src/wave/sizeReport.ts` (default spot lists, `--padang`, `--swell`, each spot's own practice and direction; `UNGATED`)
- Test: `src/game/SurfConditions.test.ts`, `src/ui/SurfScreen.test.ts`, `src/ui/LogbookScreen.test.ts`, `src/game/Logbook.test.ts`, `src/net/protocol.test.ts`, `src/game/waveLab/labSettings.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `SURF_SPOTS` ending in `'padang'`;
  - `applyPadangShape(spec: string | undefined): void` (`scripts/padangShape.ts`);
  - `--swell small|medium|big` on the catch and ride reports (the spot's own `swellChoice`).

- [ ] **Step 1: Write the failing tests** (Review Focus 3)

- `SurfConditions.test.ts`: rename "offers all four spots…" to "offers all five spots, Padang Padang last", and expect `['beach', 'point', 'reef', 'canyon', 'padang']`.
- `SurfScreen.test.ts:8` and `LogbookScreen.test.ts:17` expect the same five ids.
- `protocol.test.ts`:

```ts
  it('accepts a Padang Padang room and still accepts every older spot', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon', 'padang']) expect(parseRoomSettings({ ...settings, spot })?.spot).toBe(spot);
  });
```

- `Logbook.test.ts` (its `memory` and `ride` helpers): a Padang Padang ride is kept and sets its bests, and a Logbook saved before this change still loads:

```ts
  it('keeps Padang Padang rides and still loads a logbook saved before it existed', () => {
    const before = new Logbook(memory({ [LOGBOOK_KEY]: JSON.stringify({ recent: [ride({ spot: 'reef' })], bests: {} }) }));
    expect(before.recent.map((entry) => entry.spot)).toEqual(['reef']);
    const storage = memory();
    new Logbook(storage).add(ride({ spot: 'padang', distance: 80 }));
    const reloaded = new Logbook(storage);
    expect(reloaded.recent[0].spot).toBe('padang');
    expect(reloaded.bests('padang').distance).toBe(80);
  });
```
- `labSettings.test.ts`:

```ts
  it('keeps a saved Padang Padang spot, and still falls back from an unknown one', () => {
    expect(sanitizeLabSettings({ physical: { spot: 'padang' } }).physical.spot).toBe('padang');
    expect(sanitizeLabSettings({ physical: { spot: 'bells' } }).physical.spot).toBe('canyon');
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/game src/ui src/net`
Expected: FAIL (four spots, `padang` rejected).

- [ ] **Step 3: Implement**

- `SURF_SPOTS`, `Logbook`'s `SPOTS` and `protocol`'s `SPOTS`: append `'padang'`.
- `strings.ts`, after the Canyon's lines:

```ts
  'spot.padang': 'Padang Padang',
  'spot.padang.blurb': 'Hollow left over sharp coral, Bali',
```

- `waterSheet.ts`:
  - accept `spot=padang`: `const SPOT = (['reef', 'beach', 'padang'] as const).find((spot) => spot === PARAMETERS.get('spot')) ?? 'point';`;
  - hold Padang Padang on an open tube as the Reef is held: the three `SPOT === 'reef'` tests become `SPOT === 'reef' || SPOT === 'padang'`. Update the comment's example to `?waterSheet&spot=reef` or `padang`.
- `scripts/padangShape.ts`:

```ts
import { PADANG } from '../src/wave/Bathymetry';

/** Reshape Padang Padang for a report run (its shape is read when a spot is built): `--padang angle=40,platformDepth=9`. */
export function applyPadangShape(spec: string | undefined): void {
  if (!spec) return;
  for (const pair of spec.split(',')) {
    const [key, value] = pair.split('=');
    if (!(key in PADANG)) throw new Error(`No Padang Padang parameter ${key}`);
    (PADANG as Record<string, number>)[key] = Number(value);
  }
}
```

- In the rideability, catch, ride, tube and size reports:
  - call `applyPadangShape(option('padang'))` beside `applyReefShape(option('reef'))` (add `option` where missing);
  - add `'padang'` to each default spot list;
  - also add it to the loops at `scripts/size-report.ts:93` and `src/wave/sizeReport.ts:121`.
- The catch and ride reports take `--swell small|medium|big`, which uses the spot's own swell:

```ts
/** `--swell small|medium|big`: each spot's own swell for that size (Padang Padang's and the Reef's are their own). */
const swellSize = option('swell') as 'small' | 'medium' | 'big' | undefined;
const swellAt = (spot: SpotName) => swellSize
  ? (({ significantHeight, peakPeriod, spread, directionDegrees }) => ({ significantHeight, peakPeriod, spreading: spreadingFor(spread), directionDegrees }))(swellChoice(spot, swellSize))
  : swellFor({ ...settings, spot });
```

  Keep `ride-report`'s `--height` override on top of it.
- `scripts/size-report.ts`: Practice runs take `practiceSwell(spot)`, and every run takes the spot's own direction:
  - `const directionFor = (spot: SpotName) => swellChoice(spot, 'medium').directionDegrees ?? settings.directionDegrees;`, used in `base(spot)`;
  - `{ ...base(spot), ...practiceSwell(spot), heightAt: 'edge' }` for Practice.

  The Beach, Point and Canyon read exactly as before. The Reef's runs change the next time it is rerun, to its own 20° and Practice; tell the Reef session.
- `src/wave/sizeReport.ts`: `UNGATED = ['reef', 'padang']` (it is judged against its own targets, not Komar–Gaughan's gate).

- [ ] **Step 4: Run the tests and build the scripts**

Run: `npx vitest run src/game src/ui src/net src/dev`

Then build each changed script once to catch type errors: `npx rolldown scripts/catch-report.ts -o <scratchpad>/check.mjs --format esm --platform node` (likewise for the ride, rideability, tube, whitewater and size reports).
Expected: PASS, and every script bundles.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc -b`, expecting no errors.

```bash
git add src scripts
git commit -m "feat: Padang Padang on the Surf screen, the Wave Lab, online rooms, the Logbook and the reports"
```

Then SendMessage the Reef session ("Waves, tubing, and Reef section") in one line: the size report now reads each spot's own Practice and swell direction (the Reef's 20° and its Practice when rerun).

---

### Task 6: The reef holds (stability, GPU parity, cost)

**Files:**
- Test: `src/wave/SurfZoneSimulation.test.ts`
- Create: `docs/research/padang-padang-report.md` (extended by Tasks 7–9)

- [ ] **Step 1: Write the tests** (Review Focus 1–2)

```ts
  describe('Padang Padang holds', () => {
    // Through the set's arrival: finite, never negative, no runaway (the Reef's once reached 112 m/s over a drained reef).
    const run = (overrides: Partial<SurfZoneConfig>, fastestAllowed = 20) => {
      const simulation = new SurfZoneSimulation({
        ...small, spot: 'padang', significantHeight: PADANG_SWELLS.big.significantHeight, peakPeriod: PADANG_SWELLS.big.peakPeriod,
        directionDegrees: PADANG_SWELLS.big.directionDegrees ?? 0, spreading: 24, alongShore: 160, dx: 1, fineSpacing: 1, ...overrides,
      });
      const { solver } = simulation;
      let finite = true;
      let fastest = 0;
      for (let frame = 0; frame < 45 * 30; frame += 1) {
        simulation.step(1 / 30);
        for (let i = 0; i < solver.h.length; i += 1) {
          finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0;
          if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
        }
      }
      expect(finite).toBe(true);
      expect(fastest).toBeLessThan(fastestAllowed);
      expect(solver.maxStableStep()).toBeGreaterThan(1e-3);
      return simulation;
    };

    it('stays finite and bounded under the Big swell, plunges, and peels left toward the channel', () => {
      const simulation = run({});
      expect(simulation.lipLaunches).toBeGreaterThan(0);
      // A left: seen from a surfer facing the beach, it runs to their left, toward +x and the channel (the advisor's check).
      expect(simulation.peelEstimate()?.direction).toBe(1);
    }, 600_000);
    // Review Focus 1: the lowest springs leave 5 cm over the reef flat.
    it('stays finite over the nearly dry reef flat at the lowest spring tide', () => run({ tide: -1.2 }, 30), 600_000);
    it('stays finite at high tide', () => run({ tide: PADANG_TIDES.high }), 600_000);
    // Review Focus 2: oblique swells across the level −x edge, at the sweep's extremes.
    it('stays finite with the most oblique swells across the open −x edge', () => {
      run({ directionDegrees: 0 });
      run({ directionDegrees: 35 });
    }, 1_200_000);
  });

  it('spins up the menu’s Padang Padang on the GPU tier’s sea without blowing up', () => {
    for (const seed of [1, 2, 3]) {
      const simulation = new SurfZoneSimulation({
        spot: 'padang', seed, significantHeight: PADANG_PRACTICE_SWELL.significantHeight, peakPeriod: PADANG_PRACTICE_SWELL.peakPeriod,
        heightAt: 'edge', directionDegrees: PADANG_PRACTICE_SWELL.directionDegrees ?? 0, spreading: PADANG_PRACTICE_SWELL.spreading,
        bandwidth: PADANG_PRACTICE_SWELL.bandwidth, tide: 0, componentCount: 64,
      });
      let finite = true;
      for (const value of simulation.solver.h) finite &&= Number.isFinite(value);
      expect(finite, `seed ${seed}`).toBe(true);
    }
  }, 600_000);
```

Import `PADANG_TIDES` from `../game/SurfConditions`. If a run exceeds its timeout on the loaded M1, run it alone before changing anything. If one run alone takes more than 10 minutes, keep the Big swell's probe at `dx: 1` and run the tide and direction probes at `dx: 2, fineSpacing: 2`, stating the change in the report.

- [ ] **Step 2: Run them**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "Padang Padang holds|menu’s Padang"`
Expected: PASS.

If one fails, use superpowers:systematic-debugging:
- find where and when it diverges (the level strip, the ramp, the flat, the channel, an open edge);
- check `maxStableStep` against the step taken.

A fix that keeps the sourced slope is fine (a stability bug, a boundary rule). Softening the bed is a design change: take it to the user under the stop rule.

- [ ] **Step 3: GPU parity in the browser**

1. From the worktree, check `lsof -iTCP:5193` is free, then run `npx vite --port 5193 --strictPort --host localhost` as a background task.
2. Open `http://localhost:5193/gpu-check.html?spot=padang` in the browser pane.
3. Read its report with `get_page_text`: CPU against GPU, the largest depth difference, and the breaking cells that disagree.

Expected: the agreement the other spots show. A hidden pane is slow but still correct for this page.

- [ ] **Step 4: Measure the cost**

Run `npm run report:rideability -- --spots padang --hs 1.6 --tp 16 --direction 20 --spread 0.2 --seeds 1 --periods 4 --out <scratchpad>/padang-cost.md`. Also run `--spots reef --hs 1.3 --tp 15 --direction 20 --spread 0.2` with the same seeds and periods, as the comparison, and compare the step ms. Run the two in parallel.

- [ ] **Step 5: Start the report and commit**

Create `docs/research/padang-padang-report.md` with a "Stability" section: the probes, the GPU check's numbers, the step cost against the Reef's, and the commands.

```bash
git add src/wave/SurfZoneSimulation.test.ts docs/research/padang-padang-report.md
git commit -m "test: Padang Padang holds under the Big swell, at the lowest spring tide and across the open edge"
```

---

### Task 7: The design sweep

**Files:**
- Modify: `docs/research/padang-padang-report.md` (the sweep), `docs/research/padang-padang-sources.md` (rulings)
- Modify: `src/wave/Bathymetry.ts`, `src/game/SurfConditions.ts`, `src/game/PhysicalMode.ts` (the winning values)

- [ ] **Step 0: Report the share of waves too fast to make**

The advisor (2026-09-28): a rider needs the break point's speed, and GPS-tracked competitive surfers peak at 9.3 m/s on average and 12.5 m/s at most (Farley, Harris & Kilding 2012). In `src/wave/Rideability.ts`:
- add `export const FASTEST_SURFER = 12.5;` with that source;
- add to `RideabilityStats`: `/** Share of clean waves whose break point outruns the fastest measured surfer (FASTEST_SURFER), 0–1 (NaN without speeds). */ fastShare: number;`;
- compute it from the clean waves' `peelSpeed`s.

Test first, in `Rideability.test.ts`:

```ts
  it('reports the share of clean waves that outrun the fastest measured surfer', () => {
    const stats = rideability([
      { angleDegrees: 35, fit: 0.9, peelSpeed: 10 },
      { angleDegrees: 25, fit: 0.9, peelSpeed: 14 },
      { angleDegrees: 30, fit: 0.9, peelSpeed: 13 },
      { angleDegrees: 20, fit: 0.1, peelSpeed: 40 },
    ]);
    expect(FASTEST_SURFER).toBe(12.5);
    expect(stats.fastShare).toBeCloseTo(2 / 3, 12);
    expect(rideability([{ angleDegrees: 35, fit: 0.9 }]).fastShare).toBeNaN();
  });
```

Run `npx vitest run src/wave/Rideability.test.ts` and see it fail, then implement it and see it pass. Add a "Faster than 12.5 m/s" column to `scripts/rideability-report.ts` (`percent(stats.fastShare)`) after the peel-speed column and in its header rows. Commit: `feat: report the share of waves that outrun the fastest measured surfer`.

- [ ] **Step 1: Screen the candidates with the predictor**

With a scratch script over `ledgePeel` and `rayAngleAt` (bundled with rolldown into the scratchpad), tabulate every combination of:
- `platformDepth` in {8, 9, 10, 12} m;
- `angle` in {25, 35, 45}°;
- direction in {10, 20, 30}°;

at each Padang Padang swell. Use `deepDepth = shelfDepth = platformDepth` and the breaking depth from `breakerDepthFor(edgeHeight(...), platformDepth)`. Show:
- the predicted peel speed and α;
- the ray's angle at breaking, β_b (`rayAngleAt` at the breaking depth);
- the ramp slope that gives a 1:19 orthogonal gradient at the Medium swell: `(1 / 19) / cos β_b`.

Keep candidates that meet both:
- a predicted α of 30–40° on the Small and Medium swells. This is the advisor's target, a ruling in the ledger: a median near 27° would leave most of the wave unmakeable at the speeds surfers reach;
- `platformDepth ≥` the Big sets' breaking depth plus 1 m (Mead & Black's band stays on the ramp).

- [ ] **Step 2: Run the kept candidates in the solver**

For each kept candidate (its ramp slope from Step 1):

`npm run report:rideability -- --spots padang --hs 1.6 --tp 16 --direction <dir> --spread 0.2 --seeds 2 --periods 12 --padang platformDepth=<p>,angle=<a>,rampSlope=<s> --out <scratchpad>/sweep-<p>-<a>-<dir>.md`

Run up to four in parallel. Record the median peel angle and speed, the close-out and mixed shares, lip launches and step ms.

- [ ] **Step 3: Check catching on the top three**

For the three best by the rule in Step 4:

`npm run report:catch -- --practice --ghosts --spots padang --seeds 2 --minutes 3 --direction <dir> --padang platformDepth=<p>,angle=<a>,rampSlope=<s> --out <scratchpad>/catch-<p>-<a>-<dir>.md`

Also run the same with `--swell medium` in place of `--practice`, and `npm run report:ride -- --practice --ghosts --spots padang --seeds 2 --minutes 3` with the same shape.

- [ ] **Step 4: Choose by the rule**

A candidate qualifies when:
- all its runs stay finite;
- its measured median peel angle is 30–40° on the Small swell (the advisor's target: sections may drop to about 27°);
- its close-out share (clean waves under 27°) is ≤ 50 %;
- report its `fastShare` beside the others (not a gate);
- on Practice and on the Medium swell, the catch report stands riders at least as often per attempt as the Reef's Part A report (14 of 871 on its Practice).

Among qualifiers, the most rides of 3 s or more wins. Ties go to the design closest to the rulings' starting point (10 m, 35°, 20°).

**Stop rule:** if none qualifies, stop. Bring the user the sweep table and the options: a shallower platform than any source supports, a swell direction beyond the sourced SSW–SW, a wider window, or accepting a faster peel (true to life if the sources say Padang Padang is faster than the target).

- [ ] **Step 5: Check the choice with the advisor, then set it**

1. SendMessage "Water physics research" the table and the choice, and fold in its answer.
2. Put the winner's `platformDepth`, `angle` and `rampSlope` in `PADANG`, and its direction in `PADANG_SWELLS` and `PADANG_PRACTICE_SWELL`.
3. Update the rulings rows (the sweep's choice).
4. Add the sweep table, the choice and the advisor's answer to the report.
5. Run `npx vitest run src/wave src/game`: the design, tank and take-off tests must still pass.

```bash
git add src docs
git commit -m "feat: Padang Padang's platform, reef angle and swell direction, chosen by the peel and catch sweep"
```

---

### Task 8: Sizes: the faces, Practice and the forecast

**Files:**
- Modify: `src/game/SurfConditions.ts` (`PADANG_SWELLS` heights), `src/game/PhysicalMode.ts` (`PADANG_PRACTICE_SWELL`), `src/wave/surfForecast.ts` (`SURF_FORECAST.padang`, `PRACTICE_SURF.padang`), `src/wave/SurfZoneSimulation.ts` (`TAKE_OFF_INDEX.padang`)
- Create: `docs/research/sizes/padang*.json` (the size report's runs)
- Modify: `docs/research/size-report.md`, `docs/research/padang-padang-report.md`, `docs/research/padang-padang-sources.md`
- Test: `src/wave/surfForecast.test.ts` (add `'padang'` to both spot loops)

- [ ] **Step 1: Measure**

Run in parallel processes, each with its own tag, to spread the M1's load:
- `npm run report:sizes -- --spots padang --heights 1.6 --periods 16 --tag small`
- `npm run report:sizes -- --spots padang --heights 2.2 --periods 17 --tag medium --no-practice`
- `npm run report:sizes -- --spots padang --heights 3 --periods 18 --tag big --no-practice`

Use the heights in `PADANG_SWELLS`.

- [ ] **Step 2: Practice first (the advisor's flag)**

If Practice's measured faces are below 2 m, or its catch report (Task 7) shows no clean break:
- try Practice at 2.4–3 m faces;
- if that still doesn't break cleanly, SendMessage the advisor and tell the user that Practice Padang Padang is marginal, which is true to life.

- [ ] **Step 3: Calibrate**

Adjust only each swell's height (keep the periods) until its measured take-off H1/3–H1/10 lies in the target band:

| Swell | Target faces |
|---|---|
| Practice | 2–2.5 m |
| Small | 2.5–3.5 m |
| Medium | 3.5–4.5 m |
| Big | 4.5–6 m |

Stop after three rounds, and report what remains.

- [ ] **Step 4: Fit the forecast and the take-off**

- Run `npm run report:sizes -- --summary`, and copy Padang Padang's printed fit into `SURF_FORECAST.padang` and its Practice into `PRACTICE_SURF.padang`.
- Set `TAKE_OFF_INDEX.padang` so the take-off's z matches the Small swell's median set-break z within 15 m (`TAKE_OFF_TOLERANCE`).
- Add `'padang'` to both loops in `surfForecast.test.ts`.

Run: `npx vitest run src/wave/surfForecast.test.ts src/wave/SurfZoneSimulation.test.ts src/game`
Expected: PASS.

- [ ] **Step 5: Commit**

Update the rulings: the swells are now "calibrated on the size report".

```bash
git add src docs
git commit -m "feat: Padang Padang's faces calibrated on the size report, and its forecast fitted"
```

---

### Task 9: Reports, roadmap and the PR

**Files:**
- Modify: `docs/research/padang-padang-report.md`, `ROADMAP.md`

- [ ] **Step 1: Padang Padang's reports**

Write each to the scratchpad and summarise it in the report:
- `npm run report:rideability -- --spots padang --hs <small Hs> --tp 16 --direction <dir> --spread 0.2 --seeds 2 --periods 12`, and the same for Medium and Big;
- `npm run report:catch -- --practice --ghosts --spots padang --seeds 2 --minutes 3`, and with `--swell medium`;
- `npm run report:ride -- --practice --ghosts --spots padang --seeds 2 --minutes 3`;
- `npm run report:tubes -- --practice --spots padang` (the tube baseline before Part B).

For each swell, the report gives:
- the predicted and measured peel speed and angle, and the close-out share;
- the ride's length along the reef, against 50–150 m, and how many barrel sections were counted;
- the tube's width over length from the tube report, against Mead & Black's Padang Padang ratio of 1.97–2.14. State plainly that the gradient was inferred from that ratio, so this checks the bed, and that Part B's simulated profiles give the independent check;
- the orthogonal gradient the waves climb (the design's β_b), against 1:18–1:20;
- how far the ride stays from each open edge. ADR 0004 asks for a wavelength (about 150 m at 16 s on the platform), which a 160 m window cannot give any spot; the report says so, with the side feed and a wider window as the ways to get closer.

- [ ] **Step 2: The reference clip (the spec's judging)**

Search for a public clip of Padang Padang at 6–10 ft (for example a Rip Curl Cup heat), and note its link in the report as the proposed reference for Part B's film. Send it to the user for approval in the final message; don't download it.

- [ ] **Step 3: ROADMAP**

Update the "Padang Padang and the swept barrel" section:
- Part A's status: the chosen design, its numbers, and what is open;
- Part B still `Backlog`, with its open question.

- [ ] **Step 4: Verify and open the PR**

Run: `npx vitest run --dir src`, then `npx tsc -b`, then `npm run build`
Expected: all pass. Report the test count.

```bash
git add docs ROADMAP.md
git commit -m "docs: Padang Padang Part A's reports and roadmap"
```

```bash
git push -u origin claude/padang-padang
```

```bash
gh pr create --title "Padang Padang, Part A: the spot" --body-file <scratchpad>/pr-body.md
```

The PR body covers:
- what changed: the bed, the sea, the tank, stage 2, the fifth spot everywhere;
- the sweep's choice and its numbers;
- the stability and GPU checks;
- the cost against the Reef;
- the advice taken from "Water physics research";
- what Part B brings.

It ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Report the link, bind it with the ccd_pr tools, and leave the merge to the user.
