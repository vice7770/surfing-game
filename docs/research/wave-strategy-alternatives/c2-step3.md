# C2, step 3: the hand-over and the slices on the 2 m pool, drawn and felt (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
The plan is `c2-plan.md` §1 and §2 step 3; the advisor's decisions are rulings 28, 30 and 31. This step wires the
Basilisk library into the running game for the first time, behind `?wave=library` (off by default, rooms pinned).

**In one line:** it is built and it runs, drawn and felt, with the sea untouched underneath and the game unchanged
without the switch. **Two build rounds, and the bars do not all pass.** The rise under a board and J5 pass; the
crest, the mean step, J1 and J3 pass at 90 % but not at their worst; the hand-over's height bar misses because nearly
every slice clamps a key in the cases not yet run; J2, the folded quads and drawn = felt miss, and the stills show the
overturn's loft. So I hand back, as the brief says, with the traces, the stills and what I would change next.

The short table (round 2's build on all nine cases; section 3 has the numbers):

| Passes | Misses |
|---|---|
| the crest at the hand-over (at 90 %), the mean step (at 90 %), the surface's rise under a board, J1 (at 90 %), J3 (at 90 %), J5 (both parts), off unchanged (the pool, both Canyons), `tsc`, the suite | the height at the hand-over (the keys clamp), J1 and J3 at their worst, J2, the folded quads (after touchdown), drawn = felt at its worst and in the seam mask's band, the stills (the overturn's loft shows: run ends, pleats, dither, a faceted bore) |

Where the library's wave is single-valued (written into the sea's own nodes) nothing shows: no rib, no slit, no line
at the hand-over, in the stills or the numbers. What shows is the overturn's loft.

## 1. What was built

All new code is in `src/wave/library/` and `src/scene/library/`; the rest are small hooks.

- **`Handover.ts`: where and when each slice hands over.**
  - **Lanes.** A slice runs along a straight ray. On this reef the crests meet the reef line at about 77°, so a ray
    square to the incoming crest crosses the face at a slant (slope about 0.02; the sea sees 0.05–0.09). Each lane is
    therefore the straight chord of a refracted ray: traced from the flat platform by Snell's law on
    c = √(g (d + 1.5 m)), from where it crosses the toe to where it reaches the 2.2 m throw contour. The chords are
    smoothed along the crest and never cross. 153 lanes, about 0.7 m apart, 107 m of crest. Lanes that run onto the
    beach are dropped.
  - **Ruling 31's rule.** Each lane follows its sea crests. A slice hands over at the later of two moments: the crest is
    foreseen 5 s before its throw (the time along the lane to the throw contour at √(g (d + η)), sliceClock's own rule),
    or the crest crosses the toe.
  - **The phase on the platform.** A slice handed over at the toe takes each case's clock from that case's own toe,
    plus the time since the sea's crest crossed it (`WaveLibrary`'s new `toe` input). Up the face this share falls to 0
    over 10 m, and H/d matching takes over. This keeps the two rules from stepping apart between neighbouring lanes
    [built so].
  - **The fit.** The raw moments are read on 1 m cells. Each lane's moment, its crest's place past the toe, H and the
    crest height are fitted along the lanes by the 2 m biweight line (sliceClock's rule, clamped to the window's values),
    the keys over 8 m.
- **`SliceField.ts`: the slice records.** σ (the lane), the origin (the crest's place along the lane at t_h), the ray,
  t_h, each case's τ_h, the keys, h0 and the mean level. Each slice is a pure function of time. It runs hidden from t_h,
  blends in from t_h + 0.6 s, is whole until touchdown + 3 s, then blends back to the sea and is dropped. Export and
  import for the sea state (`SurfZoneState.library`), tested by a round trip.
- **`meanLevel.ts`:** a one-period boxcar of the sea at each lane's toe, read every 0.25 s.
- **`zoneSurface.ts`: the hybrid surface.**
  - The blend is in the crest's own frame: y(ξ) = (1 − a) y_sea(ξ) + a y_case(ξ), ξ from each one's own crest, the crest
    at (1 − a) x_sea + a x_case. The case stands on the slice's mean level.
  - Where the blended curve is single-valued and gentler than 50°, its height goes onto the lane's stations, then onto
    each render node from the two lanes beside it: node = (1 − A) η_sea + B. Outside every slice A = 0, so the node is
    the sea's own, bit for bit. A slice's frame fades into the sea over 3 m at its back and its front, and the field
    fades over 4 m at its two ends (smoothsteps: height and slope continuous).
  - Where the curve folds over (the lip, the tube, the bore's front) or stands steeper than 50°, the nodes take a smooth
    cubic bridge under it, out to gentler ground. That bridge is never seen: the loft is drawn there.
  - The sea's drawn foam and air are held off a slice's water until its touchdown (step 5 gives the library its own).
- **`libraryLoft.ts`: the overturn only.** A `LoftResult` from the same curves, so the swept barrel's own mesh, look
  (the lip as a sheet, the dark throat) and contact can be reused. Each vertex lies on the curve where the slice lifts
  (from a steepest segment of 35° to 50°, over the steep span ± 2 m), and on the water as drawn or felt elsewhere. The
  seam mask covers the lifted part and a pad beyond it, and a run of lifted slices ends on two unlifted lanes, so the
  loft and the water meet only where they are one surface [built so; see the misses].
- **`WaveZone.ts`** (the worker's glue) and **`src/scene/library/LibraryZone.ts`** (the page's drawing). The worker
  writes the library's heights into the snapshot's nodes and sends the overturn's curves (`SurfZoneBuffers.zone`); the
  page lofts them over the water as drawn, masks the water, and draws them with `SweptBarrelMesh`.
- **The rider's water.** `PhysicalSurfWater` has a `zone` option: its nodes are the snapshot's nodes, so drawn = felt
  by construction on the single-valued part. The overturn is felt through `SweptContact.forLoft` (the same crossings,
  `ContactHit` as today). The flow stays on today's rule (the sea's), as the brief says. In the zone the sea's rise
  through the bodies' step is weighed out.
- **Wiring.** `?wave=library` (`waveSwitch`, `PhysicalMode.ts`; read on the pool's Barrel only, and the zone is built
  only with `poolSize=ref`); `SurfZoneSimulation` builds the zone after the front and the crash; `main.ts` pins
  `wave: undefined` in rooms. Under the switch the old swept tube is not drawn or felt; the front and the crash still
  run in the sea underneath, so the sea is the same as without the switch.
- **The cases.** `scripts/barrel-library.ts --format brl3 --game` writes game files (`gameCase`): the frames, uses and
  path to touchdown + 6.5 τ, no velocity, no QOUT (0.66 MB each). `public/library/` and `src/wave/library/libraryCases.ts`.
- **Tests:** `src/wave/library/zone.test.ts` (11), and the switch in `PhysicalMode.test.ts` (1).
- **The probe:** `c2-step3-bars.ts` (here). It replays the game's path headless, feels the water as the runner does,
  and rebuilds the page's drawing from the snapshot.

## 2. The cases (and the clamps)

- **Shipped:** all nine of the first set, level 12, from `…/scratchpad/c2runs/docs/research/pool-c2-library/data/*_c2.json.gz`
  (the set finished at about 08:00): beds b1 (slope 0.036, HS/h0 0.19), b2 (0.068, 0.205), b3 (0.105, 0.30) × A0 rows
  0.15, 0.25, 0.355. 0.65–0.70 MB each, 5.8 MB in all (`public/library/`). `pool_c2_b1_a1` throws no tube (a spill on the
  gentlest bed at the smallest A0).
- **During the step** the set was not finished: round 1 ran on six cases (no A0 0.15 row), round 2 on seven (b3_a1
  added). The re-measure in section 3 ran on all nine.
- **The clamps** (each slice where its blend starts, all lanes; the nine-case run of section 3):
  - **τ clamps:** 962 of 1 264 slices blend a case clamped below its first frame (the slice's H/d under the case's at
    τ −8): b1's three cases for 87–100 % of their weight, b2_a2 for 28 %, b2_a1 15 %, b3's never.
  - **slope:** 330 (26 %): under 0.036 at the reef's far end, over 0.105 at its start (the convex end, where rays cross
    the contours steeply: 0.12–0.16).
  - **A0:** 231 (18 %), below the A0 0.15 row (in round 2, without it: 723).
  - **HS/h0** is never a key yet (one bed per slope): every slice takes its bed's, as in step 1b.
- What will come from ruling 31's ten runs (section 7): the A0 0.12 row below every bed, two slopes between the beds, and
  the steep end at the pool's own reef depth. They are what the height bar needs.

## 3. The bars

The probe `c2-step3-bars.ts`, sea from 40 to 130–150 s on the solver's clock (about 9–13 waves along 153 lanes), the
owner's switches. Round 1: six cases, the plan's 1.2 s blend. Round 2: seven cases, a 2.4 s blend, the seam mask's pads,
and my measures corrected (J2 skipping the lip's zero-length segments, quads skipping slivers and counting only the
lifted part, J3 on the lanes' own stations as ruling 17 read it at the loft's vertices). The last column is round 2's
build again, on all nine cases, with J5 read at exactly 1 m (round 2's read compared lanes up to 2 m apart).

| Bar | Round 1 | Round 2 | Round 2, nine cases | |
|---|---|---|---|---|
| **At the hand-over** (where each slice's blend starts) | | | | |
| Crest: the case's over still water less the sea's, within 0.25 m | p90 0.239; 11 % over | p90 0.233; 10.5 % over | p90 0.187; 8.5 % over | **pass at 90 %** |
| Height: the case's H over the sea's, 0.95–1.05 | median 1.07; 62 % outside | median 1.07; 62 % outside | median 1.07; 60 % outside. Without a τ clamp: median 0.987, p90 1.036, 16 % outside (245 slices) | **miss** (the clamps) |
| Mean step under a board ≤ 0.03 m | p90 0.026; 6.8 % over; most 0.23 | p90 0.016; 2.8 % over; most 0.11 | p90 0.018; 3.1 % over; most 0.125 | pass at 90 % |
| The surface rising under a board ≤ 0.4 m/s median | median 0.04; p90 0.29 | median 0.00; p90 0.17 | median 0.01; p90 0.19 | **pass** |
| **Along the crest** | | | | |
| J1: the share's step between neighbouring lanes, 0.05 m at 90 %, 0.10 at most | p90 0.091; most 1.07 | p90 0.045; most 1.27 (2.1 % over 0.10) | p90 0.044; most 1.07 (1.9 % over 0.10) | pass at 90 %, **miss at most** |
| J2: the face's slope between neighbours, 2° at 90 %, 4° at most, the course's two ends | start p90 173° (my measure) | start p90 2.96°, end p90 4.19°, most 74° | start p90 2.83°, end p90 4.94°, most 119° | **miss** |
| J3: at the zone's edges, height 0.01 m, slope 2° | p90 0.012 m, 3.3° (on the nodes) | p90 0.0044 m, 1.0°; most 0.030 m, 6.8° | p90 0.0044 m, 1.0°; 99 % 0.011 m, 2.4°; most 0.025 m, 5.7° | pass at 90 % |
| J5: the share's step 1 m apart over 0.2 in under 5 % of pairs (in the course) | 11.4 % (all pairs) | 13.1 % (lanes up to 2 m apart) | 4.7 % of 11 771 | **pass** |
| J5: the crest place off its neighbours' line over 0.5 m in under 10 % | 11.9 % | 9.5 % | 7.5 % | **pass** |
| **The mesh and drawn = felt** | | | | |
| No mesh quad over 90° (the contact's loft) | 6 % of quads (all, slivers too) | 7.6 % of lifted quads | 6.1 % of lifted quads; before the throw 45 of 200 037; the open tube 1 436 of 166 305; after touchdown 80 842 | **miss** (the bore) |
| Drawn = felt within 0.005 m, where the seam mask is off | p99 0.012; most 0.37 | p99 0.009; most 0.64 | p99 0.011; most 0.95 | **miss** |
| … where it is on | p99 0.003; most 0.038 | p99 0.007; most 0.040 | p99 0.007; most 0.040 | **miss** |
| … in the dithered band (the loft against the water) | p90 0.066 | p90 0.032 | p90 0.032; p99 0.20 | **miss** |
| Stills: no rib, no slit, no edge at the hand-over | | | see section 4 | |
| Off is unchanged | | | see section 6 | **pass** |

What the breakdowns say [M]:
- **The height bar is the clamps.** Of 1 264 slices, 962 have a case clamped below its first frame. By case: b1's three
  are clamped for 87–100 % of their weight, b2_a2 for 28 %, b3's never. Where no case clamps with over 5 % weight
  (245 slices), H is 0.987 of the sea's at the median, 0.95–1.05 for 84 %. The slices with a gentle ray (slope under
  0.068) blend b1, whose waves at τ −8 already stand higher than the sea's. Ruling 31's slope 0.055 (b15) and the A0
  0.12 row are what this needs.
- **The folds are the bore.** Before the throw: 45 folded quads in 200 037. The open tube: 1 436 in 166 305 (mostly the
  lip's underside). After touchdown: 80 842 in 1 120 000 (the bore's roller front is a small fold, and neighbouring
  slices' folds do not line up). Plus 4 435 between neighbours in different phases (one thrown, one not).
- **The ribs are small before the throw, large after it.** The middle lane off its neighbours' line, at the same world
  point, at 90 %: before the throw 0.025 m (behind the crest), 0.041 m (the face), 0.030 m (ahead); the open tube's face
  0.24 m; after touchdown 0.11–0.23 m. The sea's own step between neighbouring lanes is 0.048 m at 90 %.
- **J5 passes once read at 1 m** with the 2.4 s blend (round 2's 13 % compared lanes up to 2 m apart).
- **Drawn = felt** [M]. Run again without `afterTube=roller` (40–95 s, `round2-nine-cases-no-lens-bars.txt`): where the
  seam mask is on, **exact** (0.0000 at its worst); so that line's 0.040 m above is the after-tube lens, which is drawn
  only by its own design. Where the mask is off: 0.0000 median, 0.0012 at 90 %, 0.011 at 99 %, **0.95 m at worst**. The
  worst points (`drawn-felt-worst-points.txt`) all lie inside the contact's loft where its seam mask is off: neighbouring
  slices' same points stand metres apart along the lanes (different phases, mostly after touchdown), so a strip's flat
  triangles leave the water's cubic surface even where both corners lie on it. The water draws the nodes; the contact
  answers the strip. Section 8, point 2.
- The cases throw 5.05 s (median; 4.4–5.7) after their hand-over, and 37 % of slices hand over at the toe.

## 4. The stills

Headless, the water sheet (`scripts/browser/headless-shot.mjs sheet`, the sea on the GPU), the 2 m pool at Big with the
owner's switches, 70 s of sea, the seven cases of round 2. JPEGs in `c2-step3-stills/`:

| Still | What I see |
|---|---|
| `library-front-midday.jpg` | The shoulder and the water in front are smooth: no rib, no slit, no line where the wave was handed over. **But the overturn's loft ends in a hard vertical "box end"** on the shoulder side, a stippled (dithered) edge there, and the bore behind the tube is drawn as jagged facets. |
| `library-front-sunset.jpg` | The same, plainer in low light: the box end, **horizontal pleats on the loft's steep face**, and the faceted bore. |
| `library-channel-midday.jpg` | From the channel: the shoulder in front (the library's single-valued wave in the sea's own nodes) is smooth, no seam. The tube in the distance is the same slab with a hard end and a stipple. |
| `library-inside-midday.jpg` | Inside: the tube's wall shows **zig-zag pleats** (slice to slice), and a stipple at the edge on the left. |
| `off-front-midday.jpg` | Without the switch, today's tube: smooth tube, the known pleated shoulder. |

So, honestly: **the hand-over itself does not show** (no edge where the sea becomes the library, on the shoulder or in
the trough), which was the owner's main worry. **The overturn's loft shows**: its run ends, its pleats and its
dither. Section 8 says why and what I would change. (The `lineup` view was taken too; it looks at the beach and shows
nothing of the wave, so it is not kept.)

## 5. The cost

Measured on this M1 under load (three Basilisk jobs the whole time), two ways:
- **The bars probe** (CPU sea, no page; ms a step, median / 90 %):
  - the hand-over and slices (the lanes' crests, the fit, new slices): 0.91 / 1.19;
  - the zone's surface (blends, lanes, nodes, curves): 2.58 / 2.95;
  - the contact's loft, built over every lifted slice in the probe: 2.15 / 2.59. In the game it is built only within
    30 m of the board and the fallen surfer (added after round 2), so it costs less.
- **The headless fps trace** (Chrome, WebGPU, the sea on the GPU, an idle prone rider, 60 s, back to back):
  - without the switch: 60.5 fps mean, lowest second 59; the worker's whole step 33.7 ms mean;
  - with `&wave=library`: 60.5 fps mean, lowest second 60; the worker's whole step 32.1 ms mean; **the page's library
    draw (loft, mask, mesh) 5.2 ms mean (2.1–7.6 per second)**.
  - On this loaded M1 the worker's step is about 33 ms both ways, so the sea runs at about 0.55 × real time either way;
    the library's 2–3 ms do not show in that noise. The page's 5 ms is the new cost that matters (today's barrel drew in
    2.5–2.9 ms on the M1).

## 6. Off is unchanged

With `wave` unset nothing new is built: no zone, no lanes, no slices, no `library` key in the sea's state, an empty
`zone` buffer in the snapshot. Checked [M]:
- **The 2 m pool (the Barrel, `?poolSize=ref` and the owner's switches), main against this branch**, 900 steps (15 s)
  from the same spun-up sea: the solver's arrays, the foam and air, every step's snapshot surface and the front's records,
  hashed: **0545d279d79bafe7 both**, lip jets 278 both. (The game's `m1-cpu-bench.ts` builds the pool's training floor
  only, so this check is its own: `c2-step3-runs/pool-off-hash.ts`, run once from each tree.)
- **The Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, a fresh spin-up as the recipe's first run):
  - Canyon B (`?canyonWaves=true`): snapshots **a367d938f15fa934**, state **9e5831f80e38abd9**;
  - the default Canyon: snapshots **ea3d57a4d49f4b48**, state **a1a2555739210f96**;
  - both equal main's (state files in `…/scratchpad/c2s3`). A first try started from step 1b's saved state file gave
    other hashes: that file holds the sea as 32-bit floats, so a run from it is not the recipe's fresh first run.
- `npx tsc -b --noEmit` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation.test.ts` and `SurfZoneRunner.test.ts`):
  **350 files passed**, 37 skipped; **3390 tests passed**, 23 expected fail, 43 skipped (main: 348 files, 3373 tests).
  One old test lists the snapshot's transferred buffers; the new `zone` buffer was added to its list.

## 7. The queued runs (ruling 31's ten)

- **Lines:** ten, in `tools/basilisk/run_periodic.sh` (`C2_MORE`) and `canyon_pipeline.py` (`C2_CASES`, two new bed
  notes), as step 1 added its nine. Every old compile line is byte-identical (`run_periodic.sh flags`: the first 68
  lines the same; 20 new):
  - the A0 0.12 row (H/h0 0.19 by step 1's H/h0 → A0 rule) on the three beds: `pool_c2_b1_a0`, `_b2_a0`, `_b3_a0`;
  - slopes 0.055 and 0.085 on the bed line (HS/h0 0.199 and 0.249, between b1–b2 and b2–b3), at the A0 0.25 and 0.355
    rows: `pool_c2_b15_a2`, `_b15_a3`, `_b25_a2`, `_b25_a3`;
  - slope 0.105 at HS/h0 0.20, the three rows: `pool_c2_b3s_a1`, `_b3s_a2`, `_b3s_a3`.
  - Each bed as step 1's: a ray crossing the 1:9.5 reef at cos α = S / 0.1053, its top 1.34 / cos α h0, its back slope
    0.1 cos α.
- **Folder:** `…/scratchpad/c2runs2`, an export of this branch's `tools/basilisk`, `scripts` and `src` at c1a2f24d
  (`EXPORTED_FROM`), `node_modules` linked, its own `c2.sh` (runs in `c2runs2/tools/basilisk/runs/c2`, the report and
  the C2 files to `c2runs2/docs/research/pool-c2-library-r31/`).
- **Started:** 08:05 on 2026-11-13, once the first set had finished (the first set: all nine analysed; `pool_c2_b1_a1` threw no
  tube). Three at a time (`-j 3`), the costliest row first. `bash …/c2runs2/c2.sh status` for where they are; it resumes
  from its checkpoints after a stop (`bash …/c2runs2/c2.sh start`).
- About 10 h at three at once (ruling 31). Disk: about 0.4 GB a case, so about 4.5 GB; 15 GB were free at the start.

## 8. What I would change next (for the advisor)

The misses have causes I can name from the traces; I did not build a third round (the brief: hand back after two).

1. **The loft's box ends (stills; J1's and J2's worst; the folded quads).** A run of lifted slices ends where a slice's lift
   falls to 0 on its neighbour. The lift comes from the steepest segment (35° to 50°), so it should fall smoothly along
   the crest. It does not in places, because neighbouring slices sometimes stand at quite different clocks:
   - **Outliers in the raw hand-overs.** The hand-over line's trace (`c2-step3-runs/handover-line-one-wave.txt`, round 1's build) shows lanes 8–12 matched at
     H/d 0.11–0.13 between neighbours at 0.27–0.37: the crest finder took a small bump there, and the 2 m line fit is not
     robust to it. A robust fit (reject raws far off the local line) is the fix.
   - **The A0 axis may switch segment.** The matcher projects the slice onto the polyline through its cases and keeps the
     nearest segment; off the polyline the chosen segment can change between neighbours, and the weights jump. Step 1b's
     design; worth a check before step 4.
   - **The bridge under the overturn appears at once.** The nodes take the low bridge as soon as a slice passes 50°, while
     the loft's lift is still easing in from 35°. The bridge should be weighed in by the same lift (heights =
     (1 − L) × the curve's + L × the bridge), so a slice with a small lift has nodes on its own curve.
   - **The run's ends along the crest need their own taper** of a few metres (the old loft's `endBlend`), not one lane.
2. **Drawn = felt off the mask, and the dither stipple.** (a) The contact should answer only where its hit triangle's
   own seam mask is on (by its weights), and leave the water's nodes to answer elsewhere: then drawn = felt is exact
   outside the drawn loft by construction (the worst 0.95 m above is that). (b) The stipple: The seam mask's texture reaches a node (1 m) past the triangles
   that set it, and the lanes are 0.5–1 m apart, so the texture is partial over lifted triangles at a run's end and at a
   lift's end along the curve. Fix: two unlifted lanes with a whole mask before the fading lane, and a 2 m pad along the
   curve (now one lane and 1 m).
3. **The faceted bore.** After touchdown the cases' bore has small folds (its roller's front). The loft draws them as
   facets. Lift only the tube (to touchdown + its collapse), and bridge the bore's folds in the nodes.
4. **The hand-over's height (H 0.95–1.05).** Nearly every slice clamps a key (section 2). It needs the A0 0.12 row, the
   two slopes between the beds and the steep end at HS/h0 0.20: ruling 31's ten runs (section 7). Then the bars again.
5. **J5 (the share's step 1 m apart).** On this reef the hand-over line sweeps along the crest at only about 3.7 m/s in
   the middle, so the plan's 1.2 s blend steps 0.34 a metre; I used 2.4 s. The advisor may prefer to define the
   blend's course in space along the crest (metres) rather than in time.
6. **Cost.** Worker about 2–2.5 ms over the sea's step on the M1 (the plan's step-7 budget: 1 ms). Page about 5 ms.
   The slices hidden in the zone's middle need no surface every step; the node walk and the contact are already cut to
   the live parts. Step 7.
7. **The flow** is still the sea's, which runs about 1 s ahead of the library's wave near the throw (step 1b's late
   break). A rider will feel the water's push in the wrong place until step 4.

## 9. How the owner rides it

Menu → Wave Pool → Waves: Barrel, with:

`?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library`

- Which old pool switches still matter under `wave=library`:
  - `poolSize=ref` is needed: the library zone is built only on the 2 m pool.
  - `tubeLook=merge` and `lipLook=fray` still shape the overturn's look (the same mesh draws it).
  - `afterTube=roller` still draws the sea's after-tube lens (drawn only), now at the sea's own bore, faded inside a slice.
  - `wallBody=stream`, `poolReach=long`, `tubeForm`, `loftMesh`, `wallFoot`, `crestLine` change only the old tube and its
    contact, which are not drawn or felt under the switch. They still change the sea underneath only through the front
    and the crash (as without the switch).
- What to look for: the shoulder up the line (where the wave is handed over), the wave's face as it steepens, and
  whether the lip and the tube join the water with no line.
- It is not ready to judge the ride: the flow is the sea's, which runs ahead of the library's wave (step 4).

## Files and how to run them again

- `c2-step3-bars.ts`: the bars' probe. From the repository's root:
  ```
  npx rolldown docs/research/wave-strategy-alternatives/c2-step3-bars.ts -o <scratch>/bars.mjs --format esm --platform node
  node <scratch>/bars.mjs --cases public/library --cache <scratch>/sea21.bin --from 40 --until 130 [--search '?poolSize=ref&…']
  ```
  The first run spins the sea up and keeps it in `--cache`; later runs start from it.
- `c2-step3-runs/`: the three bars runs (`round1-bars.txt`, `round2-bars.txt`, `round2-nine-cases-bars.txt`), the run
  without the after-tube lens (`round2-nine-cases-no-lens-bars.txt`), one wave's hand-over line lane by lane, the fps
  traces, the Canyon byte check and the pool's off check (with its script).
- `c2-step3-stills/`: the five JPEGs of section 4. The stills were taken with
  `node scripts/browser/headless-shot.mjs sheet --serve=$PWD --port=5199 --out=<dir> --compute=gpu --spot="pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library" --shots=curl-front:rich:midday,curl-channel:rich:midday,curl-inside:rich:midday,curl-front:rich:sunset,curl-channel:rich:sunset --advance=40 --first=skip`.
- The fps trace: the earlier sessions' headless tool (`…/scratchpad/fps-ab/fps.mjs`) with the menu's clicks to the
  Wave Pool's Barrel (`…/scratchpad/c2s3/fps/fps-pool.mjs <url> 70`), on a vite of its own on 5199.
- Not run: rider sessions, catch reports and autopilot rides (the brief's rule); the Classic look's stills.
