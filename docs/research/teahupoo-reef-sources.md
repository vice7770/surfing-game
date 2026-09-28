# Teahupo'o Reef: sources and rulings

The [Teahupo'o Reef spec](../superpowers/specs/2026-09-27-teahupoo-reef.md) builds the Reef on Teahupo'o's published shape. This doc holds:
- the sources and what each says;
- the open questions and what research found;
- the values the game takes (the rulings).

Values without a source are marked **provisional**. Researched 2026-09-27 (Part A, Task 1).

## What is known

### Shape and swell

From Shand (2024), a University of Auckland coastal engineer: ["Anatomy of a wave: what makes the Olympic surf break at Teahupo'o unique"](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301), The Conversation.
- **Swell:** two to five metres at 14–20 s periods, from storms south of New Zealand.
- **Bed:** it rises from around 200 m a couple of hundred metres offshore. The wave shoals very quickly.
- **Shelf:** a flatter shelf at around ten metres lets the wave stand up with a steep face, before it breaks where the reef rises again.
- **Channel:** a deep channel runs beside the shelf, where the wave doesn't break, so it peels.
- **Peel:** left, looking toward shore.
- **Lip:** about half the wave's height thick.
- **The step:** the base of the wave seems to drop below sea level.
- **Tides:** the tidal range is low, which limits the times the reef is too deep or too shallow to surf.

### Reef, swell window and depths

From the World Surf League: ["What Makes Teahupo'o Tick"](https://www.worldsurfleague.com/posts/266359/what-makes-teahupoo-tick).
- **Crest depth:** the reef crest lies in about 5 ft of water. Other popular sources give six feet ([nauticalchannel](https://nauticalchannel.com/new/teahupoo)).
- **Deep water:** 50 yards outside the reef the floor falls to over 350 ft; it reaches 1000 ft a third of a mile offshore.
- **Reef slope:** "nearly 1:1", against Pipeline's 1:10 and other slabs' 1:4.
- **Swell:** the ideal window is 180–220° (160–240° works); the best periods are 14–18 s.
- **Direction and shape:** 160–190° opens the face; 200–230° makes it bowly.

### Forereef

Rodríguez-Burguette, Torres-Freyermuth, Franklin & Rendón-Valdez (2025), ["Extreme wave transformation and runup on a beach fronted by a very steep forereef profile"](https://www.sciencedirect.com/science/article/pii/S0141118725002354), Applied Ocean Research, [doi:10.1016/j.apor.2025.104648](https://doi.org/10.1016/j.apor.2025.104648).
- A laboratory physical model built from Teahupo'o's bathymetry.
- Forereef slope **1:2.29**.

### Breaking intensity

Mead & Black (2001), ["Predicting the breaking intensity of surfing waves"](https://www.researchgate.net/publication/228605528_Predicting_the_breaking_intensity_of_surfing_waves), J. Coastal Research SI 29.
- **Measure:** the vortex's length over its width (the tube's "roundness") is the best measure of breaking intensity.
- **Fit:** it follows the **orthogonal** seabed gradient, the gradient along the wave's path rather than across the contours: Y = 0.065X + 0.821.
- **Classes:** five, from medium to extreme. Waves beyond extreme collapse; below medium is gentle plunging or spilling (quoted in [US patent 10,207,168](https://patents.google.com/patent/US10207168B2/en)). The class limits were not found in any copy reachable here.

### Peel and skill

Hutt, Black & Mead (2001), J. Coastal Research SI 29. Minimum makeable peel angles: 60° beginner, 40° intermediate, 29° top amateur, 27° professional (`PEEL_SKILL_MINIMUM` in `src/wave/Breaking.ts`).

### Surfer speeds

GPS on professionals at the Quiksilver Pro Gold Coast (a point break) read 39.1 km/h (10.9 m/s, the fastest), 34.6, 33.6 and 32 km/h (8.9 m/s) ([Surfertoday](https://www.surfertoday.com/surfing/how-fast-do-surfers-ride-a-wave)). GPS drops out inside the tube, so tube speeds are not measured.

### Plunging over submerged slopes

Blenkinsopp & Chaplin (2008), ["The effect of relative crest submergence on wave breaking over submerged slopes"](https://www.sciencedirect.com/science/article/abs/pii/S0378383908000604), Coastal Engineering 55, 967–974. On a 1:10 reef in a flume:
- the water over the reef crest relative to the wave, h_c/H_0, dominates how a wave breaks;
- less submergence gives more intense breaking, measured by the air cavity under the jet, with less transmission and reflection;
- breaking agrees with H_b/h_b ≥ 0.78.

This is Part B's source for the slab.

### Why a straight reef cannot peel slowly

Phase matching, derived in `src/wave/ledgePeel.ts`:
- where the bed is uniform along a straight ledge, the along-ledge wave number is conserved;
- so the break point runs along the ledge at c_shelf / sin φ, with φ the crest's angle to the ledge over the shelf;
- that is never slower than c_shelf (≈ √(g·10) ≈ 9.6 m/s on a 10 m shelf), however steep the ledge;
- the shelf's depth and the ledge's angle set the peel, not the steepness;
- the old Reef's 10 m tank floor refracted every swell parallel to the reef before it broke, which is why no reef shape tried in P7 peeled.

## Open questions and what was found

1. **Mead & Black's gradient units and classes:**
   - **Found:** the fit, its meaning (the gradient along the wave's path) and that there are five classes.
   - **Not found:** the class limits and the gradient range of their data.
   - **Reading taken (provisional):** X is the gradient written 1:X. Only that reading makes steeper beds give rounder tubes, as they report. At 1:2.29 it gives Y ≈ 0.97; at 1:10, 1.47; at 1:33, ≈ 3.
2. **The inner rise (shelf to crest):** WSL calls the reef "nearly 1:1". No surveyed profile found. The ledge takes the forereef's measured 1:2.29 (the gentler, surveyed value); WSL's 1:1 is the steep bound.
3. **Crest depth and tides:**
   - **Crest:** about 1.5 m (WSL's 5 ft; six feet elsewhere).
   - **Tides:** low range (Shand), no figure found. The game's tide settings (±0.6 m) are larger than Tahiti's.
4. **Shelf width and variation:** not found. The shelf is the ~10 m depth between the forereef and the ledge; its width follows from the ledge's angle.
5. **The pass (Passe Hava'e):** deep, depth not found beyond "deep". The game uses a 12 m pass (provisional).
6. **The reef's angle to the swell:** the swell window (180–220°) is known; the reef's bearing is not. The sweep chooses the ledge angle and the swell direction (Part A, Task 8).
7. **Surfer speeds:** measured pro top speeds are 8.9–10.9 m/s on a point break. The Reef's break runs at no less than the shelf's ~9.6 m/s, so it is fast for anyone: "made through the tube", as the spec asks. The target, 10–13 m/s along the ledge, stays provisional.
8. **Tube-ride durations:** not found for Teahupo'o (the longest recorded tube anywhere is about 30 s, Surfertoday). Left for Part D's research.
9. **Slab lab studies:** Blenkinsopp & Chaplin (2008), above. More (steps, fringing reefs) in Part B.

## Rulings (the values the game uses)

| Value | Game value | Source |
|---|---|---|
| Tank edge (deep water) | 30 m | Tank limit: kh ≤ 2.5 for 7 s components, the wave-sizes rule. Teahupo'o's is 100+ m within 50 yards |
| Forereef slope | 1 : 2.29 | Rodríguez-Burguette et al. 2025 |
| Shelf depth | 10 m | Shand 2024 |
| Ledge (inner rise) slope | 1 : 2.29 | The forereef's measured slope; WSL's "nearly 1:1" is steeper (**provisional**) |
| Crest depth, mid tide | 1.5 m | WSL (5 ft) |
| Ledge angle to the shoreline | 45° | The sweep's choice: 13.6 m/s median peel on the fixed meter ([report](teahupoo-reef-report.md)) |
| Reef swell direction | 20° | The sweep's choice: 10° peeled at 25.7 m/s on the 10 m shelf |
| Pass depth, half-width | 12 m, 25 m | **provisional** |
| Beach face | 1 : 5 | **provisional** (steep enough to stay shoreward of the forereef) |
| Peel speed target along the ledge | 10–13 m/s | **provisional**; pros measured 8.9–10.9 m/s top speed on a point break. The chosen design measures 13.6 m/s |
| Faces: Practice / Small / Medium / Big | 1.5–2 / 2–3 / 3–4 / 5–6 m | the spec (decision 4) |
| Swell periods | 14–17 s (Practice 14) | Shand (14–20 s), WSL (14–18 s best) |

## Part B: slab tubes

Researched 2026-09-28 (Part B, Task 1).

### Mead & Black (2001)

Via Scarfe, Elwany, Mead & Black (2003), ["The Science of Surfing Waves and Surfing Breaks: A Review"](https://escholarship.org/uc/item/6h72j1fz), Scripps technical report; two of its authors are Mead & Black.
- **The data:** plunging waves at 28 "world-class" surf breaks.
- **The fit:** a cubic curve was fitted to each barrel (the "vortex"), and the ratio of its two dimensions (the vortex ratio) plotted against the orthogonal seabed gradient: Y = 0.065 X + 0.821, R² = 0.71.
- **Classes:** breaking intensity is classed medium, medium/high, high, very high and extreme, "defined by the breaking intensity range based on Equation 1". The limits themselves were not found in any copy reachable here.

Read directly on 2026-09-28 by the user's wave-shape advisor (the "Water physics research" session), from the chapter itself: Mead & Black (2001), J. Coastal Research SI 29, ch. 6, ["Predicting the Breaking Intensity of Surfing Waves"](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf).
- **Class limits (their Table 6.2):** extreme 1.6–1.9, very high 1.91–2.2, high 2.21–2.5, medium/high 2.51–2.8, medium 2.81–3.1.
- **Collapse:** "Waves of greater than extreme are likely to collapse (although an exact limit to vortex ratio is yet to be established) and are therefore unsurfable." No threshold is given.
- **The measured range is 1.42–3.43.** Shark Island is the lowest (1.42) and the steepest bed in the set; The Wedge 1.80, Backdoor 2.02–2.21. Surfed waves already go past "extreme".
  - By the fit, 1.42 is about 1:9. Teahupo'o's 1:2.29 is about four times steeper than any of their data, so its Y = 0.97 is an extrapolation.
- **How X was measured:** "given as the horizontal distance to one vertical unit" (1:X). The gradient is not one cell's slope: "The seabed gradient 2-3 m shallower and 2-3 m deeper than the resulting breaking depth was then averaged", with the breaking depth from H_b/d = 0.78. The band absorbs height and tide errors; it is not a physical constant.
- **Collapse and surge** (Battjes 1974's surf-similarity bands; Grilli 1997, where no solitary wave breaks on plane slopes steeper than 12°) are for slopes that run up to the shore. A wave over a crest 1.5 m deep cannot surge: it breaks depth-limited over the crest (the advisor's reading).
- **The orthogonal gradient is the dominant control** of breaking intensity. The shallower water's gradient matters more than the deeper water's. The effect of steps in the profile is "still relatively unknown", a caveat for a slab.
- **Iribarren-type measures do not fit surfing waves:** they "have not been found to be appropriate for surfing rides". So a reef break's shape follows Mead & Black here, not the plane-beach Iribarren bands.
- **Wind:** offshore winds increase breaking intensity (the overturn's wind shift, Feddersen et al. 2023, is kept).

### Other sources

- **Blenkinsopp & Chaplin (2008):** less crest submergence plunges harder, measured by the air cavity under the jet. Their cavity-size numbers were not reachable here, so the reef void's area stays provisional.
- **The lip's thickness:**
  - Shand (2024) gives about half the wave's height at Teahupo'o;
  - Chanson & Lee (1997), ["Plunging jet characteristics of plunging breakers"](https://www.sciencedirect.com/science/article/abs/pii/S0378383996000567), Coastal Engineering 31, find steeper slopes throw thicker jets (qualitative here; the full text was not reachable).
- **The jet's water:** Pick & Feddersen's jet area is the water of the overturning crest. The game takes it from the crest across the overturn's length, each cell giving at most 20 % of its water (numerical, the P7 bound). Whether the crest holds enough is measured, not assumed (Part B, Task 5).

### Rulings (Part B)

The collapse and gradient rows were revised in Task 3 on the advisor's reading above. The first ruling, "Y < 1 collapses", made most of the Reef's Big-swell breaks throw no lip.

| Value | Game value | Source |
|---|---|---|
| Vortex ratio | Y = 0.065 X + 0.821, X = 1 / orthogonal gradient | Mead & Black 2001 (X is 1:X, their definition) |
| Orthogonal gradient | the bed's average along the crest's travel, from 2.5 m shallower (not above the shoreline) to 2.5 m deeper than h_b = H / 0.78; the path ends where the window does | Mead & Black 2001's method; 2.5 m is the middle of their stated 2–3 m band (a band chosen to absorb height and tide errors) |
| Tube aspect (width / length) | 1 / Y | the same |
| Roundest tube | Y held at 1.42 on steeper beds (W/L ≤ 0.70); no collapse over a submerged crest | the roundest they measured (Shark Island). Rounder, up to W/L = 1, would be a look choice for the user, not a source |
| Gentlest gradient the fit covers | Y ≤ 3.43 (about 1:40); gentler breaks follow the plane-slope rule | the gentlest they measured |
| Inside Pick & Feddersen's fits (ψ0 ≤ 0.0889, slopes to about 1:10) | their void area, jet area and tilt for the gradient and sea; only the aspect from Mead & Black | Pick & Feddersen 2026 (sourced where they reach, the advisor's ruling); Mead & Black measured such reefs (Padang Padang 1.97–2.14) |
| Void area, beyond the fits | 0.43 H² | **provisional**: Pick & Feddersen's steepest fit, until a slab source (Blenkinsopp & Chaplin) |
| Lip thickness, beyond the fits | 0.5 H | Shand 2024; thicker jets on steeper slopes (Chanson & Lee 1997). **provisional**: "about 0.5 H" is an article's description, not a measurement (the advisor) |
| Void tilt, beyond the fits | 23° | **provisional**: Pick & Feddersen's tilt at their steepest fit |
| Wind on a reef break's tube | Feddersen et al. 2023's shift (aspect − 0.18 U/C), counted from U/C = −0.4, not from calm; stronger offshore wind rounds it no further | Mead & Black's ratios come from surf-magazine photos, almost surely offshore days (**provisional**, the shape advisor's ruling, raised by the Padang Padang session): without this the offshore wind was counted twice |
| Where a jet lands | over its sheet's thickness (its water over the void's length) along its travel | geometry: a 0.5 H lip lands over as much of the face. Pick & Feddersen's 0.22 H sheets are thinner than a cell at the other spots' sizes and land as before |

## Part C: the solid reef, the lagoon, the crash

Researched 2026-09-28 (Part C, Task 1).

### Friction on wet reef

No measurement was found of a surfboard (waxed fibreglass or epoxy, foam), neoprene or skin sliding on wet coral or reef rock. The nearest:
- rubber on wet, rough road surfaces: kinetic μ ≈ 0.25–0.75, set by how the water seals the surface's roughness (Persson et al., ["Sealing is at the origin of rubber slipping on wet roads"](https://arxiv.org/pdf/cond-mat/0412045));
- neoprene on wet steel: μ 1.58 static, 1.40 kinetic ([table](https://www.researchgate.net/figure/Coefficient-of-friction-of-neoprene-rubber-with-different-part-materials_tbl1_223593062)).

The "friction coefficients of 0.1–0.2" measured on reef tops ([Nelson 1996](https://www.sciencedirect.com/science/article/abs/pii/S0141118797000060)) are hydraulic roughness for the water, not Coulomb friction for a body. Reef rock is rugose, a surface rough on many scales at once, so it interlocks where sand shears. The spec's "harder and grippier than sand" stands, with the value provisional.

### The Teahupo'o model's lagoon

The 1:60 physical model of Teahupo'o ([zenodo 11392175](https://zenodo.org/records/11392175), CC-BY; Rodríguez-Burguette, Torres-Freyermuth et al.) has "a very steep slope (1/2.26)" at the forereef, and "a reef lagoon and planar slope (1/9.64) inland". The lagoon's depth and the reef flat's width are only in its profile file, `Profile_Teahupoo.txt`. Downloading it waits for the user's approval, so both stay provisional.

### The crash's pitch

A bubble rings at Minnaert's (1933) frequency, f₀ = (1/2πR)·√(3γp/ρ), inversely proportional to its radius. A plunging lip's roar comes from the air it traps, and for the same shape that air's size R grows as its water's cube root. So the crash's pitch falls as V^(−1/3). The reference size and how deep it may go are by ear.

### Rulings (Part C)

| Value | Game value | Source |
|---|---|---|
| Board on wet reef, Coulomb μ | 0.8, against sand's 0.6 | **provisional**: no measurement found; "grippier than sand" (the spec); rubber on wet rough surfaces 0.25–0.75, neoprene on wet steel 1.4–1.6 |
| Body on wet reef, Coulomb μ | 0.8 | **provisional**, as above |
| Reef material | rock where the reef builds the bed: forereef, shelf, ledge, crest and reef flat; sand in the pass, the lagoon and on the beach | the spot's own shape |
| A strike that ends a ride | the board meeting reef at 1 m/s or more along the bed's normal, within 0.25 s of the rider separating | **provisional** (by feel); injuries and hold-downs stay in P11 |
| Inland slope | 1:9.64 | the Teahupo'o model ([zenodo 11392175](https://zenodo.org/records/11392175)) |
| Reef flat width, lagoon depth | 20 m, 2.5 m | **provisional** until `Profile_Teahupoo.txt` is read (needs the user's approval) |
| The crash's pitch | playback rate (0.5 m³ / V)^(1/3), from 1 down to 0.5 | Minnaert 1933 for the exponent; the 0.5 m³ reference (about a Practice lip's gathered water) and the octave floor are **provisional** |
