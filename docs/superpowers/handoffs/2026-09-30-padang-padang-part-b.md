# Handoff: Padang Padang, Part B (the swept barrel)

For a Claude Code session picking this work up on another machine. Written 2026-09-30 at the end of PR 4.

## What this work is

Padang Padang (Bali) is the game's fifth surf spot. **Part A** built the spot, and it is merged (#89).

**Part B** replaces the old barrel with **one surface swept along each breaking crest**. The surface comes from 2D overturn profiles simulated in Navier–Stokes (Basilisk, offline), and it is both drawn and collided with. It runs only at Padang Padang until PR 7.

- Spec: `docs/superpowers/specs/2026-09-28-padang-padang.md` (§Part B, 13–18; Judging Part B; Coordination).
- Overall plan: `docs/superpowers/plans/2026-09-29-padang-padang-part-b.md`.
- PR plans: `docs/superpowers/plans/2026-09-30-padang-padang-part-b-pr3.md` and `…-pr4.md`.
- The research record: `docs/research/barrel-library.md` (cases, the front's join and throw, the loft, the contact) and `docs/research/barrel-cases.md` (generated).

## Where it stands

| PR | Branch | Base | State |
|---|---|---|---|
| Part A, #89 | `claude/padang-padang` | main | merged |
| PR 1 library, #90 | `claude/padang-barrel` | main | merged (a later commit, the Small swell's periodic case, rides in #91) |
| PR 2 front and slice clock, #91 | `claude/padang-clock` | `claude/padang-barrel` | **open**, the user merges |
| PR 3 drawn mesh, #92 | `claude/padang-mesh` | `claude/padang-clock` | **open**, the user merges; screenshots of a tube in both looks still owed |
| PR 4 contact, #95 | `claude/padang-contact` | `claude/padang-mesh` | **open**, the user merges; see "PR 4" below |
| PR 5 crash curve, parcels, sound | — | — | not started |
| PR 6 shading (Rich: lip glow, dark throat) | — | — | not started |
| PR 7 switch every spot, delete the old code | — | — | not started |

Merges are the user's: the auto-mode classifier refuses `gh pr merge`. Don't merge or retarget #91/#92 yourself. Stack new work on the newest open branch until they merge, then retarget to `main`.

## Setting up the machine

```bash
git clone https://github.com/vice7770/surfing-game.git && cd surfing-game
git fetch origin && git checkout claude/padang-contact
npm ci
```

- Node 22 (the M1 ran v22.17.0).
- The barrel cases are committed (`public/barrels/*.bin`, BRL2) with their index (`src/wave/barrel/barrelLibraryIndex.ts`); nothing needs rebuilding to run the game or the tests.
- Rebuilding the cases (`npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --run periodic_padang19s_L12 --a0 periodic_padang19s_L12=0.1414 --flat 0.1785714`) needs the Basilisk runs' `*_library.json` and `*_metrics.json` in `tools/basilisk/runs/`.
  - They are git-ignored.
  - The three solitary runs live only on the M1 Air.
  - The periodic run is on the advisor's branch: `git show origin/claude/water-physics-advisor-local:<path>`.
  - Their analysis needs Python with numpy.
- Work in a worktree of your own under `.claude/worktrees/`. Never touch other sessions' worktrees.

## The user's rules (keep them verbatim)

- "every value is sourced or marked provisional, and nothing is hand-shaped"
- "Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical" (spec 15)
- "Performance is measured, never a gate. Target an M4 Pro; an M1 Air may run slowly"
- "Don't change the Reef (Teahupo'o)". The Reef switches only in PR 7, after the Reef session agrees and the user looks.
- The loft and the contact use only + − × ÷ √ (online determinism: each client runs its own sea).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Work continuously without check-ins; open a PR for each piece; the user merges.
- Don't spawn agents unless the user asks. The exception: the `water-physics` advisor agent for shape questions, as below.
- Workflow: grill → spec → plan (superpowers:writing-plans) → execute (superpowers:executing-plans, native) → PR stacked on the last.
- English only in the game.

## The advisor

A "Water physics research" session advises on every lip, tube, contact or foam shape: **send it any shape before you settle it**.
- On the M1 it is a peer session: use `SendMessage` to "Water physics research".
- On another machine, spawn the `water-physics` agent type with the question and the context below. The user's standing permission covers that agent.
- Their consult log is `docs/research/water-physics/consult-log.md` on their branch (PR #82). Never edit it.
- Read their files only through `git fetch origin claude/water-physics-advisor-local` then `git show origin/claude/water-physics-advisor-local:<path>`.

**Questions sent 2026-09-30, answer pending** (decide on their reply):
1. **The cut at 0.5.** As ruled, an overturned slice with weight < 1 is whole from 0.5 and dropped below. But the drawn weight is a vertical lerp at the same (x, z), which keeps a lip over its face, so the contact could follow the drawing exactly. The cut makes a full lip end abruptly at a front's 2.5 m end blend and at the fade. The switch is one `if` in `SweptLoft.loftFront` (contact mode).
2. **After touchdown.** The contact holds each slice's last clear frame (one before touchdown) instead of trimming the jet into a cavity loop, because the cases keep only one frame past touchdown. Alternatively, the drawing could hold it too, so drawing = contact exactly.
3. The anchor's motion enters the lip flow only while it hands over, and where fronts overlap the first front's strip wins.

## PR 4, the contact (this branch)

Built: the tip velocity in the library (BRL2), the loft's contact mode, `SweptContact` (parity of lofted triangles, layers, lip flow, tube states), the water through it (`PhysicalSurfWater`, `swept` option), the rider's curl shares, and the runner and page wiring. The page fetches the files once and passes them to the worker in the start options. The full description is in `docs/research/barrel-library.md`, "The contact".

The advisor's six rulings, as applied:
1. **Lip flow:** the tip landmark's velocity by a ±4-frame local line, × √(g h0); ramped from the crest landmark to the tip across the crest, keeping the solver's along-crest flow.
2. **Closing:** down to the seabed after pinning; half-open crossings; no self-crossing after touchdown (held at the last clear frame); overturned slices under full weight cut at 0.5 and counted.
3. **No extra substeps;** measure the cost.
4. **No new trigger:** the parcels' strikes are off at swept spots; a body part reaching the curl's underside takes its share of the lip; "feet under water" ignores lip water.
5. **Tube states:** 'closing' from its own 0.8 T_open [provisional]; 'closed' from touchdown until the slice goes; none before the throw.
6. **covered** = any water above the point in the curl's air, before touchdown.

Rulings made while building (the plan's ledger):
- A point exactly on a slice's ray steps 1 nm into its strip, so the strip's own triangles take the ray's edges. The first build missed the face there; fixed with its own test.
- Test setups adapted to the code: slices found by σ; the rider's tests read `velocity` and `popUpReport.refusal`; the standing setup is the swing test's; the feet band is ±0.4 m because the board sinks under a standing rider on flat water.
- `PhysicalMode.barrel.test.ts` holds the page tests, so the loader's module mock stays out of the other tests.

Deferred minors:
- `SweptContact.index` allocates its strip and box arrays every update.
- A hand touching both the water and the curl keeps only the second share's `handLoad`.
- The page's `SnapshotSurfZone` doesn't know the contact (page-side only).

**Still to do for PR 4:**
- [ ] Rerun the probe on an unloaded machine long enough for tubes to open: `PROBE=1 SECONDS=180 LOG=padang-contact.txt npx vitest run src/wave/probes/padangContact.probe.test.ts`.
  - It logs the update per step, µs per query through open tubes, and a standing rider's cost (2,656 samples a step × µs).
  - On the loaded M1 the toy tube gave 6.4 µs a query, about 17 ms a step for a rider wholly in a tube. If an unloaded run agrees it is heavy, take the advisor's fallback: build each body's slice once a step and lerp per substep. Or precompute each quad's along range per update to shorten the query's scan.
- [ ] Ride a tube by hand at Padang Padang, and take the screenshots owed from #92 (both looks). The browser pane must be shown: a hidden pane throttles the game to about 1.5 fps.
- [ ] Put the advisor's answers to the pending questions into the code and the doc.
- [ ] Agree Part D's fields (`covered`, `clearance`, `tube`) with the Reef owner's session when it runs.

## Next PRs

- **PR 5: crash curve, parcels, sound.**
  - The lip's landing line and the crash parcels come from the barrel's clock (touchdown), not the solver's lip.
  - The swept surface blends into the roller after touchdown (today it fades over 0.3 s, a stand-in).
  - The tube's own foam starts here (PR 3 took the whitewater foam off the curl).
  - The overall plan's open item: the Kennedy onset leads the lip by up to about 2 s and 20 m on the wedge, so where the swept barrel runs, Rich's whitewater, foam and the crash sound should start from the barrel's clock. Agree it with the G9 (whitewater) owner first.
- **PR 6: Rich shading.** Lip glow and a dark throat, Rich only; Classic stays byte-identical except where there is a lip or a tube.
- **PR 7: the switch for every spot, and the deletion** of `PlungingLip.ts`, `Overturn.ts`, `tubeTable.ts`, `tubeCarve.ts`, `LipSheetMesh.ts` and `richLip.ts`. The Reef only after the Reef session agrees and the user looks. Every spot then needs a `BARREL_SLOPE` and cases for its slope.

## The code, by PR

- **PR 1:** `src/wave/barrel/ProfileLibrary.ts` (lookup by slope, foot crest and τ), `profileFormat.ts` (BRL2), `caseFromLibrary.ts` (conversion, tip fit), `barrelLibrary.ts` (loading), `scripts/barrel-library.ts`, `public/barrels/`.
- **PR 2:** `crestOnset.ts`, `BreakingFront.ts`, `sliceClock.ts` (the throw depth 1.56 + 0.56 η_foot, clamped to 0.99–2.50 m foot crests; biweight-fitted throws); `SWEPT_BARREL = ['padang']` in `SurfZoneSimulation.ts`.
- **PR 3:** `frontRecords.ts` (8 floats a point in the snapshot), `sweptLoft.ts` (the loft), `src/scene/barrel/` (mask, mesh, `SweptBarrel`), `WaterSurface.setBarrelEnabled`.
- **PR 4:** `sweptContact.ts`, `nodeBarrelCases.ts`, `src/physics/PhysicalSurfWater.ts` (`swept`, `plainSurfaceAt`), `src/physics/SurfWater.ts` (the layer and Part D fields), `src/physics/AttachedRider.ts` (`applyWater`, `wetForce`), `src/wave/SurfZoneRunner.ts` (`barrelCases`, `contact`), `src/game/PhysicalMode.ts` (`barrelCaseBytes`, `HostExtras`), `src/main.ts`.

## Running things

- Fast checks: `npx vitest run src/wave/barrel src/scene/barrel`, then `npx vitest run src/physics`, `npx tsc --noEmit`, `npm run build`.
- The long Padang stability tests in `src/wave/SurfZoneSimulation.test.ts` take 1–2 h on the M1; run that file only when the solver changes.
- Probes are opt-in: `PROBE=1` (`padangFront`, `padangLoft`, `padangContact` and others in `src/wave/probes/`).
- Under load, the M1 times long tests out: seen here for pumping, standing 20 s, holding a line, the Beach board and the Reef's G9 tube test. Rerun a timed-out test alone before blaming a change.
- In a worktree session, a hook refuses compound shell commands that name git. Run git commands one at a time, and edit files with the Edit tool rather than shell heredocs.
