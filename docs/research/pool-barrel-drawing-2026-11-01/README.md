# The Wave Pool's Barrel mode, step 3: drawing the tube (2026-11-01) — PAUSED

**Status: paused by the coordinator on 2026-11-01, before any game code changed.** The owner changed the Barrel wave: it
will no longer be the mirrored A-frame but a straight wave sent at an angle by the machine onto a straight reef, breaking
first at the right (+x) end and peeling toward −x, the rider starting at the right for one full, uninterrupted wave. The
floor is redone first (its transect feeds the M4 Basilisk runs, on the critical path); this step resumes once the new
floor is merged. The T1/T2/T3 findings below stay valid, and Padang Padang is unaffected by the floor change.

Branch `claude/pool-barrel-drawing`, from main c7fb4176 (step 1, PR #179). No `src/` change yet: this commit holds these
notes, the advisor's probe and the consult-log row.

The owner's approval for step 3: "lip thickness, hollow size, section ends, foam on the lip and the bright edge, using
the remaining Padang tube fixes" (the T items in `docs/superpowers/plans/2026-10-22-padang-foam-and-tube-todo.md`).

## What was found before any build (the state on main)

The brief and the T-note were written against bff9a874 (2026-10-22, morning). Main already holds more of them:

- **T1 route (a) is on main** since 2026-10-22 (566531c0, `docs/research/tube-from-basilisk-2026-10-22`): every swept
  spot draws and collides each case's own Basilisk frames (`TubeShape` `'basilisk'`, `libraryFromBytes`), the bounded-C
  only behind `?tubeShape=c` (online rooms pinned to the default). Measured then on Padang's four cases at 0.5 / 0.8 / 0.95
  of touchdown: lip 0.12–0.22 H (target 0.1–0.2), tip 0.03–0.16 H (late median about 0.10; target about 0.07), void
  0.09–0.22 H² (the advisor ruled then that Pick & Feddersen's 0.25–0.38 H² is a check, not the target: the area is judged
  after the level-13 cases, T4), L/W 2.0–2.1 and tilt 43–44° (Mead & Black's Padang 1.97–2.14, 29–41°). So route (b) (a C
  rebuilt from the cases' own thickness, tip path and void) is not needed; the coordinator's recommendation predated
  finding this. `src/wave/barrel/tubeShape.test.ts` pins those numbers.
- **T2 is partly on main:** `LOFT.endBlend` 1 m at thrown ends and cut ends, young ends over max(1 m, H), no clock taper
  of its own (each slice draws its own τ, the advisor's 2026-10-22 ruling), no minimum run length; the narrowed clock link
  built and tested but left off at Padang (`PADANG_FRONT = { jumpReach: 10 }`), because holes plus folds rose with it
  (Medium 0.47 → 0.49, Big 0.52 → 0.55 a frame; 0 true splits merged). The clock fix and the loft's three-level refinement
  (the fifth ruling) also landed.
- **T3 is not built:** a kept slice (`BrokenCrests`) still paints its lifted vertices with `waterFoamAt(xz)`, the trough's
  foam under the lip (`SweptBarrelMesh.ts:122`), and that foam multiplies out the lip's backlit sheet emission and glow
  (`:202`, `:258`).
- **The pool is not a swept spot:** `SWEPT_BARREL` is `['padang']` (the Canyon left it on canyon-beach-break; its tube is
  `?canyonTube=on`), `BARREL_SPOTS` has no `pool` entry, and no pool case exists (step 2's runs are not done; nothing on
  `origin` at the pause).

## What was in progress

The consult with the water-physics advisor (below), done. Next was the pool wiring, then T3, then the measurements.

**The plan as it stood** (to adapt to the new floor):
1. **The pool's wiring:** a `pool` entry in `BARREL_SPOTS`, the tube on for Barrel only (`sweptBarrelOn` and the page's
   `SweptBarrel.setSpot` keyed on `poolWaves === 'barrel'`, so Training stays byte-identical to main; a pin check as step 1's
   `pin-check.ts`). The pool loads only its own cases (T5): a `POOL_CASES` list in one place, provisional now, so swapping
   in `periodic-pool-barrel-*` is one line; the two real cases read as one A0 family (ruling A2).
2. **Its onset tables** from the frame probe's per-column onsets (ruling A3), the throw at the join (zero lag) until step 2.
3. **T3** as ruled (B5–B9), behind `?lipFoam=old`; the pale band's fix (B10) behind its own switch (Rich only).
4. **Measure:** the shape table per case (pool stand-in and Padang's four) with the tubeShape probe's measures; T2's checks
   (`padangFrontGap` at Padang Medium and Big; the open curl per wave at the pool's sizes); T3's `waterSheetPair` with
   `waterSheetBarrel.brokenFoam`; ride-camera strips at Barrel 1.5 / 1.8 m and Padang Medium, and `?barrelView=sheet`; the
   loft's and the front's cost against main.

## The advisor's rulings (2026-11-01; the consult log's top row)

The advisor ran its own probe of the library at a 4.5 m foot (`advisor-probe/pool.probe.test.ts.txt`, rename to
`.test.ts` to run; its output `advisor-probe/pool.txt`: the pad19 family, padang19s, a20, the Canyon's a38 and the Point's
a30 alone and as a family, foot crests 0.80–1.20 m). Its foot crests 0.88 / 1.12 m (1.5 / 1.8 m faces) are inferred: about
0.73–0.75 of the knee's H, as the Canyon's and Padang's periodic scouts read at similar Ursell numbers. Every drawn size
scales linearly with the foot crest the game measures. **A1–A4 were for the A-frame's arm; on the new straight reef they need
re-reading against its transect** (the principles hold: a stand-in must stand on the solver's face).

### A. The pool's provisional tube

1. **Wire `periodic-canyon23-a38-l13` alone, labelled provisional,** scaled by each slice's foot crest (h0 = η_foot / 0.31).
   Not the pad19 family, not a pick by ψ0. A stand-in must draw its breaker on the solver's face: the pool's breaker height
   over its foot crest is about 1.61–1.67 (the meter's 1.47 / 1.81 m); a38 gives 1.60, at level 13, a periodic wave over a
   submerged crest at 0.17 h0 (the pool's 0.19 h0). The pad19 family at 4.5 m draws H 12–15 % under the face (solitary
   waves, level 12); padang19s alone 35–40 % over it (the young-end cliff again); point21-a30 about as a38 but level 12. ψ0
   doesn't order our runs (padang19s has the highest ψ0 and the smallest void), and the pool's ψ0 (0.110 at 1.5 m on the
   index's basis) lies past every case and Pick & Feddersen's span (0.0889). What a38 draws (0.3 / 0.5 / 0.8 / 0.95 of
   touchdown): H 1.42–1.67 m (1.5 m faces), 1.80–2.12 m (1.8 m); vertical air gap 0.72 / 0.83 / 0.58 / 0.54 m and
   0.92 / 1.06 / 0.74 / 0.69 m; lip 0.15–0.19 H; tip 0.04–0.14 H; open 0.71 / 0.80 s; collapse 0.33 / 0.37 s. Its transect
   is gentler (1:23), so its void is longer and flatter (L/W 2.79) than the pool's should be. Don't scale it toward 1–1.2 m.
2. **The two real pool cases are one family keyed by A0:** their slopes along the ray differ only because the bigger wave
   breaks deeper on the same floor. `ProfileLibrary` groups by the slope in each case file's header (`:356`), so the import
   writes one family slope into both headers and the index, each case's own S1 kept in its notes. Blend the two only if
   both throw a tube (a clear held frame, an open void); a curl or fold goes to `BARREL_CASE_NOTES`. Expected A0 0.19–0.20
   and 0.24–0.26 (inferred).
3. **Onset tables:** band 3.86–3.21 m (Padang's 6–5 m at 7 m scaled; ≥ 1.2 m deeper than the deepest plunging onset, 2.03 m).
   Join rows from the game's own 2D per-column onsets (the frame probe), both sizes, binned by band crest (0.05–0.1 m)
   against the median onset depth, a row only where at least 6 of 12 waves break; not `spotOnset` (a 1D ray misses the
   focus and refraction). Throw at the join, zero lag, provisionally; step 2's vertical depths then give a line through both
   cases, as at the Canyon (bar: unbroken ≤ 20 %). footDepth 4.5 m, `frontFrom: 'fine'` (check every column's 4.5 m contour
   lies inside the 1 m cells). **Crash on:** it replaces step 1's flagged slab with the case's own jet (A_J 0.17 H_I²); then
   re-measure step 1's bars (one line, the peel, the catch); fall back to off if it breaks the line. Outside the tube columns
   the solver's lip still throws the slab (`Overturn.ts:86–93` jumps to it past ψ0 0.0889; clamping ψ0 to the fit's end there
   is a separate change, inferred). **No `tubeFrom`:** gate the tube on the solver's own plunge test at the join (jets on
   97–100 % of onsets at |x| 10–30, 8–18 % past 35), fallback a join-depth floor of about 1.1 m.
4. **L/W:** Mead & Black's X along the propagation direction (R² 0.71; the contour-normal fit 0.57): 1.70 at 1.5 m (1:13.6),
   1.97 at 1.8 m (1:17.7); their range 1.42–3.43, Pipeline 1.56–1.92. The owner's 1–1.2 m open tube is a target to report
   against, not to tune toward (the fits say 0.85–0.9 / 1.05 m; the stand-in peaks at 0.83 / 1.06 m mid-flight).

### B. T3: foam on the lip, and the bright edge

5. **Per slice c0 = w · f:** w the `BrokenCrests` weight; f the raw foam it reads, the crest's for the outer run and the
   face's for the underside and back wall, **latched at the slice's first drawn frame** (by front and metre, as
   `BrokenCrests` already holds after touchdown), then min(latched, live). Clean crests stay 0 (option (a)). Why latch: the
   solver's own onset whitewater reads 0.83–0.91 on Padang Big's crest just before the throw (`brokenCrest.ts:13–18`), which
   a laminar lip doesn't carry; option (a) is about crests white before their front started.
6. **Along the profile:** outer run crest → tip (32 → 64) the crest's value thinned; underside tip → throat (64 → 88) the face's
   value thinned by the same ratio; back wall throat → toe (88 → 112) the face's value, neither thinned nor capped.
7. **Thinning** (inferred: foam conserved over a stretching surface): c = c0 · min(1, L(0) / L(τ)), L the outer arc crest → tip,
   L(0) at the library's τ = 0; c = c0 before τ = 0; uniform along each run (the resampled points don't follow the water); no
   floor. a38's ratio at 0.3 / 0.5 / 0.8 / 0.95 of touchdown: ×0.95 / 1.34 / 2.36 / 3.00.
8. **Cap 0.3** before touchdown, as mix(c, min(c, 0.3), sheetWeight), so it eases in from the crest and the throat: lips are
   laminar until touchdown (Mostert 2022) and carry only the foam they had; stretched foam reads as streaks, about 0.10
   against 0.41 fresh (Koepke 1984, the foam notes); the sheet's emission and glow keep at least 70 %. **After touchdown**
   (every swept spot, inferred, the owner's A/B): the tip turns white (1) within 0.15 s, and the white sweeps back to the
   crest over the collapse, √(2W/g) (`collapseSeconds`).
9. **Lace:** a plain tint on lifted water in both looks (the lace weighted by 1 − lift); Rich may add 1D streaks keyed on the
   coordinate along the crest, constant along the profile, with mean c. Pack per vertex into `sweptLift`, decode in the
   vertex shader.
10. **The pale band is mostly a shading error:** each outer-surface vertex takes the underside's diffuse sky view factor
    (`lipSheet.ts:319–321`), and Rich samples the sky along the exit ray (`SweptBarrelMesh.ts:150–157, 181–182`): from in
    front at lip height that ray really meets the back wall, yet samples the horizon sky (68–97 % of it passes 0.45–1.0 m of
    pool water). Keep the real bright parts (the underside from inside or below, the grazing Fresnel rim at the tip, the sun
    glow). Fix (Rich only): the background per ray, the sky only where `sweptLeaves(exitRay, tip)` holds, else the wall;
    the exit surface's Fresnel transmission, so the curtain fades smoothly to total internal reflection; never the glow's
    k = 8 path for the sky image; Classic unchanged. Bars (inferred): from the side the lip at most 1.3× the back wall below
    it; from inside at least 1.5× it and greenish (G/R ≥ 1.2). The advisor reads the owner's "bright edge" as the README's
    "the lip reads bright" risk (the build is the same either way); confirm with before/after stills.

### C. T2

11. **The clock link stays off at the pool:** its limit, 0.166 s/m, is below the pool's own peel (on the A-frame, 4–5 m/s
    along an arm 65–71° off the crest: 0.55–0.75 s/m along the crest), so it would never fire, and the line has no holes.
    Open-curl band 1.3–3.5 H / tan α with tan α = c / V_x from the front's own throws (about 0.5–1.9 m at 1.5 m, 0.6–2.2 m at
    1.8 m on the A-frame). Risk: the split rule's 1 s/m (`BreakingFront.ts:24`) is near this peel; count refusals and give the
    pool 3 s/m if any (its waves come 10 s apart). **On the straight reef the peel changes: re-derive.**
12. **Nothing new at Padang.** At the pool: report how late the tip's apex throws against its own time (the 2 m line fit across
    the V lags about 0.9–1.2 s; fit each arm separately if over 0.3 s — moot on the straight reef, which has no V); report the
    loft's budget clamps and slice steps over 3 frames (bar ≤ 4 % by crest length).

### D. Bars

13. Lip 0.1–0.2 H; tip about 0.07 H (0.03–0.16 accepted); the void a check only (Pick & Feddersen 0.38 H² at 1.8 m; 1.5 m past
    the fit); L/W 1.70 / 1.97 (re-derive on the new transect). Pool-specific: drawn H within ±10 % of the meter; the vertical
    air gap at the take-off reported against 1–1.2 m and a crouched rider's 1.19 m, not tuned; open time 0.6–0.8 s; wave to wave
    drawn H and air gap within 5 %; lip foam 0 on at least 95 % of slices before touchdown (every pool crest is clean); unbroken
    ≤ 20 %; one front per wave; the loft's cost on the M4 measured.

**The owner's decisions it names:** crash on at the pool (it changes the pool's water); the white after touchdown on every
spot's curl; what "the bright edge" means; any lever on tube size.

## What's next (on resume)

1. Rebase on main with the new straight-reef floor; read its notes for the transect, the peel and the take-off.
2. Re-ask the advisor only what the new floor changes: the stand-in case (A1: is a38 still the one whose H/η_foot matches the
   new face?), the join rows (A3: per-column onsets along the straight reef), the L/W (A4, from the new ray's X), the open-curl
   band (C11, from the new peel). B (T3, the pale band) and the Padang side need no new consult.
3. Build in this order, each with its A/B switch and tests: the pool wiring (Barrel only; Training byte-identical); T3
   (`?lipFoam=old`); the pale band (`?lipBack=old`, Rich); then the measurements and strips listed above.

## Sources

- [Mead & Black 2001](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf) (eq. 6.5, Fig. 6.5–6.6,
  Table 6.1, opened by the advisor).
- [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf), via the fits in `Overturn.ts`.
- Mostert 2022 and Koepke 1984, via the knowledge base (`docs/research/water-physics/`).
