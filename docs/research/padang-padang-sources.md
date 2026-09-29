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

## The bed: what the advisor's research found

From the advisor's notes (`.claude/water-physics/research_notes/Barrel profile library and Padang reef/padang_padang.md` in the main checkout, 2026-09-28). Tags: measured, modelled, anecdotal, inferred.

- **Components (measured survey, classified).** Mead's open PhD thesis (Waikato 2000, [handle](https://hdl.handle.net/10289/13967)) reprints the 2001 papers. Its Table 4.1 lists "Padang Padang Indonesia: ramp, focus, wedge, pinnacle; v. steep/hollow & v. fast", the same set as Backdoor. There is no platform; neighbouring Bingin has one.
  - The focus "breaks earlier than any other part of the wave and so defines the start of the surfing ride".
  - Pinnacles on the wedge make short sections, or collapse a section when very shallow.
  - Contour-normal gradients across his 34 breaks: ramp 1:40–1:80, focus 1:10–1:80, wedge 1:4–1:40 (it carries the barrel: 1:19 fits here), pinnacles near vertical.
  - X in Y = 0.065X + 0.821 is confirmed as "horizontal distance to one vertical unit … along the direction of wave propagation".
  - Padang Padang was surveyed by kayak and reduced to lowest astronomical tide (LAT), but no depths, map or gradient are published. The raw survey is unpublished (eCoast / Shaw Mead).
- **Neighbour Bingin (measured, approximate contours):** wedge 0–3 m below LAT, platform about 3–4 m, ramp 4–7 m; mid tide is "~1 m above datum" (Mead 2000, ch. 5).
- **Orientation (measured map; modelled satellite classification):**
  - the coast trends 063–067° near Padang Padang, seaward normal 337–340° (OpenStreetMap);
  - the reef flat's seaward edge trends 078° over the main left's 1 km, and 066° over its last 500 m into the channel ([Allen Coral Atlas](https://allencoralatlas.org), geomorphic layer);
  - over the ridden stretch (115.0980–115.0997°E, about 190 m), the edge steps in from 120–145 m to 45–65 m off the coast. That is about 22° to the shore, and the step is the likely "end section" pinch;
  - the reef flat is 100–195 m wide.
- **The swell wraps (modelled, inferred).** Offshore swell comes from 203–209° in the dry season (Meteo-France wave model 2023–2025; ERA5), 25–55° outside the directions that can reach a reef facing 340–348° head-on. It reaches Padang Padang only by turning about 90° around Uluwatu's tip, 3–4 km south-west, which Surfline's forecaster also describes ("wraps around", from search snippets). The local direction at breaking is inferred as from about 295–320°, 17–42° to the shore normal toward the peel; that is circular with the peel, so it cannot set the peel.
- **Offshore (modelled, GEBCO 2026 via GMRT, 460 m grid):** a terrace 20–45 m deep lies north-west of Padang Padang, with 30 m at 1.3–1.8 km and 50 m at 6–8 km. The grid cannot resolve the reef or the channel.
- **Channel (modelled, inferred):** about 200 m wide at the shore and 300 m at the reef edge's line; unmapped by the atlas, so probably deeper than 10 m; depth not found.
- **Tide (measured, Benoa via the IOP paper):** M2 0.61 m, S2 0.35, K1 0.27, O1 0.17; monthly ranges 1.69–2.46 m; dry-season lows −0.76 to −0.86 m against mean sea level. LAT is about −1.1 to −1.3 m.
- **Sizes (anecdotal, modelled):** Bali feet are about half the face; contest days of "5 ft sets", "6ft+" had ERA5 swells of 2.3–3.6 m at about 17 s offshore (the 3.6 m day is about the top 1 % of dry-season hours). Dry-season climate (ERA5 2005–2024): mean Hs 2.0–2.2 m, median Tp 14.2–14.5 s, 15–17 % of hours at Tp ≥ 16 s.
- **Wind (measured, Denpasar airport METAR 2015–2024):** in the dry season from 105–124°, about 7 kn at 06–07 local time, building to 12.6–13 kn at 13–16.

## What the game takes from it

- **Frame (revised 2026-09-29).** The tank is rotated so the swell arrives square to it, already wrapped by the Bukit's terrace, and the reef's angle to the crests carries the obliquity (the advisor's ruling: side edges are clean only when conditions are uniform along shore, XBeach manual; FUNWAVE-TVD needs periodic sides for oblique waves, Chen et al. 2003, which a reef rules out). +x still runs the way the left peels. The real coast runs 17–45° off the crests, so the beach's orientation and the flat's widths are not the atlas's literally. Robustness: inputs from −10° to +20° should keep the peel inside its band (Mead & Black's Bingin held across heights and directions).
- **Ramp and wedge, no platform (revised 2026-09-29).** Mead & Black (1999; Mead 2000, ch. 5, pp. 91–100, figs 5.1–5.7) ran idealised Bingin beds through a ray model at 16 s: with a platform the wedge holds about 35° "for all input heights and directions"; without one, a wedge whose base shoals to breaking lets the ramp break the waves first (a close-out, their bed B); a deeper wedge rotated further to the ramp holds about 35° at 1 m but peels faster with height (their D). Padang Padang is Bingin's D plus a focus and pinnacles (table 4.1). A flat 10 m platform also let the solver's waves steepen by different amounts along the oblique ledge (its width varied along it, at Ursell ~40), which broke them deeper down the reef: the peel investigation's close-out. So the bed is a shore-parallel forereef, Mead's ramp, and the wedge rising from the ramp. Two planes this alike in slope meet where the base's depth moves fast: moving the crest line Δz shoreward moves the base by Δz / (1/(m_w cos β) − 1/m_r), Δz/27 at 1:50 but Δz/55 at 1:80, so the ramp is 1:80 and the base stays deeper than the Small swell breaks along the whole ride.
- **The peel angle is geometric.** The skill ladder's angles were measured on aerial photos (Hutt 1997, per Mead 2000, ch. 6, p. 113; Scarfe et al. 2009: "the included angle between the peel-line and a line tangent to the crest-line", Walker & Palmer 1971), so sin α = c/V needs the crest's real speed at breaking. Linear theory underestimates surf-zone crest speed, increasingly with H/h (Tissier et al. 2013, GLOBEX); at H/h 0.6–0.8 it runs about 1.2–1.27 × √(g h_b) (the advisor's inference). The game's peel meter uses √(g h_b), so it reads α about 5–7° low at every spot; its fix (the solver's own crest speed at the breaking columns) is a separate change. The design is sized on the geometric α: the lower half of 30–40° at the peak, Mead's "very fast" against Bingin's "fast" at about 35°.
- **Sections.** Mead's focus and pinnacles are real components with no published position or size (Mead gives ranges: focus 10–1,000 m², 1:10–1:80; pinnacles 1–10 m², near vertical). Staged (round 3 of the grilling): the plain wedge first, then a second sweep adds the focus (the advisor: a seaward bulge of the contours from the wedge's base to about twice its depth, apex on the take-off, about 20–30 m across, **provisional**; it should make the peak break first and slow the take-off to 40–55°, Bingin A against E) and pinnacles or a ridge for sections.

## Open questions (answer each with a source, or rule it provisional)

1. ~~Padang Padang's reef components.~~ Answered: ramp, focus, wedge, pinnacle (Mead 2000).
2. ~~The Bingin survey.~~ Answered: wedge 0–3 m below LAT, platform 3–4 m, ramp 4–7 m.
3. ~~The depth seaward of the reef.~~ Partly: a 20–45 m terrace offshore (GEBCO); nothing resolves the reef itself. The wedge's foot stays provisional.
4. ~~The reef edge's and the coast's orientation.~~ Answered above; the local swell direction is inferred.
5. The channel's depth: not found. Its width is 200–300 m.
6. ~~The dry season's south-east trade and the wet season's westerly monsoon: speeds, and their components across the shore.~~ Answered above (Windfinder, MERRA-2): about 4.6 m/s by day from the SSE–SE, nearly straight offshore; westerlies of about 2.5–3 m/s in the wet season, onshore. These are averages over hours and a reanalysis grid, so both stay provisional.
7. The water's clarity over Bali's reefs (particle scattering, m⁻¹) and a coral reef flat's albedo.
   - **Albedo:** live coral reflects about 2.5 % at 400–500 nm, rising to about 8 % at 550–650 nm (Hochberg & Atkinson 2003, [Spectral reflectance of coral](https://link.springer.com/article/10.1007/s00338-003-0350-1), Coral Reefs 22; 5,199 measurements of 195 colonies at 11 sites). Sand is far brighter, but the game has one albedo per spot, and the ridden bed is coral.
   - **Clarity:** no measurement was found for the Bukit's west coast, so the value stays the Reef's clear-water one, provisional.

## Rulings (the values the game uses)

| Value | Game value | Source |
|---|---|---|
| Forereef, edge to knee | 1:20 from 25 m to 12 m, shore-parallel, rounded over 10 m | slope: the advisor's ruling (2026-09-28); knee depth **provisional** (2026-09-29): with the ramp and wedge, the profile averages about 1:33 from 25 m to the lineup, matching the GEBCO terrace's 1:30–1:40 |
| Mead's ramp | 1:80, shore-parallel, from the knee | **provisional**: Mead's range for 34 breaks is 1:40–1:80; the gentle end keeps the wedge's base deeper than the Small swell breaks along the ride (Mead & Black's Bingin B) |
| Orthogonal gradient over h_b ± 2.5 m | 1:19 | Mead & Black 2001, inverted |
| Wedge's steepest slope | 1:19, its base 7 m deep at the peak, about 5 m at the ride's end | slope **provisional**: the waves climb 1:18–1:20 along their paths; base **provisional** (the advisor: about 7 m; deeper peels faster at the take-off, where Mead's focus should slow it) |
| Reef flat depth, mean sea level | 1.25 m | **provisional**: wet at Low (−0.8 m), nearly dry at the lowest springs (−1.2 m) |
| Crest line's angle to the ramp's contours (β) | 40° | **provisional**: sized so phase matching gives the geometric α in the lower half of 30–40° at the peak (33–35° with crest speeds 1.2–1.27 × √(g h_b)), rising down the line as the base shoals; the design sweep brackets 35–45°. The real reef runs 13–22° off the coast, with the swell oblique to it |
| Peak | x −60 m, z −170 m | **provisional**: in the rotated frame; the ride's end (x 70) sits at z −61, where the atlas's edge steps in to 45–65 m off the coast |
| The wedge's end upcoast of the peak | fades out over 20 m to the bare ramp | numerical: open edges copy their neighbours, so the −x edge sees the ramp, level along shore |
| Channel | axis at the +x edge, half-width 45 m, 12 m (the knee's depth) | **provisional**: the real one is 200–300 m wide, unmapped and probably deeper than 10 m (Allen Coral Atlas); the +x open edge stands in for most of it |
| Beach face | 1:5 | **provisional** (as the Reef's) |
| Window along shore | 320 m | numerical: the peak stands 100 m from the −x edge, clear of the side feed's strip (30 m), its fade (40 m) and the strip's sideways spread over the approach (about 0.12 D, 25 m at s = 150; the advisor) |
| Bed material | coral (the Reef's `reef`) everywhere but the channel and the beach face, which are sand | the reef flat and its seaward edge are mapped as reef (Allen Coral Atlas, geomorphic layer); the channel is unmapped there, so sand is **provisional**; the cove's beach is sand |
| Swell direction at the tank's edge | 0° | the advisor's ruling (2026-09-29): square to the tank, the reef's angle carrying the obliquity; robustness checked from −10° to +20° |
| Swells, buoy Hs / Tp / spread | Small 1.6 m / 16 s / 0.2; Medium 2.2 m / 17 s / 0.2; Big 3.0 m / 18 s / 0.15 | Komar & Gaughan inverted to the face targets; **provisional** until the size report (Task 8) |
| Practice | Hs 1.5 m at the edge, 16 s, band ±8 %, spreading s 40 | **provisional** until the size report (Task 8) |
| Faces, Practice / Small / Medium / Big | 2–2.5 / 2.5–3.5 / 3.5–4.5 / 4.5–6 m | the spec (decision 4) |
| Tides, Low / Mid / High | −0.8 / 0 / +0.9 m | Benoa gauge; the advisor's ruling |
| Winds, Offshore / Onshore | −5 / +3 m/s | **provisional**: the dry season's SSE–SE trade by day (about 4.6 m/s at Ngurah Rai, Windfinder), nearly straight offshore; the wet season's westerlies (about 2.5–3 m/s, MERRA-2), onshore |
| Water: particle scattering, bed albedo | 0.15 m⁻¹, [0.08, 0.08, 0.025] | scattering **provisional** (the Reef's clear water; nothing local found); albedo: live coral at 650 / 550 / 450 nm (Hochberg & Atkinson 2003) |
| Foam decay, dense / lace | 3 s / 20 s | the advisor's Foam tab: a reef's foam lasts at least as long as the Beach's (Callaghan et al. 2012, 2013) |
| Breaking onset | 0.65 √(gh) | Kennedy et al. 2000, as on plain and steep beds |
