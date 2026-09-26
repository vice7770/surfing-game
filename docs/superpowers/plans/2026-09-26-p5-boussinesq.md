# P5 Boussinesq Surf Zone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the non-dispersive stage 1 surf zone with the stage 2 objective of the [wave formation plan](../../research/wave-formation-plan.md) §1.8: Madsen–Sørensen (1992) Boussinesq equations with Kennedy et al. (2000) eddy-viscosity breaking and a Tonelli–Petti (2009) switch to shallow water, so waves shoal, pitch and break at the right depth instead of steepening into bores offshore.

**Architecture:** `BoussinesqSolver` extends `ShallowWaterSolver` and keeps its Hancock flux step. Each step:
1. Form the modified fluxes P̄ and Q̄ from P and Q.
2. Advance them with the shallow-water rates plus the dispersive and breaking sources.
3. Recover P and Q with one tridiagonal solve per row (along x) and per column (along z).

P and Q stay the primary state, so relaxation zones, the lip's mass exchange and the sliding window work unchanged. Breaking is computed inside the solver from the surface rise rate; the surf zone's `BreakingModel` reads it, so lip, foam, readouts and the board see one signal.

**Tech Stack:** TypeScript, typed arrays, Vitest.

**Spec:** [wave formation plan](../../research/wave-formation-plan.md) §1.8, §3.3 and §4.2; [ADR 0004](../../adr/0004-dispersive-surf-zone-solver.md).

## Global Constraints

- g = 9.81 m/s², B = 1/15 (Madsen–Sørensen), α = B + 1/3.
- Kennedy breaking: onset η_t^(I) per spot (0.35 √(gh) Beach, 0.65 √(gh) otherwise, `BREAKING_ONSET`), end η_t^(F) = 0.15 √(gh), T* = 5 √(h/g), δ = 1.2, ν_b = B_k δ² H η_t.
- Tonelli–Petti: shallow water wherever (η − still level) / still depth > 0.8.
- Dispersion error ≤ 2.5 % against Airy up to kh = 3 (plan §4.2 item 1). Shoaling within 10 % of Green's law, Snell within 2°, H_b/h_b in 0.6–1.0.
- CPU replay bit-exact. Worker budget 4 ms per step; if stage 2 exceeds it, the fallback is the user's choice (plan §3.3), so it is measured and reported, not decided here.
- Physics tests run on the CPU reference.

## Review Focus

- **Dry and nearly dry cells at the shoreline:** run-up must stay non-negative and finite with dispersion on. Dispersion is masked where any stencil neighbour is dry (Task 3 run-up test).
- **The sliding window's new columns:** still depth, and so the dispersive coefficients, must follow the shifted bed. They are derived from `bed` every step, never cached (Task 4 window-shift test).
- **Periodic along-shore edges**, used by the validation channels, need a cyclic tridiagonal solve (Task 1 test on a periodic 2-column channel).
- **Strong breaking making the explicit eddy viscosity unstable:** `maxStableStep` includes the viscous limit (Task 3 breaking test stays finite).
- **A lake at rest over the steep reef and canyon beds:** no dispersive source may appear from the bed alone (Task 4 lake-at-rest test on every spot).

---

## The equations (x along shore, y ≡ z across shore, d = still depth, H = total depth)

- Mass: η_t + P_x + Q_y = 0.
- Momentum (x; y by symmetry):

  P̄_t + (P²/H)_x + (PQ/H)_y + gHη_x = Bg d³(η_xxx + η_xyy) + Bg d² d_x (2η_xx + η_yy) + Bg d² d_y η_xy + R_x

  - P̄ = P − α d²(P_xx + Q_xy) − d d_x(P_x/3 + Q_y/6) − d d_y Q_x/6.
  - R is the breaking eddy viscosity, R_x = ∂x(ν P_x) + ½∂y(ν(P_y + Q_x)).
- **Derivation check:** in 1D linear flat-bed form, P_t + g d η_x − α d² P_xxt − B g d³ η_xxx = 0 gives c²/gd = (1 + B(kd)²)/(1 + α(kd)²). Mild-slope terms follow from Peregrine's flux form, P_t + g d η_x − d² P_xxt/3 − d d_x P_xt/3 = 0, plus B d²·∂xx of the long-wave equation.

## Tasks

### Task 1: Dispersive solver on a flat bed

**Files:**
- Modify `src/wave/ShallowWaterSolver.ts`: the members the subclass needs become `protected` (`zEdges`, `zGaps`, `xBoundary` and its constants, `manning`, `rateH/Qx/Qz`, the face arrays, `predictFaces`, `fluxAlongX`, `fluxAlongZ`, `advance`). No behaviour change.
- Create `src/wave/BoussinesqSolver.ts` and `src/wave/BoussinesqSolver.test.ts`.

**Interfaces:**
- Produces `class BoussinesqSolver extends ShallowWaterSolver`, `constructor(grid, depthAt, options: BoussinesqOptions = {})`, with `BoussinesqOptions extends SolverOptions`:
  - `dispersion?: boolean` (default true);
  - `breaking?: KennedyOptions | false`.
- Produces `export const MADSEN_SORENSEN_B = 1 / 15`.
- Produces `export function madsenSorensenCelerity(omega: number, depth: number, g?: number): number`, the phase speed the equations predict (Newton on ω² = g k² d (1 + B(kd)²)/(1 + α(kd)²)).
- Produces a cyclic tridiagonal solve (Sherman–Morrison) and a plain Thomas solve, module-private.

**Steps:**
- [ ] Tests:
  - *Phase speed:* a periodic 2-column channel along z, flat bed d = 2 m, cells of L/40, a linear Airy wavemaker zone and an absorbing zone. The phase speed between two gauges one wavelength apart matches `madsenSorensenCelerity` within 1 %, and Airy within 2.5 %, at kh = 0.5, 1, 2 and 3.
  - *Switch-off:* `dispersion: false` is bit-identical to `ShallowWaterSolver` over 200 steps of a wave run.
  - *Lake at rest:* one stays at rest (|u| < 1e-9) over a sloping bed.
- [ ] Run and see them fail (module missing).
- [ ] Implement:
  - **Still depth and mask** each step: d = max(0, rest − bed). Mask m = 1 where the cell and its four neighbours hold more than 0.05 m, d > 0.05 m and (η − rest)/d ≤ 0.8.
  - **FD operators with ghost cells:**
    - x uses central differences;
    - z uses second-order non-uniform differences with Δ± from the centre gaps;
    - ghosts mirror at walls (normal flux odd, others even), extend at open edges and wrap when periodic;
    - the z ends are walls, with the ghost centre dz[0] or dz[nz−1] beyond.
  - **advance(dt):**
    1. P̄ⁿ, Q̄ⁿ;
    2. Hancock faces and rates;
    3. η^{n+½} as the mean of the four predicted face surfaces;
    4. the dispersive sources from it;
    5. h^{n+1};
    6. P̄^{n+1} = P̄ⁿ + dt·(rate + source);
    7. P^{n+1} by rows (cross terms from Qⁿ), then Q^{n+1} by columns (cross terms from P^{n+1});
    8. dry cells zero;
    9. Manning as in stage 1.
- [ ] Run until the tests pass; full suite green.
- [ ] Commit `feat: add a Madsen–Sørensen dispersive solver`.

### Task 2: Varying depth: shoaling, refraction, groups and solitary waves

**Files:** `src/wave/BoussinesqSolver.test.ts`, plus fixes in `src/wave/BoussinesqSolver.ts`.

**Steps:**
- [ ] Tests, reusing the stage 1 validation setups (`shallowWaterTestSupport`):
  - *Green's law:* on the 6 m → 1.5 m slope, within 10 %.
  - *Snell:* the oblique wave over a 8 m → 2 m slope, within 2°.
  - *Group speed:* a Gaussian packet at kh = 1.5 on a flat bed moves at the Madsen–Sørensen group speed, dω/dk by finite difference, within 5 %.
  - *Solitary wave:* A/d = 0.1 on a flat bed keeps its speed within 3 % of √(g(d + A)) and its height within 5 % over 20 depths.
- [ ] Fix whatever fails.
- [ ] Commit `feat: shoal and refract dispersive waves over the spot beds`.

### Task 3: Breaking

**Files:** `src/wave/BoussinesqSolver.ts` and its test.

**Interfaces:**
- Produces `interface KennedyOptions { onset: number; end?: number; transition?: number; delta?: number }`.
- The solver exposes:
  - `readonly breakingStrength: Float64Array`, B_k in [0, 1];
  - `readonly breakingAge: Float64Array`;
  - `readonly riseRate: Float64Array`, η_t;
  - `onsetScale = 1`, the wind's shift.

**Steps:**
- [ ] Tests:
  - *Breaking depth:* a 10 s, 0.6 m wave on a 1:40 slope begins breaking where H/d is 0.6–1.0.
  - *No over-steep waves:* no unbroken wave exceeds Miche, 0.142 tanh(kd), by more than 10 %.
  - *Run-up:* dispersion on stays finite, with no negative depth, and wets above z = 80 m.
  - *Closed basin:* a freely oscillating wave never gains energy by more than 0.5 %.
- [ ] Implement:
  - B_k from η_t = rateH against a threshold. The threshold ramps from onset to end with the breaking age: a cell inherits a breaking neighbour's age, as in `BreakingModel`.
  - ν = B_k δ² H η_t, capped at 0.5 √(gH)·H.
  - R with face-averaged ν.
  - `maxStableStep` includes dx_min² / (4 ν_max) from the latest ν.
- [ ] Commit `feat: break dispersive waves by eddy viscosity`.

### Task 4: The surf zone on stage 2

**Files:**
- `src/wave/SurfZoneSimulation.ts`: add `stage?: 1 | 2`, default 2.
- `src/wave/Breaking.ts`: `BreakingModel` mirrors a Boussinesq solver's breaking, and its `onsetScale` forwards to the solver.
- `src/game/PhysicalMode.ts`: a readout row names the solver.
- Tests.

**Steps:**
- [ ] Tests:
  - every spot's lake at rest stays at rest under stage 2;
  - the default Beach runs 30 s finite, with breaking between 0 and 30 % of the surf zone;
  - a window shift keeps the dispersive coefficients on the new bed (lake at rest across the Point headland after shifts);
  - the worker core still matches the main-thread reference.
- [ ] Measure the step time for stage 1 and stage 2 on each spot (bundled Node), and regenerate `docs/research/rideability-report.md` with stage 2.
- [ ] Commit `feat: run the surf zone on the Boussinesq solver`.

### Task 5: Record

- [ ] Update the ROADMAP (P5), ADR 0004 (stage 2 status) and this plan's findings. State the measured performance against the 4 ms gate, with the fallbacks (plan §3.3) for the user to choose if it fails.
- [ ] Retiring `legacy` needs the physical mode to be catchable first, so it moves to the end of P4f; record that.
- [ ] Commit `docs: record P5`.
