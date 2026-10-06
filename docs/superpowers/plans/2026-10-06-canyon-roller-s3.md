# Canyon Roller Lens (S3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each Canyon wave carries a white roller lens on its broken face, behind the spilling front. Both looks draw it, and the rider meets it through the water sample: a board bogs in its froth and is pushed toward the beach.

**Architecture:**
- A worker-side `SpillingRoller` reads the solver and the `SpillingFront` after each step, and never writes either.
- Per column, it reads the solver's surface (crest, trough, toe, H, the bore's Froude number), runs each lens's life and keeps a small lens table.
- Three readers share that one table:
  - the rider's water sample (`PhysicalSurfWater`: the lens's top, air and flow);
  - the render node heights (the lens's top);
  - a small texture both water looks draw the band from.
- The roller's state travels in the sea handover, with the front's waves.

**Tech Stack:** TypeScript, three.js (GLSL ES 3.00), vitest, rolldown report scripts, the dev water sheet.

**Spec:** `docs/research/canyon-spilling-2026-10-05/README.md`, section "Next step: S3". The owner's decisions are in `docs/superpowers/handoffs/2026-10-05-canyon-spilling.md`, and the owner closed S2 as it stands on 2026-10-06.

**Sources**, cited in short:
- **R**: `docs/research/water-physics/roller.md`.
- **RB**: `docs/research/water-physics/roller-build.md`.
- **R3 §n**: `docs/research/water-physics/notes/round3-whitewater-build/roller-build.md`, the advisor's build recipe. Most numbers below come from it.
- **(P)**: provisional. A mid-range or engineering choice, to revisit once measured.

## Global Constraints

- **Read only.** The roller reads the solver and the front and never writes them. It never feeds back into the water (R3 §3.4). Boards still push the water through their existing reactions.
- **The Canyon only** (`SPILLING_SPOTS`):
  - Every other spot keeps its water, its look and the P11 `ROLLER_SHARE` push until S4.
  - No lip and no tube (S2).
  - The roller is the active front of the spread, not a new stage of the wave's life (owner, 2026-10-05: forming → tube → spread).
- **One water.** The lens's top goes into the render node heights, so what is drawn is what is hit, in Classic and in Rich (owner, 2026-09-29: Classic draws the roller).
- **Air.** ᾱ = 0.25. Aerated water behind the roller does not raise the surface (owner, 2026-09-29).
- **Decision paths** (thresholds, states, geometry) use only `+ − × ÷`, `Math.sqrt`, `Math.floor`, `Math.min`/`Math.max`, `Math.imul` and `>>>` (R3 §3.4). A source-regex test enforces this, as `src/wave/barrel/crashCurve.test.ts:199-201` does.
- **Handover state** rides in the JSON header (exact doubles, `null` for NaN), never in `arrays`, which travel as float32.
- **Off switches:** `roller: false` in the config, `&roller=0` in the water sheet. `spillingFront: false` also turns the roller off. Off restores the P11 push.
- **Performance** is measured, never a gate. The target is the M4 Pro; the M1 is reported.
- English only. No downloads.

## Review Focus

1. **A dropped wave.** The front drops a wave 45 s after its first onset, or when a ninth wave starts, while its roller may still break inshore. The lens must stay; it must not blink out. Tested in Task 1.
2. **The swash.** On the beach face h₁ → 0. The lens must never reach below the bed, and must shed when its crest stalls. Tested in Task 1.
3. **A late joiner mid-peel.** The joiner must get the donor's lenses at once and continue step for step. Tested in Task 5.
4. **The front switched off** (`spillingFront: false`, `&spillingFront=0`). No roller, and the P11 push comes back. Tested in Tasks 2 and 3.
5. **Another render spacing** (`?renderSpacing=2`). The rise in the node heights must still equal what the board samples. Tested in Task 3.

---

## 1. The goal

**What the player sees.** As each Canyon wave peels left to right, a band of white water appears on the broken face.
- It runs from the crest to a ragged, fingered toe, brightest along the crest.
- It travels toward the beach with the bore.
- It is about 2–3.5 H wide, 3–6 m at Medium.
- It grows out of the thin crest line S2 already draws, and fades in behind the visible front over a 5 m shoulder.
- It leaves the foam field's lace behind it. The shoulder ahead of the front stays clean and green.

**What the rider feels**, and only through the water sample:
- A board in the band sinks into its froth: it bogs.
- The band pushes toward the beach at about 330·H Pa. On a prone rider at H = 1.5 m that is about 250 N, about the pull of gravity down a 19° face (R, R3 §3.1).
- Prone riders are carried no faster than the bore, about 5–6 m/s at H = 1.5 m. Below the lens they fall behind.
- A paddler punching through takes 1.4–2.8 kN for about half a second (R3 §3.1).
- Falls use the existing wipeout.

## 2. The roller's model (`src/wave/SpillingRoller.ts`)

**Where a lens lives.**
- Each column holds up to two lenses.
- The slot is the front wave's `id` mod 2 (P). One wave then keeps the same slot all along its crest, and two waves in a row never collide.
- **Seeding.** A lens is seeded from that wave's crest in that column: `SpillingFront.crestAt(k, column)`, the first breaking cell the wave owns there, whether or not its front has reached the column.
- **Tracking.** After seeding, the lens follows its own crest: the nearest η maximum within ±2 m (P) of z_c + c·dt. It therefore outlives the front's 20 m band.

**The section, each step** (R3 §1.1, its "lite" analysis):
- **Sampling.** η and h are sampled along the column every 0.5 m, from z_c − max(10 m, 4H) to z_c + max(10 m, 6H), linear between rows.
- **Crest and trough** (z_c, z_tr): the nearest η maximum behind the steepest point and the nearest minimum ahead of it (Tissier 2012). Each is refined by a parabola.
- **Toe z_t:** the first point past the steepest one where −∂η/∂z falls to 0.2 of its peak (Martins 2018).
- **Height and Froude number:**
  - H = η(z_c) − η(z_tr); h₂ = h(z_c); h₁ = h(z_tr); r = h₂/h₁.
  - F = r(r + 1)/2 = Fr₁², compared with squared thresholds, so no square root is needed.
- **B_front:** the solver's largest `breaking.strength` between z_c and z_t, ungated.
- **Crest normal n̂:** from the neighbouring columns' z_c. Lengths and speeds measured along z are projected onto it (× n̂_z).
- **Speed c:** the tracked crest speed along n̂, relaxed over 0.3 s (R3 §1.1). It starts at √(g·h_b) (P).

**Life** (R3 §1.4; the Froude thresholds are Tissier 2012, after Chanson 2008):

| Stage | Rule |
|---|---|
| Birth | B_front ≥ 0.3 and F ≥ 2.1025 (Fr₁ ≥ 1.45) |
| Growth | travel s += c·dt from birth; g = φ = min(1, s / (6.5 h_b)) (5–8 h_b, Svendsen 1984; 6.5 is P) |
| Shedding | starts when one of these holds for ≥ 0.2 s: F < 1.69 (Fr₁ < 1.3), B_front < 0.1, or the crest is lost. Then g ← g·(1 − dt·w_b/t_c), with w_b = 0.25 m/s (`AERATION.riseSpeed`). Gone below g = 0.01 (P) |
| Rebirth | the birth rule again (re-breaking). Growth resumes from the current g (s = g·6.5 h_b), so g never jumps (P) |
| Swash | h₁ < 0.1 m or a dry toe cell: the lens is cut to t ≤ ½ the local depth, and it sheds once c < 0.5 m/s (both P, R3) |

**Shape** (R3 §2.1). Here ξ = (z − z_c)·n̂_z / L_r runs from 0 at the crest to 1 at the toe.
- **Length L_r** = w·L_m + (1 − w)·H / tanθ_s, relaxed over 0.3 s (P):
  - L_m = (z_t − z_c)·n̂_z is the measured length.
  - w = min(1, L_m / 4 m) is Bacigaluppi's guard for under-resolved bores (R3 §1.3).
  - tanθ_s runs from tan 25° = 0.4663 at birth to tan 18.5° = 0.3346 when developed, linear in φ (Martins 2018 gives 25° → 18–19°; the ramp is P).
  - So the stage length goes from 2.14 H to 2.99 H (brief: 2.1 H, growing to 2.5–3.5 H).
- **Crest thickness:** t_c = 4K·H² / [π(1 − ᾱ)·L_r], with K = 0.345 (Martins 2018: 0.33–0.36; the middle is P).
  - That is 0.27 H at birth and 0.20 H developed.
  - The water the lens holds is K·H² by construction (see Q2).
- **Thickness profile:** t(ξ) = g·t_c·√(1 − ξ²), a quarter ellipse, thickest at the crest (provisional in R3). Behind the crest it tapers as g·t_c·(1 − (ξ/0.3)²) for −0.3 ≤ ξ < 0 (Duncan's wake; P).
- **Top**, the surface that is drawn and hit: η + ᾱ·t. At the crest and at g = 1 that is 0.05–0.07 H, or 7–10 cm at H = 1.5 m.
- **Underside:** η − (1 − ᾱ)·t, which is 0.15–0.20 H under η at the crest, at g = 1.
- **Air:** α(y) = 0.9·ζ^2.6, with ζ = (y − underside)/(top − underside) and N = 0.9/ᾱ − 1 (Shi et al. 2023b). Its mean is 0.25, and α > 0.28 in the top 36 %.

**Along the crest**, per slot (R3 §1.6):
- Gaps under 4 m between live runs are closed by interpolating the runs' ends.
- Runs under 4 m are neither drawn nor felt.
- g changes by at most 0.2 per metre. Since g is 0 outside a run, every run fades in over 5 m at its ends: R3's 3–5 m shoulder.

**The front's mask** decides where a lens is drawn and felt (Q1). It uses the lens's wave, its `reached` time in the column, and a = time − max(reached, joinedAt), as S2's ramp does.
- **Not reached:** masked. The lens's life goes on underneath, so a column the front reaches late gets a developed lens, not a newborn one.
- **For a < 1.5 s**, S2's ramp (`SPILLING_FRONT_DEFAULTS`) applies:
  - L_eff = min(L_r, 1.5 m + 5 m/s·a);
  - g_eff = g·(0.35 + 0.65·a/1.5).

  The lens spans L_eff but keeps the t_c of L_r. So the band grows down the face from S2's thin crest line, together with the foam.
- **A wave the front has dropped** counts as reached.
- **Open edges:** no lens in the open-edge columns (`OPEN_EDGE_COLUMNS`, `SurfZoneSimulation.ts:150`).

**The table** is Float64 in the worker, with a Float32 copy for the GPU. It holds 8 values (2 RGBA texels) per slot and column:
- z_c, L_eff/n̂_z, g_eff and t_c;
- c·n̂_x and c·n̂_z;
- h₁ and d′max, the toe's roughness (§4).

When x falls between two columns, an empty neighbour contributes g = 0 and the live column's geometry.

## 3. What the rider feels

The lens only changes what `PhysicalSurfWater` returns (R3 §3.2–3.3). There are no new force terms.

**What the sample returns:**
- **Top.** `nodeHeight` (`PhysicalSurfWater.ts:145`) adds `roller.riseAt(x, z)`.
  - `sampleAt().surfaceY` and `surfaceAt()` (:368) are two separate code paths, but both build on the nodes, so both get the rise.
  - Both then equal the snapshot's node heights exactly.
- **Air.** Inside a lens, `voidFraction = max(α_lens(ζ), plume)`, so the air is not double-counted (R3 §3.3).
  - The plume's 0.2 cap (`AERATION.peak`) does not apply to the lens.
  - The air reaches the hull's buoyancy, planing and friction (`hullForces.ts:160`), the rider's body parts and paddling hands (`AttachedRider.ts:1832`), and the wiped-out body (`DetachedSurfer.ts:564`, through `SurfWaterBodyField`).
  - Fins and rails ignore α (`finForces.ts:107`, `BoardBody.ts:601`), as they do today.
- **Flow.** Inside a lens, the horizontal flow is ū + S(ζ)·g_eff·(c·n̂ − ū), with S = smoothstep(0, 0.3, ζ).
  - The bottom 30 % is a shear layer (Misra 2008); above it the water moves at c (R3 §3.2).
  - The vertical part is unchanged.
  - Below the lens, and in breaking water outside any lens, the flow is the depth-averaged current ū.

**Where it replaces the P11 push:** `PhysicalSurfWater.ts:344-353`, the `out.breaking > BORE` branch (`ROLLER_SHARE`, `MIN_ROLLER_FLOW`, `ROLLER_SHOREWARD`).
- When the water has a roller (`options.roller`, which `forSimulation` sets at the Canyon), the branch keeps `regime = 'bore'` but skips the carry. The lens supplies the flow instead.
- At every other spot the branch is unchanged.

**What else reads the pushed flow:**
- No production code reads `regime`.
- The flow reaches:
  - the board's hull, fins and rails (`BoardBody.ts:557-606, 738-780, 1016-1049`);
  - the rider's body and hands (`AttachedRider.ts:1709-1743, 1828-1838`);
  - the stand and planing checks (`AttachedRider.ts:1079-1083, 1507-1515`);
  - the board's start velocity (`RideSession.place`, which also shifts the Surf School's recorded starts);
  - the wiped-out body, through `SurfWaterBodyField`.
- `src/physics/testing/BoreWater.ts` copies the P11 rule for `duckDiveBore.test.ts`. It stays: it stands for the spots that keep P11.
- `PhysicalBodyWaterField` is built only by its own test, so it is left alone.

**`breaking` in the sample** stays the solver's (`forSimulation`, :278) unless Q1 rules otherwise.
- With Q1's recommendation, the Canyon passes the front's *felt* mask instead: the solver's B behind each front and in cells no wave owns, 0 ahead of the fronts, with no ramp.
- That puts the remaining `breaking` readers on the visible front too:
  - the hold-down (`DetachedSurfer.ts:583, 609-616`);
  - the curl and broken-water readers (`waveFrame.ts:216-241`, and `rideAnalysis` through `SurfZoneRunner.ts:711-716`);
  - the duck-dive goal and the HUD.

## 4. How it's drawn

**Height.**
- The worker's `writeUniformSnapshot` adds the lens's top to the node heights.
- Both looks, the host's `heightAt` and the board then share it, so the online lift and remote boards sit on the band too. No shader changes for this part.

**The band.**
- **Table to the GPU.** The table travels as a new snapshot buffer, `roller`, the way `tubes` does.
- **Upload.** It becomes an RGBA32F texture, `waterRoller` (columns × 4 rows), uploaded in **both** looks. Aeration and tubes are uploaded in Rich only.
- **Shading.** A new GLSL chunk evaluates each slot per fragment, interpolating between the two nearest columns in x. It exits early outside ξ ∈ [−0.3, 1.3].
  - Coverage = g_eff · smoothstep(1, 0.75, ξ) · toeMask · holes (R3 §4).
  - Brightness is the look's foam colour at the crest, falling to 0.40/0.55 of it at the toe (Haller & Catalán 2009; Dierssen's 0.40–0.55; the linear ramp is P).
- **The toe** (R3 §2.4):
  - It wanders by A_toe = 1.5·d′max (1–2 d′max; the middle is P), in two octaves at 1 h₁ and 7.5 h₁ (5–10 h₁; the middle is P), at 0.4× the surface's rate.
  - d′max = 0.155 h₁ at Fr₁ = 1.5 and 0.35 h₁ at Fr₁ = 1.9, linear between, clamped to 0.13–0.4 h₁. These are Wang, Leng & Chanson 2017's mid-ranges; the owner ruled mid-range.
  - Fingers live 0.4–0.6 s and holes 0.3–0.4 s at h₁ = 1.5 m, scaled with √h₁.
  - The noise is pcg3d value noise (Jarzynski & Olano 2020), with a TS twin for the tests.
  - In S3 the toe is look-only: the felt lens keeps a smooth toe, where it is thin anyway (Q5).
- **Behind the crest** (ξ = −0.3…0), the band cross-fades into the foam field's look. That is where the foam field takes over.

**Classic.**
- `CLASSIC_FOAM` (`src/scene/waterOptics.ts:189`) takes cover = max(cover, coverage) in the band's colour ramp.
- The crest light dims under it, as it does under foam (:221).
- The Classic snapshot (`src/scene/__snapshots__/waterLooks.test.ts.snap`) changes on purpose.

**Rich.**
- `RICH_FOAM` (`src/scene/water/richWaterGlsl.ts:84`) does the same.
- Where coverage is low it adds the bubbly green-cyan tint, through `waterFreshness` with the lens's α at its top.
- It adds the churn's micro-normals.
- It advects the band's foam texture by c·n̂, not by the current, so the texture travels with the roller (R3 §4).

**Not in S3:**
- spray from the toe and crest lines (R3 §4);
- displacing the collided surface by the toe's roughness (Q5).

**Expected cost**, measured in Task 6:
- worker: about 0.07 ms per step for the sections (R3 §5, an M1 under load), plus the lens states;
- snapshot: about 10 KB more per frame (160 columns × 2 slots × 8 float32);
- GPU: up to 8 texel fetches and two pcg3d octaves per fragment near a lens, nothing elsewhere;
- board: about 1 µs more per contact query (R3 §3.3).

## 5. Online

**What travels.** A new header key, `spilling: { front: SpillingFrontState; roller: SpillingRollerState }`, in `SurfZoneState` (`src/wave/surfZoneState.ts:9-20`).
- It must also be added to the header's explicit key list in `encodeSurfZoneState` (:33-34). Otherwise it silently vanishes on the wire, and in-process tests would not notice.
- **Front:** `started`, plus each wave's:
  - `id`, `onset`, `startX`, `frontX`, `tipX`, `backX` and `lastJoin`;
  - `reached`, `joinedAt` and `joinedZ` as number arrays, with `null` for NaN (as `LipState` and `FrontState` do).
- **Roller**, live entries only, each with:
  - column, slot and wave id;
  - state, birth time and travel;
  - the shed-hold timer;
  - g, c, L_r and the tracked z_c.

  H, F, n̂, t_c and the table are recomputed on the next step.
- **Size:** at most 3,840 front numbers plus about 320 × 11 roller numbers, a few tens of KB of JSON before deflate. For comparison, the Canyon's arrays are about 1.7 MB, and the limit is `MAX_SEA_BYTES` (8 MB).
- **Why the header:** `reached` and z_c feed threshold comparisons, so they must arrive as exact doubles. `arrays` travel as float32.

**Compatibility.** A donor without `spilling` (an older build, or a stored lesson sea) leaves a fresh front and no lenses. The lenses come back with the next onsets, about a period later; that is today's behaviour. In production, rooms are pinned to a build.

**Determinism.**
- The new module follows the decision-path rule.
- `SpillingFront.speedCap` loses its `Math.sin` for a Taylor-series sine, and the regex test covers `SpillingFront.ts` too.
- Left as they are: the sea's own stepping already uses `pow`, `sin`, `exp` and `hypot` (`breakerCelerity`, the boundaries, foam and aeration). Seas on different machines therefore stay within the drift gate, not bit-identical.

**Remote players.**
- They are drawn at the local surface plus their lift, and the lift is measured against the host's snapshot `heightAt`. The rise is in both, so their boards sit on the band.
- The roller changes how each owner's board moves, and so the pushes it sends. It does not change how others' pushes land (`applyRemoteReaction`).

## 6. The tasks

Run `npx vitest run` after each task. Commit after each task, ending the message with the attribution line.

### Task 0: Baselines (S2 as closed)

- [ ] Before any change, run each report below and keep its output under `.superpowers/s3/` (git-ignored). The numbers become the "before" column of the README's S3 section.
  - `npm run report:catch -- --spots canyon --direction 0 --spreading 150 --seeds 2 --minutes 3 --exposure --out .superpowers/s3/catch-s2.md`
  - `npm run report:ride -- --spots canyon --direction 0 --spreading 150 --practice --seeds 2 --minutes 3 --out .superpowers/s3/ride-s2.md`
  - `npm run report:duckdive -- --spot canyon --out .superpowers/s3/duckdive-s2.md`
  - `npm run report:holddown -- --spot canyon --out .superpowers/s3/holddown-s2.md`
  - The peel report, Medium, 3 seeds × 14 periods (command in the Canyon README).

### Task 1: The roller model

**Files:**
- Create `src/wave/SpillingRoller.ts` and `src/wave/SpillingRoller.test.ts`.
- Modify `src/wave/SpillingFront.ts` and `src/wave/SpillingFront.test.ts`.

**Interfaces it produces:**

```ts
// SpillingFront
interface SpillingWave { readonly id: number; /* = started at creation */ … }
crestAt(wave: number, column: number): number; // this step's first owned breaking cell's z, reached or not; NaN if none
update(time, dt, breakerCelerity, strength, out: Float64Array, felt?: Float64Array): void; // felt: B behind fronts and unowned, 0 ahead
// SpillingRoller
export interface RollerGrid { nx; nz; dx; xCenters; zCenters; h; bed; restLevel } // the solver fields it reads
export const ROLLER_SLOTS = 2, ROLLER_STRIDE = 8;
export interface RollerOptions { // §2's constants, each with its source in a comment
  birthStrength: number; shedStrength: number; birthFroude2: number; shedFroude2: number; shedHold: number;   // 0.3, 0.1, 2.1025, 1.69, 0.2 s
  growthDepths: number; tanBirth: number; tanDeveloped: number; area: number; voidMean: number;             // 6.5, 0.4663, 0.3346, 0.345, 0.25
  rearTaper: number; relax: number; gap: number; shoulderSlope: number; trackWindow: number;               // 0.3, 0.3 s, 4 m, 0.2 /m, 2 m
  swashDepth: number; stallSpeed: number; riseSpeed: number; minG: number;                                 // 0.1 m, 0.5 m/s, 0.25 m/s, 0.01
  edgeColumns: number; mask: 'front' | 'solver';                                                           // OPEN_EDGE_COLUMNS, 'front'
}
export const ROLLER_DEFAULTS: RollerOptions;
export interface LensPoint { thickness: number; rise: number; g: number; flowX: number; flowZ: number }
export class SpillingRoller {
  constructor(grid: RollerGrid, options?: Partial<RollerOptions>);
  update(time: number, dt: number, front: SpillingFront, strength: ArrayLike<number>, breakerDepth: number): void;
  readonly table: Float64Array;                         // ROLLER_SLOTS × nx × ROLLER_STRIDE
  lensAt(x: number, z: number, out: LensPoint): boolean; // the drawn-and-felt lens at (x, z)
  riseAt(x: number, z: number): number;                 // ᾱ·t, its top over η (max over slots)
  readonly counts: { born: number; shed: number; overflow: number; masked: number; disagree: number };
}
```

**Changes to the front:**
- `crestAt` is recorded for gated cells too. Today only reached cells set it.
- `speedCap` takes its sine from a short Taylor series (`+ × ÷` only) instead of `Math.sin`, so the existing options and tests keep working.

- [ ] **Tests**, all fast, on synthetic 1 m grids like `SpillingFront.test.ts`'s, with an analytic tanh bore:
  - **Section:** crest and trough within 0.25 m, toe within 0.5 m, H within 1 %.
  - **Thresholds and hysteresis:**
    - r = 2 is born.
    - r = 1.5 (Fr₁ 1.37) is not born, but stays if already born.
    - r = 1.35 (Fr₁ 1.26) sheds after 0.2 s, not before.
  - **Shape:**
    - The water (1 − ᾱ)·∫t holds 0.345 H² ± 1 % at g = 1, for L_r from 2.1 to 3.5 H.
    - t_c = 0.273 H at φ = 0 and 0.196 H at φ = 1, ± 1 %.
    - With w = 0, L_r goes from 2.14 H to 2.99 H over 6.5 h_b of travel.
  - **Rise:** at g = 1, the rise at the crest is ᾱ·t_c: 0.068 H at the birth length and 0.049 H developed.
  - **Along the crest:**
    - A 3 m gap is closed; a 5 m gap is not.
    - A 3 m run is not drawn.
    - |Δg| ≤ 0.2 per metre, and g goes from 0 to 1 within 5 m of a run's end.
  - **Mask:**
    - With mask `'front'`, a lens whose front has not reached its column has a state but no table entry. With mask `'solver'` it has an entry.
    - S2's ramp gives L_eff = 1.5 m + 5 m/s·a and a g_eff share from 0.35 to 1 over 1.5 s.
  - **Review Focus 1:** a dropped wave's lens is still drawn.
  - **Review Focus 2:** in the swash, t ≤ ½ the local depth everywhere, and the lens sheds when c < 0.5 m/s.
  - **Slots:** two waves in one column take two slots. A third live wave counts an overflow, and the oldest lens yields.
  - **Edges:** no lens in the edge columns.
  - **Determinism:**
    - The source regex passes on `SpillingRoller.ts` and `SpillingFront.ts`.
    - Two runs on the same inputs give bitwise-equal tables.
  - **Front:**
    - `felt` is B behind the front and in unowned cells, and 0 ahead.
    - `crestAt` is set in gated cells.
    - The series sine matches `Math.sin` within 1e-12 for 30–90°.
    - The existing front tests pass unchanged, including `speedCap(5)` = 10 at 30°.
- [ ] **Acceptance:** the numbers above. `npx vitest run src/wave/SpillingRoller.test.ts src/wave/SpillingFront.test.ts` is green.

### Task 2: In the simulation

**Files:**
- `src/wave/SurfZoneSimulation.ts`:
  - `roller?: boolean` and `rollerMask?: 'front' | 'solver'` in `SurfZoneConfig`;
  - construct the roller when `spillingFrontOn(config) && config.roller !== false`;
  - in `afterWater` (:888), update it right after `spilling.update`, timed as `stepCosts.roller`;
  - a `felt` array and a `feltBreaking` getter, which falls back to `breaking.strength`;
  - the rise in `writeUniformSnapshot` (:1224), `writeUniformFields` and `heightAt` (:1191).
- `src/dev/waterSheet.ts`: `&roller=0` and `&rollerMask=`.
- `src/wave/SurfZoneSimulation.test.ts`.

- [ ] **Tests:**
  - **The Canyon**, with the config of the existing test "spills at the Canyon at every size" (Hs 1.4, 0°, s = 150, 160 m), over 3 periods:
    - lenses are born (`counts.born > 0`);
    - every column with a drawn lens has been reached by its front;
    - the table is empty ahead of every front.
  - **Off:** `roller: false` and `spillingFront: false` leave no `simulation.roller`, and the Beach has none (Review Focus 4).
  - **Node heights:** the snapshot's surface, minus the same sea's surface with the rise skipped, equals `riseAt` at each node, to float32 precision.
  - The existing Canyon tests (no jets, the front) pass.
- [ ] **Acceptance:** as above. The physical outcomes (how many lenses, their size and life) are Task 6's report.

### Task 3: The rider's water

**Files:**
- `src/physics/PhysicalSurfWater.ts`:
  - a `roller?` option;
  - the rise in `nodeHeight`;
  - the bore branch;
  - the lens's air and flow;
  - `forSimulation` passes `simulation.roller` and, per Q1, `simulation.feltBreaking`.
- New `src/physics/testing/RollerWater.ts`: `BoreWater`'s analytic bore with the real `SpillingRoller` lens, and c = √(g(h₁ + H/2)) (R3 §2.1).
- `src/physics/PhysicalSurfWater.test.ts`, `src/physics/SurfWaterBodyField.test.ts`, and a new `src/physics/rollerFeel.test.ts`.

- [ ] **Tests**, fast first:
  - **Unit**, a synthetic table on a still channel:
    - The top is η plus the rise at the nodes, and `sampleAt().surfaceY` = `surfaceAt()`.
    - α is 0.9ζ^2.6 inside the lens and the plume's below it.
    - α > 0.28 exactly for ζ > 0.638, and the mean of α over ζ is 0.25 ± 0.005.
    - The flow is ū + g(c·n̂ − ū) at ζ ≥ 0.3 and ū at the underside; the vertical part is unchanged.
    - At the Canyon there is no P11 carry outside the lenses.
    - The P11 tests (`PhysicalSurfWater.test.ts:257, 277, 299, 315`) and `BoardBody.test.ts:255` pass unchanged.
  - **Parity:**
    - The snapshot's node heights equal `PhysicalSurfWater`'s at render spacings of 1 m and 2 m (Review Focus 5).
    - `SurfWaterBodyField` stays a pass-through at the Canyon.
  - **Review Focus 4:** with `spillingFront: false` at the Canyon, test 277's carry numbers come back.
  - **Feel**, with `RollerWater` and the real board and rider: push, bog, carry and hit, with §7's targets.
  - **Q1, if ruled:** a wiped-out body in a cell ahead of the front keeps its swim control (its felt B is 0).
- [ ] **Acceptance:** §7's feel numbers. `npx vitest run src/physics` is green.

### Task 4: The band in both looks

**Files:**
- **Data:**
  - `src/wave/SurfZoneRunner.ts`: `SurfZoneBuffers.roller` and `rollerCount`, `createBuffers`, `fill`;
  - `src/game/SurfZoneWorkerCore.ts`: `transferables`;
  - `src/game/WorkerSurfZone.ts`: `emptyLike`;
  - `src/game/SurfZoneHost.ts`: `SnapshotSurfZone.writeRoller`;
  - `src/scene/PhysicalSurfaceSource.ts`.
- **Drawing:**
  - `src/scene/WaterSurface.ts`: the `waterRoller` texture, the uniforms `waterRollerColumn0` and `waterRollerColumnWidth`, uploaded in both looks;
  - new `src/scene/water/rollerGlsl.ts`, the chunk;
  - new `src/scene/water/rollerLook.ts`, its TS twin with pcg3d;
  - `src/scene/waterOptics.ts`, `src/scene/water/richWaterGlsl.ts` and the `waterLooks` snapshot.

- [ ] **Tests:**
  - **TS twin:**
    - Coverage is 1 across the crest band at g = 1, and 0 past the toe's wander.
    - Brightness is 1 at ξ = 0 and 0.73 at ξ = 1.
    - The toe's offset has a standard deviation within 1–2 d′max.
    - pcg3d words are pinned.
  - **Buffers:** the worker-host tests carry `roller` through.
  - **Classic:** the snapshot diff is reviewed and accepted.
- [ ] **Shots:** `scripts/browser/canyon-peel-shots.mjs` from the beach, the cliff and overhead, in Classic and Rich at midday, with and without `&roller=0`.
- [ ] **Acceptance**, on the shots:
  - The band runs from the crest to a fingered toe and is brightest at the crest.
  - It starts as S2's thin line, and is gone ahead of the front.
  - The foam field lies behind it.
  - By the overhead scale, it is 2–3.5 H wide.

### Task 5: Online

**Files:**
- `SpillingFront.ts` and `SpillingRoller.ts`: `exportState` and `importState`;
- `src/wave/surfZoneState.ts`: the type and the header's key list;
- `SurfZoneSimulation.ts`: export and import;
- the tests: `src/wave/surfZoneState.test.ts`, `SpillingFront.test.ts` and `SpillingRoller.test.ts`.

- [ ] **Tests:**
  - **Round trip:** a JSON round trip is exact (NaN ↔ `null`), and `decode(encode(state)).spilling` equals `state.spilling`.
  - **Review Focus 3, the Canyon handed over in-process:** after 300 steps the fingerprint matches the donor's exactly (64-bit), as `surfZoneState.test.ts:33-47` does for the Point. The fingerprint covers h, qx, qz, foam, whitewater, the roller table and the front's waves.
  - **Through a 32-bit encode,** after 300 steps:
    - the drawn lens columns are within ±2 of the donor's (P);
    - the mean |Δz_c| is ≤ 0.5 m (P).
  - **Older donor:** a state without `spilling` imports, with a fresh front.
- [ ] **Acceptance:** as above.

### Task 6: Measurements, the report and the docs

**Files:**
- new `scripts/canyon-roller-report.ts`, with `report:roller` in `package.json`;
- `docs/research/canyon-spilling-2026-10-05/README.md`, its S3 section;
- `docs/superpowers/handoffs/2026-10-05-canyon-spilling.md`, its status.

- [ ] **The report (§7):** Medium (3 seeds × 14 periods) and Big (1 seed), each with mask `'front'` and `'solver'`.
- [ ] **Re-runs:** Task 0's reports again, compared before and after (R3 §5, risk 11).
- [ ] **Shots and the cost.**
- [ ] **The docs,** including Q1's numbers for the owner.

## 7. Measurements

**What a rider feels.** Task 3 measures these with `RollerWater` and the real hull and rider, at H = 0.5, 1.0 and 1.5 m.

| Check | Target | Source |
|---|---|---|
| **Push.** A prone rider on the 30 L board drifts with ū and is overtaken by the lens. Measure the mean water force along n̂ while inside it (Q4). | 330·H Pa × 0.5 m² = 83 / 165 / 248 N, ± 30 % (P) | R; R3 §3.1 (Duncan–Martins) |
| **Bog.** The same rider at rest at ζ > 0.64. | It sinks (α > 0.28) | R (the 30 L limit) |
| **Carry.** A free prone board. | Never faster than c. 2.5–3.1 m/s on 0.3–0.6 m bores. Below the lens it falls behind, toward c(1 − h₁/h₂). | R3 §3.1 |
| **Hit.** A paddler facing a 1.5 m roller. | 1.4–2.8 kN quasi-steady. The front's peak is at most 1.5× that, and the hit lasts 0.5–0.9 s. | R3 §3.1 (Yeh 2014) |

**The band against H**, from the report on the live Canyon:

| Measure | Expected | Source |
|---|---|---|
| L_r/H, at birth and developed | 2.1, growing to 2.5–3.5 | R |
| L_r·tanθ against H (θ from the measured face) | ≈ H (field r² 0.89) | R3 §5 (Martins) |
| θ, at birth and developed | 25°, falling to 16–22° | R3 |
| Water held / H²; t_c/H | 0.33–0.36; 0.27, falling to 0.20 | Martins; R3 §2.1 |
| c / √(g(h + H/2)) | ≈ 1 | R3 §5 |
| Fr₁ and B_front at each shedding; Kennedy–Froude disagreements; lenses the mask holds back (count, and metres ahead of the front); slot overflows; crest angle | Reported | R3 §1.5 |

**Cost:**
- `stepCosts.roller`, median and p95: about 0.07 ms on the M1 (R3 §5);
- µs per contact query: about 1 µs;
- GPU ms per frame with and without `&roller=0` (`waterSheetTime`, and `npm run survey:fps -- --features` in both looks).

Reported, never a gate.

**Riding.** Task 0 against Task 6:
- stands, rides of 3 s or more, and the median ride, at the Canyon;
- with mask `'front'`, these should not fall below S2's beyond seed noise (P);
- the `'solver'` run is Q1's evidence.

## 8. Open questions for the advisor

**Q1. Should the roller's push follow the solver's breaking or the front's owned cells?** The owner accepted S2's mismatch: on fast waves the rider feels the solver's breaking ahead of the visible foam.
- **The solver's breaking (mask `'solver'`).** Lenses act wherever the solver breaks.
  - On slow waves (about half, at 47–60°) nothing changes.
  - On fast waves (the solver at 15–30°), a rider on the green shoulder, up to tens of metres ahead of the white water, bogs and is shoved toward the beach at 330·H Pa by whitewater that isn't drawn.
  - Drawing it there instead would put white water ahead of the 55° front, undoing S2's peel on exactly those waves.
  - Catches come easier there, as with today's P11 push (ROADMAP, Riding the wave Part A: without the push the old Canyon gave 17 stands and 1 ride of 3 s or more, with it 49 and 21).
- **The front's owned cells (mask `'front'`).** The push, the bog, the rise and the band appear together, only behind the visible front, at its 55° peel.
  - Ahead of the front, a fast wave's broken face rides like a steep green one. Only the depth-averaged current carries the rider there: the bore's mass flux, c(1 − h₁/h₂), a third to a half of c.
  - So a fast wave rides as if it peeled at 55°, more makeable than the solver's own peel.
  - The lens's life still follows the solver from its own onset, so a column the front reaches late gets a developed roller at once. It fades in over S2's 1.5 s ramp and the 5 m shoulder.
- **Recommendation: the front's cells,** so the rider hits what is drawn.
  - Pass the same mask as the sample's `breaking` (B behind the front, 0 ahead, no ramp), so the hold-down, the curl and broken-water readers and the duck-dive goal follow the visible front too.
  - Task 6 runs the catch and ride reports both ways. If the front's mask costs many catches on fast waves, that is the visible peel's price, and the numbers go to the owner.

**Q2. How thick is the lens at the crest?**
- R3's quarter ellipse, holding Martins's 0.33–0.36 H² of water, gives t_c = 0.27 H at birth and 0.20 H developed. Its underside lies 0.15–0.20 H under η, matching R3's "0.15 H at the crest".
- The brief's "0.25–0.5 H thick at the crest" comes from round 2's wedge estimate at lighter densities. A wedge holding the same water (t_c = 0.26–0.44 H for L_r from 3.5 down to 2.1 H) meets the brief at every length.
- **Recommendation:** build R3's ellipse and correct the brief. If the push probe comes out short because the lens is too thin to hold a board's draft, try the wedge (one line) before moving ᾱ. Settle it with the Basilisk runs (RB, decision 4).

**Q3. Will the lenses shed too early on the terrace?**
- Saturated inner-surf-zone bores stand at H/h ≈ 0.4 (R's bore speeds imply H/h ≈ 0.41). That is Fr₁ ≈ 1.3–1.35, right at the shedding line.
- So the lenses may shed soon after the terrace's edge, or sit on the hysteresis. R3 puts the threshold's uncertainty at about 0.1 (Misra 2008: a jump at 1.19 still broke).
- **Recommendation:** keep 1.3 and 1.45 with the 0.2 s hold, and report Fr₁ and B_front at each shedding. If lenses shed while the solver still dissipates (B ≥ 0.3), lower the shedding line toward 1.2, within that uncertainty, rather than add a rule.

**Q4. At what motion should the push be checked?**
- 330·H Pa is the roller's shear on the face below it. The game turns it into drag from the lens's flow, so the force depends on the rider's speed.
- **Recommendation:** check it on a prone rider drifting with the current below as the lens overtakes it (relative speed c·h₁/h₂), which is the case a paddler meets. Report the held-still and free-carry cases beside it.

**Q5. Should S3's roughness reach the collided surface?**
- The sourced displacement has a standard deviation of 0.13–0.18 h₁ at Fr₁ 1.4–1.6, about 0.17–0.3 m on the terrace.
- Written into the 1 m node heights, it would make boards bounce in the soup: a gameplay change.
- **Recommendation:** in S3, draw the roughness only (toe fingers, holes, normals). Give the collided displacement its own measured step, or leave it to S4's loft, at mid-range as the owner ruled.

**Q6. Are sections along the column good enough for S3?**
- S3 reads each solver column along z and projects lengths and speeds onto the crest normal (n̂_z). R3's slice normal needs the loft's front line.
- The error grows as 1 − cos φ for a crest φ off the shore: about 6 % at 20°. The report prints the crest angle.
- **Recommendation:** accept it for S3 while the Canyon's crests stay within about 20° of the shore, and revisit at S4.

**Q7. Measured length, or the stage relation?**
- At the Canyon, H is 1.4–1.9 m and L_r ≥ 4 m, so R3's blend uses the solver's measured face. The solver's bore shape then shows through (R3, risk 2).
- **Recommendation:** keep the blend, and report L_r·tanθ against H and θ. If the faces fall outside 16–25°, raise it as a solver issue rather than clamp the lens to the stage relation.

**Q8. Should the P11 push stay at the other spots?**
- **Recommendation:** keep it at the Beach, the Point, the Reef, Padang and the Pool until their rollers exist (S4). Removing it now would stop broken water carrying boards there (the ROADMAP numbers in Q1).
