# The Wave Pool's Barrel, step 3: drawing the tube (2026-11-01)

The owner's approval for step 3: "lip thickness, hollow size, section ends, foam on the lip and the bright edge, using
the remaining Padang tube fixes" (the T items in `docs/superpowers/plans/2026-10-22-padang-foam-and-tube-todo.md`).
"The bright edge" is the lip's backlit translucency (the coordinator, 2026-11-01): the thin lip glowing when lit from
behind, kept by T3's cap until touchdown. It is not a feature of its own.

Branch `claude/pool-barrel-drawing`, rebased on main 9f4a9eb1 (PR #180, the straight-reef Barrel). It was paused once,
when the owner changed the Barrel from the A-frame to the straight reef, and resumed on the new floor. The water-physics
advisor's consults are the consult log's rows of 2026-11-01 ("Pool Barrel drawing"). The advisor's probes are in
`advisor-probe/`, the run summaries in `runs/`, the stills in `stills/`. No rider sessions were run.

## In one paragraph

The straight Barrel now draws and feels the swept tube on its reef's plunging section (its own front, crash on). It uses
a provisional stand-in case, the Canyon's a38, until the owner's level-13 runs on the reef land; the swap is one line.
- **The tube:** a breaker within about 5 % of the surf meter's face, with a lip 0.15–0.19 H thick. The vertical air gap
  under the lip is 0.63 m at 1.5 m faces and 0.83 m at 1.8 m (medians of open slices; each wave's p90 is 0.80 / 1.04 m).
  It opens on every wave from the take-off to s 80–90, a longest open run of 4.4 / 5.2 m a wave, and touches down
  0.7–0.8 s after it throws.
- **T3, every swept spot:** the lip carries its crest's foam, thinned as its surface stretches and capped so it stays
  translucent until touchdown; then the landing's white sweeps over it.
- **The pale band:** along the Rich lip from in front it is mostly gone. Measured, it was the glow and an unshadowed wall
  behind the lip, not the sky; both now follow where the sun can actually reach.

T1's shape was already each case's own Basilisk frames on main (since 2026-10-22), and so were T2's 1 m ends. The clock
link stays off at both spots, as ruled.

## What was on main already (T1, T2)

The brief and the T note were written against bff9a874 (2026-10-22, morning). Main already holds:
- **T1 route (a)** (566531c0, `docs/research/tube-from-basilisk-2026-10-22`): every swept spot draws and collides each
  case's own Basilisk frames (`TubeShape` `'basilisk'`); the authored bounded-C is behind `?tubeShape=c` only. The
  advisor ruled then that the void is judged on the level-13 cases (Pick & Feddersen's 0.25–0.38 H² is a check, not a
  target) and that nothing is enlarged. So route (b), the coordinator's recommendation, is not needed. Hollow size stays
  the cases' own (no levers in this job, the coordinator).
- **T2:** 1 m end blends at thrown and cut ends, young ends over max(1 m, H), no clock taper and no minimum run length; the
  narrowed clock link is built but off at Padang (`PADANG_FRONT`).

## What this branch builds

### The pool's tube (straight Barrel only)

- **The switch:** `sweptBarrelOn` turns the swept barrel on at the pool only on the straight floor (`SWEPT_POOL_FLOORS`).
  Training and the A-frame (`?poolBarrel=aframe`) never draw it, even when asked. The pool is in `SWEPT_BARREL`.
  - `?poolTube=off` gives the straight Barrel as merged: no swept tube, the solver's white and its lip sheet.
  - `?poolCrash=off` keeps the tube drawn and felt, with the solver's own lip throws instead of the tube's jets.
  - Online rooms pin both to the default (`main.ts`).
- **Its cases (T5):** `POOL_TUBE_CASES` (`barrelLibrary.ts`) is the pool's own list; `barrelCasesFor('pool')` loads only
  those. **PROVISIONAL:** the Canyon's `periodic-canyon23-a38-l13` alone, Froude-scaled by each slice's foot crest.
  - **The rule** (the advisor's, 2026-11-01): a stand-in must draw its breaker on the solver's face, within about 10 % of
    the meter's.
  - **a38:** at the foot crests the game measures on the face's knee (0.84 m at 1.5 m faces, 1.08 m at 1.8 m) it draws
    1.35–1.52 m and 1.74–1.96 m over a flight, against the meter's 1.52 / 1.79 m.
  - **Padang's four cases** draw 1.30–1.33 and 1.45–1.52 m, 13–19 % under (`runs/shape-feet.txt`). The advisor's
    re-ruling had picked them on inferred foot crests, 1.17 / 1.51 m, 40 % above the measured ones; its own rule picks a38.
  - **Caveat:** a38 ran on a gentler 1:23, so its void is longer (L/W 2.5–2.9) than Mead & Black's 1.8–2.2 for this reef.
- **One family (`BarrelSpot.family`):** the real cases will differ in slope only because the bigger wave breaks deeper on
  the same reef. `libraryFromBytes(bytes, shape, 'pool')` gives every case the pool's slope, so a slice blends them by its
  own A0, and each case's file keeps its own slope.
- **Its transect (`BARREL_SPOTS.pool`):**
  - **Slope:** 1:18.7, the 1.5 m case's along the ray, as the family's.
  - **The foot, `POOL_FOOT_DEPTH` 4.4 m:** sized on the face's knee. At the platform's seaward edge, 20–100 m out, the
    plunging section's crests stood 13–20 % lower than 10 m seaward of the knee (the advisor's 5 % rule; `runs/join-*.txt`).
  - **Front and band:** `frontFrom` fine; band 3.86–3.21 m (Padang's 6–5 m at 7 m, scaled).
  - **Join rows** (`POOL_JOIN`): where the solver's white starts on u 40–90, against the band crest the front reads there,
    one row per machine height (1.05, 1.15, 1.27, 1.32 and 1.4 m at the feed). They come from the straight floor's frame
    probes and this branch's join probe.
  - **The throw:** at the join (zero lag) until step 2. `joinPast` is 3 H.
  - **`frontAt`:** the reef only, s 20–100, no more than 30 m behind its crest line.
- **Where it departs from the advisor's rulings** (measured; logged for the advisor):
  - **Join rows from the white, not Kennedy's fresh onset.** On this oblique peel the white reaches a column along the
    crest before its own crest rises fresh. Fresh onsets fire on only 10–67 % of the plunging section's columns, 0.3–0.8 m
    shallower than the white, so a tube thrown there would trail the white line by 4–10 m.
  - **`joinPast` 3 H, not 1.5 H.** At 1.5 H each plunging column joined 0.67–0.83 of the waves at 1.5 m faces and
    0.17–0.5 past s 70 at 1.8 m. The white's onset depth spreads 1.11–1.70 m (p10–p90) at 1.5 m faces, and 1.5 H covers
    only 0.15 m of depth on the 1:12.4 face.
  - **The plunge gate by place, s ≤ 100.** The solver's plunge test doesn't run where the crash is on (`throwLip`). Past
    s 90–100 jets fall under half the onsets, and late joins drew tubes on the spilling bores at s 120–180 when the front
    ran to s 205.
  - **The foot at the knee:** the advisor's 5 % rule, measured.

### T3: the foam a lip carries (every swept spot)

The advisor's rulings B5–B9; the owner approved T3's amendment of option (a); the coordinator made the landing's white
the default.
- **`BrokenCrests`:** latches each place's crest and face foam when it is first drawn (by front and metre, as it already
  held after touchdown). A slice's lip carries the kept share times the lesser of then and now, so a clean crest carries
  none. `outer` is the crest's, for the outer run; `face` is the face's, for the underside and the back wall.
- **`lipFoamAt`:**
  - The outer run (crest to tip) and the underside (tip to throat) are thinned by the stretch L(0)/L(τ) of the
    crest-to-tip arc (the loft's new `sliceStretch`).
  - Both are capped at 0.3 as far as the point is a sheet, until touchdown: the lip stays translucent and backlit, and its
    sheet light keeps at least 70 %. Lips are laminar until touchdown (Mostert 2022), and stretched foam reads near 0.10
    against 0.41 fresh (Koepke 1984).
  - The back wall keeps the face's foam, unthinned.
  - After touchdown (`sliceAfter`), the tip turns white within 0.15 s and the white sweeps back to the crest and the
    throat over the collapse, √(2W/g).
- **Packing:** `sweptLift` packs the lift (in thousandths) and the lifted water's own foam (its fraction), since WebGL2's
  attribute budget is full. Lifted water takes its foam as a plain tint; the lace lies only where the curl rests on the
  water.
- **A/B:** `?lipFoam=old` (`waterSheetBarrel.lipFoam = 'old'`) draws it as main does.

### The bright edge: the pale band along the Rich lip

The advisor's B10, re-ruled after the measured split (consult log). Rich only; Classic is unchanged. `?lipBack=old`
(`waterSheetBarrel.lipBack = 'old'`) draws it as main does.

| Padang Medium, held curl (11.9 m open), Rich, midday, `curl-front` | lip | over its dark sheet |
| --- | --- | --- |
| main | 0.341 | glow 0.125, background 0.11 (sky 0.02), crest scatter 0.07 |
| first ruling (sky per ray) | 0.363 | made no difference: the wall term dominated |
| this branch | 0.240 | outer run's own light 0.134 → 0.052; the rest is the underside, backlit |

The terms were split by recompiling the program with one removed at a time; the back wall is 0.090.
- **The glow** on the outer run now fires only where the sun gets into the tube. Its `max(0, −n·L)` fired on the curl's
  downward-facing front under a high sun.
- **The crest light's lobe** narrows from pow 4 to pow 16 (Petzold's forward scattering via Mobley 1994; the exponent is
  inferred). On the outer run it counts only with the sun behind the wave or getting in.
- **The wall behind the lip** is lit as the drawn back wall is: the wall point's F_w and F_l (packed into its normal's
  length), and the sun through the lip unless it gets in.
- **The sky through the lip** comes only out of the tube's mouth, from the ray's exit point.
- **Where I evaluate the tests:** the advisor said the far point. I evaluate "the sun gets in" from the slice's wall point
  (`vSweptWallView.z`, in the vertex) and the sky from the exit point along the crest. From any point on the sheet near the
  tip, the tip's vector shrinks to nothing and the opening test flips: the per-ray first try let 0.1 of sky through, by
  measurement.
- **The bars:**
  - **Outer run** (front, close and ride views at midday): its own light falls 45–60 % (0.134 / 0.155 / 0.157 → 0.052 /
    0.088 / 0.081).
  - **The lip region from in front** is still 2.7× the wall (main 3.8×) at Padang, because from 0.5 m under the crest one
    sees the underside, lit through its far side: the backlit lip, the bright edge.
  - **The pool's pale water** (its white floor) gives 1.15× from the front and 0.94× along the ride view (main 1.03 / 0.83);
    inside 1.18× (main 1.31×), under the advisor's 1.5×. G/R is 2.1–2.5 everywhere.
- **Flag (the advisor, not built):** the glow's k = 8 path assumes an aerated lip. A laminar lip scatters several times
  less, so the underside's glow is probably too strong for clear water. This is the owner's look call.

### T2 (no change)

The clock link stays off at both spots (the advisor's C11 and the 2026-10-22 bar). At the pool its 0.166 s/m falls within
the pool's own 0.11–0.24 s/m, and nothing measured asks for it.

## Measurements

### T1: the shape against the targets (`runs/shape.txt`, `runs/shape-feet.txt`)

At 0.5 / 0.8 / 0.95 of touchdown, as the drawing holds each case. H is the drawn crest over the lowest point ahead.

| Case (foot crest / foot depth) | H (m) | Lip (H) | Tip (H) | Void (H²) | L/W | Air gap (m) |
| --- | --- | --- | --- | --- | --- | --- |
| Padang padang19s (0.99 / 7) | 2.28–2.24 | 0.19 / 0.20 / 0.15 | 0.03 / 0.07 / 0.06 | 0.17 / 0.12 / 0.09 | 3.9–6.0 | 0.78 / 0.58 / 0.47 |
| Padang a20 (1.40 / 7) | 2.02–1.96 | 0.21 / 0.22 / 0.19 | 0.03 / 0.09 / 0.10 | 0.21 / 0.17 / 0.10 | 3.5–5.6 | 0.78 / 0.65 / 0.48 |
| Padang a30 (2.10 / 7) | 2.83–2.58 | 0.21 / 0.18 / 0.16 | 0.07 / 0.13 / 0.16 | 0.18 / 0.19 / 0.20 | 2.07–2.22 | 1.49 / 1.21 / 1.18 |
| Padang a45 (3.15 / 7) | 4.00–3.69 | 0.16 / 0.14 / 0.12 | 0.07 / 0.12 / 0.09 | 0.21 / 0.21 / 0.23 | 2.13–2.40 | 2.11 / 1.80 / 1.76 |
| Pool 1.5 m, a38 (0.84 / 4.4) | 1.52 / 1.40 / 1.35 | 0.19 / 0.17 / 0.15 | 0.06 / 0.12 / 0.14 | 0.21 / 0.20 / 0.17 | 2.5–2.9 | 0.79 / 0.56 / 0.51 |
| Pool 1.8 m, a38 (1.08 / 4.4) | 1.96 / 1.80 / 1.74 | 0.19 / 0.17 / 0.15 | 0.06 / 0.12 / 0.14 | 0.21 / 0.20 / 0.17 | 2.5–2.9 | 1.02 / 0.71 / 0.66 |

- **Targets:** lip 0.1–0.2 H; tip about 0.07 H (0.03–0.16 accepted at level 12); void a check only; L/W from Mead & Black
  (Padang 1.97–2.14; the pool about 1.8–2.2 along the reef by its X, ±0.2).
- **Lip:** in target everywhere except the Padang a20 mid-flight (0.22). **Tip:** in the accepted range.
- **L/W:** in Padang's band for its A0 0.3–0.45 cases. The small cases' second-moment L/W runs 3.5–6, because their void
  is a narrow sliver (the advisor's clear-frame measure gave 2.0–2.2). The pool's stand-in is 2.5–2.9, longer than the
  reef's 1.8–2.2.
- **Void:** 0.09–0.23 H², under Pick & Feddersen's 0.25–0.38 (a check). Hollow size waits for the level-13 cases.

### The pool in the game (`runs/final-*.txt`; the game's front and loft, 12 periods after 50 s, CPU)

| | 1.5 m faces (1.05 m at the feed) | 1.8 m faces (1.32 m) |
| --- | --- | --- |
| Drawn H, open standing slices, p10 / p50 / p90 (the meter: 1.52 / 1.79 m) | 1.25 / 1.44 / 1.72 m | 1.64 / 1.86 / 2.12 m |
| Vertical air gap, p10 / p50 / p90 (each wave's p90) | 0.48 / 0.63 / 0.82 m (0.80) | 0.63 / 0.83 / 1.03 m (1.04) |
| Waves joined per column, s 30–90 (of 12) | 0.67–1.0 | 0.67–1.25 (two joins a wave in some columns) |
| Joins, by s (p10 / p50 / p90) | 33 / 52 / 81 | 31 / 51 / 77 |
| Each wave's longest open run (in its H) | 4.41 m (2.41 H) | 5.23 m (2.57 H) |
| Open-curl band, 1.3–3.5 H / tan α (the advisor: α 50–53° down the reef, 33–37° past the take-off) | 1.7–4.5 m; 2.6–7.1 m | 1.75–4.7 m; 3.6–9.6 m |
| Open (throw to touchdown), collapse | 0.70 s, 0.32 s | 0.79 s, 0.36 s |
| Folds and holes in the loft | 0, 0 | 0, 0 |
| Lip foam on standing slices before touchdown | 18.6 % carry some (p90 0.11) | 19.9 % (p90 0.13) |

- **Unbroken:** the front's count of crests that crossed their join depth unbroken is 45 % / 26 %. It is mostly the reef's
  start (s 20–30, which whitens as one section and joins no tube) and the plunging section's end (s 90–100); the
  plunging section itself joins on nearly every wave (the coverage row).
- **The meter:** the probe's own surf meter reads 1.63 / 2.09 m over these 12 periods with the tube's crash on, against the
  floor's 1.52 / 1.79 m without it. The crash's jets change the pool's water (the coordinator's call); not separated here.
- **The lip's foam before touchdown** is over the advisor's 5 % bar (about 19 %). It is zero lag at work: the pool's slices
  appear only once the solver has broken (the join), so the latch catches the solver's own onset whitewater. At Padang
  (lagged) a slice is first drawn about 2 s before its throw, while its crest is clean. When step 2's vertical depths give
  the pool a lag, the latch moves before the onset (inferred). Capped at 0.3, the lip keeps at least 70 % of its glow.
- **Wave to wave:** one start and one line every 10 s (the floor's own sd 0.2 s); the drawn H's per-wave medians spread
  1.38–1.88 m and 1.77–2.09 m. That is the front's own pieces as much as the waves.

### T2 at Padang (`runs/padang-gap-*.txt`, the link off as shipped, seed 3, 1 m cells)

| | Medium (100 s) | Big (60 s) | 2026-10-22, the same probe, off |
| --- | --- | --- | --- |
| True splits merged by a clock link | 0 of 123 (0 %) | 0 of 283 (0 %) | 0 / 0 |
| Strips dropped as folds, a frame | 0.55 | 0.42 | 0.45 / 0.37 |
| Of them holes (an open tube), a frame | 0.028 | 0.180 | 0.024 / 0.150 |
| Open curls, p10 / p50 / p90 | 0.49 / 4.49 / 10.95 m | 0.37 / 5.21 / 11.32 m | 0.25 / 4.50 / 10.49; 0.24 / 4.95 / 10.98 |
| Fronts a wave | 2.64 | 2.22 | 2.64 / 2.22 |

- Nothing in T2 changed here. These are main's numbers on this machine's run, within the 10-22 run's spread (its Big ran
  97 s, this 60 s).
- **Padang:** the open curl's median of 4.5–5.2 m sits at the low end of 2.6 H/tan α (about 4–10 m at H 2–3 m, 35–40°).
- **The pool:** each wave's longest open run is inside its band at both sizes.

### Cost

- **Pool CPU step** (`runs/cost-1.05.txt`, 1.5 m, 300 steps each, alternated, this M1 under heavy load): with the swept
  tube 109.1 ms p50, without (`?poolTube=off`) 105.8 ms, so +3 %. Elsewhere the front cost 2.2–2.7 ms a step (p50; p90
  4.9–5.1).
- **The page's loft:** 1.3–1.6 ms a build p50, 2.4–2.7 ms p90 (Node, no budget clamps).
- **T3:** per-vertex arithmetic on the CPU (no new attributes or textures), plus one profile lookup a thrown slice for the
  stretch.
- **The Rich lip:** a few dot products and exponentials, plus a vertex-side tube test; one more varying (vec3), no texture
  units. Not timed in a shown pane (the M1 cost cliff); worth timing on the M4.

## Stills (the water sheet, Rich unless named; shot in a hidden browser pane)

- **`padang-medium-rich.jpg`, `padang-medium-classic.jpg`:** Padang's own Medium on the GPU, the held 11.9 m open curl.
  - Rows: views from the ride camera (`curl-ride`, a rider's eye 8 m down the line and 3 m in front of the toe), in front
    (`curl-front`), close, from the channel, and inside. Columns: main (`?lipFoam=old&lipBack=old`) against this branch,
    at midday and sunset.
  - The curl's roof is darker and greener and its front no longer a pale sheet; the band under the lip from below is the
    backlit underside. After touchdown the lip whitens from its tip (the curl's left end at midday).
- **`padang-medium-before-b10-reruling.jpg`:** the same before the re-ruling (the first per-ray try).
- **`pool-small-rich.jpg`:** the straight Barrel at 1.5 m (CPU water), the held curl's 4.7 m open run, the same views. The
  pool's pale water (its white floor) washes the contrast out: the tube is a small curl with a dark mouth, as the meter's
  1.5 m face draws it.
- **`pool-big-sheet-view.jpg`:** `?barrelView=sheet` at 1.8 m. The lip shows white to pale blue (0.2–0.4 m thick), the
  rest grey.
- **`padang-lab-t3-rich.jpg`:** T3's pair on the T note's Lab sea (`?inpage&waterSheet&spot=padang&compute=gpu&height=1.4&period=12&direction=0`),
  the held 14.2 m open curl. Arms: `brokenFoam` false, main's foam (`lipFoam` old), and T3. The sheet held the longest open
  curl, which was on a clean crest: none of its 2,813 lifted vertices carries foam, so the three arms match. A broken
  crest's carried foam is covered by the tests (`brokenCrest.test.ts`), not by a still. The Padang Medium stills' curl is
  clean too, so they show the landing's white and the cap, not carried foam.

## A/B switches

All dev only; online rooms pin the sea's to the default.

| Switch | What it gives |
| --- | --- |
| `?poolTube=off` | the straight Barrel as merged, no swept tube |
| `?poolCrash=off` | the tube drawn and felt, the solver's own lip throws in place of the tube's jets |
| `?lipFoam=old` | the curl's foam as main draws it: the water's foam under a broken crest's curl, no landing white (every swept spot; drawing only) |
| `?lipBack=old` | the Rich lip's light as main draws it: sky by the underside's view factor everywhere, the ungated glow and crest light, the unshadowed wall (drawing only) |
| `?tubeShape=c`, `?barrelView=sheet\|phase\|front\|region` | as before |

`waterSheetBarrel.lipFoam` and `.lipBack` switch them on a held water sheet.

## When the real pool cases land

1. `npm run barrels` with the two cases (`--spot pool`; `docs/research/barrel-library.md`), as the advisor staged them.
2. **The one line:** `POOL_TUBE_CASES = ['periodic-pool-straight-small-l13', 'periodic-pool-straight-big-l13']`, by their
   ids. The family slope puts them in one A0 bracket. Blend them only if both throw a tube; a curl or fold goes to
   `BARREL_CASE_NOTES`.
3. **The throw line** from their vertical depths, as the Canyon's (`throwDepth`), in place of the zero lag. Retest the lip
   foam before touchdown (the latch then precedes the onset), and `joinPast` (3 H was set for zero lag).
4. **Check their breaking height against the meter.** A 2D ray has no spreading: the advisor's K_r is about 0.7–0.8, so
   the 2D cases may break taller. The foot depth (4.4 m at the knee, against their 4.5 m platform) scales them 2 % small.
5. **Rerun** `PROBE=1 TUBE_MODE=shape|front` (`src/wave/probes/poolTube.probe.test.ts`) and compare with this table.

## Tests

- **Type-check:** `npx tsc --noEmit -p .` and the server's are clean.
- **Main suite** and the SurfZoneSimulation subset: see the hand-back. No rider sessions were run.
- **New and changed tests:**
  - `src/wave/barrel/poolTube.test.ts`: the pool's cases and family, its reef reach, its foot, band, zero lag and joins;
    the loft's stretch.
  - `everySpot.test.ts`: the pool's floors, crash and switch.
  - `brokenCrest.test.ts`: the latch, `lipFoamAt`'s thinning, cap, landing white and its monotone spread; the packing;
    `?lipFoam=old`.
  - `SweptBarrelMesh.test.ts`: the decode, the lace's weight, the per-ray sky, the shaded wall, the gated glow and lobe,
    the wall views' packing, `?lipBack=old`'s own program.
- **Probes:** `src/wave/probes/poolTube.probe.test.ts` (opt-in, `PROBE=1`, `TUBE_MODE` join | front | shape | cost).

## Open items

1. **The provisional case.** a38 is a gentler reef's tube: longer and flatter (L/W 2.5–2.9). The air gap (0.63 / 0.83 m
   median) is under the owner's 1–1.2 m at 1.5 m; at 1.8 m the late-flight p90 just reaches 1.0 m. Size is judged on the
   level-13 cases (no levers here).
2. **The lip's foam before touchdown** at the pool: about 19 % of slices carry some, a zero-lag artifact; it should clear
   with step 2's lag.
3. **My departures from the advisor's rulings,** all measured, for the advisor to confirm:
   - the join rows from the white, not the fresh onset;
   - `joinPast` 3 H;
   - the gate by place, s ≤ 100;
   - a38, by its own rule, over its pick of Padang's cases;
   - the sun-in and sky tests from the wall and exit points.
4. **The crash changes the pool's water** (the meter 1.63 / 2.09 m against 1.52 / 1.79 m). The coordinator decided on, behind
   `?poolCrash=off`; the catch and the line should be rerun with it (headless riders: the owner's call).
5. **The Rich lip from below** is still 2.7× the wall at Padang: the backlit underside with the glow's k = 8 (the advisor:
   probably too strong for a laminar lip). The owner's look call.
6. **The landing's white on every swept spot** is now the default (T3); `?lipFoam=old` gives the A/B at Padang.
7. **The pool's columns sometimes join twice a wave** at 1.8 m (coverage 1.08–1.25): a front point ending and a crest
   rejoining. It is not seen as a fold or hole.
8. **Not timed:** the Rich program's GPU cost in a shown pane, and the M4.

## Shot list for the owner

Wave Pool, Waves: Barrel, Rich, midday. Ride camera unless a shot says otherwise.

1. **1.5 m, three waves from the take-off:** look back and up at the lip as it throws ahead of you. Is the lip green with
   body, not a pale membrane? Is the dark mouth open about 0.6 m high? Does the tube peel down the reef with you for about
   4–5 m of open curl and then land, white from the tip back?
2. **1.8 m, the same:** a bigger tube (about 0.8 m of air under the lip, up to 1 m late in flight). Can you fit crouched?
   Note where it stops (around s 90, before the reef spills).
3. **Both sizes, from beside the take-off:** the lip seen against the sky (the bright edge) should glow, translucent, until
   it lands, then turn white.
4. **A/B:** the same wave with `?poolTube=off` (as merged), `?poolCrash=off` (the tube without its jets), `?lipFoam=old`
   and `?lipBack=old`.
5. **Padang Medium and Big:** take off and look up at the curl. With `?lipBack=old` the curl's front shows a pale band;
   without it the outer face should be darker and greener, with the lit underside the bright part. After touchdown the lip
   should whiten from the tip within a fraction of a second (compare `?lipFoam=old`).
6. **Padang, a close-out over whitewater** (the Lab sea, `?spot=padang` with height 1.4, period 12): a broken crest's lip
   should carry thin, streaky white with green through it, not a full white wall.

## Sources

- [Mead & Black 2001](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf) (eq. 6.5, Table 6.1).
- [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf), via the fits in `Overturn.ts`.
- Mostert et al. 2022 (laminar lips), Koepke 1984 (foam reflectance), Petzold via Mobley 1994 (forward scattering), via
  the knowledge base (`docs/research/water-physics/`).
