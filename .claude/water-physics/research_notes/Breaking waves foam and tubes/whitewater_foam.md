# Surf-zone whitewater and foam: physical fact base and real-time simulation/rendering techniques

Researcher notes, 2026-09-28. Evidence tags on each finding: **[lab]** measured in a flume, **[field]** measured at sea or in a surf zone, **[model]** theory, a formula or a derived number, **[prod]** film or game production practice (artistic, not physics), **[doc]** engine documentation, **[std]** a standard, **[anecdotal]** surf press or lore. "Game" facts come from this repository and are cited by file path. Several publisher pages (Wiley/AGU, AMS, ScienceDirect, HAL behind an Anubis bot wall) refused automated access. For those papers I read the abstract through the OpenAlex API and cite the DOI; the text says so wherever the finding comes from an abstract only.

## 1. The roller and the turbulent bore: shape, length, speed, and how long the height lasts

### Takeaway
Most of the whitewater in a surf zone is the **roller**: an aerated wedge of lower density riding the front face of the broken wave (the bore). It is brightest at the crest and fades toward its toe on the face. It moves with the bore at about the phase speed. Because broken-wave height stays depth-limited all the way inshore, the roller persists to the swash rather than dying out. LiDAR field data show that the usual roller-area formulas (the 0.9·H² family the game uses) overestimate inner-surf-zone dissipation. The real roller is therefore smaller and/or less dense than those formulas imply.

### Cited Findings
- [lab] Duncan (1981), breakers made by a towed hydrofoil: the breaker "has a small zone of turbulent water riding its forward slope". That zone exerts a shear force along the forward slope equal to the component of its weight in that direction. Its amplitude and vertical extent are both proportional to the phase speed squared, and neither depends on the slope of the forward face. The turbulent wake behind it thickens with the square root of the distance behind the breaker (abstract). — [doi:10.1098/rspa.1981.0127](https://doi.org/10.1098/rspa.1981.0127)
- [lab] Haller & Catalán (2009): the roller's optical intensity "ramp[s] up from the toe of the wave roller on the front face of the wave to a maximum intensity at the wave crest". Imagery captured the roller's growth, equilibrium and decay phases over a bar/trough bed. Measured roller lengths agreed with a roller model and could be inverted to give wave height (abstract). — [doi:10.1029/2008JC005185](https://doi.org/10.1029/2008JC005185)
- [field] Carini et al. (2015), Duck NC: foam in an actively breaking crest (the roller) has a distinct thermal-IR signature, so roller length can be retrieved from IR. Dissipation from roller length (via Duncan 1981), integrated across the surf zone, was 40–69% of the incoming wave energy flux. Breaking concentrated over the sand bar at low tide (abstract). — [doi:10.1002/2014JC010561](https://doi.org/10.1002/2014JC010561)
- [field] Martins et al. (2018) made the first direct field measurements of roller geometry, from LiDAR. "Most existing roller area formulations … lead to considerable overestimation of the wave energy dissipation." Measured dissipation is "close to, but smaller than," that of a hydraulic jump of the same height. Roller density (its aeration) should enter roller-area formulations (abstract). — [doi:10.1029/2017JC013369](https://doi.org/10.1029/2017JC013369)
- [field] Raubenheimer, Guza & Elgar (1996), three beaches: mid- and inner-surf-zone sea/swell heights were depth-limited, roughly independent of offshore height. γs = Hs/h increases with beach slope β and with decreasing kh, and is well correlated with β/kh. The nonlinear shallow-water equations with bore dissipation predicted the evolution (abstract). — [doi:10.1029/96JC02433](https://doi.org/10.1029/96JC02433)
- [field] Thornton & Guza (1983): the single free parameter of the widely used bore-dissipation model, B, is "the fraction of foam on the face of a wave". The large fitted value "implies that the simple periodic bore dissipation function substantially underestimates the actual dissipation" (abstract). — [doi:10.1029/JC088iC10p05925](https://doi.org/10.1029/JC088iC10p05925)
- [field] Tissier et al. (2011), ECORS field experiment at Truc Vert: the classical bore model "is inappropriate for describing wave dynamics when approaching the swash zone". A shock-wave (Saint-Venant) expression predicted broken-wave celerity better (abstract via search; the PDF link was dead). — [ScienceDirect abstract](https://www.sciencedirect.com/science/article/abs/pii/S0997754610001226)
- [lab] Rojas & Loewen (2010): under a spilling breaker the bubble cloud advances at about 100% of the phase speed. Under a plunger the entrained air cavity advances at about 70%, and the splash-up's bubble cloud at about 90% (abstract). — [doi:10.1029/2009JC005614](https://doi.org/10.1029/2009JC005614)
- [model, game] The game's foam source computes bore dissipation from the hydraulic-jump head loss ΔH = (h₂−h₁)³/(4h₁h₂) with bore speed c = √(g h₂ (h₁+h₂)/(2h₁)) (Chow 1959). — `src/wave/FoamField.ts` (lines 25–35). Foam balls are sized from a roller cross-section of 0.9·H² (Svendsen 1984, as carried in `docs/research/whitewater-sources.md`).

### Inferences
- The roller should read as a **continuous band** tied to the bore front: feathered at the toe, brightest at the crest, travelling at bore speed, and present all the way to the swash on a beach. Discrete "foam ball" sprites do not show that band. The game has the fields to drive it: the breaking strength B and the bore front.
- Heights are depth-limited, so a bore that fades out mid-surf-zone looks wrong. The exception is over a trough, where Haller & Catalán's "decay phase" can happen and breaking restarts on the next bar.
- Martins (2018) implies that 0.9·H² oversizes the inner-surf-zone roller. Sizing foam balls or the roller band from the bore's actual dissipation (already computed in `FoamField.ts`) would be more consistent than sizing it from H².

### Gaps
- No numeric roller length, angle or thickness ratios (for example L_r/H or roller slope in degrees). Martins (2018) full text was blocked (Wiley 403, HAL behind a bot wall, the Bath repository PDF 403), and Haller & Catalán's numbers are not in the abstract. I did not re-open Svendsen (1984) to confirm the 0.9·H² constant.
- No numeric excess of broken-wave celerity over √(gh). The Tissier PDF returned 404.

## 2. How foam coverage grows and decays after a break

### Takeaway
An individual whitecap's foam area rises fast while the crest is actively breaking (stage A, about 1 s), keeps spreading while it thins, then decays over seconds.
- **Decay clock:** set by how long the **subsurface bubble plume** takes to degas, not by single foam cells, which pop in about 2–4 s.
- **Measured oceanic decay times:** 0.2–10.4 s per event, with an area-weighted effective value of 1.4–4.8 s.
- **Size effect:** bigger whitecaps last longer.
- **Surfactants:** can make foam last about 3× longer.

### Cited Findings
- [field/model] Monahan & Lu (1990) split whitecaps into stage A "spilling crests" and stage B "mature whitecaps", tied to the life history of the bubble plume from formation to dissipation (abstract). — [doi:10.1109/48.103530](https://doi.org/10.1109/48.103530)
- [field] Koepke (1984), photos at 1 s intervals (wind 7.5 m/s; 13 whitecaps at 8 m/s; foam streaks at 14–15 m/s):
  - The area of an individual foam patch **increases** with age, fitted as a(t) = 1 − exp(−βt), while its reflectance **decreases**.
  - With 10% reflectance as the threshold for "white", patches stop counting as white at about 7.5 s.
  - Wind streaks live more than 10 s and are "fairly stable".
  - Source: [Koepke 1984 PDF (EUMETSAT copy)](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf); [Optica abstract](https://www.osapublishing.org/abstract.cfm?uri=ao-23-11-1816)
- [field] Callaghan, Deane & Stokes (2012), Martha's Vineyard, 552 whitecaps imaged at 3–6 fps with sub-cm pixels:
  - Decay times ranged 0.2–10.4 s.
  - The area-weighted "effective" decay time was 1.4–4.8 s across four observation periods (a factor of 3.4).
  - Decay time correlated positively with maximum foam-patch area.
  - For a given size, decay times varied by a factor of 2–5; the correlation with breaking speed was weak.
  - Source: abstract. — [doi:10.1029/2012JC008147](https://doi.org/10.1029/2012JC008147)
- [lab] Callaghan, Deane & Stokes (2013), Scripps glass channel:
  - "Foam lifetime is variable and controlled by subsurface bubble-plume-degassing times, which are a function of wave scale and breaking wave slope", with or without surfactants.
  - With Triton X-100 at 204 µg/L (medium-productivity ocean), foam "persists for roughly a factor of 3 times its clean seawater value".
  - In clean water the decay is about exponential. With surfactant it shows an initial temporary rise, then turns roughly linear.
  - Source: abstract plus search summary. — [doi:10.1175/JPO-D-12-0148.1](https://doi.org/10.1175/JPO-D-12-0148.1)
- [lab+field] Callaghan (2017): the surfactant imprint shows in the **decay phase**. An area-time-integral "stabilization factor" quantifies it, and lab and ocean distributions overlap (abstract). — [doi:10.1002/2017JC012809](https://doi.org/10.1002/2017JC012809)
- [lab+field] Callaghan et al. (2024, JGR Oceans): when appropriately scaled, lab and ocean foam-area time series follow similar trends. Oceanic whitecaps are "much larger in scale", but their growth and decay timescales are similar in magnitude, which suggests bubbles are injected relatively shallowly at sea. Aggregated statistics yield the dissipation of individual whitecaps (abstract). — [doi:10.1029/2023JC020193](https://doi.org/10.1029/2023JC020193)
- [model] Callaghan (2024, GRL): a model for the total air volume each whitecap entrains, forced by the wave-field dissipation rate (abstract). — [doi:10.1029/2024GL108632](https://doi.org/10.1029/2024GL108632)
- [field] Potter et al. (2015), FLIP platform: in mid-IR, breaking crests appear bright and decaying foam dark, which separates active from residual whitecaps. The study quantifies the durations of whitecap lifetime stages (abstract). — [doi:10.1002/2015JC011276](https://doi.org/10.1002/2015JC011276)
- [lab] Masnadi et al. (2021): "lifetimes of bubble plumes and surface foam are directly related to the dissipated energy". The time to onset of foam cooling scales with plume decay time and is not significantly affected by surfactants. Foam temperature varies spatially within one event, implying plume depth does too (abstract). — [doi:10.1029/2020JC016511](https://doi.org/10.1029/2020JC016511)
- [field] Yang & Potter (2021): whitecaps "stop advancing before stage A ends", possibly a sign of plume degassing (abstract). — [doi:10.3390/rs13204051](https://doi.org/10.3390/rs13204051)
- [field] Scanlon & Ward (2016), 125,860 images in 622 ten-minute periods: active (W_A) and maturing (W_B) coverage were quantified separately. W_B "serves to conceal" the variability of actively breaking waves (abstract). — [doi:10.1002/2015JC011230](https://doi.org/10.1002/2015JC011230)
- [lab] Zheng et al. (1983), reported by Hwang (NRL): single surface bubbles of radius 0.7–3.7 mm lived on average 2.24 s in tap water, 2.98 s in Delaware Bay water and 3.89 s in Atlantic water. Lifetime peaks near 2–3 mm radius. — [Hwang, arXiv:1906.11202](https://arxiv.org/pdf/1906.11202)
- [field compilation] Koepke's Table II gives whitecap cover W(U) from the literature: 1.0% at 10 m/s, 4.1% at 15 m/s, 11.2% at 20 m/s, 24.6% at 25 m/s. — [Koepke 1984 PDF](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- [field] Anguelova & Webster (2006): whitecap coverage varies strongly beyond wind speed alone, which motivated satellite (microwave) retrievals of coverage (abstract). — [doi:10.1029/2005JC003158](https://doi.org/10.1029/2005JC003158)
- [game] Foam decay e-folding times, dense / residual lace: beach 3 / 20 s, point 3 / 12 s, **reef 3 / 8 s**, canyon 3 / 15 s (`src/wave/SurfZoneSimulation.ts` lines 100–103). LACE_SHARE = 0.3 of the decaying dense foam becomes lace. FOAM_SOURCE_RATE = 4 /s "covers the surface within a quarter second" (`src/wave/FoamField.ts`).

### Inferences
- The visual signature of ageing whitewater is **area up, brightness and opacity down** (Koepke): the same foam spreads into thinner, lacier cover. It is not a white decal fading in place. A two-component field (dense plus lace) can show this if the lace component is drawn as spreading, thinning cell walls.
- Decay should be tied to the plume. A first-order clock is τ ≈ plume depth / bubble rise speed, scaled by a surfactant factor of about 1–3. For example, a 1.3 m plume at 0.2–0.25 m/s gives about 5–7 s of feeding. This combines Chanson's d/u_r time scale (section 6) with the game's plume depths from `docs/research/whitewater-report.md`.
- The game's dense 3 s e-fold is within the measured oceanic range (1.4–4.8 s effective). But its reef residual (8 s) being the **shortest** contradicts the measured trend: larger, more energetic breaks, with larger foam patches and deeper plumes, decay more slowly (Callaghan 2012, 2013). Reef whitewater should persist at least as long as beach whitewater.
- Stage A (active, about 1 s) should be visually distinct from stage B: brighter and moving with the crest, then stopping (Yang & Potter). Residual foam should stop moving with the wave and drift with the current.

### Gaps
- No numeric growth (stage A) durations or growth timescales: the Callaghan 2024 and Potter 2015 full texts were blocked.
- Every decay-time measurement found is for **deep-water whitecaps**. I found no study of foam decay times behind depth-limited surf-zone bores or reef slabs.

## 3. How long surface foam persists in the surf zone, and the patterns it leaves

### Takeaway
In surf zones, residual foam outlives the waves that made it. It lasts long enough to be carried by the mean currents that coastal imaging systems track it as a quasi-passive tracer (longshore currents, rip cells). Rips appear as darker gaps in the whitewater with plumes of foam and sand beyond the break. In big surf, persistent foam saturates time-exposure images.

### Cited Findings
- [field] Lippmann & Holman (1989): time-exposure (timex) video maps sand bars through preferential breaking. "During high waves, persistent surface foam obscures the relationship of image intensity to local dissipation", so the images need differencing (abstract). — [doi:10.1029/JC094iC01p00995](https://doi.org/10.1029/JC094iC01p00995)
- [field] Chickadel, Holman & Freilich (2003): an "optical current meter" measures longshore current from the alongshore drift of "persistent sea foam in the surf zone" in short video time series. RMS error against an electromagnetic current meter was 0.10 m/s, with a gain not different from 1 (abstract). — [doi:10.1029/2003JC001774](https://doi.org/10.1029/2003JC001774)
- [field] Rodriguez Padilla et al. (2021), Anglet, France, 1 Hz frames, Hs 0.8–3.3 m: "the drifting foam, left after the passage of breaking waves" was tracked as a quasi-passive tracer. It reproduced rip-cell circulation, dominant onshore surface flow and an energetic longshore current, with RMSE 0.12–0.24 m/s against a profiler. Offshore flow was underestimated under persistent breaking over a reef (abstract). — [doi:10.3390/rs13101874](https://doi.org/10.3390/rs13101874)
- [field/agency] NOAA National Weather Service:
  - Channelized rips "appear as darker, narrow gaps of water heading offshore between areas of breaking waves and whitewater". Look for "plumes of sand or foam offshore of the breakers" and a "choppy, rippled texture".
  - Widths are 5–100 yd (about 5–90 m). Speeds are typically 1–2 ft/s (0.3–0.6 m/s) and up to 8 ft/s (2.4 m/s).
  - Source: [NWS Rip Current Science](https://www.weather.gov/safety/ripcurrent-science)
- [field] Holman et al. (2006), four years of daily timex at an embayed beach: 5271 rip channels on 782 days. Mean spacing was 178 m (lognormal), and individual rip-channel trajectories lasted 45.6 days on average (abstract). — [doi:10.1029/2005JC002965](https://doi.org/10.1029/2005JC002965)
- [field] Koepke (1984): wind foam streaks matter above about 9 m/s wind. Their reflectance is about 10% (a single bubble layer). They live longer than 10 s and spread fastest when young. — [Koepke 1984 PDF](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- [field, open ocean] Flatau et al. (2000), citing Thorpe (1995): bubble clouds "reach to mean depths of about 4Hs … some clouds extending to about 6Hs" and "persist for several minutes". — [arXiv:physics/0006060](https://arxiv.org/html/physics/0006060)
- [prod] Sea of Thieves (Rare, SIGGRAPH 2018 Talks): "We progressively blur the result of the foam buffer with feedback to simulate the foam dispersing". The mask is blended with artist-authored textures, and the amount depends on calm, normal or stormy state. — [Ang et al. 2018 PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)

### Inferences
- Surf-zone residual foam must live **tens of seconds to minutes** to behave as the imaging studies describe: drifting alongshore, forming rip plumes, visible in minute-scale averages. That is an inference from how the tracer methods work; I found no directly measured number. The game already advects foam with the solver's depth-averaged velocity (`src/wave/FoamField.ts`). Longer-lived residual foam would let rip plumes and longshore streaks emerge on their own.
- Streaks, "scum lines" and lace come from **convergence**. Flow that converges (−∇·u > 0) compacts foam into lines; divergence opens gaps. A pure advection–decay scalar without a compaction term, or one blurred isotropically (the Sea of Thieves approach), smooths these patterns away. The shoreline (swash turnaround) and bore trailing edges are natural accumulation lines.
- Rips should read as **darker gaps in the whitewater band** with a foam plume beyond the break, which fits a spot with bars and channels.

### Gaps
- No measured surf-zone residual-foam lifetime and no statistics on lace or foam-cell size. The Argus system paper (Holman & Stanley 2007) has no abstract in OpenAlex and was not opened.

## 4. Colour and albedo of fresh foam, old foam and aerated water

### Takeaway
- **Fresh, thick foam:** reflects about **40–55%** of visible light (50–75% for very thick ship-bow foam), flat across the visible spectrum.
- **Ageing foam:** darkens quickly as it thins. Its lifetime-averaged ("effective") reflectance is about **22%**, and thin lace or streaks are about **10–18%**, against about **5.5%** for foam-free sea.
- **Aerated water:** submerged bubble clouds are **not white**. They brighten the water and shift it toward **green / blue-green** (turquoise); only the densest surface foam is white.

### Cited Findings
- [field+model] Koepke (1984):
  - Dense clear-water foam reflects about 55% in the visible (Whitlock et al.), "valid up to 0.8-µm wavelength", then falls with water absorption.
  - A model of a whitecap as "more than twenty-five uniform bubble layers" also gives about 55%; Stabeno & Monahan's calculation agrees.
  - Streaks are about 10%, matching a single bubble layer.
  - Effective reflectance is 22 ± 8% for whitecaps (efficiency factor 0.4 ± 0.15) and 10 ± 4% for streaks (0.18 ± 0.07).
  - The area-weighted mean reflectance of a patch over its first T seconds falls with T: 41% (1 s), 35% (2 s), 30% (3 s), 25% (5 s), 21% (7 s), 16% (10 s).
  - Foam-free sea averages 5.5% reflectance, and 10% is the threshold for "white".
  - Source: [Koepke 1984 PDF](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- [field] Dierssen (2019), Long Island Sound, 400–2500 nm:
  - Whitecap reflectance was "~40% in visible wavelengths" for intense breaking; thin foam was about 18%; stage A foam with many layers about 50%.
  - It cites Koepke's "20 to 55% upon initial wave breaking to 3–10% after 10 s" and Moore et al.'s 50–75% for ship-bow foam. Whitlock's ~60% is flagged as possibly inflated by calibration.
  - Water with many submerged bubbles gave "a more green-peaked reflectance spectrum", an amplification of the background water's colour, rather than white.
  - Source: [Frontiers in Earth Science](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014/full)
- [field] Frouin, Schwindling & Deschamps (1996), Scripps Pier: relative to 0.44 µm, foam reflectance was lower by about 40% at 0.85 µm, 50% at 1.02 µm and 85% at 1.65 µm. They attribute this to foam's structure: large air bubbles separated by thin water films, plus bubbles in an underlayer that enhance water absorption (abstract). — [doi:10.1029/96JC00629](https://doi.org/10.1029/96JC00629)
- [model] Zhang, Lewis & Johnson (1998): at bubble number densities of about 10⁵–10⁷ m⁻³ (common at sea), bubbles "significantly influence the scattering process" and backscattering, more so with organic coatings. "The injection of bubbles will shift ocean color toward the green" (abstract). — [doi:10.1364/AO.37.006525](https://doi.org/10.1364/AO.37.006525)
- [observation] Flatau et al. (2000), quoting Bohren (1987): "Where a great many bubbles have been entrained by a breaking wave it is white. But where there are fewer of them it is blue-green or green, brighter than the sea but not as bright as the foamiest parts." — [arXiv:physics/0006060](https://arxiv.org/html/physics/0006060)
- [field] Koepke (1984) also notes that in turbid water with a high sediment load, light from below is possible even above 1.0 µm. Sediment changes the underlight, the likely origin of tan or brown surf-zone foam and water. — [Koepke 1984 PDF](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- [prod/model] Dupuy & Bruneton's whitecap shader adds foam as `W * l * 0.4`, with l = (sun + sky irradiance)/π: an albedo of 0.4 applied to the coverage W. — [jdupuy/whitecaps ocean.glsl](https://raw.githubusercontent.com/jdupuy/whitecaps/master/ocean.glsl)
- [doc] Unity HDRP water foam is monochromatic: it cannot be tinted, for example for algae. This comes from the search-result summary of Unity's docs; the page I opened was only an index. — [Unity HDRP foam docs](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-foam-in-the-water-system.html)

### Inferences
- Linear-space albedo targets:
  - Fresh dense foam: about **0.5–0.55**.
  - Ageing foam: follows a Koepke-like curve down to about **0.1–0.2** (lace), while its coverage spreads.
  - Aerated subsurface water: water colour times a gain (well under foam brightness) that rises with void fraction and leans green-cyan. Only surface foam goes white.
- Foam at 0.55 against sea at about 0.055 is a 10× contrast. Foam authored at albedo 1.0 under the same exposure will likely clip and look painted, and flattens the fresh-versus-old difference that sells ageing.
- For the "Rich" look's churn freshness: bright white only during stage A (about 1 s) and in dense patches. After that, reduce **both** reflectance and opacity, and let the underlying green/turquoise bubble water show through.
- Surf-zone foam over sandy bottoms can take a sediment tint, and aerated water there is milky. That is inferred from Koepke's turbidity note; I found no measurement.

### Gaps
- No measured albedo for surf-zone or reef whitewater specifically, and no measured colour of sediment-laden surf foam.

## 5. Spray and mist from the lip and the splash-up

### Takeaway
A plunging breaker makes droplets in **time-staggered bursts**: at jet impact, when large bubbles trapped by the jet burst, and later as small bubbles burst over the foam. **78%** of the drops come *after* the impact burst. Droplet sizes follow two power laws that cross at about **0.4–1.5 mm**. The fine fraction becomes a salt-spray haze that stays low but can be large:
- Reef-break plumes reached **25–35 m**, confined below about **40 m**, and were episodic.
- Beach-break spray stayed below **19 m**.
- Surf-generated aerosol stayed undiminished **16 km** downwind in offshore flow.

### Cited Findings
- [lab] Erinin et al. (2019), freshwater plunging breaker, droplets down to 50 µm radius:
  - Three droplet production time zones: jet impact upstream of the crest; bursting of large bubbles trapped by the jet impact; later bursting of smaller bubbles.
  - These account for **22%, 44% and 34%** of an average of **653 droplets per breaking event**.
  - Size distributions are two power laws intersecting at **radius 418 µm**.
  - Source: abstract. — [doi:10.1029/2019GL082831](https://doi.org/10.1029/2019GL082831)
- [lab] Erinin et al. (2023, JFM, "Plunging breakers Part 2"):
  - Droplets with diameter ≥ 100 µm were measured 1.2 cm above the crest by cinematic holography at 650 holograms/s.
  - Four mechanisms: closure of the indentation between the plunging jet and the splash; large-bubble bursting at jet impact; splashing and bubble bursting in the turbulent front; small-bubble bursting on the following wave.
  - The power-law crossover **diameter grows from 820 µm (weak) to 1480 µm (strong breaker)**.
  - Source: [arXiv:2210.01923](https://arxiv.org/abs/2210.01923)
- [lab] Chanson, Aoki & Maruyama (2002), a pseudo-plunging jet hitting at 5.6–6.4 m/s into 0.2–0.47 m depth: the impact produced "strong splashing of short duration (i.e., less than 0.4 s)" with a very low liquid fraction (< 2%). "Some droplets would travel up to 2.5 m from the impact point and reach heights in excess of 0.4 m above the initial free-surface level." — [Chanson et al. 2002 PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [lab] Blenkinsopp & Chaplin (2007): the energy spent "entraining air and generating splash accounts for a minimum of between 6.5 and 14% of the total energy dissipated", depending on breaker type (abstract). — [doi:10.1098/rspa.2007.1901](https://doi.org/10.1098/rspa.2007.1901)
- [review] Veron (2015): small spray droplets travel far and can stay aloft for days; large droplets stay close to the surface (abstract). — [doi:10.1146/annurev-fluid-010814-014651](https://doi.org/10.1146/annurev-fluid-010814-014651)
- [review] de Leeuw et al. (2011): sea-spray aerosol research centres on particles with r₈₀ < 1 µm, down to 0.01 µm. Production per whitecap area remains uncertain by an order of magnitude (abstract). — [doi:10.1029/2010RG000349](https://doi.org/10.1029/2010RG000349)
- [field] van Eijk et al. (2011), Scripps Pier and Duck FRF: surf-generated particles of 0.2–10 µm diameter. Their flux scales with wave-energy dissipation rather than a universal wind relation. In offshore flow, no significant drop in surf-aerosol concentration was found up to 16 km downwind (abstract). — [doi:10.1029/2011JD015602](https://doi.org/10.1029/2011JD015602)
- [field] Porter, Lienert, Sharma & Lau, lidar during SEAS (April 2000), Bellows Beach, Oahu (reef 1.5–2 km offshore, mean wind 7 m/s):
  - Reef spray plumes reached **35 m**. Mean spray scattering extended to **25–30 m**, and spray from breaking waves was "confined to below 40 m".
  - Plumes stayed "fairly concentrated with distance for 1 km downwind" in onshore wind.
  - "Approximately 50% of the time, no reef plumes are observed" (episodic sets).
  - Spray from beach waves with 0.5–1 m faces did "not reach up to 19 m".
  - Source: [UH SEAS lidar PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)
- [field] Zhou et al. (2025, Science Advances): strong nearshore sea-spray production in high-wave periods "greatly enhances downwind cloud condensation nuclei and aerosol mass". Swell decoupled from local wind often dominates (abstract). — [doi:10.1126/sciadv.adw0343](https://doi.org/10.1126/sciadv.adw0343)
- [game] SPRAY_LIFE = 3 s and MIST_LIFE = 4 s (× 0.6–1.0 random); FOAM_BALL_LINGER = 1 s (`src/wave/SprayCloud.ts` lines 73–74, 92). Splash-up parcels leave at 0.6× the jet's impact speed (`docs/research/whitewater-report.md`).

### Inferences
- **Two populations with different lifetimes.** Visible droplets (≳ 0.1 mm) are ballistic and fall back within seconds. Mist and haze (≲ 0.1 mm) drift with the wind and linger far longer, stretched downwind. A 4 s mist life cannot make the tall, lingering, downwind veil that the reef lidar shows.
- **Emit in stages.** Use an impact burst of about 0.4 s (Chanson), then a longer bubble-burst "fizz" over the whole foam patch for as long as the plume degasses (Erinin: 78% of drops come after the impact burst).
- Offshore wind blowing lip spray back over the wave (the "spray veil") is iconic at reefs, but I found no measurement. Treat it as **artistic**, driven by wind vector and lip speed.

### Gaps
- No field measurements of lip-spray heights, droplet speeds or drop sizes for large surf-zone or reef plungers. The Erinin droplet-speed numbers were not in the abstracts I read.
- Unverified conflict: a search summary said Clarke et al. (2006) found Oahu plume heights did not exceed 5 m, and that Scripps Pier lidar plumes reached 20–25 m in onshore wind. I did not open those sources. Porter et al. (opened) report up to 35 m over the reef.
- Veron (2015) full text was not opened, so I have no sourced size ranges for spume, jet and film drops.

## 6. What makes reef whitewater "explosive" and a beach break's roller gentle

### Takeaway
Reef whitewater is explosive for four compounding reasons:
1. **Steeper seabed.** Steep reef gradients (and offshore winds) make more intense plunges, with lower tube "vortex ratios".
2. **Faster jets entrain much more air.** The lip's impact speed grows like √H, and entrained air grows like the **2nd–3rd power of impact speed** above a 1–3.5 m/s onset.
3. **Shallow landing.** The jet lands in shallow water, so the bubble plume reaches the bottom within about a quarter second, and depth-averaged void fraction exceeds 10% right at impact.
4. **Trapped air.** Big tubes trap air cavities whose collapse, spit and repeated splash-ups throw water and spray high.

The measured outcome is tall, episodic spray plumes: 25–35 m over an Oahu reef, against under 19 m for beach waves.

### Cited Findings
- [field/model] Mead & Black (2001), summarized by Scarfe et al. (2003):
  - The "orthogonal seabed gradient is the dominant variable controlling wave breaker intensity".
  - The tube ("vortex") ratio follows Y = 0.065X + 0.821 (R² = 0.71) across plunging waves at 28 world-class breaks. X is the orthogonal seabed gradient and Y the ratio "between the height and width of the vortex"; another summary calls it length:width.
  - A low ratio means a more extreme plunge. Intensity classes run medium, medium/high, high, very high, extreme.
  - "Offshore winds increase breaking intensity": waves break in shallower water.
  - A ledge "must have a gradient >1:4, or waves are likely to surge and collapse"; plunging is common on ledges. Ridges and pinnacles raise intensity and lower the peel angle.
  - Source: [Scarfe et al. 2003 (eScholarship)](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)
- [lab] Chanson, Aoki & Maruyama (2002), citing Chanson & Lee (1997):
  - **Jet and air:**
    - The jet impact velocity V₁ "is basically proportional to the square root of the wave height".
    - Entrained air per metre width is q_air ∝ (V₁ − V_e)^N, with N ≈ 3 at low jet speeds and 2 at high speeds, and onset velocity V_e ≈ 1–3.5 m/s in freshwater.
    - Froude-scaled lab tests "tend to underestimate" air entrainment.
  - **Void fraction:**
    - Depth-averaged void fraction "of more than 10%" (about 12%) next to jet impact in shallow water, falling to 4–6% about 1–1.2 depths downstream.
  - **Plume and rise:**
    - The plume reached the bottom (0.4 m) in 0.23–0.27 s at about 6 m/s impact, and its front moved at 30–45% of V₁.
    - Millimetric bubbles rose at about 0.2 m/s, "nearly constant for bubble diameters ranging from 0.5 to 50 mm". The dominant timescale is the bubble rise time d/u_r.
  - Source: [Chanson et al. 2002 PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [lab] Rojas & Loewen (2010), plunging breaker:
  - Local peak void fractions ran 0.024–0.96, and time-averaged values 0.012–0.37; the spilling breaker's mean was 0.17–0.29.
  - An energetic spilling breaker can entrain about as much air as a steeper plunger.
  - Four key events: the jet impacting the forward face, air-cavity collapse, splash-up impact on the forward face, and peak void fraction in the splashing zone.
  - Source: abstract. — [doi:10.1029/2009JC005614](https://doi.org/10.1029/2009JC005614)
- [lab] Deane & Stokes (2002), reported by Hwang:
  - Bubbles larger than about 1 mm radius come from turbulent fragmentation, with size distribution ∝ a^(−10/3).
  - Smaller bubbles come from jet and drop impact, ∝ a^(−3/2).
  - The roughly 1 mm split matches the Hinze scale, and the bubble **volume** distribution peaks near 1 mm.
  - Source: [Hwang, arXiv:1906.11202](https://arxiv.org/pdf/1906.11202)
- [review] Kiger & Duncan (2012): air entrainment in plunging breakers is complex, with "many parts of this process that are poorly understood" (abstract). — [doi:10.1146/annurev-fluid-122109-160724](https://doi.org/10.1146/annurev-fluid-122109-160724)
- [field] Porter et al. (SEAS lidar): reef plumes up to 35 m, mean to 25–30 m, episodic (none about 50% of the time); beach spray below 19 m. — [UH SEAS lidar PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)
- [anecdotal] Surfer Today: "spitting" barrels act like compressed chambers that expel air and spray out of the open end. Spit needs a swift break and an open barrel, is common at Pipeline, Teahupo'o, Jaws, Puerto Escondido and Supertubos, and "wave size is not a critical factor". — [surfertoday.com](https://www.surfertoday.com/surfing/why-do-barreling-waves-spit)
- [game] In the Hs 1.4 m, Tp 10 s runs:
  - Reef splash-up median 0.63 m and 90th percentile 1.12 m, against beach 0.37 / 0.77 m.
  - The spray pool (4096, plus 1024 for the tube) was full on **17% of reef steps**, against 1% at the beach.
  - Aeration hit its α_max = 0.2 cap in 22% of reef surveys.
  - Source: `docs/research/whitewater-report.md`. The AERATION constants are share 0.1, plunge depth 0.8·H, bore depth 0.3·H, rise speed 0.25 m/s, peak 0.2 (`src/wave/AerationField.ts` line 13).

### Inferences
- Explosiveness is **rate × height × suddenness × persistence**.
  - Reef: very large emission in a sub-half-second burst synchronized with jet impact and cavity collapse; secondary splash-ups; a white "boil" rising behind the impact once the plume hits bottom and upwells (an inference from the plume reaching the bottom in about 0.25 s in shallow water); a tall mist plume that settles slowly and drifts.
  - Beach: a continuous rolling roller band with modest spray and a long foam trail.
- Scale **emitted mass** super-linearly with impact speed, ∝ (V₁ − V_e)^(2–3), not linearly. Launching splash-up at 0.6× impact speed (the game's rule) sets *height*; the *amount* should grow much faster than speed.
- The 4096-particle pool saturating on 17% of reef steps means the budget, not the physics, is capping the reef's violence. A GPU particle tier (section 10) is the direct fix.
- The game's α_max = 0.2 depth-averaged cap is consistent with Chanson's roughly 12% depth-averaged value in the lab, but Chanson warns that Froude-scaled labs under-represent air entrainment. Local values reach 0.96 (Rojas & Loewen). A higher cap near impact at reefs is defensible if it improves the look.

### Gaps
- No measurements of spit speed or volume. The game's spit model is mass-conservation plus an anecdotal mechanism.
- No field measurements of lip thickness, jet speed or splash-up height at slab reefs (Teahupo'o-type).
- Mead & Black's class boundaries and site values were not opened; only the regression is verified. A search snippet giving an average vortex ratio of about 3 for surfed waves is unverified.

## 7. Diffuse-particle methods: spray, foam and bubbles as secondary particles

### Takeaway
The standard recipe comes from Ihmsen, Akinci, Akinci & Teschner (2012):
- **Emission:** spawn secondary "diffuse" particles where air is likely trapped (large relative velocities), at wave crests (convex, outward-moving surface), and in proportion to kinetic energy.
- **Classification:** by how deeply a particle is buried in water. Spray is ballistic, foam is advected on the surface with a finite life, bubbles take buoyancy plus drag toward the flow.
- **No interaction:** particles never interact with each other, so millions are affordable.

For heightfield solvers like the game's, Chentanez & Müller (2010) detect breaking fronts from slope, rise rate and curvature, trade mass with the heightfield, and run about 220K particles in about 2.8 ms (generation plus simulation) on a 2010 GPU.

### Cited Findings
- [model] Ihmsen et al. (2012), all details from the paper PDF:
  - **Three potentials,** each clamped to [0, 1] by Φ(I, τmin, τmax):
    - Trapped air: a scaled velocity difference between neighbours, large "for impacts and vortices".
    - Wave crest: curvature κ̃ times the velocity along the normal, emitting only where the fluid moves in the normal direction on convex regions.
    - Kinetic energy.
  - **Emission rate:** a particle emits n_d = I_k (k_ta·I_ta + k_wc·I_wc)·Δt diffuse particles per step, sampled in a cylinder along its velocity.
  - **Thresholds used:** τ_wc 2–8, τ_ta 5–20, τ_k 5–50. In the lighthouse scene: up to 30 trapped-air and 50 crest samples, giving 3.3 M diffuse particles; 4.5× those settings gave 15 M.
  - **Classification:** "less than 6 fluid neighbors … spray", "more than 20 … air bubbles", otherwise foam.
  - **Motion by type:**
    - Spray moves under momentum, external forces and gravity.
    - Foam "is purely advected according to the averaged local fluid velocity".
    - Bubbles take −k_b·g buoyancy plus k_d drag toward the fluid velocity.
  - **Lifetime:** only foam ages. Its lifetime is set between a minimum and a maximum by the generation potential, because "large clusters of foam are more stable than smaller ones".
  - **Rendering:** a ray-cast volume shader with absorption and emission (no scattering).
  - **Cost:** "Wave" scene, 220k fluid particles and 2.7 M diffuse, took 28 min of diffuse computation over 1000 frames (offline).
  - Source: [Ihmsen et al. 2012 PDF](https://cg.informatik.uni-freiburg.de/publications/2012_CGI_sprayFoamBubbles.pdf)
- [model, real-time heightfield] Chentanez & Müller (2010), NVIDIA:
  - **Breaking-wave detection:** a cell breaks if its slope |∇η| exceeds a steepness threshold (α_minSplash = 0.45), it rises fast (∂h/∂t > v_minSplash = 4), and it is a crest (∇²η < l_minSplash = −4).
  - **Particle birth:** particles are seeded in a rectangle along the front, total volume ∝ |∇η|. Horizontal velocity comes from the wave speed √(g·min(h, h_max)) along −∇η/|∇η|. A fraction is labelled spray.
  - **Mass exchange:** particles remove mass and momentum from the heightfield and return them when they land.
  - **Foam:** "When a splash particle hits the surface we create a foam particle with some probability, depending on the impact speed". Foam "is advected by the velocity field … and projected onto the fluid surface", with a "user-defined" lifetime plus noise.
  - **Timing:** the Beach scene ran about 220K active particles at 9.88 ms per frame including rendering (heightfield 0.75 ms, generation 1.87 ms, particles 0.90 ms) on a GTX 480, with Δt = 16.66 ms.
  - Source: [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- [doc/prod] SideFX Houdini Whitewater Source:
  - **Emission criteria:**
    - Curvature: "an effective method to detect the leading edges of breaking waves", gated by a Max Velocity Angle.
    - Acceleration: Eulerian, marks where fluid rejoins and traps air.
    - Vorticity: "churning areas … deeper below the surface".
    - Splash: thin, fast, isolated structures.
    - Pressure: alignment of pressure and surface gradients, marking wave faces.
    - Stretch, Squish and Surface Scale: surface deformation.
  - **Gates:** depth limits and a speed range.
  - Source: [Whitewater Source docs](https://www.sidefx.com/docs/houdini/nodes/sop/whitewatersource.html)
- [doc/prod] SideFX Whitewater Solver:
  - Particles carry continuous bubble, foam and spray states (0–1) by depth relative to a foam layer.
  - Forces: gravity; buoyancy and advection strength ramped by depth.
  - Life: one lifespan with separate aging rates for bubbles, foam and spray.
  - Pattern: density control (clumping) and repellants that "give rise to a cellular foam structure".
  - Source: [Whitewater Solver docs](https://www.sidefx.com/docs/houdini/nodes/dop/whitewatersolver.html). Per the search summary of SideFX docs, foam forms a layer on the surface that is strongly advected, spray above it is ballistic, and bubbles below are weakly advected with buoyancy: [Whitewater (DOP)](https://www.sidefx.com/docs/houdini/fluid/whitewater.html).
- [model] Thürey, Müller-Fischer, Schirm & Gross (2007, Pacific Graphics): shallow-water simulations gain overturning waves by "detecting steep wave fronts in the height field and marking them by line segments, which then spawn sheets of fluid represented by connected particles". The demos include waves near a beach and "surf riding characters" in real time (abstract via search). — [TUM portal](https://portal.fis.tum.de/en/publications/real-time-breaking-waves-for-shallow-water-simulations/)
- [model] Thürey, Sadlo, Schirm, Müller-Fischer & Gross (2007, SCA): bubbles with Hill's spherical vortices coupled to shallow water, and SPH foam with surface tension to cluster foam bubbles. Scenes had 81–654 bubbles and 131–1129 foam particles at 161–18.9 fps. That is micro-scale; the paper calls "several hundred bubble and foam particles" complex scenes. — [Thürey et al. 2007 SCA PDF](https://cgl.ethz.ch/Downloads/Publications/Papers/2007/Thue07a/Thue07a.pdf)
- [prod] Surf's Up (Sony Imageworks, 2007): a ray-intersected "crash curve" along the lip, with interpolated "spill vectors", sent interpolated **energy** data to a real-time particle preview of crashing whitewater. — [Making Waves for Surf's Up PDF](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)

### Inferences
- Mapping to the game's Boussinesq heightfield:
  - Use Chentanez's three-condition breaking test, or the game's own breaking flag and jet-landing events, as the emitters.
  - Weight emission by Ihmsen-style potentials: trapped air from the velocity jump at jet landing or cavity collapse; crest from curvature times upward velocity; a kinetic-energy gate.
  - Classify by height relative to the local surface η: above → spray, within a thin band → foam, below → bubble. This is Houdini's scheme and needs no neighbour search.
- Bubbles rising at 0.2–0.25 m/s and turning into foam when they surface would tie the aeration field, the "fizz" spray and the surface-foam field into one consistent lifecycle.
- SPH foam clustering (Thürey 2007) does not scale to a surf zone. Get the cellular look from textures or repellant noise (sections 9 and 10).

### Gaps
- No real-time surf-zone diffuse-particle system from a shipped game was found with published counts. Uncharted 4, Sea of Thieves and others publish foam-map approaches, not particle budgets.

## 8. Foam as an advected scalar with decay; foam from surface compression (Jacobian) or from dissipation

### Takeaway
Games mostly keep foam as a 2D coverage map with four parts:
- **Deposit:** where the surface folds or pinches (Jacobian below a threshold), in shallows, or from simulated dissipation.
- **Fade:** a fixed rate each update.
- **Spread:** by advection or a feedback blur.
- **Look:** blended with authored textures.

Dupuy & Bruneton turn the Jacobian rule into a filterable statistic so whitecaps stay anti-aliased at any distance. The game already has a better source than the Jacobian, the actual breaking dissipation, so its scalar approach mostly needs a better lifecycle and look.

### Cited Findings
- [model] Tessendorf (2001/2004 course notes): the Jacobian of the horizontal displacement x → x + λD(x,t) is J = J_xx·J_yy − J_xy·J_yx, with J_xx = 1 + λ∂D_x/∂x. J < 0 marks folding. "The minimum eigenvalue is the actual signal of the onset of folding", its eigenvector gives the folding direction, and the overlap region could drive "spray, foam and/or breaking waves". — [Tessendorf course notes PDF](https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf)
- [model] Dupuy & Bruneton (2012, SIGGRAPH Asia Technical Brief):
  - Whitecap coverage comes from a "wave deformation criteria which can be pre-filtered linearly", which makes it anti-aliased from centimetric to planetary scales (abstract).
  - In the shader, coverage is the Gaussian CDF of the Jacobian's mip-filtered mean and variance: `0.5*erf(0.5*sqrt(2)*(eps-mu)*inversesqrt(sigma2))+0.5`, summed over four grid scales.
  - Sources: [ACM](https://doi.org/10.1145/2407746.2407761); [ocean.glsl](https://raw.githubusercontent.com/jdupuy/whitecaps/master/ocean.glsl)
- [doc] Crest Ocean System (4.15):
  - Detects "pinched" crests (whitecaps) and deposits foam, scaled by Wave Foam Strength and Wave Foam Coverage.
  - Adds shoreline foam where depth is below Shoreline Foam Max Depth.
  - A **Foam Fade Rate** removes foam every update (default simulation frequency 30 per second).
  - Manual inputs: add from texture, add from vertex colours, override.
  - Source: [Crest ocean simulation docs](https://crest.readthedocs.io/en/4.15.2/user/ocean-simulation.html)
- [prod] Sea of Thieves (SIGGRAPH 2018 Talks):
  - The ocean is FFT (Tessendorf). Foam "is generated at wave peaks using the method described in the reference paper" and "around objects that intersect the water surface … using depth buffer comparisons".
  - The foam buffer is blurred with feedback, then blended with artist textures. Generation and dispersion change with calm, normal or stormy states.
  - A subsurface colour is blended in using a wave-peak mask from the choppiness offsets.
  - Source: [Ang et al. 2018 PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)
- [doc] Unity HDRP water: wind-driven "simulation" foam across the surface plus local foam, for example trailing foam behind objects. The search summary names "Simulation Foam Amount" and "Wind Speed Dimmer" as the recommended controls; the page I opened was an index. — [Unity HDRP foam docs](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-foam-in-the-water-system.html)
- [prod] LIGHTSPEED STUDIOS "Photon Water System" (GDC 2023): precomputes and updates at runtime "height, velocity, and foams" from physical equations, rendered with an adaptive CDLOD mesh (abstract). — [GDC Vault](https://www.gdcvault.com/play/1028829/Advanced-Graphics-Summit-Open-World)
- [prod] Naughty Dog, "Rendering Rapids in Uncharted 4" (SIGGRAPH 2016 Advances): water runs in a separate engine for everything from ponds to stormy oceans. Rapids combine offline fluid simulations with procedural components controlled by technical artists (abstract; the 143 MB slides were not opened). — [Advances 2016 course page](https://advances.realtimerendering.com/s2016/)
- [field→model] Foam as a dissipation proxy: B, the "fraction of foam on the face", is the dissipation parameter in bore models (Thornton & Guza 1983); roller foam length from IR gives dissipation (Carini 2015); aggregated whitecap foam gives the dissipation of individual whitecaps (Callaghan 2024). — [doi:10.1029/JC088iC10p05925](https://doi.org/10.1029/JC088iC10p05925); [doi:10.1002/2014JC010561](https://doi.org/10.1002/2014JC010561); [doi:10.1029/2023JC020193](https://doi.org/10.1029/2023JC020193)
- [game] The FoamField solves ∂F/∂t + u·∇F = S − F/τ on the solver grid, with two components (dense whitewater, and the residual lace it decays into). It advects semi-Lagrangian with the depth-averaged velocity and adds breaking strength × bore dissipation, plus lip splashes. "The foam never feeds back into the water." — `src/wave/FoamField.ts` lines 40–47.

### Inferences
- The game's source term (bore dissipation × breaking strength) is physically better than a Jacobian or "pinch" rule, which marks steep folded crests rather than energy loss. Keep it. A Jacobian or Dupuy-style statistical term is useful only for **far-field open-ocean whitecaps** beyond the solver domain.
- What the game's scalar lacks, compared with the physics:
  - Source-dependent decay: τ should grow with plume depth and breaker size, not stay fixed per spot.
  - Area growth with thinning (sections 2 and 4).
  - A compaction term from flow convergence, which makes streaks, scum lines and rip plumes (section 3).
- A feedback blur (Sea of Thieves) is a stylization that erases convergence patterns. Avoid it for a realistic look, or keep it very small.

### Gaps
- I found no primary sources for foam in Assassin's Creed III/IV, Ghost of Tsushima or Unreal Engine's Water plugin; only third-party pages mention UE shoreline-foam width. NVIDIA WaveWorks foam documentation was not found. The Uncharted 4 details are in slides I did not open.

## 9. Advected foam textures, flow maps and foam texture detail (bubbles, lace, streaks)

### Takeaway
To give an advected foam field visible structure that moves with the water without smearing, real-time systems use **flow-mapped texture layers**. Two or three copies of the texture advect with the flow and reset out of phase, cross-faded by periodic weights. Distortion only looks right for about the first third of a cycle, and a noise offset hides the pulsing. For the detail itself, a **pre-simulated foam life cycle** baked into a looping texture and indexed by life stage (Surf's Up) looked "beyond any procedural texturing method … using noise functions". Houdini gets cellular foam from repellant particles.

### Cited Findings
- [prod] Vlachos, "Water Flow in Portal 2" (SIGGRAPH 2010, Valve):
  - Artists author a low-resolution 2D flow map, about 4 texels/m.
  - A normal map is distorted along the flow in **two layers offset by half a phase**, so each layer's restart is hidden.
  - "Distortion looks reasonable for the first 1/3 of uv space."
  - Noise removes the "pulsing"; an offset per phase reduces repetition.
  - Normal strength scales down with flow speed.
  - Cost against two scrolling normal maps: +2 texture fetches and +21 ALU instructions.
  - Flowing colour (debris) uses a distortion interval centred on zero (−f to +f).
  - Playtests: 17% fewer wrong turns.
  - Source: [Vlachos 2010 slides PDF](https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf)
- [model] Chentanez & Müller (2010), citing Neyret (2003) "Advected textures": three sets of texture coordinates per grid cell are semi-Lagrangian-advected and periodically regenerated. Each is weighted by a raised cosine of its age, (1 − cos(2π·age/τ))/3, and the displacement weight depends on how much the flow stretches the texture. Used for sub-grid FFT detail. — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- [prod] Surf's Up beach break (Kluyskens, Sony Imageworks 2007):
  - "A foam pattern (convection) life cycle is simulated and rendered as a repeatable texture": an image sequence used as a 3D shader, with X and Z as U and V and the sequence as Y.
  - A splatting shader "takes 'bites'" out of it. Attribute-carrying particles and rendered attribute maps choose "placement, life cycle stage, deformation and fading"; at the leading edges of licks and waves the shader switches to attribute maps for precision.
  - The result is "relatively fast and light" compared with rendering a particle or fluid sim, and "beyond any procedural texturing method that tries to depict foam using noise functions".
  - Source: [Surf's Up beach break PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- [doc/prod] Houdini Whitewater Solver: "Enable Repellants" makes particles that "push whitewater away and give rise to a cellular foam structure" (tensile radius and strength); density control clumps foam. — [Whitewater Solver docs](https://www.sidefx.com/docs/houdini/nodes/dop/whitewatersolver.html)
- [model] Thürey et al. (2007, SCA): foam bubbles cluster through SPH surface tension. Surface foam bubbles are "more hemispherical" than spherical. When a foam bubble is deleted after a randomized lifetime, it launches a small surface wave. — [Thürey et al. 2007 SCA PDF](https://cgl.ethz.ch/Downloads/Publications/Papers/2007/Thue07a/Thue07a.pdf)
- [field] Single-bubble surface lifetimes of 2–4 s (Zheng et al. 1983, via Hwang) set the time scale on which lace cells open and pop. — [arXiv:1906.11202](https://arxiv.org/pdf/1906.11202)
- [game] The game already has a flow-map foam pattern with a defined period (`src/scene/foamPattern.ts` line 25) and a churn texture of domes 0.8 cell wide (`src/scene/water/churnTexture.ts` line 27).

### Inferences
- The highest-value upgrade to the game's foam pattern is to **index the pattern by foam age or density**. Examples: a baked 3D/flipbook "foam lifecycle" (dense bubbly → opening cells → thin lace → streaks), or a procedural Voronoi whose cell-wall width falls with age. Flow-mapping moves it. This turns one scalar into the observed evolution (Koepke's spreading and thinning; streaks at about 10% reflectance).
- Streak anisotropy can come from the local strain or velocity direction: stretch lace along the flow where the flow is shearing.
- A **subsurface bubble layer** is worth adding under the foam: a dimmer, green-tinted parallax texture for aerated water, per Bohren and Dierssen. It gives the "Rich" water depth without particles.

### Gaps
- Neyret (2003) itself was not opened; it is described here through Chentanez & Müller's use and citation. No measured statistics on lace cell size were found.

## 10. Screen-space and volumetric whitewater rendering; GPU particle budgets

### Takeaway
- **Real-time rendering:**
  - Spray as **velocity-stretched sprites**, which fakes motion blur.
  - Foam particles as **surface-aligned diffuse disks**.
  - Dense splash through **screen-space fluid rendering**.
- **Offline rendering:** ray-march the diffuse-particle density as a volume, or instance huge point counts at render time.
- **Budgets:**
  - About **220K** heightfield-coupled particles cost about 2.8 ms (generation plus simulation) on a 2010 GTX 480.
  - three.js ships a **200K**-particle WebGPU compute example.
  - Offline whitewater uses 3–15 M particles per frame; Surf's Up stored about 200 GB of whitewater per beach.
- **Lighting:** droplet scattering is strongly forward-peaked, well fitted by an HG + Draine blend.

### Cited Findings
- [model] Chentanez & Müller (2010):
  - "Spray particles are rendered as an elongated ellipse along the direction of their velocity to emulate the motion blur effect". "Foam particles are rendered as diffuse disks with normals perpendicular to the height field water surface". Splash particles use van der Laan et al.'s screen-space fluid rendering.
  - Particle counts by scene: Boat 250K, Beach 220K, Ocean 83K, Waterfall 56K. Beach GPU timing: total 9.88 ms, of which generation 1.87 ms and particles 0.90 ms (GTX 480, CUDA).
  - Source: [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- [model] Ihmsen et al. (2012): diffuse material rendered by ray-casting a volume density built from the particles, with absorption and emission only. The paper counts up to 3.3 M and 15 M diffuse particles per frame. — [Ihmsen et al. 2012 PDF](https://cg.informatik.uni-freiburg.de/publications/2012_CGI_sprayFoamBubbles.pdf)
- [prod] Surf's Up beach break: "All whitewater … is done through a RenderMan clustering DSO, where many RenderMan points are added at render time based on an input of 'seed points'". The pre-simulated whitewater came to about 200 GB of particles per beach (about 300 GB with textures), cut per shot by camera culling and a smooth distance-based LOD. — [Surf's Up beach break PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- [doc] three.js `webgpu_compute_particles` example: `const particleCount = 200000;`, updated in a TSL compute shader and drawn as instanced sprites (per the fetch summary, the example's info text says "500k"). — [three.js example source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_compute_particles.html)
- [model] Jendersie & d'Eon (NVIDIA, SIGGRAPH 2023 Talks): "A blend of HG and Draine's phase function can accurately match 95% of the Mie phase function over a wide range of droplet sizes", with analytic fitting and sampling. — [NVIDIA Research](https://research.nvidia.com/publication/2023-08_approximate-mie-scattering-function-fog-and-cloud-rendering)
- [game] The spray pool is 4096 particles plus 1024 places for tube whitewater. At the reef it peaked at 5120 and was full on 17% of steps (point 9%, beach 1%). — `docs/research/whitewater-report.md`

### Inferences
- Budget: on the M4 Pro's WebGPU tier, 100K–250K GPU-simulated spray, mist, foam and bubble particles is a plausible target. That extrapolates from 220K in about 2.8 ms of simulation on 2010-era hardware and the stock 200K three.js example. It is 25–60× the current CPU pool.
  - WebGL2 fallback: texture-ping-pong GPGPU or transform feedback can carry a smaller pool.
  - Budget by the performance benchmark, per the project's "perf measured, never a gate" stance.
- Rendering order of value:
  - (1) Velocity-stretched, soft, depth-faded spray sprites.
  - (2) Forward-scattering phase with a backlit glow: the HG part with g ≈ 0.7–0.9 is a common choice, per the search snippets; Jendersie & d'Eon's blend if affordable.
  - (3) Large low-density mist sprites or a coarse froxel or slab volume for the lingering reef plume.
  - (4) Screen-space thick splash surfaces only on the WebGPU tier.
- Volumetric ray-marched whitewater (Ihmsen's renderer) is offline-quality and not a fit for the browser budget, except as a coarse 2.5D slab for mist.

### Gaps
- No published real-time *surf* game particle budgets were found. The Mie asymmetry values (g ≈ 0.82 measured for water droplets; 0.7–0.99 typical) came only from search snippets ([arXiv:1902.02389](https://arxiv.org/pdf/1902.02389)), not opened pages. No source gives WebGL2 GPGPU particle counts on Apple GPUs.

## 11. What sells scale and violence in whitewater visually

### Takeaway
The cues that read as big and violent all have measured counterparts:
- **Size spectra:** many tiny drops and few large ones (power laws crossing at about 0.4–1.5 mm).
- **Streaks:** motion blur on fast spray.
- **Sudden onset then long persistence:** a burst under 0.4 s, then foam that spreads and thins for 5–10 s and more, then mist that lingers and drifts.
- **Multi-stage timing:** jet impact → cavity collapse → splash-up(s) → bubble-burst fizz.
- **Correct brightness:** foam about 0.55 and fading, aerated water green.
- **Forward-scattering light:** backlit spray glows.
- **Sound sync:** within +45 / −125 ms of the visual event.

### Cited Findings
- [lab] Size spectra:
  - Droplets: two power laws crossing at 418 µm radius (Erinin 2019), with crossover diameter 0.82–1.48 mm for weak to strong breakers (Erinin 2023).
  - Bubbles: ∝ a^(−10/3) above about 1 mm radius and a^(−3/2) below (Deane & Stokes 2002, via Hwang).
  - Sources: [doi:10.1029/2019GL082831](https://doi.org/10.1029/2019GL082831); [arXiv:2210.01923](https://arxiv.org/abs/2210.01923); [arXiv:1906.11202](https://arxiv.org/pdf/1906.11202)
- [lab] Timing:
  - Spray: droplets come in three time zones — impact 22%, large-bubble bursts 44%, small-bubble bursts 34% (Erinin 2019).
  - Plunging sequence: jet impact, air-cavity collapse, splash-up impact, then peak void fraction in the splashing zone (Rojas & Loewen 2010).
  - Durations: the initial splash lasts under 0.4 s, and the plume reaches the bottom of 0.4 m depth in about 0.25 s (Chanson 2002).
  - Sources: [doi:10.1029/2019GL082831](https://doi.org/10.1029/2019GL082831); [doi:10.1029/2009JC005614](https://doi.org/10.1029/2009JC005614); [Chanson 2002 PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [field] Persistence and growth:
  - Foam patches grow in area while their reflectance falls, staying white to about 7.5 s (Koepke).
  - Decay times run 0.2–10.4 s, and larger whitecaps last longer (Callaghan 2012).
  - Surfactants give about 3× persistence (Callaghan 2013).
  - Sources: [Koepke PDF](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf); [doi:10.1029/2012JC008147](https://doi.org/10.1029/2012JC008147); [doi:10.1175/JPO-D-12-0148.1](https://doi.org/10.1175/JPO-D-12-0148.1)
- [model] Motion streaks: spray drawn as ellipses elongated along velocity to emulate motion blur (Chentanez & Müller 2010). — [PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- [field] Height and episodicity: reef spray reached 25–35 m and was absent about half the time; beach spray stayed below 19 m (Porter et al.). — [UH SEAS lidar PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)
- [std] Sound sync: ITU-R BT.1359-1 found detectability thresholds of **about +45 ms to −125 ms** and acceptability thresholds of **about +90 ms to −185 ms**, where positive means sound leads the picture. — [ITU-R BT.1359-1 PDF](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!PDF-E.pdf)
- [prod] Surf's Up drove crashing whitewater from interpolated per-vertex "energy" and "crash" attributes along the lip's crash curve; it tied effects to wave energy, not a constant rate. — [Making Waves PDF](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- [model] Lighting: an HG + Draine blend matches Mie scattering by water droplets (Jendersie & d'Eon 2023). — [NVIDIA Research](https://research.nvidia.com/publication/2023-08_approximate-mie-scattering-function-fog-and-cloud-rendering)

### Inferences
- **Scale cue:** particle sizes that stay small relative to the wave (power-law sampled, most sprites tiny), plus big coherent sheets for splash-up. Uniform medium sprites read as small-scale "confetti".
- **Violence cue:** a strong **attack/decay envelope**. Near-instant onset at jet impact (a spray burst, a flash of white, audio), a slower second bump at cavity collapse and splash-up, then seconds of fizz and spreading foam, then mist.
- **Lighting cue:** backlit spray and mist should glow toward the sun (forward scattering), while front-lit spray looks grey-white. Dense foam in shadow must stay clearly darker than lit foam at the same albedo. Sun glints on wet foam are an artistic cue with no source.
- **Sound:** trigger impact audio from the same jet-impact events that emit the burst, keeping audio within +45 ms early / 125 ms late of the visual. Physical sound travel delay at a distance is an artistic choice: players may accept it, but it can read as lag.

### Gaps
- No perceptual study was found on what makes water "look big" (for example sprite size relative to the frame). Recommendations on particle size and motion-blur length are production practice, not measured.

## 12. Ranked techniques by visual payoff versus cost, and what the game's whitewater is missing

### Takeaway
The game's physics drivers are already good: Boussinesq breaking dissipation, jet and impact events, an aeration field, advected two-component foam. The gap is mostly in **how the whitewater evolves and looks, and in its particle budget**:
- Foam lacks a lifecycle: it does not spread, thin and lace, and bright dense foam never becomes dim lace.
- Aerated water isn't green-bright.
- Mist and residual foam don't persist.
- The spray budget saturates exactly where "explosive" is needed.
- Reef foam decays fastest where physics says it should last longest.

### Cited Findings
- [game] Foam decay dense / residual is 3 / 20 s at the beach but **3 / 8 s at the reef**. — `src/wave/SurfZoneSimulation.ts`. Physics: decay grows with whitecap size and plume degassing time. — [doi:10.1029/2012JC008147](https://doi.org/10.1029/2012JC008147); [doi:10.1175/JPO-D-12-0148.1](https://doi.org/10.1175/JPO-D-12-0148.1)
- [game] Spray and mist lives are 3 s and 4 s, and foam balls linger 1 s. — `src/wave/SprayCloud.ts`. Physics: reef spray plumes reach 25–35 m, stay concentrated 1 km downwind, and aerosol persists more than 16 km offshore. — [UH SEAS lidar PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf); [doi:10.1029/2011JD015602](https://doi.org/10.1029/2011JD015602)
- [game] The spray pool (4096 + 1024) is full on 17% of reef steps; reef splash-up is 0.63 m median and 1.12 m at the 90th percentile for Hs 1.4 m. — `docs/research/whitewater-report.md`. Real-time reference: 220K heightfield particles in about 2.8 ms (2010 GPU). — [Chentanez & Müller PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- [game] Aeration peak 0.2 (depth-averaged) and rise speed 0.25 m/s. — `src/wave/AerationField.ts`. Physics: about 12% depth-averaged near impact in shallow lab water, with labs underestimating air; local peaks up to 0.96; rise about 0.2 m/s. — [Chanson PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf); [doi:10.1029/2009JC005614](https://doi.org/10.1029/2009JC005614)
- [game] Foam balls are sized from 0.9·H² of roller (`docs/research/whitewater-sources.md`). LiDAR says such roller-area formulas overestimate inner-surf-zone dissipation. — [doi:10.1029/2017JC013369](https://doi.org/10.1029/2017JC013369)

### Inferences
Ranked by visual payoff per unit of cost for this game. Costs are relative estimates; everything is measurable on the M4 Pro survey.

| Rank | Technique | What it fixes | Evidence it matters | Cost / tier |
|---|---|---|---|---|
| 1 | **Foam lifecycle look.** Index the foam pattern by age or density: dense bubbly → opening cells → thin lace → streaks. Area spreads while reflectance falls (0.55 → ~0.1–0.2 albedo). Flow-mapped, two or three phases. Bake one pre-simulated "foam cycle" flipbook or 3D texture, as in Surf's Up, or a Voronoi cell-wall shader. | Whitewater reading as a painted white decal; no ageing. | Koepke area growth and reflectance decay; Dierssen 40% → 18%; Surf's Up foam-cycle texture; Vlachos flow maps | Low: shader plus one texture; WebGL2 fine |
| 2 | **Physically tied persistence.** Dense τ ≈ plume depth / rise speed (a few s, longer for bigger breaks). Residual lace tens of seconds to minutes. Reef ≥ beach. A per-spot surfactant factor of 1–3×. | Reef foam vanishing fastest; residual too short to form rip plumes and streaks. | Callaghan 2012/2013; Chickadel 2003; Rodriguez Padilla 2021 | Trivial: constants and one formula |
| 3 | **Aerated-water colour (Rich look).** Bubble cloud → brighter green/turquoise water under and behind the break; white only where surface foam is dense. | Aerated water drawn white or not at all. | Bohren via Flatau 2000; Zhang et al. 1998; Dierssen 2019 | Low: water shader reads the aeration field |
| 4 | **Roller band.** A continuous white band on the bore front, feathered at the toe and brightest at the crest, width from roller length or dissipation, riding at bore speed all the way to the swash. | Discrete foam balls standing in for the roller. | Duncan 1981; Haller & Catalán 2009; Martins 2018; Raubenheimer 1996 | Low–medium: shader plus existing B and bore fields |
| 5 | **GPU diffuse particles (WebGPU tier).** 100K–250K spray/mist/foam/bubble particles. Chentanez-style heightfield breaking emitters plus the game's jet and cavity events. Ihmsen-style potentials. Houdini-style depth classification. Bubbles surface into foam. | Pool saturation; thin reef spray; missing fizz. | Ihmsen 2012; Chentanez 2010 (220K in ~2.8 ms); three.js 200K | Medium dev; GPU cost scalable by benchmark; smaller WebGL2 fallback |
| 6 | **Staged, super-linear emission.** Emitted mass ∝ (V₁−V_e)^(2–3). An impact burst under 0.4 s, a cavity-collapse and splash-up second pulse, 1–3 s+ of bubble-burst fizz over the foam patch. Power-law drop sizes. | "Explosive" missing at reefs; beach and reef looking alike. | Chanson 2002; Erinin 2019/2023; Rojas & Loewen 2010 | Low (logic) on top of 5; partial gains even with the CPU pool |
| 7 | **Spray and mist shading.** Velocity-stretched sprites, soft depth fade, forward-scattering phase (backlit glow), long-lived mist sprites or a coarse volume slab drifting downwind to 25–35 m at reefs, episodic with sets. | Mist dying in 4 s; spray not reading as light-filled water. | Chentanez ellipses; Jendersie & d'Eon 2023; Porter et al. lidar | Low–medium; fill-rate is the main cost |
| 8 | **Convergence compaction in the foam scalar.** Add a source ∝ max(0, −∇·u)·F, and no isotropic blur, so streaks, scum lines and rip plumes emerge. | Featureless residual foam. | NOAA rip visuals; Chickadel 2003; Lippmann & Holman 1989 | Low: one term in the existing advection |
| 9 | **Audio sync.** Fire impact and crash sounds from the same jet-impact events, within +45 / −125 ms. | Violence not "felt". | ITU-R BT.1359-1 | Trivial |
| 10 | **Screen-space fluid surfaces** for thick splash-up curtains (WebGPU tier only). | Splash-up reading as particles, not sheets. | van der Laan et al., as used by Chentanez | Medium–high; M4 only |
| 11 | **Jacobian / Dupuy-Bruneton whitecaps** for far-field open-ocean foam beyond the solver. | Horizon ocean lacking whitecaps. | Tessendorf; Dupuy & Bruneton 2012 | Low; low priority for surf |
| 12 | **Micro-scale foam physics** (SPH bubble clustering) or full volumetric ray-marched whitewater. | — | Thürey 2007 SCA (hundreds of particles); Ihmsen volume renderer (offline) | High; not recommended in the browser |

- **Keep:** dissipation-driven foam sourcing, jet and impact events, the 0.2–0.25 m/s bubble rise, and advection with the solver velocity. These match the physics sources. The changes above mostly reshape lifecycle, look and budget.

### Gaps
- Game-specific costs of each technique were not measured here. The ranking is an informed estimate to verify with the project's performance survey on the M4 Pro and M1 Air.
- **Found but not opened:**
  - 2025–2026 papers that could refine the physics: Callaghan 2025 GRL on the breaking-strength parameter of individual whitecaps ([doi:10.1029/2025GL116342](https://doi.org/10.1029/2025GL116342)); Cao 2026 JGR on spectrally resolved dissipation ([doi:10.1029/2025JC023904](https://doi.org/10.1029/2025JC023904)); a 2026 Coastal Engineering paper on stage-resolved bubble clouds under plunging breakers ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0378383926002012)); a 2025 Applied Ocean Research paper on wave-roller area evolution ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0141118725000483)).
  - Recent real-time ocean frameworks: Arc Blanc ([arXiv:2503.03326](https://arxiv.org/abs/2503.03326), abstract only, no foam details) and a wave-particle/FFT hybrid ([arXiv:2511.02852](https://arxiv.org/pdf/2511.02852)).
