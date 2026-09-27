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
