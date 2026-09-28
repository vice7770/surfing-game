# The whitewater roller and turbulent bore as geometry a surfer rides and hits

Researched 2026-09-28. Tags: **[meas-field]** field measurement, **[meas-lab]** lab measurement, **[model]** a model or parameterisation, **[anecdotal]** practitioner or reviewer report, **[game-doc]** game documentation or developer statement, **[inference]** my own reasoning from the cited numbers. Access level: *(full text)* means I read the paper; *(abstract)* means I read only the abstract; *(snippet)* means I saw only a search-engine rendering because the page was blocked or not opened. This round builds on the earlier notes in `.claude/water-physics/research_notes/Breaking waves foam and tubes/` (`whitewater_foam.md` §1 and §6, `depth_averaged_breaking.md`). It does not repeat them except to check the "known" values. WebFetch hit a session limit near the end, so one lead (Shi et al. 2023b, below) was found but not opened.

## 1. Roller shape: profile, thickness, toe, roughness, height above the underlying water, and how it evolves from the break point to the swash

### Takeaway
In the inner surf zone the aerated roller covers the **whole front face** from crest to toe (L_r·tanθ ≈ H). Its length is about 2.9H, slightly more in the field. Its face slopes 25° at onset and relaxes to 16–22°, with a further drop of about 10° where the beach steepens. Its mean thickness depends on the density you assume. The LiDAR-calibrated area (0.33–0.36·(ρ/ρ_r)·H²) gives a mean thickness of about 0.13H at ρ_r = 0.87ρ, and up to about 0.3H if the roller is lighter. Lab bores and jumps add three things: a self-similar upper surface that rises steeply at the toe and flattens toward the crest, a jagged toe line with transverse wavelengths of about 1–10 times the depth ahead of the bore, and air held only in the top part of the bore, above the undisturbed water level.

### Cited Findings
**Field geometry (Martins et al. 2018, LiDAR, Saltburn UK)** *(full text, author's accepted version)*
- [meas-field] **Set-up:** three 2D LiDARs on a pier sampled at 25 Hz on a 0.1 m cross-shore grid. The analysis covers inner-surf-zone bores on 9–10 April 2016, with Hs ≈ 1 m and Tp ≈ 10–11 s offshore. — [Martins et al. 2018 (Bath repository PDF)](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf); [doi:10.1029/2017JC013369](https://doi.org/10.1029/2017JC013369)
- [meas-field] **Definitions:** the roller is the part of the profile from the crest, through the breaking region where ∂η/∂x < 0, to the toe. The toe is where the surface gradient falls to 20% of its maximum over the roller (∂η/∂x = 0.2 tanθ_max). The authors chose this threshold after checking every wave by eye:
  - a lower threshold put the toe at the trough, which "can sometimes be well in front of the roller itself";
  - a higher one put the toe inside the roller.

  For fully developed bores, the toe is "close to and seaward of the preceding trough". θ is a straight-line fit from crest to toe. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [meas-field] **Angle and length:**
  - Roller angles are "2 to 6 times greater" than the 5.7° (tanθ ≈ 0.1) used in roller models.
  - On one tracked wave the angle fell from 25° to 18° in the first 8 m after breaking, held at 16–22° between x = 131 and 160 m, then dropped by about 10° between x = 165 and 170 m. That drop came where the beach slope is greatest, together with faster height decay.
  - High angles coincide with high dissipation. Peaks in L_r lag peaks in θ by 5–7 m.
  - L_r correlates with H (r² = 0.62) and is "slightly larger than" Duncan's L_r = 2.91H. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [meas-field] **The roller spans the full face.** "If L_r is correctly measured, we should get L_r tanθ ≈ H"; this holds with r² = 0.89 and RMSE 0.06 m. By contrast, in Duncan's steady hydrofoil breakers the roller "covered only a fraction of the wave face", following H = 1.6·L_r·tanθ. There may also be a linear trend between tanθ and H, but the authors say more sites are needed. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [meas-field + model] **Underside and area:**
  - "No threshold for the void fraction which represents the underside of the roller area has been proposed", and "no clear interface between the wave and the roller is generally observable for inner surf zone waves and fully developed bores".
  - Duncan (1981) defined the area with the tangent to the smooth water below his breaker. Govender et al. (2002) defined it as the "aerated region" only. Martins drew the interface as "ellipsoidal … close to the roller toe" (their Fig. 7).
  - To match the measured dissipation, Martins modified the area formulas: A = 0.326(ρ/ρ_r)H² from Svendsen, or 0.362 for a less energetic group; over 38 individual waves the mean was 0.364 ± 0.059. A = 0.026(ρ/ρ_r)(L_r/cosθ)² from Duncan.
  - At ρ_r = 0.87ρ these are 42% and 27% of Svendsen's and Duncan's originals. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [model, cited by Martins] The roller is "a turbulent mass of mixed water and air centred on the Mean Water Level (MWL)" that "moves at the same speed c as the carrier wave" (Svendsen 1984). For this dataset the Booij celerity reduces to c²/g ≈ h_w + H/2 ≈ 2.49H − 0.06. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)

**Lab and field front slopes and roller lengths**
- [meas-lab] Zhang, Chen, Zheng & Demirbilek (ICCE 2014) re-analysed the barred-beach flume data of Haller & Catalán (2009): regular waves H = 0.37–0.51 m, T = 5–8 s, mean bed slope 0.042. They defined slope as the mean front slope from zero up-crossing to crest.
  - The slope "peaks at the dominant breaking point and decreases towards the shore".
  - It ranges from 0.2 to 0.8 and "tends to approach a stable value around 0.2 in the inner surf zone".
  - Haller & Catalán had found 0.24–0.35 reproduced their measured roller lengths.
  - The roller showed "growth, equilibrium, and decay phases" over the bar and trough. — [Zhang et al. 2014 (PDF)](https://pdfs.semanticscholar.org/1760/1a77ba2f2a37dd3985fca0018156f682ccb2.pdf)
- [meas-field] Carini et al. (2015), thermal-IR camera at Duck NC (SZO 2010; mean Hs 0.77 m, max 1.24 m):
  - Roller length is the crest-perpendicular length of the aerated breaking region. Lengths reached "as great as 4.5 m at the shore and 5.5 m over the bar".
  - At low tide, rollers grow to a depth-limited L_r and then shorten.
  - They restate Duncan (1981) as a self-similar aspect ratio, A/L_r² = 0.11 ± 0.01 (mean thickness A/L_r = 0.11·L_r). Duncan's breakers had face slopes of 10°–14.7° and speeds of 0.625–1.03 m/s.
  - Duncan also assumes the toe sits "approximately at mean water level", not in the trough. — [Carini et al. 2015 (PDF)](https://faculty.washington.edu/jmt3rd/Publications/Carini2015.pdf)
- [meas-lab] Govender & Mocke (ICCE; OJS listing dated 2025) used particle and bubble image velocimetry on a 1:20 beach: plunging T = 2.5 s, H₀ = 12 cm; spilling T = 1.11 s, H = 16 cm.
  - Earlier records were "confined to below the wave trough due to the presence of wave bubbles higher in the water column", and this was worse in plunging waves.
  - Plunging waves show "considerable turbulent intensities above the approximated trough level".
  - They report no numeric roller geometry. — [Govender & Mocke, ICCE (PDF)](https://icce-ojs-tamu.tdl.org/icce/article/view/14624)
- [meas-lab] Govender, Mocke & Alport (2002) measured "roller geometries" with digital correlation image velocimetry and grey-scale filtering of video. Numbers are not available to me. *(snippet; Wiley 403)* — [doi:10.1029/2000JC000755](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2000JC000755)
- [meas-lab] Kimmoun & Branger (2007) ran PIV over a 1/15 beach from incipient breaking to the swash. They used 14 overlapping windows and estimated void fraction "in each point of the surf zone". The abstract gives no values. *(abstract)* — [JFM 588, Cambridge](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/particle-image-velocimetry-investigation-on-laboratory-surfzone-breaking-waves-over-a-sloping-beach/8BE91DB5F5213EDDA333B5815472F796)

**Lab jumps and bores: upper-surface profile, toe line and aerated layer** (Wang, Leng & Chanson 2017, ICE Eng. Comput. Mech. 170) *(full text)*
- [meas-lab + model] **Profile:** the time-averaged roller surface of a stationary jump is self-similar: (d − d₁)/(d₂ − d₁) = ((x − X_toe)/L_r)^0.537 for 0 < (x − X_toe)/L_r < 1. This is an empirical fit for 3.8 < Fr₁ < 10 (Wang & Chanson 2016). The roller length is L_r/d₁ = 6(Fr₁ − 1) for Fr₁ < 10. — [Wang, Leng & Chanson 2017 (PDF)](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab] **Fluctuations and toe motion:**
  - For both stationary jumps and moving bores, "the maximum roller surface fluctuations were observed in the first half of roller", and their size grows with Froude number.
  - An uplifted roller surface coincides with the toe shifting downstream.
  - The toe oscillates horizontally more than the surface does vertically, at 0.4 times the frequency of the depth fluctuation.
  - The fitted line in their Fig. 7, as extracted from the PDF, reads d′_max/d₁ = 1.5 × (Fr₁ − 1). I could not reconcile it with the figure's 0–1 axis, so treat it as **unverified**. — [Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab + meas-field] **Toe perimeter:**
  - Seen from above, the toe is a "continuous curvy shape" that varies rapidly in x, y and t, with "backshifts of the toe from time to time".
  - Lab bore: spectral peaks at L_w = 0.2 m and 0.146 m, a predominant L_w/d₁ ≈ 1.2.
  - Qiantang River tidal bores: 0.7 < L_w/d₁ < 25, with predominant L_w/d₁ ≈ 1 and 5–10 (Leng & Chanson 2015a).
  - Stationary jumps: 0.7–7.
  - Coherent toe structures have integral length 2–5.5·d₁. Free-surface structures have integral length rising from 0.5·d₁ at the toe to 3·d₁ at the end of the roller. — [Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab] **Where the air sits in a weak breaking bore** (Fr₁ = 1.4–1.5): "a large amount of air bubbles entrained at vertical elevations between 1·25 < z/d₁ < 1·5. No bubbles were detected for z/d₁ < 1·05." Probe signals above 1.5·d₁ were intermittent because of the roller surface. Negative instantaneous toe celerity was observed. — [Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab] Leng & Chanson (2015), breaking tidal bores (Mech. Res. Commun. 65):
  - The toe perimeter "fluctuated rapidly with transverse distance and time" with a characteristic transverse wavelength.
  - Celerity fluctuations had a "ratio of standard deviation to mean value greater than unity".
  - Toe scatter and wavelength were "comparable to field observations". *(snippet)* — [ScienceDirect abstract](https://www.sciencedirect.com/science/article/abs/pii/S0093641315000348)

**Evolution and the "known" values**
- [meas-lab, earlier round] Haller & Catalán (2009): roller optical intensity ramps up from the toe to a maximum at the crest. — [doi:10.1029/2008JC005185](https://doi.org/10.1029/2008JC005185) (via `whitewater_foam.md` §1)
- [earlier round; mixed field, lab and model sources] Consistent with this round: L_r ≈ 2.9H, face 25° easing to 16–22°, ρ_r ≈ 0.87ρ, c ≈ 1.14–1.3√(gh), and bores stop breaking below Fr ≈ 1.3, a lab result (`depth_averaged_breaking.md` lines 183–242). Martins attributes the 1.14 factor to Tissier et al. (2011) — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)

### Inferences
- [inference] **Two constraints fix a roller mesh's outline.** L_r·tanθ ≈ H means that choosing θ from the stage also sets L_r = H/tanθ:
  - onset, 25°: about 2.1H;
  - fully developed, 16–22°: 2.5–3.5H;
  - steep inner beach, about 11°: about 5H.

  This matches the shorter rollers near the break point (Haller & Catalán; Martins) and the 2.9H mean.
- [inference] **Suggested upper-surface shape.** Use the jump power law z_top(s) = H·s^0.54, with s running from 0 at the toe to 1 at the crest. It rises steeply at the toe and flattens toward the crest. Give the foot a finite slope rather than the power law's vertical tangent, because Martins' 20%-gradient toe implies a smooth foot. Place the toe near mean water level or just behind the preceding trough, as in Duncan and Martins. Do not reuse the jump's L_r/d₁ = 6(Fr₁ − 1): it gives L_r ≈ 4.4·(d₂ − d₁) for Fr₁ = 1.5–3, which is longer than the ≈ 2.9H measured on surf-zone rollers.
- [inference] **Thickness above the unaerated water:**
  - Duncan's A = 0.11·L_r², with L_r = 2.9H, gives 0.93H²; this appears to be where Svendsen's 0.9H² comes from. Its mean thickness is about 0.31H.
  - The LiDAR-calibrated area 0.326·(ρ/ρ_r)·H² gives a mean thickness of 0.13H at ρ_r = 0.87ρ, 0.19H at 0.6ρ and 0.28H at 0.4ρ.
  - A wedge or ellipse that is 0 at the toe would be about twice as thick at the crest.
  - Build the roller as a lens: roughly 0.25–0.5H thick near the crest, tapering to 0 at the toe, and sitting on top of the smooth bore face. The game's existing bore aeration depth of 0.3H (`src/wave/AerationField.ts`, line 13) sits at the upper end of this range.
- [inference] **Lifecycle for geometry:**
  - At the break point: short (≈ 2H) and steep (25–39°; Zhang's slopes up to 0.8).
  - Over roughly the first 8 m, or about one roller length, it relaxes to 16–22° and lengthens, with L_r peaks lagging θ peaks by 5–7 m.
  - It keeps a quasi-steady shape across a flat or barred inner zone, and shrinks or reforms over troughs (Zhang/Haller: growth, equilibrium, decay).
  - It flattens by about 10° and loses height faster where the beach steepens near shore (Martins).
  - It stops breaking and sheds the roller when the bore Froude number falls below about 1.3 (earlier round).

### Gaps
- No measured cross-section of a field roller's underside. Martins says no interface is observable, and LiDAR sees only the top surface. Thickness therefore rests on area formulas plus an assumed density.
- Govender et al. (2002) roller-area and slope numbers, and Kimmoun & Branger (2007) void-fraction maps: blocked (Wiley 403, HAL bot wall); abstracts only.
- The newest roller-area papers were blocked (ScienceDirect 403): the 2025 surf-zone roller-area evolution study ([S0141118725000483](https://www.sciencedirect.com/science/article/pii/S0141118725000483)) and the 2026 irregular-wave roller-area study ([S0141118726001756](https://www.sciencedirect.com/science/article/pii/S0141118726001756)).
- Roller behaviour in the last metres before the swash (bore collapse at the shoreline) was not researched in this round.
- The Wang et al. (2017) Fig. 7 fit coefficient is unverified (see above).

## 2. Aeration and buoyancy: void fraction in and under the roller, and what aerated water does to a floating board or body

### Takeaway
Under surf-zone bores the air is concentrated **above trough level**. Ensemble-averaged maxima there are about 15–20% (Cox & Shin 2003). Local instantaneous values reach 0.96 in plunging breakers, and the roller's surface layer runs up to void fraction 1. Weak lab bores hold no bubbles below the undisturbed water level. Field-calibrated mean roller densities are about 0.6–0.87ρ, and probably lower. A floating body in such a mixture sits deeper by 1/(1 − α). A prone surfer on a 30 L board can no longer float statically once α exceeds about 0.28. Planing lift and drag fall in proportion to the mixture density. Rising bubbles can partly offset this by lifting a floating body with upwelling drag. I found no measurement of a surfboard or person floating in surf-zone foam.

### Cited Findings
- [meas-lab] Cox & Shin (2003) made lab measurements of void fraction in the bore region of regular waves on a plane slope, "above trough level in the aeration region":
  - Maximum ensemble-averaged void fractions were "between 15 and 20%".
  - Above still water level, the void fraction's time variation "could be modeled by linear growth followed by exponential decay".
  - Normalised by wave period and mean void fraction, that variation looks self-similar. *(snippet of abstract; ASCE 403)* — [J. Eng. Mech. 129(10)](https://ascelibrary.org/doi/10.1061/(ASCE)0733-9399(2003)129:10(1197))
- [meas-lab] Mori, Suzuki & Kakuno (2007) used a dual-tip resistivity probe and an ADV in two flumes to check scale effects:
  - Bubble sizes follow a power law d^−1.5 to d^−1.7, "independent of the location".
  - Void fraction is linearly related to turbulence intensity. *(snippet; Wiley 403)* — [doi:10.1029/2006JC003647](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2006jc003647)
- [meas-lab] **Vertical structure of the aerated layer** (Wang, Leng & Chanson 2017):
  - In a weak breaking bore (Fr₁ = 1.4–1.5), air sits between 1.25 and 1.5·d₁; none was found below 1.05·d₁.
  - Hydraulic-jump rollers have two layers: a shear layer with a local maximum of void fraction and bubble count, and above it a free-surface layer where the void fraction "increased monotonically to unity". Y₉₀, the height where C = 0.9, is the conventional "surface".
  - As extracted, the shear-layer peak decays along the roller as C_max ≈ 0.5·exp(−3.4 (x − X_toe)/L_r).
  - Bubbles range "from less than a millimetre to a centimetre", with a chord-time mode of 1–2 ms.
  - To limit viscous scale effects, lab jumps need Re greater than 4–6 × 10⁴. — [Wang, Leng & Chanson 2017 (PDF)](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab] Wüthrich, Shi & Chanson (2022), jumps at Fr₁ = 2.1 and 2.4:
  - Depth-averaged void fraction peaked at about one inflow depth downstream of the toe.
  - Near the surface, "values of C > 0.9" were discarded as "splashing and detached droplets".
  - Large bubbles reached about 100 mm across before rupturing. — [Environ. Fluid Mech. (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9363398/)
- [meas-lab] Shi, Wüthrich & Chanson (2023), unsteady breaking bore: the vertical void-fraction distribution at the leading edge "exhibits a convex profile". *(snippet)* An open reprint exists but was not opened because of the fetch limit. — [Shi et al. 2023b reprint (not opened)](https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023b.pdf)
- [meas-field + model] **Mean roller density:**
  - ρ_r/ρ = 0.87 gave the best fit to the LiDAR dissipation, "well within the range of previous observations of void fractions" (Cox & Shin; Kimmoun & Branger; Govender; Rojas & Loewen).
  - But this density "corresponds to a surface roller confined in the most aerated part of the breaker … suggesting that a smaller mean roller density is more likely". Their Fig. 7 compares 0.8 and 0.4.
  - Duncan needed 0.61ρ. Keeping Duncan's original area would require 0.23ρ, "unrealistic in the inner surf zone". — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [meas-lab, earlier round] Plunging and shallow landings (from `whitewater_foam.md` §6):
  - Rojas & Loewen (2010): local peaks 0.024–0.96, time averages 0.012–0.37, spilling mean 0.17–0.29 ([doi:10.1029/2009JC005614](https://doi.org/10.1029/2009JC005614)).
  - Chanson et al. (2002): depth-averaged void fraction above 10% next to jet impact, 4–6% at 1–1.2 depths downstream. The plume reached the 0.4 m bed in 0.23–0.27 s. Bubbles rose at about 0.2 m/s for 0.5–50 mm diameters, and Froude-scaled labs "tend to underestimate" entrainment ([PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)).
- [model/theory] Hueschen (2010, Am. J. Phys. 78:139–141): bubbles "reduce the buoyant force by reducing the density of the water, but if they entrain an upwelling flow of water as they rise, they can produce a large upward drag force on the floating object". *(snippet of abstract; AIP 403)* — [Am. J. Phys.](https://pubs.aip.org/aapt/ajp/article-abstract/78/2/139/570670/Can-bubbles-sink-ships?redirectedFrom=fulltext)
- [model/lab] May & Monaghan (2003) combined experiments and simulation of a single large bubble rising under a floating body.
  - A body beside the bubble can be drawn into the trough it creates and swamped.
  - A body directly above sits at a stagnation point and is safe. *(snippet)* — [ResearchGate listing](https://www.researchgate.net/publication/242546591_Can_a_single_bubble_sink_a_ship)
- [anecdotal] River-rescue and canyoning practitioners say aerated hydraulics "provide less buoyancy". Swimmers can be held in them, and higher-flotation PFDs are advised for aerated water. *(snippets; pages not opened)* — [Canyon Magazine](https://canyonmag.net/technical/safety/hydrology/); [paddling.com forum](https://forums.paddling.com/t/optimal-pfd-buoyancy-for-highly-aerated/33425)
- [game-doc] The game already floats the hull and the detached swimmer in a mixture of density ρ(1 − α). See `src/physics/hullForces.ts` lines 159–160 and `src/physics/DetachedSurfer.ts` lines 548–549. `AERATION` in `src/wave/AerationField.ts` (line 13) caps α at 0.2, with bore depth 0.3H and plunge depth 0.8H.

### Inferences
- [inference] **Static float in a mixture.** A body of mass m needs a submerged volume V = m/(ρ(1 − α)).
  - At α = 0.2 it sits 25% deeper; at 0.5, twice as deep.
  - Board + rider (78 kg; 30 L board + about 75 L body) can float statically only while α < 0.28. With a 60 L board the limit is α < 0.44.
  - A breath-holding swimmer of about 985 kg/m³ has no static float once α exceeds about 0.04. This matches the game's existing test that aerated water is lighter than a surfer holding a breath.
  - So in the top of a roller (α from 0.2 to 1), a prone surfer is **pulled down until they reach the less aerated water below**. The roller's shallow aerated lens explains why the board "bogs" rather than sinking to the bottom.
- [inference] **Planing and drag.** Planing lift and form drag both scale with the fluid density, so a standing rider in a mixture of α = 0.2 gets about 20% less lift at the same speed and angle of attack. The board then rides deeper, with more wetted area, or noses up. This is the physics of "bogging" in the soup. The game's ρ(1 − α) hull density already does this if α is sampled in the roller lens.
- [inference] **Continuum assumption.** Bubbles are 0.1–100 mm across, much smaller than a board or body, so treating the mixture as a continuum is reasonable. Patchiness at the 0.1–1 m scale (boils, holes, fingers; §4) should make buoyancy flicker, which suits a stochastic α. Hueschen's upwelling drag suggests adding a small upward force where bubbles are rising (behind the roller, as it degasses at about 0.2 m/s). In the moving roller itself the forward flow dominates.
- [inference] **Density to give the roller.** Use 0.6–0.87ρ as the lens average (Duncan–Martins), grading from about 0.5ρ or lower at the surface (C → 1 at Y₉₀) to ρ at the lens underside. Where air is present, the game's α_max = 0.2 is conservative for the roller lens. It may suit depth-averaged plume air but not the lens.

### Gaps
- No measurement found of a surfboard, bodyboard or person floating in surf-zone foam or roller water (draft, lift, drag).
- Cox & Shin, Mori et al., Hoque & Aoki (2005) and Kimmoun & Branger full texts were blocked. There are no vertical void-fraction profiles for field bores; all profiles are from the lab.
- The Shi et al. (2023b) open reprint on bore void fraction was found but not opened.

## 3. Forces on a surfer or body in a bore: impact, the whitewater push, riding speed, and duck-diving

### Takeaway
There are no surf-specific force or speed measurements. The best proxies are these:
- **Tsunami-bore loads.** Drag is F = ½·C·ρ·A·U², with C ≈ 2 for a square column and ≈ 0.65 for a cylinder. A bore's leading-edge impact is at most about 1.5× the later quasi-steady force.
- **Human-stability flume data.** Adults are knocked over at 0.26 m depth and 3 m/s, or 0.4 m and 2.6 m/s.
- **Tsunami debris.** Floating debris never outruns the bore front.
- **Duncan's roller force balance.** By my estimate it implies a shear of about 330·H Pa (H in m) on the face under the roller, comparable to gravity's pull along the slope on a prone rider.

A rider carried by whitewater therefore moves at up to the bore speed c ≈ 1.14–1.3√(gh), which is 3.4–4.9 m/s for H = 0.5–1 m. Tidal-bore surfers ride 0.3–0.6 m bores at 2.5–3.1 m/s. I found no peer-reviewed duck-dive study.

### Cited Findings
- [review + meas-lab] Yeh et al. (2014, ICCE 34), tsunami loads on structures:
  - Drag is F_D = ½·C_D·A·ρ·U². For a surface-piercing body C_D "must be a function of gravity (i.e. Froude number)". Arnason et al. (2009) therefore used a resistance coefficient, "C_R ≈ 2 for a square column".
  - At a bore front, "the upper limit of the impulsive force caused by a bore is approximately 150% of the subsequent maximum hydrodynamic force", which the authors stress is an empirical result from two small lab studies (Ramsden 1993; Arnason 2005).
  - Surges running over a dry bed give impulsive forces smaller than the later quasi-steady force, because their fronts are shallow. — [Yeh et al. 2014 (ICCE)](https://icce-ojs-tamu.tdl.org/icce/article/view/7955)
- [meas-lab] Arnason, Petroff & Yeh (2009) generated dam-break bores in the lab and measured surface (LIF), velocity (LDV/DPIV) and column forces (load cell). *(abstract)* — [J. Disaster Res. 4(6)](https://www.fujipress.jp/jdr/dr/dsstr000400060391/)
- [meas-lab] Bores 140–210 mm high at 1.98–2.45 m/s on a cylinder gave a "hydrodynamic coefficient of 0.65". For a square prism, drag coefficients were 1.15–1.65 depending on orientation. *(snippets; two cylinder papers appeared in the results, and I could not confirm which one reports the 0.65)* — [Instant tsunami bore pressure and force on a cylindrical structure](https://www.sciencedirect.com/science/article/abs/pii/S1570644315300472); [Coastal Eng. 110 (2016), ADS](https://ui.adsabs.harvard.edu/abs/2016CoasE.110....1S/abstract)
- [meas-lab + model] Arrighi, Oumeraci & Castelli (2017), people in floodwater:
  - **Mechanisms:** a person slides when drag exceeds (W − B − Lift)·μ, with μ = 0.3 assumed; they topple when the drag moment exceeds the restoring moment.
  - **Coefficients:** the body's drag coefficient runs "from 0.1 for high Froude numbers, up to approximately 1 for low Froude numbers" and falls exponentially as Fr rises (less submergence). Lift coefficients were −0.49 to 0.06, mostly downward.
  - The critical mobility parameter runs from 0.3 (subcritical) to 6 (supercritical).
  - **Measured instability pairs:**

    | Subject | Height, mass | Frontal area | Depth (m) at speed (m/s) |
    |---|---|---|---|
    | Stuntman | 1.70 m, 68.2 kg | 0.43 m² | 0.26 at 3.0–3.1; 0.33 at 2.6; 0.35 at 2.4 |
    | Karvonen et al. subject 2 | 1.95 m, 100 kg | 0.49 m² | 0.40 at 2.6; 0.60 at 2.0; 1.00 at 1.2 |

  — [HESS 21:515–531](https://hess.copernicus.org/articles/21/515/2017/)
- [review of meas-lab] A review of tsunami-driven debris (Frontiers in Built Environment, 2017):
  - "The debris velocity was found to be always less than or equal to the bore front velocity" (Matsutomi et al. 2008).
  - Entrainment begins "after the leading edge of the bore passes the debris" (Shafiei et al. 2016).
  - Debris first rides "within the overflow of the bore", then slows and falls behind once it touches the bed (Yao et al. 2014).
  - Boulders pivot to put their long axis across the flow (Imamura et al. 2008).
  - In-water impact peaks run up to 1.5× those in air (Shafiei et al. 2016). — [Tsunami-Driven Debris Motion and Loads: A Critical Review](https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2017.00002/full)
- [model] **Roller speed and push.**
  - The roller "moves at the same speed c as the carrier wave" (Svendsen 1984, via Martins). For the Saltburn data, c²/g ≈ 2.49H − 0.06.
  - Duncan's balance is τ·L = ρ_r·g·A·sinθ with L = L_r/cosθ: the roller's weight along the face is held by shear on the face beneath it. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf); [Carini et al. 2015](https://faculty.washington.edu/jmt3rd/Publications/Carini2015.pdf)
- [meas-lab] Ejected droplets travel at about 1.5× the bore-front speed (Wüthrich et al. 2021, as summarised from the article page). — [JFM 924](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/strong-freesurface-turbulence-in-breaking-bores-a-physical-study-on-the-freesurface-dynamics-and-airwater-interfacial-features/84559CFD248197C7B88FBF5F6B1FBFD3)
- [meas-field] Tidal bores that surfers ride:
  - Sélune (France): bores 0.3–0.6 m high moving at 2.5–3.1 m/s.
  - Chanson photographs "kayacks and surfers riding the bore" on the Dordogne (2000) and a surfer on the Garonne bore front (2008). — [Chanson, tidal bores page](https://staff.civil.uq.edu.au/h.chanson/tid_bore.html)
- [anecdotal] Pororoca riders have stayed on one bore for over 30 minutes and 12 km. *(snippet; not opened; I am not sure which result carried this claim)* — [Pororoca (Wikipedia)](https://en.wikipedia.org/wiki/Pororoca); [Surfer Today, tidal bores](https://www.surfertoday.com/surfing/what-is-a-tidal-bore)
- [meas-lab] **Why duck-diving under spilling water works:**
  - Aeration and much of the turbulence are concentrated above trough level (Govender & Mocke; Cox & Shin).
  - In spilling waves TKE is "almost uniform with a small linear increase above the bed", but in plunging waves it "increases exponentially" toward the surface and is much larger. — [Govender & Mocke (ICCE)](https://icce-ojs-tamu.tdl.org/icce/article/view/14624)
  - Breaking creates large "horizontal eddies" and "obliquely descending eddies" that carry vorticity and Reynolds stress into the water column (Nadaoka et al. 1989, abstract). A secondary summary says these eddies approach the seabed *(snippet)*. — [JFM 204](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/structure-of-the-turbulent-flow-field-under-breaking-waves-in-the-surf-zone/90525A3B07B4895FC1D26D5EA94F97F9)
- [gap confirmed] A 2025–2026 scoping review of surfing biomechanics (26 studies, 2010–2025) lists paddling, pop-up, aerials, bottom turns and similar topics, but no duck-dive study turned up. *(snippet)* — [MDPI scoping review](https://www.mdpi.com/2673-7078/6/2/36). The earlier round found the same. The repo cites coaching advice: sink the nose 40–60 cm and start 1–2 body lengths before the whitewater arrives (`docs/research/surf-gameplay-research.md` line 284).

### Inferences
- [inference] **How fast a rider in whitewater goes.** At most the bore speed: c ≈ 3.4 m/s at H = 0.5 m, 4.9 m/s at H = 1 m and 6.0 m/s at H = 1.5 m (Martins' regression), or 1.14–1.3√(gh). A rider falls behind as soon as they drop out of the roller lens into the bore body. There, mass conservation gives u = c(1 − h₁/h₂), only 0.33c for h₂/h₁ = 1.5 and 0.5c for 2. This is the debris result: objects ride the overflow, then lag. Beginners riding prone are therefore pushed at close to c only while the board sits in or just ahead of the roller on the face.
- [inference] **Size of the push.** With the LiDAR-calibrated ρ_r·A = 0.326·ρ·H² (independent of the assumed density), Duncan's balance gives τ ≈ 0.326·ρ·g·H²·sinθ·cosθ/L_r ≈ 330·H Pa at θ = 18°, L_r = 2.9H:
  - about 166 N at H = 1 m on 0.5 m² of board and back;
  - compared with 236 N of gravity along an 18° face for 78 kg.

  So the roller roughly doubles the downslope drive of a prone rider on the face. This is a better basis for the push than an ad hoc impulse.
- [inference] **Getting hit (paddling out, facing the roller).** These are upper-end numbers, because water inside the roller moves at or below c.
  - Relative speed is about c + 1 m/s of paddling, 4.4–5.9 m/s for H = 0.5–1 m.
  - Dynamic pressure is ½·ρ_r·U² ≈ 8.6–15.5 kPa at ρ_r = 0.87ρ.
  - With C ≈ 1 (a deep-submergence human, Arrighi) on about 0.15 m² of head, shoulders and board edge, that is 1.3–2.3 kN quasi-steady, and up to about 1.9–3.5 kN at the front (the 1.5× impulsive cap).
  - It lasts only as long as the roller takes to pass, L_r/U ≈ 0.5–0.7 s for H = 1 m.
  - This matches the repo's earlier estimate of 0.6–3 kN leash drag (`docs/research/surf-gameplay-research.md` line 340).
- [inference] **Knock-down when standing inside.** A fallen or wading surfer in 0.3–0.6 m of water hit by bore flow at 2–3 m/s is past the measured adult instability pairs, so being knocked over is the physically right outcome.
- [inference] **Duck-dive depth.** In a spilling bore the target is to get below the aerated lens (mean thickness 0.13–0.3H, as much as about 0.5H under the crest) and below the most turbulent layer above trough level. That is about 0.5–1 m under a 1 m bore, consistent with the coaching advice to sink the nose 40–60 cm. In a plunging or shallow break there is no refuge: the plume reaches a 0.4 m bed in about 0.25 s, and descending eddies carry turbulence down. A duck-dive there should give much less protection, which matches the game's parked duck-dive findings.

### Gaps
- No field or lab measurement of forces on a surfer (prone or standing) hit by whitewater, of the speed a whitewater-pushed prone surfer reaches, or of duck-dive kinematics or depth.
- The tsunami coefficients come from rigid columns in freshwater bores. A floating, yielding and rotating body, and an aerated roller (lower ρ), are not covered.
- The cylinder and prism coefficients are from abstracts only (ScienceDirect 403).

## 4. Turbulence and surface texture of the roller for rendering: bumps, eddy scales, timescales

### Takeaway
The roller surface is in a regime of "strong free-surface turbulence". It carries recurring 3D features: fingers, crowns, droplets, slugs, spider webs, mushrooms, boils and holes.
- **Lifetimes:** about 0.1–0.15 s for fingers; under 0.1 s for holes.
- **Frequencies:** about 3.5–4.5 Hz for crowns and fingers at lab scale.
- **Sizes:** millimetre droplets up to boils half a channel wide.
- **Coherent structures:** integral length grows from 0.5·d₁ at the toe to 3·d₁ at the back of the roller. Toe undulations have wavelengths of about 1·d₁ and 5–10·d₁ in field tidal bores.
- **Foam roughness:** surf-zone foam roughness is only 2–6 mm (stereo, field), so the visible bumpiness of a roller is macro-scale geometry, not foam roughness.
- **Emission and brightness:** active roller foam is optically bright and thermally "warm" (high emissivity). Residual foam cools quickly.

### Cited Findings
- [meas-lab] Wüthrich, Shi & Chanson (2021, JFM 924, CC-BY) studied breaking bores at Fr₁ = 1.5, 2.1 and 2.4 in a 19 m × 0.7 m channel at Re ~10⁵.
  - The regime is "strong free-surface turbulence", where the flow overcomes "both gravity and surface tension, leading to surface deformations, breaking and large air entrainment".
  - Feature classes: fingers, crowns, droplets, slugs, spider webs, mushrooms, boils, holes (and helices).
  - Fingers are an "upward ejection of an air–water volume with an impulsive and highly energetic behaviour". They occur at about 4.5 Hz and live 0.10–0.15 s.
  - Crowns occur at 3.5–4.2 Hz. Holes live "shorter that 0.1 s".
  - Droplets have a modal diameter of 2.5–3 mm, with means of 3.3 mm (Fr 2.4) and 2.8 mm (Fr 2.1). They are ejected at 16.8°–83.1°, with modes near 30° and 45°.
  - Boils can grow to "more than half of the channel width". — [JFM 924](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/strong-freesurface-turbulence-in-breaking-bores-a-physical-study-on-the-freesurface-dynamics-and-airwater-interfacial-features/84559CFD248197C7B88FBF5F6B1FBFD3)
- [meas-lab] Wüthrich, Shi & Chanson (2022) filmed jumps at 22,000 fps:
  - "mushrooms" are pseudo-circular foamy accumulations at the toe;
  - "holes" are 3D air cavities that look darker because clear water lies beneath;
  - "slugs" are S-shaped ribbons with many bubbles;
  - large bubbles reach about 100 mm. — [Environ. Fluid Mech. (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9363398/)
- [meas-lab] Wang, Leng & Chanson (2017):
  - Integral length of free-surface turbulent structures rises from 0.5·d₁ near the toe to 3·d₁ at the downstream end of the roller. Coherent toe structures span 2–5.5·d₁.
  - Toe transverse wavelengths are about 1.2·d₁ in the lab bore; 1 and 5–10·d₁ in Qiantang tidal bores (range 0.7–25).
  - Toe oscillation runs at 0.4× the depth-fluctuation frequency, and surface fluctuation peaks in the first half of the roller. — [Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- [meas-lab] At a bore's roller toe, air is entrained along the toe perimeter, which is also "a line source of vorticity", and "a shear layer develops in the wake of the toe". Turbulence is anisotropic just behind the toe and tends to isotropy further back. *(snippet)* — [Breaking bore roller characteristics: turbulence statistics using optical techniques (Coastal Eng., 2021)](https://www.sciencedirect.com/science/article/abs/pii/S0378383921000533)
- [meas-field] Hansen & MacMahan measured the geometric roughness of surf-zone foam from stereo imagery, as the vertical standard deviation of surface elevation over foamy areas, from a camera 1 m above the water mid–surf zone. Mean 3.2 mm, range 1.7–6.3 mm. *(snippet of abstract; Springer redirect)* — [Boundary-Layer Meteorol.](https://link.springer.com/article/10.1007/s10546-018-0390-2)
- [meas-field] In thermal IR, foam "has a higher emissivity than foam-free water", so active roller foam looks warmer, while "residual foam in the wake of a breaking wave cools quickly". In visible imagery "active foam and residual foam both appear bright". — [Carini et al. 2015](https://faculty.washington.edu/jmt3rd/Publications/Carini2015.pdf)
- [meas-lab] Surf-zone breaking creates large "horizontal eddies" and "obliquely descending eddies" that inject non-zero mean vorticity and drive Reynolds stress. The abstract gives no scales. — [Nadaoka, Hino & Koyano 1989 (JFM 204)](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/structure-of-the-turbulent-flow-field-under-breaking-waves-in-the-surf-zone/90525A3B07B4895FC1D26D5EA94F97F9)
- [meas-lab] Govender, Mocke & Alport (2004) measured dissipation rates and length scales of 3D isotropic structures "through the wave roller" in lab spilling waves. The numbers were blocked. *(snippet)* — [doi:10.1029/2003JC002233](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2003JC002233)

### Inferences
- [inference] **Scaling lab frequencies to the field.** The lab bores had inflow depths of about 0.1–0.2 m (inferred, not reported in what I read). Wang et al.'s toe wavelengths of 0.146–0.2 m at L_w/d₁ ≈ 1.2 imply d₁ ≈ 0.12–0.17 m in the similar UQ channel. Under Froude scaling, time scales grow with √(length ratio). For a field bore about 5–10× larger, the 3.5–4.5 Hz crown and finger rhythms become about 1–2 Hz, and the 0.1–0.15 s lifetimes become about 0.25–0.5 s. Millimetre droplets and bubbles are set by surface tension and do **not** scale. Rendered spray droplets should stay millimetre-sized, and field-scale texture should come from boils and fingers of 0.1–1 m.
- [inference] **A texture recipe.** Use a height-displacement noise on the roller lens:
  - correlation length rising from about 0.5·H·(d₁/H) at the toe to about 3·d₁ at the crest; for a surf-zone bore take d₁ ≈ trough depth;
  - largest amplitude in the front half of the roller;
  - evolution at about 1–2 Hz;
  - a toe line that wanders with transverse wavelengths of about 1·d₁ and 5–10·d₁, occasionally stepping back and surging forward;
  - short-lived "holes" (darker, clear water) and "mushrooms" (foam clumps) at the toe;
  - fingers and crowns ejecting droplets forward at 30–45°, up to about 1.5c.

  The micro-roughness of settled foam (2–6 mm) belongs in the normal and specular response, not in geometry.
- [inference] **Brightness and emission.** Make the roller band brightest at the crest and ramping from the toe (Haller & Catalán). Keep the distinction between active foam, which moves with c and is hot in IR, and residual foam, which is left behind and dimmer. This supports rendering the roller lens as its own object, separate from the advected residual-foam field.

### Gaps
- No field measurement of roller-surface fluctuation amplitude, eddy size or frequency for surf-zone bores. All of these are lab-scale bores and jumps.
- Govender et al. (2004) length scales and Watanabe et al. (2005) 3D vortex spacing were not accessible: Wiley 403, and Semantic Scholar rate-limited (429).
- The Hansen & MacMahan numbers come from the abstract snippet only.

## 5. How surf games handle riding whitewater, getting hit by it, and wiping out

### Takeaway
None of the five titles documents whitewater as a physical volume that pushes, lifts or submerges the rider. The documented patterns are:
- the lip, or "foam and lip", area is a wipeout zone (Barton Lynch Pro Surfing);
- a wipeout wipes the accumulated trick score (Kelly Slater's Pro Surfer; Surf World Series);
- the wave closing on the rider is a common, sometimes unfair, wipeout cause (TransWorld Surf);
- True Surf's developer describes waves as blended 2D vertical slices, and describes whitewater mainly as a rendering problem (plus unspecified "new white water physics").

The game's plan to build the roller as hit-able geometry has no documented precedent among these titles.

### Cited Findings
- [game-doc] True Surf (True Axis), from the Meta blog of 18 December 2025:
  - The wave engine grew from the idea "to simply create a series of 2D animations of vertical slices of waves and blend between them". The team built "a custom 2D water simulation to create all the reference" and an animation tool.
  - The aim was "a wave that could change shape as it peels from a spilling wave with no tube to a plunging wave where you can get in the barrel".
  - For VR they "needed a new way of rendering all the white water, looking okay from any angle, and not killing performance". They had feared falling back to a cartoon look if the white water could not look right. — [Meta blog](https://www.meta.com/blog/true-surf-launch/)
- [game-doc] True Surf App Store release notes, version 1.1.59 (5 December 2024): "Upgraded WAVE Engine, with new white water physics". The notes give no detail on how whitewater acts on the surfer. — [App Store](https://apps.apple.com/us/app/true-surf/id1177819604)
- [anecdotal] Barton Lynch Pro Surfing (Bungarra Software; early access April 2022, full release November 2023):
  - A negative Steam review: "The foam and lip mechanics are very bad, the interaction with the surfer is terrible … every time it's a wipeout!"
  - A positive review: "the surfing and physics do feel good". — [Steam reviews](https://steamcommunity.com/app/1776170/reviews/?browsefilter=toprated); developer name from [Surfd review](https://surfd.com/2023/12/review-barton-lynch-pro-surfing-game/)
- [anecdotal] Surf World Series (Climax Studios, 2017):
  - Reviewers: "you're going to wipe out a lot" while learning a beach, and after each wipeout the game re-shows the goal. — [COGconnected](https://cogconnected.com/review/surf-world-series-review/)
  - Producer Jamie Fisher on waves: "Each destination has its own style of wave". Professional surfer Tom Lowe advised the team. No whitewater mechanics are described. — [GamingBolt interview](https://gamingbolt.com/surf-world-series-interview-hanging-ten)
- [anecdotal] Kelly Slater's Pro Surfer (Treyarch, 2002): "if you wipeout at any time you'll lose all of the points that you had just built up". Holding down on the d-pad takes you "into the tunnel". The waves "crash and behave in a fairly realistic manner". The review does not describe whitewater contact. — [Gaming Nexus](https://www.gamingnexus.com/Article/44/Kelly-Slaters-Pro-Surfer)
- [anecdotal] TransWorld Surf (Angel Studios, 2001):
  - A reader review says many wipeouts happen because the wave "had chosen an awkward moment to fold in on itself". *(snippet; GameFAQs 403)* — [GameFAQs reviews](https://gamefaqs.gamespot.com/xbox/517540-transworld-surf/reviews)
  - The game was nominated for GameSpot's "Best In-Game Water". — [Wikipedia](https://en.wikipedia.org/wiki/Transworld_Surf)

### Inferences
- [inference] The genre's common approach is to treat whitewater and lip contact as a **binary wipeout trigger or score penalty**, with no graded push, buoyancy loss or hold-down. Players criticise this where it feels arbitrary ("every time it's a wipeout"; "awkward moment to fold").
- [inference] A physical roller lens has specific advantages over these titles:
  - it pushes at up to c with a Duncan-type shear;
  - it lowers buoyancy and lift through ρ(1 − α);
  - its drag pulse on impact is bounded by 1.5× the quasi-steady value;
  - its surface is readable, with a toe line and a crest band.

  Together these let whitewater outcomes be graded: pushed along, bogged, knocked off, or held down. That answers the players' fairness complaints about binary triggers.

### Gaps
- No developer documentation found for whitewater mechanics in any of the five games, and no GDC talks or technical write-ups. GameFAQs guides for Kelly Slater's Pro Surfer and TransWorld Surf were blocked (403), so the in-game rules for "caught inside" or riding foam could not be checked.
- True Surf's "new white water physics" (2024) is not described anywhere I could reach.
