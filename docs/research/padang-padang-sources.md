# Padang Padang: sources and rulings

The [Padang Padang spec](../superpowers/specs/2026-09-28-padang-padang.md) builds a fifth spot on Padang Padang's real conditions. This doc holds the sources, what each says, and the values the game takes (the rulings). Values without a source are marked **provisional**. The "Water physics research" session advises; its findings are in the Claude Doc "Wave Physics Research" (the Padang Padang tab).

## What is known

- **The break** ([Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts), [Mondo Surf](https://www.mondo.surf/surf-spot/padang-padang/guide/11668), [The Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/)):
  - a left-hand reef break over a "super sharp reef" that is "extremely shallow" at low tide;
  - "two, three or even four barrel sections before the wave fades into the deep water channel", whose rip is "powerful";
  - "the final section … frequently pinches the barrel over a dangerously shallow part of the reef";
  - "The wave sections if smaller than double overhead": small days break in sections, which is true to life for a small Practice;
  - rides of "50 to 150 meters on a good day", for "advanced surfers and pros only" (Mondo Surf);
  - "The reef runs north off a high cliff, and the waves shape up in a sort of north-easterly orientation on S-SW swells"; the take-off is "a fast drop in, sometimes right into the pit" (The Surf Atlas).
- **Swell:** south-south-west to south-west groundswell, periods often over 16 s. It works from about 4 ft and is best at 6–10 ft, "double to triple overhead". The feet are read as Hawaiian (face ≈ 2 × the number; Caldwell & Aucan 2007). That reading is inferred, not stated: it is the one consistent with "double to triple overhead" (the advisor, 2026-09-28).
- **Wind:** the south-east trade blows offshore in the dry season, April–October ("SE light to Strong"; Mondo Surf gives east to south, 83°–200°).
  - At Ngurah Rai airport, 10 km north-east of Padang Padang, the wind by day averages SSE at 9 kt, about 4.6 m/s, over 2002–2026 ([Windfinder](https://www.windfinder.com/windstatistics/kuta), observations).
  - The MERRA-2 reanalysis (10 m, a 50 km grid) at Denpasar gives easterlies from mid-March to early August (70 % of the time in May), southerlies to mid-December (81 % in October) and westerlies to mid-March (54 % in January). Its windiest month is August at 9.1 mph (4.1 m/s, all hours), and its calmest March at 5.3 mph (2.4 m/s) ([WeatherSpark](https://weatherspark.com/y/128849/Average-Weather-in-Denpasar-Indonesia-Year-Round)).
  - The Bukit's west coast faces west, so easterlies and south-easterlies blow from land to sea, and the wet season's westerlies blow onshore.
- **Tide:** "Low tide is best for huge top to bottom barrels. Mid tide is also very good and can be surfed at High tide" (Bali Surfing Camp); it "needs a low (but not too low) tide" (The Surf Atlas). Very low spring tides expose the reef (surf guides; anecdotal, no datum).
  - The Benoa gauge (UH Sea Level Center data) is mixed semidiurnal.
  - Its highest ranges were 2.46 m (December 2020) and 2.3 m (2022) ([IOP Conf. Ser. Earth Environ. Sci. 1350, 012016, 2024](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016)).
  - Predictions for Nusa Dua put springs at about 2.7–2.8 m and neaps at 0.6–0.7 m ([tidechecker](https://tidechecker.com/indonesia/bali/nusa-dua/), secondary).
- **Tube:** Mead & Black (2001, J. Coastal Res. SI 29, [Table 6.1](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf)) fitted three photos of Padang Padang:
  - vortex ratios 1.97, 2.14 and 2.02 ("very hollow", 1.91–2.2);
  - vortex angles 29°, 33° and 41°;
  - about 0.78 H long and 0.4 H wide (the third photo).
- **Orthogonal gradient, inferred:** inverting Y = 0.065X + 0.821 gives X = 17.7–20.3, so about 1:18–1:20. It is averaged along the wave's path over the breaking depth ± 2–3 m. No survey confirms it.
- **Peel:** at least 27–29° (`PEEL_SKILL_MINIMUM`, Hutt, Black & Mead 2001).
- **Phase matching** (`src/wave/ledgePeel.ts`): along a straight edge the break point runs at c / sin φ, set where the contours turn. A 1:19 ramp out of 30 m of water peels at α ≤ 22° on the Small swell. A platform of 8–12 m with the edge 35–45° to the swell gives 27–32° (screen of 2026-09-28).

## Open questions (answer each with a source, or rule it provisional)

1. Mead & Black (2001), "Field studies leading to the bathymetric classification of world-class surfing breaks" (J. Coastal Res. SI 29: 5–20): Padang Padang's reef components, if listed.
2. Mead & Black (1999), the Bingin survey: the neighbouring reef's platform depth, ramp and flat.
3. The depth seaward of the reef (the platform), from a chart, GEBCO or the Bingin survey.
4. The reef edge's and the coast's orientation to the SSW–SW swell (a map or satellite source), and the swell's direction on the platform by Snell's law.
5. The channel's depth and width.
6. ~~The dry season's south-east trade and the wet season's westerly monsoon: speeds, and their components across the shore.~~ Answered above (Windfinder, MERRA-2): about 4.6 m/s by day from the SSE–SE, nearly straight offshore; westerlies of about 2.5–3 m/s in the wet season, onshore. These are averages over hours and a reanalysis grid, so both stay provisional.
7. The water's clarity over Bali's reefs (particle scattering, m⁻¹) and a coral reef flat's albedo.
   - **Albedo:** live coral reflects about 2.5 % at 400–500 nm, rising to about 8 % at 550–650 nm (Hochberg & Atkinson 2003, [Spectral reflectance of coral](https://link.springer.com/article/10.1007/s00338-003-0350-1), Coral Reefs 22; 5,199 measurements of 195 colonies at 11 sites). Sand is far brighter, but the game has one albedo per spot, and the ridden bed is coral.
   - **Clarity:** no measurement was found for the Bukit's west coast, so the value stays the Reef's clear-water one, provisional.

## Rulings (the values the game uses)

| Value | Game value | Source |
|---|---|---|
| Platform depth (the tank's edge) | 10 m | **provisional**, the sweep's choice (Task 7) |
| Orthogonal gradient over h_b ± 2.5 m | 1:19 | Mead & Black 2001, inverted |
| Ramp's steepest slope | 1:19 | **provisional**: set in Task 7 so the waves climb 1:18–1:20 along their paths |
| Reef flat depth, mean sea level | 1.25 m | **provisional**: wet at Low (−0.8 m), nearly dry at the lowest springs (−1.2 m) |
| Crest line's angle to the shoreline | 35° | **provisional**, the sweep's choice (Task 7) |
| Peak | x −50 m, z −90 m | **provisional**: fits the ride in the 160 m window |
| Level strip upcoast of the peak | 20 m | numerical: open edges copy their neighbours |
| Channel | axis at the +x edge, half-width 20 m, platform-deep | **provisional** |
| Beach face | 1:5 | **provisional** (as the Reef's) |
| Swell direction on the platform | 20° | **provisional**: SW groundswell refracted to the platform; the sweep's (Task 7) |
| Swells, buoy Hs / Tp / spread | Small 1.6 m / 16 s / 0.2; Medium 2.2 m / 17 s / 0.2; Big 3.0 m / 18 s / 0.15 | Komar & Gaughan inverted to the face targets; **provisional** until the size report (Task 8) |
| Practice | Hs 1.5 m at the edge, 16 s, band ±8 %, spreading s 40 | **provisional** until the size report (Task 8) |
| Faces, Practice / Small / Medium / Big | 2–2.5 / 2.5–3.5 / 3.5–4.5 / 4.5–6 m | the spec (decision 4) |
| Tides, Low / Mid / High | −0.8 / 0 / +0.9 m | Benoa gauge; the advisor's ruling |
| Winds, Offshore / Onshore | −5 / +3 m/s | **provisional**: the dry season's SSE–SE trade by day (about 4.6 m/s at Ngurah Rai, Windfinder), nearly straight offshore; the wet season's westerlies (about 2.5–3 m/s, MERRA-2), onshore |
| Water: particle scattering, bed albedo | 0.15 m⁻¹, [0.08, 0.08, 0.025] | scattering **provisional** (the Reef's clear water; nothing local found); albedo: live coral at 650 / 550 / 450 nm (Hochberg & Atkinson 2003) |
| Foam decay, dense / lace | 3 s / 20 s | the advisor's Foam tab: a reef's foam lasts at least as long as the Beach's (Callaghan et al. 2012, 2013) |
| Breaking onset | 0.65 √(gh) | Kennedy et al. 2000, as on plain and steep beds |
