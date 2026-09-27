# Wipeout and duck-dive, Part B: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Broken water becomes aerated and turbulent for the bodies in it, so a wipeout can hold a surfer under for as long as the broken water lasts; the surfer's breath runs down underwater, and running out ends in a rescue.

**Architecture:** The water already carries a whitewater plume (G9's `AerationField`: air per cell and the plume's depth, advected and degassing). Bodies start sampling it: water at a point in the plume holds a void fraction, and every body's buoyancy and drag take the mixture's density, ρ(1 − α). The plume also carries turbulent kinetic energy, relaxed toward Ting & Kirby's measured intensity under broken waves and fading over about a wave period after; the fallen surfer (whose seven points feel separate eddies) samples it as a smooth, seeded eddy velocity with a descending bias under the roller. A breath store drains while the head is under, faster with effort, and recovers at the surface; empty, the rider is rescued to the lineup. The HUD darkens its edges as breath runs low, can show a breath meter, and the sound muffles while the head is under.

**Spec:** `docs/superpowers/specs/2026-09-27-wipeout-and-duck-dive.md` (Part B). Research: `docs/research/surf-gameplay-research.md` §5–6. Part A's report: `docs/research/duck-dive-report.md`.

## Global Constraints

- Aeration 12–18 % in broken water (Blenkinsopp & Chaplin): the plume's own void fraction, capped at `AERATION.peak` (20 %).
- Turbulence: from the solver's breaking, fading over about one wave period (Ting & Kirby 1995); physical flow the bodies sample, never a scripted tumble.
- Breath: about 60–70 s at rest, draining faster with effort (Guimard et al. 2021: ≈ 56·e^(−0.025·x) s at x % of peak effort). Underwater, the Duck-dive action dives, Space swims up at a higher breath cost, releasing relaxes and floats.
- Feedback: muffled sound while the head is under; screen edges darkening as breath runs low; an optional breath meter, on by default in Practice, off in Natural Sets (like the balance meter).
- Running out ends the ride with "Held down too long" and a rescue to the lineup.
- Done when hold-downs in 1–2 m plunging surf mostly last 5–15 s (survey §6), and the user's playtest agrees. A failing check is investigated, never tuned into passing.
- Performance is measured, never a gate. Strings through `src/ui/strings.ts`. Tests with `npx vitest run --dir src`.

## Review Focus

1. **Water with no plume** (a flat Practice sea, the Wave Lab, test waters): every body behaves exactly as before; `voidFraction` absent means 0.
2. **Breath while riding or lying on the board:** it never drains (the head is out of the water or the rider is paddling); only a fallen surfer's head under water drains it.
3. **A rescue mid-lesson or online:** it relaunches like R (a lesson restarts its attempt through its own miss path; online, the rider respawns where R would put it).
4. **Breath and the meter after a relaunch:** full again, the vignette gone.
5. **Determinism:** the eddies are a pure function of position and time, so a replayed run gives the same swimmer path.

---

### Task 1: Bodies in aerated water

**Files:** `src/physics/SurfWater.ts`, `src/physics/PhysicalSurfWater.ts` (+test), `src/physics/DetachedSurfer.ts` (+test), `src/physics/SurfWaterBodyField.ts`, `src/physics/AttachedRider.ts`, `src/physics/hullForces.ts` (+test), `src/physics/BoardBody.ts`.

**Interfaces:** `WaterSample.voidFraction?: number` and `BodyWaterSample.voidFraction?: number` (0–1, absent = 0). `PhysicalSurfWaterOptions.aeration?: { voidFraction(cell: number): number; readonly depth: ArrayLike<number> }`; `forSimulation` passes `simulation.aeration`.

- [ ] Tests first: `PhysicalSurfWater` reports the plume's void fraction inside the plume's depth and 0 below it or without a plume; a swimmer of density 950 floats in clear water and sinks in water holding 15 % air; `patchForce`'s buoyancy, pressure and friction scale by (1 − α); a prone rider's parts' buoyancy and drag likewise.
- [ ] Implement: blend over the four cells (each cell's α if the point lies within its plume depth under the surface); every body's buoyancy and drag use ρ(1 − α).
- [ ] Commit.

### Task 2: Turbulence in the plume, and eddies the swimmer feels

**Files:** `src/wave/AerationField.ts` (+test), `src/wave/SurfZoneSimulation.ts`, `src/physics/eddies.ts` (new, +test), `src/physics/SurfWaterBodyField.ts` (+test), `src/physics/PhysicalSurfWater.ts`.

**Interfaces:** `AerationField.turbulence: Float64Array` (k, m²/s²) and `AerationField.intensity(cell)`; `TURBULENCE = { ratio: 0.15, rise: 0.5, decayShare: 1 / 3, descend: 0.3 }`; `eddyVelocity(x, y, z, t, k, out)`; `WaterSample.turbulence?: number` (k at the point).

- [ ] Tests first: under breaking of strength B in water h deep, k relaxes toward (ratio·√(g h))²·B within about `rise` s; once breaking stops it falls to e^(−3) within one peak period; k advects with the current like the air; `eddyVelocity` is a pure function of its inputs, has zero mean and an RMS near √(2k/3) per component over many samples, carries the descending bias, and is smooth (neighbouring points 5 cm apart differ little); the swimmer's body field adds it to the flow, the board's and rider's samples do not.
- [ ] Implement (modelling choices, provisional, cited in doc comments): the intensity target from Ting & Kirby's √k/√(g h) ≈ 0.1–0.2 under the broken wave; decay e-folding a third of the peak period (gone within about one period); eddies as a sum of seeded sinusoidal modes of 0.3–1 m wavelength and a turnover of about their size over u'. Only the fallen surfer feels them: a board and a rider span several eddies, which average out over their length, while each of the swimmer's seven points feels its own.
- [ ] Commit.

### Task 3: Breath and the rescue

**Files:** `src/physics/Breath.ts` (new, +test), `src/physics/RideSession.ts` (+test), `src/wave/SurfZoneRunner.ts` (+test).

**Interfaces:** `BREATH = { rest: 65, effortFall: 0.025, recover: 8 }`, `class Breath { level: number; reset(): void; step(dt, underwater: boolean, effort: number): void; get empty(): boolean }`; `RideSession.breath`, `RideSession.outOfBreath`; runner: rescue when empty (relaunch like R), status `ride.breath`, `ride.rescues`; snapshot `RIDER_SNAPSHOT.breath`.

- [ ] Tests first: held under at rest the breath lasts 65 s; at 50 % effort about 65·e^(−1.25) ≈ 19 s; at the surface it refills over 8 s; lying or standing on the board it never drains; a relaunch refills it; the runner rescues a rider whose breath runs out (counts it, relaunches prone in the lineup).
- [ ] Implement: effort 10 % relaxed, 50 % while stroking, diving or swimming up (the spec's "higher breath cost").
- [ ] Commit.

### Task 4: What the player sees and hears

**Files:** `src/ui/RideHud.ts` (+test), `src/ui/ui.css`, `src/game/Settings.ts` (+test), `src/ui/settingsModel.ts` (+test), `src/ui/App.ts`, `src/ui/strings.ts`, `src/audio/soundMapping.ts` (+test), `src/main.ts`, `src/game/RideTracker.ts` or the HUD's notice.

- [ ] Tests first: `showsBreathMeter` mirrors the balance meter's rule; the HUD shows the breath meter only while the fallen surfer's breath is below full and the setting allows it; the edge vignette's strength rises as breath falls below half (none above); a rescue shows "Held down too long" for 3 s; the sound muffles while the rider's head is under water; Settings keeps `breathMeter` within its choices.
- [ ] Implement, with strings `settings.breathMeter.*`, `hud.breath`, `hud.heldDown`.
- [ ] Commit.

### Task 5: Hold-downs and the duck-dive, measured

**Files:** `scripts/holddown-report.ts` (new), `package.json`, `docs/research/holddown-report.md`, `docs/research/duck-dive-report.md`.

- [ ] A report: on the Canyon's practice swell, a rider lying in the impact zone is let go (`separate`) as a breaking crest arrives; per episode, the time its head spends under water in the next 30 s, the longest single stay, and when it regained control; set beside the survey's 5–15 s. Reported, not asserted.
- [ ] Re-run the duck-dive report with the aerated, turbulent water and record what changed (depth, setback, keeping the board).
- [ ] Commit the reports.

### Task 6: Finish

- [ ] ROADMAP, the spec's status, full suite, browser check where the pane allows, PR (stacked on #47), memory.
