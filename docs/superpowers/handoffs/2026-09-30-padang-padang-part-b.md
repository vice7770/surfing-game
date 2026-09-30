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

**The advisor's answers on PR 4 (2026-09-30), to build next on this branch.** They confirmed the rest as written: parity, half-open ties and folds, the floor and ceiling fields, `surfaceAt` as the lowest crossing, the lip flow, the tube states, covered and clearance.

1. **After touchdown: keep the contact's hold.**
   - The contact holds the last clear frame (the jet ≥ 2 cells off the face).
   - The drawing keeps the touchdown frame. It's the visual event, and one frame is below what a body part resolves. Don't hold the drawing too: at bigger scales the slit would show (2 cells ≈ 0.2 m at h0 7 m, 0.3 m at 10 m).
   - Neither may outlast the pocket. From touchdown, fade the slice, drawing and contact together, over the game's own collapse time for that tube, √(2W/g) with W the void's height. That is `PlungingLip`'s `collapsed`, the roof's free fall.
     - It comes to about 0.3 s for the Small swell's void (W ≈ 0.5 m) and 0.6 s for a Reef-sized one (1.9 m). It is provisional: G9's mechanism, not a measurement.
     - This replaces `LOFT.handover`'s 0.3 s fade after touchdown.
     - W per slice needs the case's void height: add `W_O` from the metrics to the case header, scaled by h0, or measure it on the held frame (the throat's underside over the face).
   - During the collapse, keep the held frame's jet velocity, blended by the same weight: the water is still coming down.
2. **Follow the drawing; drop the 0.5 cut.**
   - The lerp toward the same h by the same e preserves order (y1 − y2 becomes e(y1 − y2)), so parity holds and the lip shrinks as drawn.
   - Remove the contact-mode cut in `SweptLoft.loftFront` and `LoftResult.cuts`, and rewrite its test.
   - Blend the lip's velocity toward the solver's flow by the same e (per slice, from `sliceWeight`).
   - Add a test: the per-vertex lerp keeps order only where e and h change slowly across a triangle, so sample lerped slices along vertical lines and assert face < underside < top. The tip's shared vertices keep the fold safe.
3. **Overlapping fronts:** first-front-wins is fine only if the drawing uses the same rule; today the drawing shows both. Count the overlaps in `SweptContact.stats`. If they turn out common, prefer the front whose crest is nearer the point along the ray.
4. **The slope clamp (flag 1):** raise `MIN_NORMAL_Y` in `PhysicalSurfWater` from 0.1 to 0.5 (|s| ≤ 1.73, at most 2 × support), provisional.
   - Buoyancy is support × (−s_x, 1, −s_z), which grows as 1/n_y, so 0.1 pushes a body sideways at up to 10 × its buoyancy on the tube's back wall.
   - Better still: clamp at the steepest slopes the height field already gives under riders on the same seas.
   - Keep the unclamped normal (`normalX/Y/Z`) for anything that plans off the face.
5. **No buoyancy in the lip's water (flag 2).** A falling jet's pressure is near atmospheric, so its share takes drag only.
   - This applies to the ceiling share and to a part in the curl's water (`waterFloorY` defined). In `AttachedRider.wetForce`, pass a flag that zeroes `support`.
   - It replaces their earlier "leave it", which held only while the slope stayed small.
6. **Check the anchor velocity (flag 3).** During a handover, compare the stored-velocity lip with a finite difference of the drawn tip over a step; they should agree within the smoothing. If not, the missing term is the blend weight × (the solver crest's speed − the library crest's).

They asked for the tip table (in `barrel-cases.md`, sent) and the cost numbers (sent; the unloaded rerun is still owed).

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
- [ ] Build the advisor's six answers above, with tests, and update `docs/research/barrel-library.md` ("The contact") and PR #95's description.
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
