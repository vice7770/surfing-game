# Padang Padang (Bukit Peninsula, Bali): bathymetry, wave, wind and tide conditions

Scope: a sourced parameter sheet for building Padang Padang in Breakline (Boussinesq solver over 2D bathymetry, JONSWAP input with direction, period, height, wind and tide). Research date 2026-09-28.

Tag legend used in every bullet:
- **[measured]**: an in-situ survey, gauge or station record.
- **[modelled]**: output of a numerical model or reanalysis (ERA5, MFWAM, WBEND), or a satellite classification (Allen Coral Atlas) or gridded compilation (GEBCO via GMRT). Some are **computed here** from public data; the request URL is given so the numbers can be reproduced.
- **[anecdotal]**: surf guides, surf-camp pages, contest reports, forecaster prose.
- **[inferred]**: my own derivation from the cited items. It is never a source on its own.

Quick reference. Every row is backed by a bullet in the sections below.

| Parameter | Value | Tag | Section |
|---|---|---|---|
| Reef components | ramp, focus, wedge, pinnacle; "v. steep/hollow & v. fast" | measured survey + classification (Mead 2000/2001b) | (a) |
| Vortex L/W (3 photos) | 2.02, 2.14, 1.97; angles 29°, 33°, 41°; one photo W/H 0.40, L/H 0.78 | measured (photo fits) | (a) |
| Orthogonal gradient behind the fit | X in Y = 0.065X + 0.821 is "horizontal distance to one vertical unit", so Padang ≈ 1:18–1:20 | inferred from the fit; X's definition now confirmed | (a) |
| Coastline trend near Padang | 063–067° / 243–247°, seaward normal 337–340° (Bingin–Uluwatu 4.4 km: 054°/234°, normal 327°) | measured map data (OSM) | (b) |
| Reef-flat edge trend (main left) | 078°/258° over 1 km; 066° over the last 500 m into the channel | modelled (satellite classification) | (b) |
| Deep-water swell vs reef | Offshore swell arrives from 203–209° (SSW). The reef faces ~340–348°, so the swell is shadowed and reaches the reef only by wrapping around the Bukit tip | modelled + inferred | (b) |
| Local wave direction at breaking | ~from 295–320° (WNW–NW) | inferred, unverified | (b) |
| Channel | ~200 m wide at the shore, ~300 m at the reef-edge line, at 115.0997–115.1015°E; unmapped (probably >~10 m) | modelled + inferred; depth not found | (c) |
| Reef-flat depth | dries or nearly dries at the lowest spring lows; ~1 m of water at mid tide | inferred from anecdote + neighbour survey | (d) |
| Neighbour Bingin (measured) | wedge 0–3 m below LAT, platform ~3–4 m, ramp 4–7 m; mid tide ≈ 1 m above LAT | measured (contours approximate) | (d) |
| Tide (Benoa gauge) | M2 0.61 m, S2 0.35 m, K1 0.27 m, O1 0.17 m; F = 0.414 (mixed, mainly semidiurnal); monthly range 1.69–2.46 m; Jul–Sep lows −0.76 to −0.86 m vs MSL | measured (UHSLC gauge, via paper) | (d) |
| Ride length / sections | 50–150 m normal, 150–300 m on good days; 2–4 barrel sections; take-off, main tube, then a shallow "end section" that pinches | anecdotal | (e) |
| Contest sizes | 5 ft sets / 6-footers (2023 warm-up); "6ft+" (2025 run day); "4–6ft" (2026 warm-up) | anecdotal | (f) |
| Offshore Hs on those days | 2.3–2.5 m, Tp ≈ 17 s (2023-08-04 pm); 3.2–3.6 m from 203° (2025-08-06) | modelled (ERA5) | (f) |
| Offshore isobaths from the Bukit tip | 20 m at 0.9–2.5 km, 50 m at 6–8 km, 100 m at 8–9 km, 200 m at 10–11 km, 1000 m at 16–21 km | modelled (GEBCO 2026 via GMRT) | (g) |
| Swell climate, Jun–Sep | Hs mean 2.0–2.2 m (P90 2.6–2.8 m), Tp median 14.2–14.5 s, 15–17 % of hours with Tp ≥ 16 s | modelled (ERA5, 2005–2024) | (h) |
| Wind, Jun–Sep | from ESE (105–124°); 6.8–7.0 kn at 06–07 WITA rising to 12.6–13.0 kn at 13–16 WITA | measured (airport METAR, 2015–2024) | (i) |

---

## (a) Reef components and depths in Mead & Black 2001, Mead's PhD thesis, and Mead & Black 1999 on Bingin

### Takeaway
Mead's open-access PhD thesis (Waikato, 2000) contains the peer-reviewed papers as chapters. It confirms that Padang Padang was surveyed by kayak with a depth sounder and DGPS, reduced to LAT. Padang is classed as **ramp + focus + wedge + pinnacle**, "very steep/hollow and very fast". The thesis gives three vortex fits for Padang and confirms that the regression's X is the run per unit rise, so the earlier 1:18–1:20 inversion holds. It publishes **no Padang depths, contour map or per-break gradient**. Neighbouring Bingin is published with a component map with approximate measured contours (0–7 m).

### Cited Findings
- **Source identity.** Mead, S.T. (2000), *Incorporating high-quality surfing breaks into multi-purpose reefs*, PhD thesis, University of Waikato. It is open access, 261 pages. Chapter 3 is "Bathymetric Classification of World-Class Surfing Breaks" (= Mead & Black 2001a, JCR SI 29: 5–20). Chapter 4 is "Functional Component Combinations…", marked "Journal of Coastal Research, Special Surfing Issue (Accepted)" (= 2001b, pp. 21–32). Chapter 5 is the Bingin paper, "Coasts and Ports '99 Conference Proceedings Vol. 2, 438-443". Chapter 6 is "Predicting the Breaking Intensity of Surfing Waves" (= 2001c, pp. 51–65). — [Mead 2000, handle](https://hdl.handle.net/10289/13967); [PDF](https://researchcommons.waikato.ac.nz/server/api/core/bitstreams/cee55b9f-c5e5-47da-9147-3b1fb5dd69fa/content); reference list in [Scarfe et al. 2003](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)
- **[measured] Survey.** Table 2.1 lists "Padang Padang, Indonesia (Bali), Kayak, Coral reef". Bingin and Sanur are the other Bali sites. — [Mead 2000](https://hdl.handle.net/10289/13967)
- **[measured] Survey method.** Surveys were done "at, or near, high tide in low swell conditions". Transects ran "approximately normal to the isobaths", were logged at 1 s, and were generally <10 m apart. A Dobie pressure sensor recorded the tide, and data were reduced "to lowest astronomical tide (LAT)". Heave was removed using time-synced shore video. Relative position errors were "<1 m… majority (>90%) lying between 0 to 0.7 m". — [Mead 2000, ch. 2–3](https://hdl.handle.net/10289/13967)
- **[measured] Survey dates conflict.** The text says the Bali trip was "during September and November of 1997". But the Bingin map is captioned "Surveyed 23/9/96", and the pressure sensor was lost "after its third deployment in Bali, Indonesia (October 1996)". So the Padang survey date is 1996 or 1997. — [Mead 2000](https://hdl.handle.net/10289/13967)
- **[measured] Padang base station.** "WGS-84 8.813758888S 115.1038561W" (printed W, but clearly E), described as "2m back from solid rock in centre of cliff viewing point". — [Mead 2000, Table 3.1](https://hdl.handle.net/10289/13967)
- **[measured survey → classification] Padang components.** Table 4.1 (= Mead & Black 2001b) lists "Padang Padang Indonesia: ramp, focus, wedge, pinnacle; v. steep/hollow & v. fast". Backdoor (Hawaii) has the same set. Bingin is "ramp, platform, focus, wedge, ridge; v. steep/hollow & fast; v. fast section". Pipeline is "ramp, large focus, pinnacle". — [Mead 2000, Table 4.1](https://hdl.handle.net/10289/13967)
- **Component definitions (Mead & Black 2001a):**
  - Ramp: "a seaward-dipping seabed that refracts incoming waves towards the favoured wave orthogonal direction".
  - Focus: "a distended seabed ridge aligned so that wave orthogonals converge towards the apex… may ultimately lead to a 'take-off peak'".
  - Wedge: "a sloping seabed that initiates wave breaking and which refracts incoming waves away from the favoured orthogonal direction".
  - Pinnacle: "an isolated region of shallow bathymetry that causes the wave to locally rear up and steepen (e.g. a shallow rock, pinnacle or coral-head)".
  - Ledge: gradient ">1:4".
  - A focus also causes a "decrease of effective seabed gradient… making it easier for a surfer to take-off". Pinnacles on the wedge "may act to create a short section… or, if the pinnacle rises up to very shallow depths, may cause a section of wave to collapse".
  - — [Mead 2000, ch. 3–4](https://hdl.handle.net/10289/13967); summarised in [Scarfe et al. 2003](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)
- **[measured ranges across the 34-break dataset, not Padang-specific] Table 3.3 (thesis only).** The thesis notes it is "not included in the peer-reviewed paper". Columns are size, contour-normal gradient and alignment to the favoured orthogonal:

  | Component | Size | Contour-normal gradient | Alignment |
  |---|---|---|---|
  | Ramp | 100 to >10,000 m² | 1:40–1:80 | 0–90° |
  | Platform | 10–3,000 m² | >1:80 | 0–20° |
  | Focus | 10–1,000 m² | 1:10–1:80 | 40–90° |
  | Wedge | 50 to >2,000 m² | 1:4–1:40 | 30–80° |
  | Ledge | 10–1,000 m² | 1:1–1:4 | 25–60° |
  | Ridge | 5–50 m² | 1:4–1:40 | 0–50° |
  | Pinnacle | 1–10 m² | <1:0.25–1:1 | n/a |

  — [Mead 2000, Table 3.3](https://hdl.handle.net/10289/13967)
- **[measured] Vortex statistics (Table 6.1).**
  - "Padang Padang 1: 2.02 … 29° … 0.0025"; "Padang Padang2: 2.14 … 33° … 0.0018"; "Padang Padang3: 1.97, 0.4, 0.78, 41° … 0.0032".
  - Column values show 0.40 = vortex width/H and 0.78 = vortex length/H (0.78/0.40 ≈ 1.95 ≈ L/W).
  - For comparison: Pipeline 1.56–1.92, Backdoor 2.02–2.21, Bingin 2.54–2.63, Sanur 2.13. The dataset range is 1.42–3.43.
  - — [Mead 2000, Table 6.1](https://hdl.handle.net/10289/13967)
- **[measured → regression] Definition of X.** "Y = 0.065X + 0.821 (R² = 0.71), where X is the orthogonal seabed gradient and Y is the vortex ratio". The Fig. 6.5 caption defines the orthogonal gradient as "given as the horizontal distance to one vertical unit… the gradient along the direction of wave propagation". — [Mead 2000, ch. 6](https://hdl.handle.net/10289/13967)
- **Gradient method.** Gradients were digitised from each break's survey grid. For magazine photos they used Hb/d = 0.78 and averaged the slope "2-3 m shallower and 2-3 m deeper than the resulting breaking depth". When wave height was unknown they averaged "from lowest astronomical tide to a depth of 6-8 m". Per-break gradient values are plotted (Fig. 6.5) but not tabulated. — [Mead 2000, ch. 6](https://hdl.handle.net/10289/13967)
- **[measured + modelled] Bingin, the neighbour ~1.2 km ENE (Mead & Black 1999, reprinted as thesis ch. 5):**
  - Bingin "receive[s] deep ocean swells from the south to south west during the southern hemisphere winter" and breaks "fast and hollow along the edge of the steep reef face for up to 90 m".
  - It has five components: ramp, focus, platform, wedge, ridge.
  - WBEND inputs were 1–5 m, 170–240°T in 10° steps, 16 s. The model agreed with the field "(1.8 m (H1/10), 16 s period)".
  - Peel was "~35°" along the break and 40–55° at the take-off.
  - "Waves of 4 m and higher closed-out at all input directions" on the platform. "As the wave input direction tended towards the south west (225°) wave height at breaking increased… waves travel relatively straight up the ramp".
  - — [Mead 2000, ch. 5](https://hdl.handle.net/10289/13967)
- **[measured, approximate contours] Bingin depths.** Fig. 5.1's "depth contours approximate the measured Bingin Reef bathymetry". The wedge isobaths are labelled 0, 1, 2, 3 m, the platform lies between 3 and 4 m, and the ramp isobaths are 4, 5, 6, 7 m. Captions of Figs 5.2–5.7 give "mid-tide (~1 m above datum)", the datum being LAT. — [Mead 2000, ch. 5, figures inspected](https://hdl.handle.net/10289/13967)
- **Bingin configuration in a later review.** "Bingin is a Ramp/Focus/Wedge configuration with a ridge superimposed on the wedge and a platform abutting the wedge." — [Scarfe et al. 2003](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)

### Inferences
- **Gradient from the vortex fit.** Inverting the fit, X = (Y − 0.821)/0.065 gives 18.4, 20.3 and 17.7 for the three photos. So the orthogonal gradient under the breaking Padang waves is about **1:18 to 1:20** [inferred]. The unit question raised in `profile_library.md` is now settled (X = run per unit rise). But R² = 0.71, so one break's inversion is only indicative. The actual gradient Mead measured for Padang exists only as a plotted point.
- **Build recipe from the components** [inferred]:
  - an offshore ramp (1:40–1:80) that aligns the wrapped swell;
  - a focus at the up-reef end that makes the take-off peak and softens the effective gradient there;
  - a wedge carrying the main barrel (orthogonal gradient ~1:18–1:20, inside the 1:4–1:40 wedge band);
  - one or more pinnacles (1–10 m², near-vertical) that make short, very fast sections or collapse them at low tide.
- Padang's vortex ratios (1.97–2.14) are rounder and heavier than Bingin's (2.54–2.63). In the dataset they sit between Pipeline and Backdoor [inferred from Table 6.1].

### Gaps
- No Padang contour map, depth values or tabulated gradient were found in the thesis. The 2001a/b/c journal PDFs were not opened: JCR SI 29 is paywalled, and the thesis chapters are the accepted texts. The raw survey (Mead/ASR/eCoast database) is unpublished. Asking eCoast (Shaw Mead) is the only route to real Padang soundings.
- Mead & Black 1999 (Bingin) was read only in its thesis reprint.

---

## (b) Reef-edge orientation relative to the SSW–SW swell (bearings)

### Takeaway
Padang sits on the **NNW-facing** side of the Bukit, on a coast that faces 327–340°. The reef-flat edge that the left follows runs **~066–078° (ENE)**, and the wave peels ENE into a channel. Deep-water swell comes from 203–209° (SSW), more than 90° away from the reef's facing direction. So Padang is **geometrically shadowed from the dominant swell** and works only when big, long-period swell wraps around the Bukit's western tip. The local breaking direction is inferred as ~WNW–NW; no source measures it.

### Cited Findings
- **[measured map data; computed here] Coastline bearings.** From the OSM `natural=coastline` ways (OSM convention: land on the left of the way's direction):
  - Bingin to Uluwatu stretch (115.090–115.118°E, 4.4 km): trend **054°/234°**, seaward normal **327°**.
  - Padang ±1 km (115.095–115.112°E): trend **063°/243°**, normal **337°**.
  - 115.098–115.106°E: trend **067°/247°**, normal **340°**.
  - The small cove at 115.100–115.104°E faces due north (360°).
  - — [OpenStreetMap API extract](https://api.openstreetmap.org/api/0.6/map?bbox=115.090,-8.822,115.118,-8.800) (© OpenStreetMap contributors, ODbL)
- **[modelled: satellite habitat classification; computed here] Reef-flat edge.** I rasterised the Allen Coral Atlas geomorphic polygons and sampled shore-normal transects every ~25 m alongshore. The seaward edge of the reef flat (Terrestrial/Outer Reef Flat to Reef Slope) trends:
  - **078°/258°** over the main-left reef (115.0905–115.0996°E, ~1 km);
  - **066°/246°** over its last 500 m, ending at the channel;
  - 084° over the western half;
  - 060° for the reef east of the channel.
  - — [Allen Coral Atlas WFS, geomorphic layer](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326)
- **[anecdotal] Spot coordinates.**
  - Wannasurf lists the spot at "8° 48.628' S, 115° 5.964' E" (= −8.81047, 115.09940). That is right at the east end of the reef-flat edge in the transects (edge point −8.8106, 115.0995). — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)
  - Wikipedia gives the beach as 8.81114°S 115.1012°E. — [Wikipedia](https://en.wikipedia.org/wiki/Padang_Padang_Beach)
  - OSM's "Pantai Padang Padang" beach polygon starts at (−8.81173, 115.10336). — [OSM extract](https://api.openstreetmap.org/api/0.6/map?bbox=115.090,-8.822,115.118,-8.800)
- **[anecdotal] Direction of ride.** "The start is a fast drop in, sometimes right into the pit. That rips left across the front of the cliffs". The right on the other side "peels right into the entrance of Labuan Sait Beach". — [Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/). The waves fade "into the deep water channel" between "Padang Padang Lefts and Baby Padang". — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
- **[anecdotal] Surfline forecaster article.** The page returned 403 and a Cloudflare challenge; the text below comes from search-result snippets only, not verified on the page:
  - Padang "is situated on the north side of the Bukit Peninsula and isn't directly exposed to the Indian Ocean storm track, requiring a powerful, long period swell with some 'west' in the direction to reach the break".
  - "With the swell focusing on the tip of the peninsula, it refracts and wraps around the northern side. The local bathymetry off Padang Padang continues to refract and bend the swell back into the coast."
  - — [Surfline, "Mechanics of Padang Padang"](https://www.surfline.com/surf-news/mechanics-of-padang-padang-bali-indonesia-left-barrel/29045)
- **[anecdotal] Guide swell windows.** "SSW, SW" ([Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)); "Southwest, South" ([Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)); "Southwest" ([Surf-Forecast](https://www.surf-forecast.com/breaks/Padang-Padang)); an app heuristic of 205–245°, ≥12 s, ≥1.5 m ([balisurf SpotCatalog](https://github.com/chiliec/balisurf)).
- **[modelled] Neighbour.** Bingin's modelled offshore inputs were 170–240°T, and breaker height rose toward 225°. — [Mead 2000, ch. 5](https://hdl.handle.net/10289/13967)
- **[modelled; computed here] Offshore swell direction.** Meteo-France wave model (MFWAM) swell partition at (−8.958, 114.958), 2023–2025: Jun–Oct mean 203–208°, p10–p90 ~197–218°. — [Open-Meteo marine API request](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_direction,wind_wave_height,wind_wave_direction&models=meteofrance_wave&start_date=2023-01-01&end_date=2025-12-31&timezone=Asia%2FSingapore)

### Inferences
- **Shadowing** [inferred]. A reef whose seaward normal is ~340–348° accepts direct approach only from 250° through 080°. Deep-water swell from 203–225° is 25–55° outside that window. It reaches Padang only after turning roughly 90° or more around Uluwatu, 3–4 km SW. This matches Surfline's "wraps around the northern side" and the need for long periods and "some west".
- **Local breaking direction** [inferred, unverified]:
  - A left peeling ENE along an edge trending 066–078° has its landward normal at 156–168°.
  - With a fast peel angle of 30–40° (Bingin was modelled at ~35°; Padang is described as faster), the wave orthogonal at breaking points toward ~120–135°. The waves therefore arrive **from about 295–320° (WNW–NW)**.
  - This is very sensitive to the edge trend and to the peel angle.
- **Implication for the game's domain** [inferred]:
  - Either include the Bukit's western tip and the shelf (≥ 4 km) so the solver does the wrapping,
  - or drive a local domain from its W/NW boundary with the inferred local direction. Driving SSW–SW swell straight onto a local Padang patch would be physically wrong.
  - The "favoured orthogonal" of the ramp is then the refracted W–WNW direction, not the offshore 205–225°.

### Gaps
- No nautical chart, survey or paper gives the reef-edge bearing or the local wave direction at Padang. Mead's figure orientation for Bingin could not be reconciled with the OSM coastline: its N arrow and the sign of its survey axes look inconsistent. So I did not take bearings from Mead's figures.
- The Allen Coral Atlas imagery date and classification accuracy at this site are unknown.

---

## (c) Channel depth and width

### Takeaway
There is a deep channel with a strong, swell-dependent rip at the ENE end of the left, between Padang Lefts and Baby Padang. From the satellite reef map it is about **200 m wide at the shoreline and ~300 m wide along the reef-edge line**, centred near 115.1005°E. It is left unmapped by the atlas, which is consistent with water deeper than the atlas's ~10 m reliable depth. **No channel depth was found.**

### Cited Findings
- **[anecdotal]** "The deep water channel between Padang Padang Lefts and Baby Padang creates a powerful rip current. The bigger the swell, the stronger the current." — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
- **[anecdotal]** Dangers include "Rips/undertow". — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html). Also "currents which can drag you over the end section of reef as the water sucks out". — [Surf Indonesia](https://www.surfindonesia.com/bali-surf-spots/padang-padang/)
- **[modelled: satellite classification; computed here]**
  - Along 115.0997–115.1015°E, both the geomorphic and the benthic layers of the Allen Coral Atlas are **largely unmapped beyond ~45–95 m from the shore**. The exceptions are thin "Reef Slope"/"Coral/Algae" fringes, "Back Reef Slope" patches at 100–190 m and one sand patch at 100–160 m, both on the eastern side (115.1010–115.1015°E).
  - The reef-flat edge on the west side steps shoreward from 125 m to 45 m between 115.0985 and 115.0997°E.
  - East of the channel, the flat widens to 130–255 m (115.1027–115.1045°E).
  - — [ACA geomorphic WFS](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326); [ACA benthic WFS](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:benthic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326)
- **[published method statement]** In the Allen Coral Atlas case study (5 m Planet Dove imagery), "bathymetry was only reliable to a depth of 10 m". Its "Reef Slope" class corresponds to a Reef Cover "Reef Front" slope of 3–10 m. — [Kennedy et al. 2021, Reef Cover (Sci. Data), Europe PMC full text](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8329285/fullTextXML)
- **[modelled]** GEBCO-based GMRT is 15″ (~460 m) in this area, so it cannot resolve the channel. — [GMRT about](https://www.gmrt.org/about/)

### Inferences
- Channel width is **~200 m at the shore and ~300 m at the reef-edge line** [inferred from the classification gap]. Its depth is plausibly **>~10 m** in the outer part [inferred from the unmapped status, but a mapping gap can also come from foam, turbidity or sun glint].
- For the game, a channel 8–15 m deep, flanked by the steep west reef edge, would reproduce "fades into deep water" and give the rip its return path [inferred placeholder; not measured].

### Gaps
- Channel depth: **not found**. There is no survey, chart sounding or published satellite-derived depth. The atlas's own satellite bathymetry is download-only per its FAQ (search summary; not opened here).

---

## (d) Reef depth at mid tide, and behaviour at the lowest spring tides

### Takeaway
No measured Padang reef-crest depth exists in open sources. Several things point the same way:
- the neighbour Bingin, with a measured wedge from 0 to 3 m below LAT and mid tide ≈ 1 m above LAT;
- tide statistics from the Benoa gauge;
- consistent anecdote that the inside reef becomes exposed at the lowest tides.

Together they suggest the **reef flat top is near LAT (dry or nearly dry at spring lows, ~1 m of water at mid tide)** and the **breaking edge is ~1–3 m below LAT (2–4 m of water at mid tide)**. All of this is inferred.

### Cited Findings
- **[measured: tide gauge, via paper] Benoa gauge (UHSLC data), Az Zahra et al. 2024.**
  - Harmonic amplitudes: M2 0.61, S2 0.35, N2 0.10, K2 0.13, K1 0.27, O1 0.17, P1 0.07 (labelled "cm", but the magnitudes are metres).
  - Formzahl 0.414, "mixed-semidiurnal".
  - Monthly HHWL / LLWL / range:
    - 2020 Jul–Sep: 0.94 / −0.76 to −0.80 / 1.69–1.73 m; Dec 2020: 1.34 / −1.13 / **2.46 m**; 2020 average range 2.00 m.
    - 2022 Jul: 0.98 / −0.84 / 1.82 m; Aug: 1.04 / −0.82 / 1.86 m; Sep: 1.12 / −0.86 / 1.98 m; May and Nov: range 2.33 m; 2022 average range 2.16 m.
  - — [IOP Conf. Ser. EES 1350 012016](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016)
- **[modelled; computed here] Tide at an offshore point.** Open-Meteo sea level (Meteo-France), cell (−8.79, 115.04), 2023–2025, hourly:
  - daily range median 1.94 m, p95 2.76 m, max 3.13 m;
  - in Jun–Sep, the days with lows below −0.9 m had those lows at **05–07 and 16–18 WITA**.
  - The series has a ~+0.5 m mean offset, and its amplitudes exceed the Benoa gauge. Use the gauge for amplitudes; this series is useful only for timing.
  - — [Open-Meteo request](https://marine-api.open-meteo.com/v1/marine?latitude=-8.80&longitude=115.08&hourly=sea_level_height_msl&start_date=2023-01-01&end_date=2025-12-31&timezone=Asia%2FSingapore&cell_selection=sea)
- **[measured, approximate] Neighbour Bingin.** Wedge contours 0–3 m, platform ~3–4 m, ramp 4–7 m, all relative to LAT. Mid tide is "~1 m above datum". — [Mead 2000, ch. 5](https://hdl.handle.net/10289/13967)
- **[anecdotal] Low tide.**
  - "The final section… frequently pinches the barrel over a dangerously shallow part of the reef. At low tide it is extremely shallow"; "Low tide is best for huge top to bottom barrels. Mid tide is also very good and can be surfed at High tide." — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
  - Surfline (search snippet, page 403): "During the lower tides of the month, Padang Padang can become absurdly dangerous as the end section breaks below sea level and directly in front of exposed, jagged reef". It gives "Best Tide: Low" but says "mid tides… are required for classic conditions". — [Surfline](https://www.surfline.com/surf-news/mechanics-of-padang-padang-bali-indonesia-left-barrel/29045)
- **[anecdotal] Conflicting tide preferences.**
  - "needs a low (but not too low) tide" — [Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/)
  - "mid to high tide" with "rising" — [Surf Indonesia](https://www.surfindonesia.com/bali-surf-spots/padang-padang/)
  - "Mid tide" — [Surf-Forecast](https://www.surf-forecast.com/breaks/Padang-Padang)
  - "All tides" — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)
  - app heuristic MID/HIGH — [balisurf](https://github.com/chiliec/balisurf)
  - 2025 contest: "With a dropping tide from 7:30am onwards" — [Carve](https://www.carvemag.com/2025/08/rip-curl-cup-padang-padang-is-on-high-alert-to-run-wednesday-august-6/)
- **[modelled: classification; computed here] Reef-flat widths.** Along the main left, the reef flat (Terrestrial/Outer Reef Flat) is 100–195 m wide from the OSM coastline. The Reef Slope band beyond it is 100–200 m wide (flat edge at 100–195 m, slope ends at 230–335 m). The atlas mapped almost no distinct "Reef Crest" here (0.06 ha in the whole window). — [ACA WFS](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326)

### Inferences
- **Datum** [inferred]: LAT ≈ MSL − 1.1 to 1.3 m. The monthly LLWL already reaches −1.13 m, and the listed harmonic amplitudes sum to 1.70 m. Mean tide ≈ LAT + 1.0–1.2 m, which matches Mead's "mid-tide (~1 m above datum)". Dry-season lows (LLWL −0.76 to −0.86 m vs MSL) are ~0.3 m higher than the annual extremes.
- **Reef flat** [inferred]: "exposed, jagged reef" at the lowest tides puts the inside reef flat top near LAT, from −0.3 to +0.3 m. That means **~1 m of water at mid tide**, and bare or a few cm at spring lows (most likely at dawn or late afternoon in the dry season).
- **Breaking edge** [inferred by analogy with Bingin's 0–3 m wedge]: **~1–3 m below LAT**, i.e. **2–4 m of water at mid tide**.
- **Reef-front slope** [inferred]: if the atlas Reef Slope band spans roughly 3→10 m over 100–200 m, the reef front is ~1:15–1:30. That is consistent with the 1:18–1:20 from the vortex fit, but rough.
- **Game tide control** [inferred]: expose a range of about LAT to LAT + 2.3 m (MSL ± ~1.1 m). Use a dry-season range of ~1.7–2.0 m as the default, and allow up to 2.5 m in Nov–Jan/May.

### Gaps
- Crest depth at mid tide: **not found (measured)**. No tide station on the Bukit west coast was found. The phase and amplitude difference between Benoa (inside the bay, east side) and Padang is unknown.

---

## (e) Along-shore structure behind the "two to four barrel sections"

### Takeaway
Guides agree on the structure: a take-off peak that is "relatively manageable" because it forms in deeper water, then a long tube along the cliffs, then a shallow **end section** that pinches before the channel, giving "two, three or even four barrel sections". Mead's component list (**focus** for the take-off, **wedge** for the main tube, **pinnacle(s)** for the sections) explains this. The satellite reef map shows the reef-flat edge stepping **sharply shoreward (125 m → 45 m from the coast over ~120 m)** just before the channel, a plausible location for the pinching end section. No bowl-by-bowl bathymetry exists.

### Cited Findings
- **[anecdotal]**
  - "There can be two, three or even four barrel sections before the wave fades into the deep water channel."
  - "The take-off is relatively manageable because the wave forms in deep water."
  - "The final section of the wave, known locally as the end section, frequently pinches the barrel over a dangerously shallow part of the reef."
  - At head-high, "the wave will usually section at this size and the ride is short".
  - — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
- **[anecdotal]** "The start is a fast drop in, sometimes right into the pit"; riders "get real deep before opening up a little as it approaches the shelf". — [Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/)
- **[anecdotal]** Surfers "sit pretty deep in the barrel for up to 50 metres or so"; hazards include "the shallow reef on the end section". — [Surf Indonesia](https://www.surfindonesia.com/bali-surf-spots/padang-padang/)
- **[anecdotal]** Length "Normal (50-150m); Long on good days (150-300m)"; "The final section demands obligatory tube riding". — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)
- **[measured survey → classification]** Components ramp, focus, wedge, pinnacle. The focus "breaks earlier than any other part of the wave and so defines the start of the surfing ride". Pinnacles on the wedge create short sections or cause "a section of wave to collapse" if very shallow. — [Mead 2000, ch. 3–4](https://hdl.handle.net/10289/13967)
- **[modelled: classification; computed here] Reef-flat edge distance from the coast, west to east:**

  | Longitude (°E) | Flat edge from coast |
  |---|---|
  | 115.0905–115.0915 | 130–140 m |
  | 115.0917–115.0937 | 140–175 m |
  | 115.0940–115.0950 | 180–195 m (seaward bulge) |
  | 115.0952–115.0962 | 165–185 m |
  | 115.0965–115.0985 | 120–145 m |
  | 115.0987 | 125 m |
  | 115.0990 | 115 m |
  | 115.0992 | 100 m |
  | 115.0995 | 65 m |
  | 115.0997 | 45 m |
  | 115.0997–115.1015 | channel |

  Patches classed "Plateau" and "Back Reef Slope" lie 150–330 m offshore at 115.0967–115.0985°E. — [ACA WFS](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326)
- **[modelled: Bingin analogue]** Bingin's ridge on the wedge produces a "tube-section" whose length "was found to increase with increasing wave height… the ridge… is wider in deeper water". — [Mead 2000, ch. 5](https://hdl.handle.net/10289/13967)

### Inferences
- **A normal 50–150 m ride** [inferred] most likely spans ~115.0980–115.0997°E. That puts the take-off where the flat edge is ~120–145 m out and the end section where it swings in to 45–65 m. The offshore plateau patches at 115.0967–115.0985°E are a candidate for the **focus/take-off shoal**. The inward step of the edge before the channel is a candidate for the **end-section pinch** (the edge turns more oblique to the crest, so the local peel accelerates and the water shallows).
- **Game layout** [inferred]:
  - a focus bump near the start;
  - a straight wedge of ~80–150 m along ~066–078°, carrying 1–2 pinnacles or ridges spaced ~30–60 m apart (Mead's pinnacles are 1–10 m², ridges 5–50 m²), which gives 2–4 tube sections;
  - a final shoreward kink onto a shallow shelf (flat top ~LAT) just before a deep channel.
- The Bingin result suggests that sections lengthen with wave height. Wedge features that widen with depth reproduce this [inferred].

### Gaps
- No source names or locates individual Padang bowls. The ~5 m satellite classification cannot show pinnacles of 1–10 m². The actual position of the take-off relative to the reef map is not verified (Wannasurf's GPS is user-submitted).

---

## (f) Reported face heights on big Padang days, and how Bali "feet" relate to face height

### Takeaway
Contest reports use local feet: "five-foot sets", "gaping 6-footers" (2023), "6ft+" (2025) and "4–6ft" (2026 warm-up). The only explicit face-height statement is Surfline's "8- to 15-foot faces" as the best size, seen only in a search snippet. Bali reports follow the Australian/Hawaiian convention of roughly **half the face height**. A local camp's body-height mapping implies a factor of ~2 at 2–5 ft rising to ~3 at 6 ft. The reanalysis puts **contest days at offshore Hs ≈ 2.3–3.6 m with Tp ≈ 15–17 s**; 3.4–3.6 m is about the top 1 % of dry-season hours.

### Cited Findings
- **[anecdotal] 2023.** "Powerful five-foot sets stormed across the Padang reef"; "gaping 6-footers"; "the tide began to drop from the afternoon high"; "This was the best Padang swell to hit Bali during the waiting period so far" (Aug 4, 2023, afternoon warm-up). — [WSL](https://www.worldsurfleague.com/posts/519566/padang-padang-awakens-for-rip-curl-cup-warm-up-session)
- **[anecdotal] 2025.** "A promising large SSW groundswell… peaking Wednesday morning"; "Promising 6ft+ swell"; "dropping tide from 7:30am"; "clean offshore winds all day Wednesday" (run day Aug 6, 2025). — [Carve, Aug 4, 2025](https://www.carvemag.com/2025/08/rip-curl-cup-padang-padang-is-on-high-alert-to-run-wednesday-august-6/)
- **[anecdotal] 2026.** The event ran in "all-time conditions"; the warm-up had "pumping 4–6ft Padang Padang". — [Rip Curl Indonesia](https://www.ripcurl.co.id/pages/ripcurlcup-padang-padang-2026)
- **[anecdotal, unverified snippets]** "six- to eight-foot surf" (2023) and "4-6 foot" (2024) appeared in search summaries, but the opened pages did not contain them. — [WSL 2023 event page](https://www.worldsurfleague.com/events/2023/spec/4325/rip-curl-cup-padang-padang); [Rip Curl Canada 2024](https://ripcurl.ca/blogs/event-news/padang-padang-2024)
- **[anecdotal, search snippet only]** "The best wind and swell size for surfing at Padang Padang is 8- to 15-foot faces"; "6ft+ on the buoys". — [Surfline](https://www.surfline.com/surf-news/mechanics-of-padang-padang-bali-indonesia-left-barrel/29045)
- **[anecdotal] Size ranges.**
  - "Starts working at 1.0m-1.5m / 3ft-5ft and holds up to 4m+ / 12ft" — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)
  - Optimal "Double overhead to Triple overhead" — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
- **[anecdotal] Bali scale.** "In Bali we follow the Australian scale": 2 ft is shoulder high, 3 ft about head high, 4 ft head and a half, 5 ft double overhead, 6 ft triple overhead (article dated May 17, 2025). — [Bali Surfing Camp](https://www.balisurfingcamp.com/blog/surfers-guide-to-wave-height)
- **Hawaiian scale.** It corresponds "to roughly half the actual measured or estimated height of a wave's face" and "is also used in Australia". — [Wikipedia](https://en.wikipedia.org/wiki/Hawaiian_scale)
- **[modelled; computed here] Offshore conditions on contest days (ERA5 via Open-Meteo, cell −9.0, 115.0):**
  - 2023-08-04, 12–15 WITA: Hs 2.28–2.52 m, Tp 16.9–17.0 s, 199–201°. The next morning: Hs 3.36 m, Tp 16 s.
  - 2025-08-06, 06–15 WITA: Hs 3.62 → 3.24 m from 203°.
  - MFWAM swell partition, 2025-08-06: 3.6 → 2.9 m, mean period 13.6 → 12.3 s, 208–209°.
  - — [ERA5 2023](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2023-08-03&end_date=2023-08-05&timezone=Asia%2FSingapore); [ERA5 2025](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2025-08-05&end_date=2025-08-07&timezone=Asia%2FSingapore); [MFWAM 2025](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction&models=meteofrance_wave&start_date=2025-08-05&end_date=2025-08-07&timezone=Asia%2FSingapore)
- **[modelled; computed here]** ERA5 Hs p99 is 3.38 m in July and 3.34 m in August. Annual maxima over 2005–2024 were 3.3–4.6 m. — [ERA5 request, 2005–2024](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2005-01-01&end_date=2024-12-31&timezone=Asia%2FSingapore)

### Inferences
- **Converting Bali feet to face height** [inferred], using a 1.8 m surfer: 3 ft (head high) ≈ 1.8 m, 4 ft ≈ 2.7 m, 5 ft ≈ 3.6 m, 6 ft ≈ 3.6–5.4 m faces. The factor is ≈ 2 at 3–5 ft; the camp's "triple overhead" at 6 ft stretches it to ~3.
- **Suggested size presets** (face height at breaking) [inferred]:

  | Preset | Bali feet | Face height | Offshore Hs | Tp |
  |---|---|---|---|---|
  | Working | 4 ft | ~2.5 m | ~2 m | ≥14 s |
  | Contest | 5–6 ft | ~3–4 m | 2.3–3 m | 15–17 s |
  | Big | 6–8 ft+ | ~4–5 m | 3.3–3.6 m | ≥15 s |
  | Maximum | 10–12 ft | ~6 m+ | ≥4 m (annual-max tail) | — |

  These pair local feet with same-day reanalysis. That is not a transfer function: the swell wraps around the Bukit, so nearshore heights at Padang depend strongly on direction and period.

### Gaps
- No measured face heights, photogrammetry or nearshore wave record at Padang were found. The Surfline article could not be opened. The contest-day dates for 2023 and 2026 could not be pinned from the opened pages (2023 used the Aug 4 warm-up).

---

## (g) Offshore depth profile: distances to the 20, 50 and 100 m contours

### Takeaway
The only open numbers are GEBCO-based grids at ~460 m resolution, plus one published statement. SW of the Bukit tip the shelf is narrow: 100 m at ~8–9 km and 1000 m at ~16–21 km. NW of Padang (Jimbaran/Kuta shelf) there is a broad **20–45 m terrace**: 30 m at ~1.3–1.8 km, 50 m at ~6–8 km, and 100 m only at ~13.7 km (toward 300°) or beyond the ~13 km grid edge (toward 315–330°). No BATNAS, chart or satellite-derived bathymetry values were obtained.

### Cited Findings
- **[published statement; source not stated]** "Water depth drops from 0 to 100 m in 6 km from the shoreline… the 100 m isobath drops quite sharply to the 200 m isobath at some places (up to 1 km distance between 100 m and 200 m isobaths), particularly at the western, southwestern and southern corners of the Peninsular shelf". The seabed is described as "sandy… with depth ranging up to 1,500 m". — [Frontiers in Marine Science 2021, South Bali megafauna](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2021.606998/full)
- **[modelled: gridded compilation; computed here]** GMRT v4.5.0 uses GEBCO 2026 (15″) where there is no multibeam. — [GMRT about](https://www.gmrt.org/about/). Distances along bearings, from the grid:
  - **From the Uluwatu tip** (−8.8165, 115.0835), bearings 180–270°: 20 m at 0.9–2.5 km; 50 m at 6.1–8.3 km; **100 m at 8.0–9.3 km**; 200 m at 9.8–11.1 km; 500 m at 11.9–14.6 km; 1000 m at 16.5–20.6 km.
  - **From the Padang lineup** (−8.8105, 115.0994):
    - toward 255–270°: 20 m at 2.2–2.8 km, 50 m at 9.5–10.8 km, 100 m at 11.0–11.7 km;
    - toward 300–330°: 30 m at 1.3–1.8 km, 50 m at 5.8–7.7 km, 100 m at 13.7 km (300°) or not reached before the grid edge (~13 km, 315–330°);
    - profile along 330°: 21 m at 250 m, 25 m at 750 m, 30 m at 1.25 km, 40 m at 3 km, 42–46 m from 3.5 to 6 km, 50 m at ~6.8 km;
    - nearest isobaths: 50 m at 5.8 km (bearing 315°); 100 m at 8.8 km (bearing 169°, south of the Bukit).
  - **From the Bukit south coast** (−8.845, 115.12) southward: 20 m at 1.4–1.6 km, 50 m at 3.4–5.1 km, 100 m at 4.8–6.3 km. This is consistent with the Frontiers "100 m within 6 km".
  - — [GMRT GridServer request](https://www.gmrt.org/services/GridServer?north=-8.70&south=-9.25&east=115.25&west=114.75&layer=topo&format=esriascii&resolution=max)
- **[pointer]** The Bali provincial spatial portal links a PUSHIDROS TNI-AL (Navy hydrographic office) 2017 bathymetry map with 100, 200 and 1,300 m contours. It says nothing specific about the Bukit and was not downloaded. — [tarubali.baliprov.go.id](https://tarubali.baliprov.go.id/bathimetri/)
- **[modelled, relative only]** A public app repo builds Sentinel-2 relative bathymetry (Stumpf ratio) for Padang (`padang_psdb.tif`). Its metre calibration uses control points marked "general reef-break knowledge ESTIMATES, NOT measured soundings". It reports corr 0.84 and RMSE ~3.4 m against GEBCO at Uluwatu. — [balisurf repo, tools/sdb](https://github.com/chiliec/balisurf)

### Inferences
- For a Boussinesq domain, the input boundary at ~40–45 m depth lies ~3–6 km W/NW of Padang on the terrace [inferred]. A 16 s wave there has kh ≈ 0.6–0.7, which is intermediate depth. The terrace itself is the macro "ramp" that turns the wrapped swell toward the NW-facing coast [inferred].
- GEBCO's first few hundred metres from shore are not resolved (the grid even returns land at the lineup). Nearshore depths must come from the reef model in (a)–(e), not from GEBCO [inferred].

### Gaps
- **BATNAS/DEMNAS (Badan Informasi Geospasial): not accessed.** No BATNAS-derived distances are given here.
- No nautical chart soundings were found.
- No peer-reviewed satellite-derived bathymetry paper for the Bukit's west coast was found.

---

## (h) Swell climate: Bali south-west swell statistics by month

### Takeaway
Over 2005–2024, ERA5 at the nearest deep-water cell (−9.0, 115.0) shows the dry season (Jun–Sep) with **Hs mean 2.0–2.2 m, P90 2.6–2.8 m, Tp median 14.2–14.5 s, P90 ~16.5 s, and 15–17 % of hours with Tp ≥ 16 s**. Wet-season means are 1.6–1.8 m. The swell partition (MFWAM) comes from **203–209° (SSW)** all dry season. A published WW3 hindcast agrees on the seasonality: wave power ~40 kW/m in Jun–Aug against ~20 kW/m in Dec–Feb. No buoy was found.

### Cited Findings
- **[modelled] Published hindcast.** Rizal et al. 2019 (WAVEWATCH III, 1991–2015): wave energy along the south coasts of Java and Bali exceeds 20 kW/m. Seasonal "highest value in the period of June to August for about 40 kW/m… lowest… December to February for about 20 kW/m". — [Rizal et al. 2019, J. Renew. Sustain. Energy 11, doi:10.1063/1.5034161 (Tethys record)](https://tethys-engineering.pnnl.gov/publications/preliminary-study-wave-energy-resource-assessment-its-seasonal-variation-along)
- **[modelled; computed here] ERA5 (Open-Meteo "era5_ocean", 0.5°, cell −9.0, 115.0, hourly 2005–2024, n = 174,296)**:

  | Month | Hs mean | Hs P90 | Hs P99 | Tp median | Tp P90 | % Tp≥16 s | Mean dir (p10–p90), total sea | % Hs≥2 m |
  |---|---|---|---|---|---|---|---|---|
  | Jan | 1.82 | 2.48 | 3.04 | 12.5 | 15.2 | 6 | 222 (207–240) | 29 |
  | Feb | 1.68 | 2.28 | 3.08 | 12.6 | 15.2 | 6 | 220 (206–239) | 21 |
  | Mar | 1.63 | 2.16 | 2.92 | 13.2 | 15.9 | 9 | 215 (202–232) | 17 |
  | Apr | 1.69 | 2.18 | 2.80 | 13.7 | 16.2 | 13 | 202 (186–216) | 18 |
  | May | 1.92 | 2.46 | 3.06 | 14.2 | 16.4 | 15 | 190 (165–209) | 38 |
  | Jun | 2.05 | 2.60 | 3.28 | 14.2 | 16.6 | 17 | 190 (169–206) | 52 |
  | Jul | 2.19 | 2.78 | 3.38 | 14.5 | 16.5 | 17 | 189 (167–207) | 66 |
  | Aug | 2.13 | 2.68 | 3.34 | 14.2 | 16.4 | 15 | 193 (172–208) | 58 |
  | Sep | 2.05 | 2.68 | 3.24 | 14.3 | 16.4 | 16 | 201 (188–211) | 51 |
  | Oct | 1.82 | 2.38 | 3.06 | 13.6 | 16.2 | 12 | 205 (197–213) | 27 |
  | Nov | 1.56 | 1.98 | 2.44 | 13.1 | 15.3 | 5 | 206 (198–215) | 9 |
  | Dec | 1.60 | 2.04 | 2.76 | 12.6 | 15.1 | 5 | 214 (204–230) | 12 |

  Annual: Hs mean 1.85 m, max 4.62 m (2018). In May–Oct, "Hs ≥ 2 m and Tp ≥ 14 s" holds 36 % of the time; "Hs ≥ 2.5 m and Tp ≥ 15 s" holds 10 %. — [Open-Meteo ERA5 request](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2005-01-01&end_date=2024-12-31&timezone=Asia%2FSingapore)
- **[modelled; computed here] Swell vs wind-sea partitions (MFWAM, cell −8.958, 114.958, 2023–2025).** Periods are mean periods, not peak.

  | Months | Swell Hs | Swell direction (p10–p90) | Swell mean period | Wind-sea direction |
  |---|---|---|---|---|
  | Jun–Sep | 1.63–1.76 m | 203–208° (~197–218°) | 10.8–11.0 s | 117–128° (ESE–SE) |
  | May | — | — | — | 113° |
  | Oct | — | — | — | 134° |
  | Dec–Feb | — | — | — | 240–268° (W) |

  — [Open-Meteo MFWAM request](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_direction,wind_wave_height,wind_wave_direction&models=meteofrance_wave&start_date=2023-01-01&end_date=2025-12-31&timezone=Asia%2FSingapore); periods from [this request](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=swell_wave_period,wind_wave_period,wave_period&models=meteofrance_wave&start_date=2023-01-01&end_date=2025-12-31&timezone=Asia%2FSingapore)
- **[measured + modelled] Neighbour survey.** Bingin's survey-time waves were "1.8 m (H1/10), 16 s", and the model was run at 16 s. — [Mead 2000, ch. 5](https://hdl.handle.net/10289/13967)
- **[anecdotal] Season and consistency.**
  - Best season "May-October (Dry Season)"; consistency "Inconsistent (Rating: 4/10)". — [Surf-Forecast](https://www.surf-forecast.com/breaks/Padang-Padang)
  - "Very consistent (150 day/year)". — [Wannasurf](https://www.wannasurf.com/spot/Asia/Indonesia/Bali/Padang-Padang/index.html)
  - Best days "during the dry season, which runs from April to September". — [Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/)

### Inferences
- The ERA5 **total-sea** mean direction in the dry season (~190°) is pulled south by the ESE wind-sea. For swell input use the **swell partition, ~205° ± 10°** [inferred from MFWAM vs ERA5].
- **JONSWAP presets for the dry season** (offshore, before wrapping around the Bukit) [inferred]:

  | Preset | Hs | Tp | Direction |
  |---|---|---|---|
  | Typical | 2.0 m | 14 s | 205° |
  | Good | 2.5 m | 15–16 s | 205–215° |
  | Contest/big | 3.3–3.6 m | 16–17 s | 200–210° |

  A narrow spreading suits the long-period groundswell. Padang needs the long-period tail: Tp ≥ 16 s occurs only ~15–17 % of dry-season hours.

### Gaps
- No wave buoy near Bali was found. MFWAM swell peak periods were not available (mean periods only). ERA5 at 0.5° does not resolve the Bukit's sheltering, so all values are offshore.

---

## (i) Wind: dry-season SE trade-wind speeds and daily timing

### Takeaway
The nearest long surface record (Ngurah Rai airport, WADD, METAR 2015–2024) shows the dry season dominated by **ESE winds (vector means 111–120°), mean 9–10.5 kn (4.8–5.4 m/s) in Jun–Aug**. Winds are lightest at **06–07 WITA (~7 kn, from ~102–105°)**, build from 08–09 WITA, and peak at **13–16 WITA (12.6–13.0 kn, P75 15 kn, from ~114–121°)**. Guides say the wave "barrels best when the SE trade wind kicks in mid-morning". Relative to Padang's reef the wind blows cross-offshore. It is nearly head-on offshore relative to the wrapped (WNW–NW) waves (inferred).

### Cited Findings
- **[measured; computed here] Airport METAR (WADD), 2015–2024, n = 146,592, local time WITA.**
  - Monthly (scalar mean speed; vector-mean direction; share of reports from 090–180°):

    | Month | Mean speed | Direction | From 090–180° |
    |---|---|---|---|
    | May | 8.7 kn | 113° | 80 % |
    | Jun | 9.4 kn | 111° | 82 % |
    | Jul | 10.5 kn | 113° | 90 % |
    | Aug | 10.1 kn | 116° | 90 % |
    | Sep | 8.9 kn | 120° | 87 % |
    | Oct | 7.3 kn | 132° | 68 % |
    | Dec–Mar | — | 273–277° (W) | 9–27 % |

  - **Diurnal cycle, Jun–Sep** (mean kn / P75 / vector-mean direction):

    | Hour (WITA) | Mean | P75 | Direction |
    |---|---|---|---|
    | 00 | 8.0 | 10 | 114° |
    | 03 | 7.4 | 10 | 111° |
    | 06 | 6.8 | 9 | 105° |
    | 07 | 7.0 | 9 | 102° |
    | 08 | 8.6 | 11 | 104° |
    | 09 | 9.9 | 13 | 106° |
    | 10 | 10.9 | 13 | 108° |
    | 12 | 12.3 | 15 | 112° |
    | 14 | 12.9 | 15 | 118° |
    | 15 | 13.0 | 15 | 121° |
    | 16 | 12.8 | 15 | 123° |
    | 18 | 11.2 | 13 | 123° |
    | 20 | 9.2 | 11 | 118° |
    | 22 | 8.6 | 11 | 116° |

  - May–Oct speed P10 / P50 / P90: 4 / 9 / 14 kn.
  - — [Iowa Environmental Mesonet METAR archive request](https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=WADD&data=drct&data=sknt&year1=2015&month1=1&day1=1&year2=2025&month2=1&day2=1&tz=Asia%2FMakassar&format=onlycomma&latlon=no&elev=no&missing=M&trace=T&direct=no&report_type=3&report_type=4)
- **[modelled; computed here]** The MFWAM wind-sea offshore comes from 113–134° in May–Oct. This independently confirms the ESE–SE trade direction over the water. — [Open-Meteo MFWAM request](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_direction,wind_wave_height,wind_wave_direction&models=meteofrance_wave&start_date=2023-01-01&end_date=2025-12-31&timezone=Asia%2FSingapore)
- **[anecdotal] Guides.**
  - "SE light to Strong"; "the wave barrels best when the SE trade wind kicks in mid-morning" — [Bali Surfing Camp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)
  - "a good offshore from the east"; "the most reliable easterly winds" in the dry season — [Surf Atlas](https://thesurfatlas.com/bali-surf/surfing-padang-padang/)
  - "Ideal Wind Direction: Southeast" — [Surf-Forecast](https://www.surf-forecast.com/breaks/Padang-Padang)
  - Surfline (snippet, page 403): "The prevailing ESE trades, set up by seasonal high pressure to the south, are ideal… it's offshore a lot" — [Surfline](https://www.surfline.com/surf-news/mechanics-of-padang-padang-bali-indonesia-left-barrel/29045)
  - 2025 run day: "clean offshore winds all day" — [Carve](https://www.carvemag.com/2025/08/rip-curl-cup-padang-padang-is-on-high-alert-to-run-wednesday-august-6/)
  - App heuristic: offshore 90–135°, maximum 25 km/h — [balisurf](https://github.com/chiliec/balisurf)

### Inferences
- **Direction** [inferred]: ESE (105–124°) against a reef whose landward normal is 156–168° is ~35–60° off straight offshore, i.e. cross-offshore along the coast. But it blows almost exactly **against the inferred local wave direction** (waves from ~295–320°, travelling toward ~115–140°). That would explain "offshore a lot" and good lip hold-up even though the wind is cross-shore to the coastline.
- **Game wind presets, dry season** [inferred]:

  | Preset | Speed | Direction | Time (WITA) |
  |---|---|---|---|
  | Dawn | 3–4 m/s | 100–105° | 06–07 |
  | Mid-morning | 5 m/s | 106–110° | 09–10 |
  | Afternoon | 6.5–7.5 m/s | 115–125° | 13–16 |
  | Wet-season onshore/side | 4 m/s | ~275° | — |

- The airport sits on the isthmus between two bays. Its afternoon maximum likely includes a sea-breeze boost, so values at Padang may differ [inferred].

### Gaps
- No wind record on the Bukit's west cliffs was found. Station siting and averaging details for WADD were not checked. No published sea-breeze study for the Bukit was found.
