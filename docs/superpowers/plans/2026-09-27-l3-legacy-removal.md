# L3 Legacy Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the legacy (pre-physics) wave's code, which the page stopped reaching in L1, and trim what it left in shared modules.

**Architecture:** Deletion driven by a reachability scan from the game's entry points (`src/main.ts`, `src/gpuCheck.ts`, `src/dev/characterSheet.ts`, the surf zone worker, the report scripts), then the compiler and the suite. Test and report scaffolding the game never reaches is kept on purpose: the test waters (`PlaneWater`, `SwellWater`, `BumpWater`), the test surfers and humanoid, the carve lab's helpers, `roomSea`, `Rideability`, `TubeShape`, `causticMath` and `rollModel`.

**Tech Stack:** TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-27-wave-lab-surf-school.md` (section *L3 · Legacy removal*).

## Global Constraints

- **The physical ride's shared pieces stay:** `BoardBody`, the `SurfWater` seam, `describeSwell`, and the legacy `Surfer` as `SurferView`'s fallback body until the skinned surfer loads.
- **The suite stays green.** Tests of deleted modules go with them; tests of kept modules lose only their legacy cases.
- **`Controls.ts` changes by one import only** (the uncommitted Steam Controller work also edits it): `BoardInput` moves into it.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A kept module that still imported a deleted one only for a type** (the compiler catches it). *Test: `npx tsc -b`.*
2. **A report script built on the legacy wave** (`board-baseline`) left in `package.json`. *Test: every `report:*` script's entry exists.*
3. **The fallback surfer after its legacy update is removed.** `SurferView` still draws it until the skinned surfer loads. *Test: the character tests (`src/scene/character`).*

---

### Task 1: Delete the legacy wave and its views

**Files:**
- **Delete:**
  - `src/wave/WaveModel.ts`, `src/wave/PlungingSheet.ts`, `src/physics/BoardPhysics.ts`, `src/physics/boardTrace.ts`;
  - `src/scene/LegacySurfaceSource.ts`, `src/scene/CameraRig.ts`, `src/scene/BoardWake.ts`, `src/scene/BreakSpray.ts`, `src/scene/Seabed.ts`, `src/scene/PlungingSheetMesh.ts`;
  - `src/ui/Hud.ts`, `src/game/RunHistory.ts`;
  - their tests;
  - the tests that only drive the legacy board (checked one by one: `SeedSweep`, `SettingsSweep`, `SustainedRide`, `BoardTrace`);
  - `scripts/board-baseline.ts` and its `report:board-baseline` npm script.
- **Modify:**
  - `src/physics/SurfWater.ts` (drop `LegacySurfWater`);
  - `src/scene/Surfer.ts` (drop the legacy `update(physics: BoardPhysics, …)` and what only it used);
  - `src/game/Controls.ts` (`BoardInput` defined here);
  - `src/wave/SwellReadout.ts` (drop `formatSwellReadout`, the legacy readout);
  - comments that call the legacy wave current;
  - `CONTEXT.md` (the *Physics tuning panel* entry goes);
  - `ROADMAP.md` (the L3 entry).

- [ ] **Step 1:** Delete the files. Run `npx tsc -b` and read every error.
- [ ] **Step 2:** Fix each error by trimming the legacy part from the kept module (never by bringing a deleted module back).
- [ ] **Step 3:** Run `npx vitest run --dir src`. Expected: green. The number of tests falls by exactly the deleted tests' count; note it.
- [ ] **Step 4:** Run `npm run build`, then a browser check: the menu, the Wave Lab and a Surf ride load with a clean console.
- [ ] **Step 5:** Commit: `refactor: delete the legacy wave`.
