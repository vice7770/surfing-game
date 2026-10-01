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
| Curl colour fix | `claude/padang-curl-colour` | `claude/padang-contact` | in progress (another agent): the curl's lift range, and the overlap footprint to the lifted span |
| PR 5 crash curve, parcels, sound | `claude/padang-crash` | `claude/padang-contact` | in progress (another agent), on PR 4's fade |
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

**The advisor's answers on PR 4 (2026-09-30), now built on this branch** (2026-10-01; the record is `docs/research/barrel-library.md`, "The contact"). They confirmed the rest as written: parity, half-open ties and folds, the floor and ceiling fields, `surfaceAt` as the lowest crossing, the lip flow, the tube states, covered and clearance.

As built, and the rulings taken while building (each sent to the advisor first):
- **Item 7 (the buckets):** 0.5 m buckets along each strip's ray; about 8 quads a query through a tube, against 133; the answers are exactly the full scan's. The quads' ranges are widened by 0.1 mm past their 32-bit rounding, which fixed a lost face crossing on vertex rows; the full scan had it too.
- **Item 1 (after touchdown):**
  - **The held frame** is measured per case when the library loads: the last frame, at or before a frame before touchdown, whose tip stands 2 cells over the face beneath it and 2 cells ahead of its throat.
    - pad19-a30-l12's last two frames have closed onto the face, so it holds two frames before touchdown; the others hold one.
    - pad19-a20-l12's and pad19-a45-l12's last two frames are duplicates and open, so their drawn lip never visibly lands. The fade closes it; **PR 5's crash curve owns the landing's look.**
  - **W** is the held frame's void height (0.48, 1.17, 1.75 and 0.49 m at h0 7 m), so the collapse √(2W/g) takes 0.31–0.60 s.
  - **Each blended case holds at its own held frame** (the advisor's later ruling). The min of the two cases froze a blend on a case that carried no weight.
  - **The drawn and held tips** stand up to 0.33 m apart, at a30's closed frames: the touchdown's own approach, accepted.
- **Item 2:** no cut. On the library's cases the layers can swap by up to 10 mm at the tip where a front's ends ramp the weight; parity holds on every line. About 1 % of lines meet a cell-scale wiggle in the cases' near-vertical undersides. **A light smoothing in the converter is a cleanup for later.**
- **Item 3:** strip-level dropping in the shared loft, counted; the contact's per-point rule is the backstop. The colour agent is changing the footprint to the lifted span on its branch: **don't edit `dropOverlaps` or `hullsOverlap` on `claude/padang-contact`.**
- **Item 4:** the slope is held at tan 60° along the face's direction.
- **Item 5:** drag only.
- **Item 6:** the anchor's following motion is added, with Ṡ the crest's mean pace since its throw (guards: blended in over 0.1–0.3 s, held to 0.5–1.5 × √(g d)). The residual is 0.33 m/s or less until a window before a hold.

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

7. **The query's cost first (their follow-up, 2026-09-30).** The 6.4 µs is a linear scan over all 133 quads of a strip, so do this before the unloaded rerun.
   - In `SweptContact.update`, precompute each quad's along-ray range and bucket the strip's quads by s at about 0.5 m over the profile's ~23 m.
   - A vertical line then tests only its bucket's quads: one per layer, three at most in the overturn. That's about 10–20× fewer tests, well under 1 µs a query even on the loaded M1, so a rider wholly in a tube costs about 1–2 ms a step there, not 17.
   - Keep the early-out: a point outside every front's footprint goes straight to the height field.
   - The lerp-per-substep fallback only saves slice rebuilds (0.37 ms a step), which aren't the cost; don't build it.
   - Take the 180 s rerun when `uptime` shows the load low.
8. **The tip table checks out.** Normalised by each case's own crest speed, the four cases agree: 1.0–1.1 C thrown, about 1.2 C at the peak, falling at about 2/3 g, the periodic case about 10 % slower. It is recorded in `docs/research/barrel-library.md` ("The contact") as the library's values, provisional, beside Erinin 2023's 1.1–1.3 C.

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
- ~~`SweptContact.index` allocates its strip and box arrays every update.~~ Fixed with the buckets.
- A hand touching both the water and the curl keeps only the second share's `handLoad`.
- The page's `SnapshotSurfZone` doesn't know the contact (page-side only).
- The converter could smooth the cases' near-vertical jet undersides lightly: about 1 % of vertical lines meet them three times (a millimetre-wide air sliver in the lip).

**Still to do for PR 4:**
- [ ] Rerun the probe on a quiet machine, long enough for tubes to open: `PROBE=1 SECONDS=180 LOG=<a git-ignored path> npx vitest run src/wave/probes/padangContact.probe.test.ts`.
  - It logs the update per step, µs per query through open tubes, a standing rider's cost (2,656 samples a step × µs), the dropped strips per 1000 (and any with an open tube), the tip gap, and the faces' slopes. Each comes with CPU time and the load.
  - Tried 2026-10-01 on the M1 (load 22–38, 8 GB paging): its worker got 13–20 % of a core and hadn't logged 5 s of sea in 29 minutes, so it was stopped.
  - The toy tube with the buckets: 0.79 µs CPU a query (2.05 µs wall at load 28), so about 2.1 ms CPU a step for a rider wholly in a tube.
- [ ] Ride a tube by hand at Padang Padang, and take the screenshots owed from #92 (both looks). The browser pane must be shown: a hidden pane throttles the game to about 1.5 fps. It was hidden on 2026-10-01.
- [x] Build the advisor's answers 1–6 above, with tests, and the query's buckets (7) before the rerun. Update `docs/research/barrel-library.md` ("The contact") and PR #95's description. Done 2026-10-01; see "As built" above.
- [ ] Agree Part D's fields (`covered`, `clearance`, `tube`) with the Reef owner's session when it runs (it wasn't running on 2026-10-01).

## Next PRs

- **PR 5: crash curve, parcels, sound.**
  - The lip's landing line and the crash parcels come from the barrel's clock (touchdown), not the solver's lip.
  - The swept surface blends into the roller after touchdown. Today it fades over the tube's collapse, √(2W/g) (the loft's `sliceCollapse`, `sliceFade`, `collapseFade`).
  - The tube's own foam starts here (PR 3 took the whitewater foam off the curl).
  - The overall plan's open item: the Kennedy onset leads the lip by up to about 2 s and 20 m on the wedge, so where the swept barrel runs, Rich's whitewater, foam and the crash sound should start from the barrel's clock. Agree it with the G9 (whitewater) owner first.
- **PR 6: Rich shading.** Lip glow and a dark throat, Rich only; Classic stays byte-identical except where there is a lip or a tube.
- **PR 7: the switch for every spot, and the deletion** of `PlungingLip.ts`, `Overturn.ts`, `tubeTable.ts`, `tubeCarve.ts`, `LipSheetMesh.ts` and `richLip.ts`. The Reef only after the Reef session agrees and the user looks. Every spot then needs a `BARREL_SLOPE` and cases for its slope.

## The code, by PR

- **PR 1:** `src/wave/barrel/ProfileLibrary.ts` (lookup by slope, foot crest and τ), `profileFormat.ts` (BRL2), `caseFromLibrary.ts` (conversion, tip fit), `barrelLibrary.ts` (loading), `scripts/barrel-library.ts`, `public/barrels/`.
- **PR 2:** `crestOnset.ts`, `BreakingFront.ts`, `sliceClock.ts` (the throw depth 1.56 + 0.56 η_foot, clamped to 0.99–2.50 m foot crests; biweight-fitted throws); `SWEPT_BARREL = ['padang']` in `SurfZoneSimulation.ts`.
- **PR 3:** `frontRecords.ts` (8 floats a point in the snapshot), `sweptLoft.ts` (the loft), `src/scene/barrel/` (mask, mesh, `SweptBarrel`), `WaterSurface.setBarrelEnabled`.
- **PR 4:** `sweptContact.ts` (the buckets, the backstop), `nodeBarrelCases.ts`, `ProfileLibrary.ts` (`heldFrame`, `ProfileQuery.hold`, `pointAt`, `collapseSeconds`), `sweptLoft.ts` (`collapseFade`, `CREST_SPEED`, `dropOverlaps`, the tip gap), `src/physics/PhysicalSurfWater.ts` (`swept`, `plainSurfaceAt`, the slope clamp), `src/physics/SurfWater.ts` (the layer and Part D fields), `src/physics/AttachedRider.ts` (`applyWater`, `wetForce` with no buoyancy in the lip), `src/wave/SurfZoneRunner.ts` (`barrelCases`, `contact`, the column depth), `src/game/PhysicalMode.ts` (`barrelCaseBytes`, `HostExtras`), `src/main.ts`.

## Running things

- Fast checks: `npx vitest run src/wave/barrel src/scene/barrel`, then `npx vitest run src/physics`, `npx tsc --noEmit`, `npm run build`.
- The long Padang stability tests in `src/wave/SurfZoneSimulation.test.ts` take 1–2 h on the M1; run that file only when the solver changes.
- Probes are opt-in: `PROBE=1` (`padangFront`, `padangLoft`, `padangContact` and others in `src/wave/probes/`).
- Under load, the M1 times long tests out: seen here for pumping, standing 20 s, holding a line, the Beach board and the Reef's G9 tube test. Rerun a timed-out test alone before blaming a change.
- In a worktree session, a hook refuses compound shell commands that name git. Run git commands one at a time, and edit files with the Edit tool rather than shell heredocs.
