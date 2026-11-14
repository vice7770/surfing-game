# C2 step 5e: what face the wave presents to a rider, and whether it reaches 30–45°

**It reaches it, and it already ships.** Under `?wave=library` the water a rider's board reads presents a **35.9°
face (26.2–44.6) over the three quarters of a second before the lip goes vertical, and 47.3° (36.7–53.6) over the half
second after that**, on a 2.1 m wave, with a **2 m chord of 30.9° then 38.2°** — the brief's "30–45° over about 2 m",
hit on both counts. **85.5 % then 98.1 % of faces are over 30°**, on 1.34 then 2.07 m of arc. The slope the rider's
path turns through from the trough to the steepest point, which is the one quantity the load-factor identity needs,
measures **35.9° then 47.3°** against the advisor's 40–50°. Population: 4 413 and 3 022 faces out of 80 253 read over
600 frames, every live slice on every frame [M].

**The brief's 16° is real, and it is the sea's own number — not this wave's.** Measured on the *same water at the same
place and instant* with the switch off, the 2 m pool as it ships reads **16.4° (6.9–27.3, most 35.1), 2 m chord 15.6°,
and 0.9 % of 79 800 faces over 30°** [M]. The `FaceWater` row the surfer track probes against (Canyon-matched: 1.4 m,
16°) is right to a decimal — **for the wave `?wave=library` replaced yesterday** (#297, #300, #305). Nobody has
measured a turn on the face the game now has.

**Canyon B cannot reach it by this route, and not because of the grid.** Over 3 356 faces of the arm the steepest is
**20.7°** and **not one reaches 30°**; halving the **render node** spacing to 0.5 m moves the maximum by **0.5°** [M].
20° is where the breaking closure of our own equations fires by construction [S], and our maximum is 20.7°. (That rules
out the sampler and the node grid, **not** the solver's own 1 m cells — the strategy doc's T4, untested here.)

So this round changes no game file. What it ships is the measurement, the three waves' numbers side by side, and the
`FaceWater` row the surfer track should be probing against. **The owner types nothing new**; the switch is the one they
already have (§8 has the address and a shot list).

## 1. How the face was measured, and why these four numbers

The probe is `c2-step5e-face.ts` (its header has the commands). A face is read **the way a rider meets it**: along the
path from the trough up to the crest, through the water the bodies read — `PhysicalSurfWater.forSimulation`, the render
nodes the snapshot draws, with the loft's swept contact in place — sampled every 5 cm along each slice's own lane ray.
Not the wave's overall steepness, and not H/L.

Each face is then reduced four ways, so the numbers are comparable at both ends of the question:

| | what it is | why |
|---|---|---|
| **local** | the steepest slope anywhere on the face, as the surface reports it to the board (its sampled gradient) | the surfer track's and the calibration's "steepest slope"; the number the brief's 16° is |
| **upper80** | a least-squares line through the upper 80 % of the height | Carini 2019's own window, so our faces sit next to her 4200 real ones (plunging median 16.5°, 95th 27.5°) |
| **chord2** / **chord1** | the steepest 2 m and 1 m chord of the face | the brief's "30–45° **over about 2 m**" taken literally. chord1 is also the most a 1 m node grid can carry at all |
| **turn** | the slope **change** from the trough to the steepest point | the advisor's reduction: the load factor needs 40–50° of this along the rider's path, and it is the only one of the four that `n = 1/cos φ` cares about |

Plus the slope at height fractions 0.05 … 0.95, so the profile's shape shows and not only its maximum.

**Every number below says its population.** `[M]` measured, `[I]` inferred, `[S]` sourced.

## 2. The chain, read in the code

`?wave=library` writes the library's heights **into the sea's own render nodes** — "drawn = felt"
(`PhysicalSurfWater`, `ZoneNodes`), so there is no separate physics path to lose the shape in. Three things in that
chain can cap a face, and it matters which:

1. **The node grid.** The zone is built on `this.renderGrid(1)` — **1 m, hard-coded**, in the `?wave=library` branch of
   `SurfZoneSimulation`. `?renderSpacing=0.5` does **not** reach it (and `WaveZone.applySnapshot` returns early when
   the grids disagree, so a finer render grid would drop the library from the drawn water altogether) [M, read].
2. **The bridge.** `LIFT.bridge` = 50°: segments steeper than that, folded, or unreached mark their stations, and each
   run of them is replaced on the nodes by a cubic Hermite widened out to the ≤ `LIFT.gentle` = 30° ground, at most
   `LIFT.reach` = 2 m each side (`zoneSurface.ts`). The comment says why: *1 m nodes cannot hold it*.
3. **The loft.** From `LIFT.on` = 35° the slice starts lifting off the nodes, fully by `LIFT.full` = 50°; what lifts is
   drawn as the overturn and felt through `SweptContact`, whose slope is clamped at 60° (`MIN_NORMAL_Y`).

The measurement says these cost **almost nothing until the last half second**, and the advisor's independent reading of
the Basilisk cases says why they need not: in all ten cases she measured, the forward profile **stays single-valued
until the maximum local slope reaches 48–89°**, and the overhang appears only 0.02–0.59 s before verticality and lives
*above* the steepest point [S, the advisor's measurement of our own library]. **The water a bottom turn runs on is
ordinary single-valued face. It does not need the loft.**

## 3. The asset: what Basilisk put in the file

Population: **all 19 cases**, every tenth of a τ from −3 to +1, **754 frames in all**, read off each case's own
128-point curve forward of its crest to the first overhang. Angles are scale-free; the arcs and the chords are at
h0 = 4.9 m, the scale the pool's own slices take (§4 measures h0 = 4.95 m, 4.40–5.05). Medians, with the 5–95 % band
and the most in brackets. Every figure [M].

| τ, √(h0/g) before verticality | H, m | local | upper80 | chord2 | chord1 | turn | arc over 30°, m | faces reaching 30° |
|---|---|---|---|---|---|---|---|---|
| ≤ −2.5 | 2.01 | **18.4** (11.5–26.6) | 13.4 | 17.1 | 18.0 | 18.3 | 0.00 | 0 % |
| −2.5 … −1.5 | 2.02 | **24.0** (15.0–33.7) | 17.0 | 21.6 | 23.1 | 23.7 | 0.00 (–1.09) | 14 % |
| −1.5 … −0.75 | 2.08 | **38.7** (26.6–51.3) | 22.6 | 30.5 | 34.7 | 37.6 | 1.26 | 88 % |
| −0.75 … −0.25 | 2.11 | **62.2** (46.5–80.5) | 33.8 | 40.9 | 48.0 | 61.8 | 1.83 | 100 % |
| −0.25 … +0.25 | the lip is over | 82.0 | 17.1 | 24.9 | 27.7 | – | 0.34 | 100 % |

Read it this way:

- **The shape is top-heavy and it arrives late.** At τ ≤ −2.5 the whole face is an 18° face — which is our solver's own
  number. The 30–45° the brief asks for appears **between τ −1.6 and the throw**, which at this h0 is the **last
  1.1 s** [I, from the bucket medians × √(h0/g) = 0.710 s].
- **chord1 > chord2 > upper80 < local** throughout, and the gaps are the face's curvature: the steep part is 1.3–1.8 m
  of arc out of a 6–11 m face, so the longer the window the more flat toe it averages in. **The brief's "over about 2 m"
  is the right window and it is the asset's own steep stretch**: 1.26 m at τ −1.5 … −0.75, 1.83 m at −0.75 … −0.25.
- **The steepest point sits at 0.52–0.71 of the height.** Our solver puts it at 0.59–0.62 (the calibration), so the
  *place* was always right; only the magnitude was not. Carini 2019 reports plunging breakers' upper-80 % line fit with
  a median of 16.45° and a 95th of 27.46° [S]: on the metric she uses, our asset's 22.6–33.8° in its steep window sits
  **above the 95th percentile of 524 real plunging breakers**, so the asset is not short of a real wave — it is a
  steeper-than-typical one.

## 4. The three waves, as a rider meets them

Population: the 2 m pool at `?poolSize=ref` with the owner's ride switches, seed 1, tide 0, stage 2, CPU, **40 to 100 s,
600 frames, every live slice on every frame — 80 253 faces**; the sea's own column is the same 79 800 windows at the
same instants, so R and D differ by the switch and nothing else (the library writes no solver field: step 5b's part S
measured identical state hashes). Canyon B at `?canyonWaves=true`, medium swell, six columns of the arm, 60 to 120 s,
**3 356 faces**. The slices' own scale h0 = 4.95 m (4.44–5.03). Medians, 5–95 % band in brackets. Every figure [M].

| | H, m | **local** | upper80 | **chord2** | chord1 | **turn** | arc over 30°, m | faces reaching 30° | n |
|---|---|---|---|---|---|---|---|---|---|
| **`?wave=library`**, τ ≤ −2.5 | 1.67 | 13.6 (8.1–23.6) | 10.8 | 13.1 | 13.4 | 13.6 | 0.00 | **0.1 %** | 20 973 |
| τ −2.5 … −1.5 | 1.96 | 27.2 (16.3–32.3) | 21.1 | 24.6 | 26.0 | 27.1 | 0.00 | 19.6 % | 5 794 |
| **τ −1.5 … −0.75** | 2.08 | **35.9** (26.2–44.6) | 27.6 | **30.9** (23.5–36.3) | 33.9 | **35.9** | 1.34 | **85.5 %** | 4 413 |
| **τ −0.75 … −0.25** | 2.13 | **47.3** (36.7–53.6) | 36.6 | **38.2** (30.3–42.7) | 44.2 | **47.3** | 2.07 | **98.1 %** | 3 022 |
| τ −0.25 … +0.25 | 2.11 | 53.8 (41.7–60.8) | 41.6 | 42.8 | 50.1 | 53.8 | 2.25 | 98.7 % | 2 973 |
| τ > +0.25 (broken) | 1.41 | 29.5 (13.8–56.8) | 18.0 | 22.0 | 26.0 | 29.5 | 0.00 | 48.9 % | 43 078 |
| **library, all frames** | 1.66 | 25.7 (10.6–55.7) | 16.1 | 20.5 | 23.3 | 25.6 | 0.00 | 39.7 % | 80 253 |
| **the 2 m pool as it ships** (same windows, same instants) | 1.47 | **16.4** (6.9–27.3, most 35.1) | 11.6 | 15.6 | 16.1 | 16.3 | 0.00 | **0.9 %** | 79 800 |
| **Canyon B, the arm** | 0.72 | 5.4 (2.3–17.7, **most 20.7**) | 4.2 | 5.3 | – | 5.0 | 0.00 | **0.0 %** | 3 356 |
| Canyon B, node spacing 0.5 m | 0.72 | 5.5 (2.4–18.1, most 21.2) | 4.2 | 5.4 | – | 5.1 | 0.00 | 0.0 % | 3 361 |

**The answer to the one question, in one line: 30–45° over about 2 m is reachable, it is reached, and the only wave in
the game that reaches it is `?wave=library`.**

### What each row says

1. **The brief's 16° is the sea's own number, measured.** With the switch off, the same water at the same place and
   instant reads **16.4° (6.9–27.3)** with a 2 m chord of 15.6° — the `FaceWater` row the surfer track probes against
   (Canyon-matched: 1.4 m, 16°) is right to a decimal for the sea. **0.9 % of 79 800 faces reach 30°**, none of them
   for more than 1.5 m of arc.
2. **Canyon B cannot reach it, and the sampler is not what stops it.** Over 3 356 faces the steepest is **20.7°** and
   **not one reaches 30°**. Halving the **render node** spacing to 0.5 m moves the median from 5.4 to 5.5° and the
   maximum from 20.7 to 21.2° — **0.1° in the median and 0.5° at the top**. Read that narrowly: it rules out the
   sampler and the 1 m node grid, **not the solver's own 1 m cells** — that is the strategy doc's T4 and this round did
   not test it. What it does point at is the closure: the advisor's ruling,
   from the authors of our equations (Sørensen, Madsen & Schäffer, ICCE 1996), is that the closure fires at *"φ_B = 20
   deg"* and eases to a terminal 10° [S]. Our maximum is 20.7°. **The two numbers agree to within the measurement.**
   (The Canyon median is low because the window is 90 m of open water and the tallest thing in it is often a 0.7 m
   swell, not the breaker; the maximum and the 0 % are what carry the claim, and dilution cannot invent a missing
   maximum.)
3. **The library wave reaches it, and holds it for about as long as a bottom turn takes.** The 30°+ band runs from
   τ ≈ −1.6 to past verticality; at h0 = 4.95 m one τ is 0.710 s, so the pre-verticality part of it lasts **about
   1.14 s** [I, from the bucket edges]. A bottom turn takes 0.6–1.0 s [S, the advisor]. **It fits, with little to
   spare.**
4. **It is a pocket, not a wall.** At τ −1.5 … −0.75 the probe finds 4 413 faces in 600 frames, 7.4 lanes a frame at
   0.5 m of lane spacing: about **3.7 m of crest** in the 36° band at any instant, another 2.5 m in the 47° band and
   2.5 m past verticality — roughly **6 to 9 m of crest carrying 30°+ at once** [I, from the counts]. The turn has to
   happen in the pocket. That is what a real wave does too.
5. **Almost nothing is lost between the asset and the rider, until the last half second.** Against §3's asset, at the
   same τ: local **35.9 against 38.7** (93 %), chord2 **30.9 against 30.5** (101 %), arc over 30° **1.34 against
   1.26 m**. In the next bucket local keeps 47.3 of 62.2 (76 %) but chord2 keeps **38.2 of 40.9 (93 %)**, which is the
   number the ask is written in. **The 1 m node grid and the bridge cost about 7 % of the face in the window a bottom
   turn uses, and a quarter of the local peak only in the half second when the lip is already pitching.** The grid is
   not the problem anybody thought it was.
6. **The steepest point sits at 0.62–0.64 of the height** and the profile says where the steep water is: at
   τ −0.75 … −0.25, **9.2° at 0.05 of the height, 17.9° at 0.15, 33.0° at 0.30, 44.1° at 0.50, 44.9° at 0.70**. So a
   board sitting in the trough still sees 9°; what it climbs into is 33–45°. **This is why `turn` is the right column:
   the slope *change* from the trough to the steepest point is 35.9° then 47.3°, against the advisor's requirement of
   40–50° of slope change along the rider's path** [S, her arithmetic on Forsyth's means]. One bucket is at it, the
   other is just under it, and both are on single-valued water with no overhang.

7. **The face is open water, all of it.** The probe books, per point, whether the loft's ceiling covers it. Over
   **28 807 faces in every τ bucket, including the two where the lip is pitching, the share covered is 0.000** [M]. So
   the water a bottom turn runs on is never under the overturn, which is the advisor's point 4 confirmed from the game
   side: *the bottom turn runs on ordinary, single-valued face*, and no multivalued surface is needed to give the rider
   40°.
8. **It pushes as well as leaning.** The water along the face, onshore positive, measured on an independent 22 s window
   (n 1 666 / 1 158 / 28 325) [M]:

   | | crest | steepest point | trough |
   |---|---|---|---|
   | library, τ −1.5 … −0.75 | 3.48 m/s (2.71–4.03) | 3.51 (2.48–4.04) | 1.63 (0.36–2.70) |
   | library, τ −0.75 … −0.25 | 4.17 (2.98–4.82) | 4.17 (2.94–4.84) | 2.88 (1.42–4.75) |
   | the sea's own, same windows | 2.26 (1.39–4.00) | 1.45 (0.43–3.20) | **−0.48** (−0.94–0.42) |

   The sea's trough runs *backwards* under a rider; the library's runs onshore at 1.6–2.9 m/s. This is step 4's
   "the wave PUSHES, 5.06 against 2.04 m/s" re-measured along the face, and it is a second reason the same turn should
   behave differently on it.

   That 22 s window also **replicates the angles independently**: 35.8 against 35.9°, 47.2 against 47.3°, and the sea's
   16.6 against 16.4°.

## 5. What this does to the brief's identity

The surfer track's identity stands untouched: n = 1/cos φ in steady trim, so the turn rate can only come from the
wave. What changes is the number it is evaluated at.

| | on the face the surfer track probes | on the face `?wave=library` presents |
|---|---|---|
| face slope in the turn | 16° [M] | **35.9–47.3°** [M] |
| tan of it (descent per metre of closing) | 0.287 | **0.73–1.08**, 2.5–3.8× |
| slope change along the path (`turn`) | 16.3° [M] | **35.9–47.3°** [M] |
| what the load factor needs | 40–50° of slope change [S] | at it, or just under |

**So the 7× shortfall in the descent was a property of the test wave, not of the game.** Nobody has yet measured a
bottom turn on the face the game already has. That is the next round, and it belongs to the surfer track.

## 6. What the surfer track should probe against

A `FaceWater` row matched to the library face, to sit beside `MATCH=pool` and `MATCH=canyon` (the fit method is
face-hold's calibration.md part 2):

| | library match, the steep window | the Canyon-matched row in use today |
|---|---|---|
| `height` | **2.08 m** (1.75–2.30) [M] | 1.4 m |
| `slope` | **36°** at τ −1.5 … −0.75, **47°** at −0.75 … −0.25 [M] | 16° |
| crest-to-trough run | 6.5 m then 5.3 m [M] | 7.3 m |
| the water at the crest / at the steepest point / at the trough | **3.48 / 3.51 / 1.63 m/s** at τ −1.5 … −0.75; 4.17 / 4.17 / 2.88 at −0.75 … −0.25 [M] | 2.0 / 1.21 / 0 m/s |
| `depth`, `speed` | fit them to the water above as calibration.md part 2 does (`FaceWater`'s current is c·η/(d+η), and its trough has no flow at all, so the 1.6–2.9 m/s onshore there cannot be matched) | 2.6 m, 5.7 m/s |

Two warnings that come with it. **`FaceWater` is one planar face repeated along x and it never breaks**, so it cannot
copy the pocket (§4 item 4) or the 1.14 s life (item 3) — a probe on it will be *kinder* than the game, in the one
dimension that was never the problem before and now is. And the 36° row should be read as the floor: the face is
steeper for the last half second, and 85.5 % of faces in that window are already over 30°.

## 7. Limits of this measurement

- **The slope is the one the body reads, not a finite difference of my own.** `local`, `turn` and the profile come from
  `WaterSample.slopeX/slopeZ`, the Catmull-Rom derivative of the render nodes (or the swept contact's normal where the
  loft covers the point), which is exactly what `BoardBody` is handed. `upper80` and the chords come from the sampled
  heights at 5 cm. So `local` can exceed any chord, and does.
- **One face per slice per frame.** The crest is the highest station the library's weight reaches along that lane, and
  the face runs onshore from it to the trough ahead. A lane carrying two slices (one going, one coming) is read once,
  at the taller.
- **One seed, one tide, one size.** The 2 m pool at `?poolSize=ref` with the owner's ride switches, seed 1, tide 0,
  stage 2, on the CPU. Canyon at `?canyonWaves=true`, medium swell, seed 1.
- **`FieldSlice.s` is not the crest's place now.** It is the crest's place at the hand-over, five seconds and tens of
  metres back. A first pass of this round used it as the window and read 2.3° faces off the flat platform behind the
  wave; the `--dump` mode exists because of it, and nothing here is quoted without having been dumped first. (Part 15's
  lesson again: read what a column means before quoting it.)
- **Angles on the asset are exact; its arcs and chords are at h0 = 4.9 m.** The pool's own slices measure h0 = 4.95 m
  (4.40–5.05), so the asset's metre figures are within 1 % of the game's.

## 8. What this round ships, and what the owner types

**No file under `src/` changes, so the Canyon byte hashes cannot move and the default path is untouched.** What ships
is the probe (`c2-step5e-face.ts`), this write-up, and the three waves' numbers.

**The change that gets a 30–45° face is already merged and opt-in.** The owner types what they already have:

```
?spot=pool&waves=barrel&swell=big&poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolReach=long&wave=library
```

**The shot list, for the ride that would settle it** (one wave each is enough to tell):

1. Drop in and go **straight to the bottom**, then turn as hard as the stick allows. The face you are turning on is
   36–47°, not 16°. Does it come round faster than the Canyon?
2. Do it **late** — as close to the lip throwing as you dare. That is the 47° half second.
3. Do it **early**, three or four seconds before the throw. That is the 13.6° water, and it should feel like the
   Canyon does. If 1 and 3 feel the same, the wave is not the lever and I am wrong.
4. Stay **off the pocket** — two or three board lengths ahead of the break — and turn there. That is also 13.6° water,
   and it is the other half of the same test.

## 9. The owner's calls this read opens

1. **Where rider work is judged.** The ruling of 2026-11-10 is that rider work is ridden in Canyon with
   `?canyonWaves=true`. Canyon's face does not reach 30° in 3 356 faces and cannot be made to by resolution. **If the
   turn rate is to be worked on, it has to be ridden where a steep face exists, which today is the 2 m pool with
   `?wave=library`.** The alternative is to bring the library to Canyon — a lane field and a keep rule for the arm,
   which is the C2 plan's own scaling step and a round of its own, not a switch.
2. **How long the steep window should last.** Ours is about 1.14 s against a 0.6–1.0 s turn. The advisor measured that
   the **mild** bed-slope corner of our case box (s 0.036–0.055) holds 30–45° for **1.16–1.20 s** against **0.50–0.61 s**
   at s 0.105, nearly independent of A0 [S, her measurement of our ten cases]. Our pool's reef picks its cases from the
   local bed, so buying that window means a milder reef — at the cost of a thinner lip and a longer tube. That is a
   look-versus-feel trade and it is the owner's.
3. **Whether step 5d's foam defects now outrank this.** They do: this thread's question is answered and the answer
   needs no wave work. Nothing found here bears on the seam mask's dithered edge, the metre-wide foam cells or the 24
   foam nodes written where the mask discards the water.
