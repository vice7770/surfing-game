# Barrel physics: how real plunging breakers and surfable tubes form, and what numbers they hit

Scope: the time sequence of a plunging break, tube shape measures, the 3D barrel along the peel, crest kinematics, and lip mass. Tags used below: **[meas-lab]** measured in a flume, **[meas-field]** measured in the field or at field scale, **[model]** numerical (FNPF = fully nonlinear potential flow, DNS = direct numerical simulation), **[anecdotal]** surfer or press description. "H" is breaking wave height unless stated. The overturn geometry convention used by nearly all modern papers: L = overturn (void) length along its tilted major axis, W = width across it, θ = tilt of the major axis from horizontal, A_O = enclosed void area, A_J = jet area (the multi-valued water above the void), all taken at the moment the jet touches down.

## Q1. The time sequence of a plunging break, with numbers

### Takeaway
The best numbers now available say: breaking starts when crest surface velocity reaches about 0.85 of crest speed, the front face goes vertical, and a jet leaves the crest. The jet's toe then falls close to free fall, and its horizontal speed relative to the wave is only slightly above crest speed. When it touches down it closes a void whose length is about 0.4 to 1.2 H, tilted 22 to 53°. The void stays tube-shaped only about 0.5 s (1 to 3 m of travel) before it stretches out and collapses, and the splash-ups follow. Jet size and void size are both set mainly by the local bed slope relative to wave nonlinearity, ψ0 = s/(H0/h0)^(1/4).

### Cited Findings
**Onset (crest kinematics, front face vertical)**
- Breaking onset parameter B = U/C, with U the horizontal particle velocity at the crest and C the translational speed of the crest. "B ≈ 0.85 provides a robust threshold as a precursor to breaking". In shallow-water cases the threshold is 0.85–0.88. B then passes 1.0 "shortly after" reaching 0.85. The time from threshold to B = 1 shrinks as the surf similarity parameter ξ0 grows. [model: LES/VOF and FNPF-BEM, regular, irregular, solitary and focused waves on plane beaches, bars and slopes] — [Derakhti et al., arXiv 1911.06896 (JGR Oceans 2020)](https://arxiv.org/html/1911.06896v1)
- The linear phase speed is a poor stand-in for crest speed near breaking. The ratio of linear c to actual crest speed C is 0.8–1.1 in most cases around onset — [Derakhti et al.](https://arxiv.org/html/1911.06896v1)
- Pick & Feddersen define breaking onset t_b as the moment the front face goes vertical (the last time step before the free surface becomes multi-valued), and jet impact t_I as the moment the jet reaches the surface below. FNPF is valid only up to impact — [Pick & Feddersen 2026, JFM 1040 A8 (open access PDF)](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Front-face steepening before breaking is "super-exponential". Example (s = 1/15, H0/h0 = 0.6): |min ∂η/∂x| = 0.5 at t̃_s = 13.5 (t̃ = t√(g/h0)) and breaking at t̃_b = 15.8. The time from |∂η/∂x| = 0.5 (26.6°) to a vertical face is 0.9 (H0/h0 = 0.2) versus 2.3 (H0/h0 = 0.6) in t̃ units. The steepening rate scales with ψ1 = s/(H0/h0)^(3/2), and faster steepening gives bigger overturns and jets. [model, FNPF, solitary waves] — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Varing et al. (2021), as summarised by Pick & Feddersen: the point of maximum surface velocity |u_m| coincides with where the overturning jet starts, and for solitary waves |u_m|/c ≈ 1 predicts onset better than B = 0.85 — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Field (Duck, NC, over 4200 lidar and IR tracked waves, 110 plunging): γ = H/h peaks near breaking onset, at 0.7 < γ_b < 0.8 for plunging and 0.6 < γ_b < 0.7 for spilling. Face slope and γ together predict breaker type. [meas-field] — [Carini 2019, PhD thesis, U. Washington](https://digital.lib.washington.edu/researchworks/items/62cc24f5-5f09-43b5-9a42-ced8a78187b8)
- Solitary waves on slopes: S0 = 1.521 s/(H0/h0)^(1/2) with γ_b = 0.841 e^(6.421 S0) (Grilli et al. 1997; r² = 0.937 on the combined data). The alternative ψ0 = s/(H0/h0)^(1/4) gives γ_b = 0.871 e^(11.874 ψ0) (r² = 0.990). Grilli's S0 < 0.3 covers spilling and plunging, and S0 > 0.3 is surging. [model + meas-lab] — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Grilli et al. (1997) simulated slopes 1:100 to 1:8. "No wave breaks for slopes steeper than 12°". After breaking there is a rapid, non-dissipative decay of height as potential energy turns into kinetic energy — [Grilli, Svendsen & Subramanya 1997 abstract](https://digitalcommons.uri.edu/oce_facpubs/207/)

**Jet formation and flight**
- Longuet-Higgins (1982): a class of exact cubic free-surface flows "corresponds with remarkable accuracy to the forward face of an overturning, or plunging, breaker" [theory] — [LH 1982 abstract, JFM 121](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/parametric-solutions-for-breaking-waves/6513918A73FA0255C3D51BA2CCDF8DBB)
- New, McIver & Peregrine (1985): finite-depth computations give a continuum, "ranging from the projection of a small-scale jet at the wave crest (of the type that might initiate a spilling breaker) to large-scale plunging breakers involving a significant portion of the wave", with "a remarkable similarity ... in the overturning regions" [model] — [New et al. 1985 abstract, JFM 150](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/computations-of-overturning-waves/1C114232AF35590F75E52775F7B41044)
- The toe of a plunging breaker is "to a good approximation ... in freefall under gravity". Its measured trajectory fits z = z0 − g(t − t0)²/2, and it hits with vertical speed w = (2gh)^(1/2), where h is the height of the plunging face at impact (not the full crest-to-trough height). The model assumes "the initial velocity of the toe relative to the underlying wave is a small fraction of the phase speed" (citing Van Dorn & Pazan 1975; Perlin, He & Bernal 1996). [meas-lab, dispersive focusing, 0.6 m deep tank] — [Drazen, Melville & Lenain 2008, JFM 611](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2008_Drazen_Melville_Lenain-Journal_of_Fluid_Mechanics_vol_611.pdf)
- Drazen et al. write the crest-to-impact time as τ = (h/2g)^(1/2) in the text I extracted. Free fall from rest through h takes (2h/g)^(1/2), so this may be a typo or a quirk of the extraction — [Drazen et al. 2008](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2008_Drazen_Melville_Lenain-Journal_of_Fluid_Mechanics_vol_611.pdf)
- Erinin et al. (2023), Plunging breakers Part 1 [meas-lab, deep-water dispersive focusing, λ0 = 118.06 cm, f0 = 1.15 Hz, linear c0 = 1.358 m/s]:
  - Crest horizontal speed at jet formation averages 1.52 m/s (≈ 1.12 c0).
  - Jet-tip impact speed is 1.904 m/s (weak breaker) to 2.010 m/s (strong).
  - Impact angle is 21.9° to 27.6°.
  - Mean vertical acceleration of the jet tip is 7.43, 7.00 and 7.35 m/s², "about 18% lower than" free fall, attributed to "surface tension and/or aerodynamic forces". The jet tip is "an evolving geometric point, not particle tracking".
  - From weak to strong breaker, the crest-to-tip distance at impact grows 42% horizontally and 31% vertically, and the area under the jet at impact grows 86%.
  - Multiple splash-ups follow.
  
  — [Erinin, Liu, Wang & Duncan 2023, JFM 967 A35](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35)
- Jet impact velocity V1 is "basically proportional to the square root of the wave height" (Chanson & Lee 1997). A field breaker about 2–3 m high corresponds to an impact velocity of about 6–7 m/s. (The en-dashes were lost in PDF extraction. The text reads "23 m" and "67 m/s", which can only mean 2–3 m and 6–7 m/s.) [meas-lab + estimate] — [Chanson, Aoki & Maruyama 2002, Coastal Eng. 46](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)

**Touchdown, void closure, splash-up, collapse**
- At void closure (the frame nearest the moment the lip meets the face), field voids have L/W = 1.70–3.15, mean 2.55 (30 lidar-scanned plungers, Duck NC).
- The voids are roundest and steepest at closure. They then become "more elongated and less steep": L/W reaches 1.7–5.0, "rapidly over 1–3 m and within half a second". [meas-field, multi-beam lidar] — [O'Dea, Brodie & Elgar 2021, GRL 48](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- A near-full-scale "pseudo-plunging" nappe (impact velocity 5.6–6.4 m/s) gave these results:
  - Splash travelled up to 2.5 m from the impact point and rose more than 0.4 m above the still-water level.
  - The bubble plume reached the bed of the 0.4 m deep flume in 0.23–0.27 s.
  - The boiling, roller-like region lasted 3–7 s longer than the jet. Its extent was roughly 1.5–2 m from impact; the extracted text reads "x V 1.52 m" with the dash and symbols lost, so treat the extent as approximate.
  - Depth-averaged void fraction next to impact was above 10%.
  
  Caveat: the jet had no horizontal velocity. [meas-lab] — [Chanson et al. 2002](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- Upon impact, the jet's potential energy turns ballistically into kinetic energy and then rapidly into turbulence and bubbles. Jet potential energy scales linearly with A_J·H_I² (r = 0.99). Grilli et al. (1997) proposed "the area of the jet at the instant of touchdown as a measure of the strength of breaking". [model] — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Field: plunging breakers "lose energy at a rate 40% greater than that of spilling breakers within the first 0.2 wavelengths after the onset of breaking" [meas-field] — [Carini 2019](https://digital.lib.washington.edu/researchworks/items/62cc24f5-5f09-43b5-9a42-ced8a78187b8)
- Dissipation per unit crest length ε_l ∝ ρ g^(3/2) h^(5/2), which is equivalent to b = β(hk)^(5/2). With the linear packet slope S, the lab fit is b ∝ S^2.77. [meas-lab] — [Drazen et al. 2008](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2008_Drazen_Melville_Lenain-Journal_of_Fluid_Mechanics_vol_611.pdf)

### Inferences
- **Free-fall timescale.** The jet falls through about the plunging-face height, roughly 0.7–1.0 H. For H = 1.5 / 2 / 3 m the drop takes about 0.5 / 0.6 / 0.75 s, and the impact vertical speed is about 5 / 6 / 7.5 m/s. Air drag is ignored. Erinin's 18%-below-g tip acceleration stretches this a little.
- **Launch speed.** Erinin's impact angle is presumably measured from horizontal. If so, the tip's horizontal speed is about 1.77–1.78 m/s, which is ≈ 1.16–1.17 × crest speed (≈ 1.30–1.31 × c0). The quoted 1.25–1.32 (vs crest) and 1.40–1.48 (vs c0) are total speeds including the gravity-driven vertical part. Drazen's "small fraction of phase speed relative to the wave" agrees.
  - A game lip launched at 1.2–1.6 × *crest* speed is therefore on the fast side. About 1.1–1.3 × crest speed is closer to the evidence.
  - The larger literature ratios (1.5–1.7) are quoted against the *linear* phase speed, which near breaking is 10–25% below crest speed (see Q4).
- **Tube length is not just throw distance.** In the wave frame, a toe launched ≈ 0.15 C ahead of the crest and falling 0.6 s travels only about 0.15 × 6 m/s × 0.6 s ≈ 0.5 m. Yet measured voids are about 1 H long. So much of the void length comes from the lower face slowing and steepening behind the jet: the face base sits in shallower, slower water. A depth-averaged face that never goes vertical, and so never draws the base back under the lip, cannot produce this. The lip's landing point on a 17° solver face will be much too close to the crest unless the landing surface is the carved void floor.
- **The rideable barrel is mostly the pre-impact curl.** Once closed, the void reshapes within about 0.5 s (O'Dea). The "tube" a rider sees is mostly the open curl between jet launch and touchdown, plus about 0.5 s of closed void behind it.

### Gaps
- I could not open Bonmarin (1989), Peregrine (1983), Kiger & Duncan (2012), Chanson & Lee (1997) or Galvin (1969) full text. The Bonmarin splash-up heights, Peregrine's splash-up mechanisms and Chanson & Lee's jet thickness and impact numbers are therefore missing. A search abstract of Galvin (1969) states that plunging waves travel "four to eight times breaker height during the breaking process", but I could not open the ASCE page ([link](https://ascelibrary.org/doi/10.1061/JWHEAU.0000631), 403), so treat it as unverified.
- New et al. (1985) accelerations of "five or six times g" beneath the overturn appeared only in a search summary. The abstract I opened gives no numbers.
- Chang & Liu (1998) "1.68 × phase speed in the jet" and "0.86 c close to breaking" appeared only in search snippets (JPO page 403). Unverified.
- No field measurement of the time from vertical face to jet touchdown was found. Pick & Feddersen report t_b and t_I only in nondimensional plots.
- The game's claim that the jet "pours for its whole flight per Erinin et al. 2023" is not supported by what I could read. Erinin et al. say the tip is an evolving geometric point and attribute the sub-g acceleration to surface tension and/or aerodynamics, not to continued feeding.

## Q2. Tube shape measures: vortex ratio, void area, lip thickness, and what makes thick lips and round tubes

### Takeaway
Modern studies fit the same Longuet-Higgins (1982) loop to lidar, photos or simulations, so the numbers compare directly across sources:
- **Aspect ratio.** W/L is 0.30–0.44 in solitary-wave FNPF, 0.26–0.51 at Surf Ranch, 0.32–0.59 in the field at Duck, 0.43–0.67 on a 1:10 lab reef, and 0.29–0.70 at world-class breaks. Equivalently, the vortex ratio L/W is about 1.4–3.4.
- **Void area.** A_O/H² runs from about 0.04 on gentle slopes to 0.4–0.43 on steep ones.
- **Jet area.** A_J/H² grows quadratically with ψ0, from 0.012 to 0.27, which is why steep reefs throw thick lips.
- **Tilt.** Voids tilt 22–53° (FNPF), about 35–45° in the field.
- **What makes them fat.** Steeper local slope, smaller H0/h0 and offshore wind all give bigger, rounder, more horizontal voids with thicker jets. The effect of wave period alone is weak and unresolved.

### Cited Findings
**The shared shape model**
- The LH82-derived curve is z'/W = ±(3√3/4)·√(x'/L)·(x'/L − 1). It is fitted after rotating the void by θ. x' = 0 is the back of the overturn and x' = L is where the jet meets the water in front of the wave. Area A = (2√3/5)·L·W. [meas-field fitting method] — [Feddersen et al. 2023, JFM 958 A4 (PDF)](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- The curve is an exact potential-flow solution only when W/L = 0.36 (L/W = 2.76). New (1983) noted that it "does not give the correct surface velocity for an overturn", so it is a shape descriptor, not dynamics — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf); [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Robertson et al. (2014) give the LH82 constant ratio as 2.75 in one place and 2.57 in another in the same paper. O'Dea et al. give 2.76 — [Robertson, Nistor, Hall & Buckham, ICCE 2014](https://pdfs.semanticscholar.org/5b55/f488369a29862dd720e5b2079159ecb940cb.pdf)

**Pick & Feddersen (2026): the source the game uses exists and says this** [model, FNPF "surftank", 30 solitary-wave cases, s = 1/100…1/10, H0/h0 = 0.2–0.6, shallow flat reef at h_s/h0 = 0.05]
- Published in JFM 1040 A8, online 27 July 2026, open access (CC-BY) — [Cambridge Core](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/scaling-the-shape-of-shoaling-and-overturning-solitary-waves/D43EDB6346C8975E77258A291CFCB4EF); [PDF](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf); [UCSD press release](https://today.ucsd.edu/story/surfs-up-how-the-seafloor-shapes-breaking-waves)
- Fits against ψ0 = s/(H0/h0)^(1/4), valid for cases where the jet lands on the slope (S0 < 0.2, ψ0 < 0.1):

  | Quantity | Fit | Skill | Range in the data |
  |---|---|---|---|
  | Void area A_O/H_I² | 5.319 ψ0 − 0.043 | r² 0.990 | 0.04–0.43 |
  | Jet area A_J/H_I² | 37.072 ψ0² − 0.587 ψ0 + 0.020 | r² 0.997 | 0.012–0.266 |
  | Aspect ratio W_O/L_O | 1.661 ψ0 + 0.298 | r² 0.943 | 0.30–0.44 |
  | Tilt θ_O (°) | −5746.4 ψ0² + 225.2 ψ0 + 48.4 | RMSE 1.2° | 52.7° to 22.4° |

  — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- "Gentler slopes yield smaller, more inclined overturns with thinner jets, whereas steeper slopes produce larger, more horizontally inclined overturns with thicker jets". A_J/A_O is always below 1 but rises with ψ0.
- The steepest cases (s = 1/10) produce asymmetric, foil-shaped voids bounded below by flat still water. These were not fitted to LH82.
- Comparisons in the paper:
  - Blenkinsopp & Chaplin (2008, periodic waves on a 1:10 lab reef): A_O/H² = 0.05–0.35, W/L = 0.43–0.67.
  - O'Dea et al. (2021, field): A_O/H² = 0.05–0.3, W/L = 0.32–0.59.
  - For the Surf Ranch slope s = 0.0693 with H0/h0 = 0.6, the fits predict A_O/H² = 0.38 (measured 0.31, DNS 0.35), W/L = 0.41 (measured 0.38, DNS 0.30), A_J/H² = 0.19 (DNS 0.22) and θ 29° against the DNS 33°. Note that the 2024 DNS paper itself reports θ = 29° at zero wind, so the attribution is slightly inconsistent.
  
  — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)

**Field-scale lidar at Surf Ranch** [meas-field; 22 waves (11 left, 11 right)]
- Bathymetry:
  - Generation region h ≈ 2.5 m.
  - Steep section from x ≈ 13 m, then a flat bar about 6 m wide at h ≈ 0.95 m.
  - The slope in the direction of wave travel is β = 0.0693 ([Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)).
- Waves:
  - Solitons with H = 1.97–2.33 m on the bar (H/h ≈ 2.05–2.57) and C = 6.7 m/s.
  - Cross-wave wind U_w/C from −1.2 to 0.7.
- Overturn shape across all waves: A/H² = 0.2–0.42 and W/L = 0.26–0.5.
- Example fits:
  - L = 2.32 m, W = 1.07 m, θ = 35°.
  - Offshore wind: A = 1.74 m² with W/L = 0.51 and 0.49.
  - Onshore wind: A = 1.46–1.47 m² with W/L = 0.35–0.36.
  - θ within ±2° of 40° in those four.
- Offshore wind (U_w/C < −0.4) gives A/H² ≈ 0.4, saturating, and W/L ≈ 0.48. The strongest onshore wind (U_w/C ≈ 0.75) gives A/H² ≈ 0.2 and W/L ≈ 0.25.
- No dependence on the weakly varying H/h was found.

— [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)

The 2024 follow-up quotes the Surf Ranch tilt as θ_o ≈ 42° ± 8° — [Feddersen et al. 2024 (revised ms.)](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**DNS of the Surf Ranch case** [model, 2D Basilisk two-phase DNS; Re_w = 4×10⁴ against 1.4×10⁷ in the field]
- No wind: A_O/H_b² = 0.352, W/L = 0.300, A_J/H_b² = 0.219, θ = 29°.
- Onshore wind (Re* = 2400): A_O/H_b² = 0.301, W/L = 0.381, A_J/H_b² = 0.132, θ = 39°.
- Offshore wind: A_O/H_b² = 0.344, W/L = 0.296–0.305, A_J/H_b² = 0.229–0.219.
- The DNS gets the *opposite* wind dependence of W/L from the field experiment and needs stronger wind. Wind-induced surface pressure contributes 2–5% of ∂φ/∂t.

— [Feddersen, Hanson, Mostert & Fincham 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**Field lidar at Duck, NC** [meas-field, 30 plunging waves, 2017]
- At closure, L/W = 1.70–3.15 (mean 2.55). For comparison, the lab reef of Blenkinsopp & Chaplin (2008) gave 1.46–2.28 and the field photos of Mead & Black (2001) gave 1.42–3.43.
- The normalised void area A/H_b² rises on steeper local slopes (r² = 0.5) and in shallower breaking depth (r² = 0.4).
- Voids get rounder on steeper slopes (r² = 0.2) and in offshore-directed wind (r² = 0.2).
- The slope measured over half a wavelength offshore of breaking predicted best. Over a full wavelength there was no correlation (r² < 0.1).

— [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)

**Vortex ratio (surf-science usage)**
- Mead & Black (2001c) fitted a cubic curve to barrel photos from 28 world-class breaks (Robertson et al. say 23 locations). The vortex ratio predicts breaking intensity via Y = 0.065X + 0.821, where X is the orthogonal seabed gradient (R² = 0.71). The wording of the definition varies: Scarfe et al. call it the ratio "between the height and width of the vortex", while Robertson et al. and O'Dea et al. use vortex length / width (L/W).
- Intensity classes run medium, medium/high, high, very high, extreme.
- The shallower-water gradient matters more than the deeper one. The effect of steps or multi-gradient profiles was "still relatively unknown".
- Offshore winds raise breaking intensity. Onshore or cross-shore winds lower it.
- The Iribarren or surf-similarity number was found "too general" for surfing waves.

— [Scarfe et al. 2003 review (eScholarship)](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)

- Xia & Wan write the same relation as l_c/w_c = 0.065 m + 0.821, with m the orthogonal reef gradient, "independent of the incoming wave parameters" — [Xia & Wan, ICCM 2017](https://www.sci-en-tech.com/ICCM2017/PDFs/2641-9438-1-PB.pdf)
- Robertson et al. (2014) tested it in the field [meas-field; 187 waves at The Hook and Sewers (Santa Cruz) and Tropicana (Barbados); H = 0.89–3.51 m; T = 8.3–23.5 s; slopes 0.003–0.066]:
  - Neither the vortex ratio (R² ≤ 0.28, R² 0.31 with a multi-parameter fit) nor the vortex angle (R² ≤ 0.02) was predictable from wave or bed parameters. The typical angle was about 43–48° (regression intercepts), RMSE about 5°.
  - The dependence on wave period was weak and slightly *positive* (R² = 0.18), against surfer belief.
  - The paper contradicts itself on slope. Its Fig. 8 text says steeper effective slopes "may result in larger vortex ratios", while its conclusion says decreasing slope raises the ratio.
  - Onshore wind raises the ratio by narrowing the vortex. Offshore wind widens it.
  - It recommends jet length/H_b, jet thickness/H_b and jet area/H_b² instead.
  - Prior work cited: L/W 1.73–4.43 (Blenkinsopp & Chaplin 2008; Couriel et al. 1998), and 1.46–2.28 on a constant 1:10 slope.
  
  — [Robertson et al. 2014](https://pdfs.semanticscholar.org/5b55/f488369a29862dd720e5b2079159ecb940cb.pdf)

**Heavy slabs and lip thickness**
- Teahupo'o (by Tom Shand, U. Auckland):
  - Swell feels the bottom from about 200 m depth only "a couple of hundred metres" offshore.
  - "A flatter shelf in the reef" at about 10 m depth lets the wave stabilise and stand up with a steep face before it breaks as the reef rises again.
  - Incoming waves are 2–5 m with 14–20 s periods.
  - The wave "is still very linear" because shoaling is so rapid.
  - The overturning lip is about "half the wave height", and "the lower part of the wave appears to drop away below sea level".
  
  [expert description, not measured] — [The Conversation, 2024](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301)
- "The lip of the wave is often as thick as it is tall". The reef is "semi-circular, and drops down sharply" and lies up to 20 in (51 cm) beneath the surface. [anecdotal, Wikipedia with secondary citations] — [Wikipedia: Teahupoʻo](https://en.wikipedia.org/wiki/Teahupo%CA%BBo)

### Inferences
**Fit values as a check table (from Pick & Feddersen's fits)**
- L/H comes from A_O = (2√3/5)·L·W. "Horizontal" and "vertical" are the extents of the rotated loop. "Gap" is the tallest vertical opening under the lip. The jet thickness t_J ≈ A_J/L_O assumes the jet spans about the void length.

  | ψ0 | A_O/H² | A_J/H² | W/L | θ | L/H | W/H | horizontal/H | vertical/H | gap/H | t_J/H |
  |---|---|---|---|---|---|---|---|---|---|---|
  | 0.02 (≈1:50 beach) | 0.063 | 0.023 | 0.33 | 51° | 0.53 | 0.17 | 0.35 | 0.42 | 0.25 | 0.04 |
  | 0.04 (≈1:30) | 0.17 | 0.056 | 0.36 | 48° | 0.82 | 0.30 | 0.58 | 0.64 | 0.40 | 0.07 |
  | 0.06 (≈1:20) | 0.28 | 0.12 | 0.40 | 41° | 1.00 | 0.40 | 0.79 | 0.71 | 0.49 | 0.12 |
  | 0.08 (≈1:15) | 0.38 | 0.21 | 0.43 | 30° | 1.13 | 0.49 | 1.01 | 0.66 | 0.54 | 0.19 |
  | 0.09–0.10 (edge of fit) | 0.44–0.49 | 0.27–0.33 | 0.45–0.46 | 22–14° | 1.2 | 0.55 | 1.1–1.2 | 0.6 | 0.56–0.58 | 0.23–0.27 |

- **What a real tube of a given size looks like.**
  - H = 2 m on a 1:20 reef: void about 2.0 m long by 0.8 m wide, tilted about 40°. The vertical opening under the lip is about 1 m and the lip averages about 0.25 m thick.
  - H = 3 m slab near the top of the fit: void about 3.6 × 1.6 m, nearly horizontal, with a gap of about 1.7 m and a lip about 0.7–0.8 m thick (jet area about 2.4–3 m² per metre of crest).
- **What X means in Mead & Black's formula.** It is only self-consistent if X is the run per unit rise (gradient 1:X):
  - 1:10 → L/W 1.47 (W/L 0.68), matching the low end of Blenkinsopp & Chaplin's 1:10 lab range (1.46–2.28).
  - 1:30 → 2.77, matching LH82's 2.76.
  - 1:40 → 3.42, the top of the field range.
  - With X as a fraction (e.g. 0.1), Y would fall below 1 and steeper would mean less round, contradicting "steeper orthogonal gradients → lower vortex ratios".
  - The orthogonal gradient is along the wave ray, so X_orth ≈ X_contour-normal / cos α for peel angle α. Robertson et al. say the formula combines the normal gradient and the peel angle, but the symbols were lost in extraction.
- **The solitary-wave fits cap roundness too low for reefs.** Periodic waves on reefs are rounder (W/L up to 0.67 in the lab reef, 0.59 in the field, about 0.70 in Mead & Black's range). Offshore wind at Surf Ranch gives about 0.5. A game that takes W/L from Pick & Feddersen (0.30–0.44) will draw elongated, "thin-looking" voids next to real reef barrels. For a heavy reef, W/L ≈ 0.5–0.65 with θ ≈ 15–30° is closer to the evidence.
- **The Reef's forereef slope is far outside every fit.** The 1:2.3 forereef (s = 0.43) gives ψ0 ≈ 0.49–0.65 and S0 ≈ 0.85–1.5. That is 5–6× beyond the fitted ψ0 < 0.1, in Grilli's surging regime, and steeper than the 12° limit above which no solitary wave breaks.
  - Extrapolating the linear A_O fit there gives about 3 H², which is nonsense.
  - At Teahupo'o the wave breaks as the reef rises from the ~10 m shelf. The slope that sets the overturn is that rise, not the forereef.
  - The game should compute ψ0 from the slope over about half a wavelength offshore of the break point (O'Dea's best predictor) and clamp ψ0 at 0.1 or less.
- **Void area and opening may be roughly right; the lip and the wall are what read wrong.** The game's measured median tube length (0.8–1.1 m) and 90th-percentile opening (0.7–1.2 m) at Hs 1.4 m match the table for ψ0 ≈ 0.03–0.06 if H_b ≈ 1.5–2 m. That is within real ranges, but at the gentle-beach end. Three likelier causes of "thin/small" are:
  1. Lip thickness. A_J should be about 0.1–0.3 H² at reef slopes, a lip 0.1–0.27 H thick.
  2. The missing vertical wall under the lip. The solver's face is 17°, whereas the real face is vertical at t_b and overhung after.
  3. Void tilt and roundness. A carve that uses only the *lower half* of the LH loop, possibly unrotated, loses the tilted, rounder back of the tube.
- **Offshore wind is a cheap, sourced "fatter barrel" knob.** It is worth about ×2 in A/H² and W/L 0.25 → 0.5 (Surf Ranch), and about −40% to +5% in jet area (DNS).

### Gaps
- I could not find a published *measured* cross-section of Teahupo'o, Pipeline, Shipstern Bluff or Cloudbreak barrels from photogrammetry, lidar or stereo. The only lidar barrels are Duck (beach and bar) and Surf Ranch (pool bar). Lip-thickness statements for heavy slabs are anecdotal ("half the wave height", "as thick as it is tall").
- I could not open Mead & Black (2001) directly (ResearchGate and JSTOR blocked), so neither the numeric boundaries of the five intensity classes nor the exact definition of X is verified. "Average surfed vortex ratio about 3" appeared only in a search snippet.
- No source directly measures jet *thickness* (Erinin et al. did not measure it). All thickness numbers above are inferred from jet area.
- Wave-period effects: Pick & Feddersen's solitary waves have no period. Robertson et al. found no significant period dependence. Blenkinsopp & Chaplin found A_O/H² rising with H0/h_c (opposite to the solitary-wave (H0/h0)^(-1/4) trend). The "long periods make thick lips" belief is not established quantitatively.

## Q3. The barrel's 3D shape along the peel: throat, pit, closing section, peel angles and speeds

### Takeaway
There is almost no quantitative science on how the barrel cross-section varies along the crest. The measurable pieces are:
- Peel angle α, the angle between the crest and the trail of whitewater. It is about 30° at the surfable minimum, 45–66° typical and about 70° as the practical upper limit.
- The kinematics: the break point moves along the crest at c/tan α, and a surfer staying at it must go c/sin α.
- How fast a void evolves after closure (about 0.5 s).

Together these imply that the open barrel stretches several metres along the crest and the closed, collapsing tube a few metres behind it.

### Cited Findings
- Peel angle is "the angle between the trail of the broken whitewater and the crest of the unbroken wave". It ranges from 0° to 90°. Low angles make fast waves and 0° is a closeout (Walker 1974; Hutt 1997; Hutt et al. 2001; Mead 2001b).
- Walker (1974) classified beginner, intermediate and expert limits by peel angle and wave height. Hutt et al. (2001) redid this on a 1–10 skill scale.
- The four governing surfing-wave parameters are H_b, α, breaking intensity and section length. Hutt recommends H1/10 rather than Hs for surfing statistics.
- Planar beaches with parallel contours close out. Surf breaks need features (ramps, wedges, ledges, focuses, ridges) that raise the peel angle into the surfable range.

— [Scarfe et al. 2003](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)

- A ridge component locally steepens the seabed gradient and "leads to a wave section with a steeper face and lower peel angles". The Ledge at Manu Bay (Raglan) is a fast, heavy section of this kind — [Scarfe et al. 2002, surveying paper](https://ref.coastalrestorationtrust.org.nz/site/assets/files/7962/scarfe_etal_transtasmansurveyorpaper2002.pdf)
- Peel angle limits: 30° is the "practical minimum" (Look Laboratory, U. Hawaii, 1974), most rideable waves fall at 45–66°, and at about 70° the wave "crumbles toward the beach instead of down the line". Break-point speed along the crest = c/tan α; required surfer speed = c/sin α. [secondary summary] — [Science of Surfing, "Peel angle"](https://www.scienceofsurfing.com/p/peel-angle)
- Surf Ranch geometry: the soliton propagates at 25.5° to the hydrofoil path and is highly oblique (≈ 65°) to the shoreline. Along-basin wave speed is 7.4 m/s against C = 6.7 m/s. The along-wave (transverse) speed is C_ỹ = 3.19 m/s — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- O'Dea et al. reconstructed voids at "the leading edge of the breaking crest" of finite-crested plungers, using 3–4 m along-crest windows. Voids evolve within about 0.5 s and 1–3 m of travel after closure — [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Section length S_L: a new section starts wherever H_b, α or breaking intensity changes. Moores (2001) measured surfer speeds and section lengths from video — [Scarfe et al. 2003](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)

### Inferences
- **Surf Ranch peel angle.** The along-basin speed 7.4 m/s = C/sin α gives α ≈ 65°, so the required surfer speed there is about 7.4 m/s.
- **Peel speeds.** For c = 6 m/s: α = 30° gives a peel rate of 10.4 m/s and a surfer speed of 12 m/s; α = 45° gives 6.0 and 8.5 m/s; α = 65° gives 2.8 and 6.6 m/s.
- **Along-crest barrel structure implied by the kinematics.**
  1. **Throat (open curl).** It runs from the point where the face goes vertical to the point where the lip lands. Its along-crest length is about the peel rate × (curl-plus-fall time). Taking about 0.6–1 s for H ≈ 2 m gives roughly 3–6 m at α = 45° and 6–10 m at α = 30°.
  2. **Pit.** This is the cross-section just before touchdown, the roundest and steepest (O'Dea).
  3. **Closed, collapsing void behind the landing point.** It extends about the peel rate × 0.5 s ≈ 1.5–5 m before it elongates (L/W up to 5) and breaks up.
  4. **Closing section.** A section where α falls toward 0 (e.g. over a ridge) makes the landing point outrun the surfer.
  
  A single 2D cross-section swept along the crest cannot show this "young to old" gradient. A tube that looks the same at every along-crest station will read as a trough rather than a barrel.

### Gaps
- No peer-reviewed quantitative measurement of along-crest barrel geometry (throat, pit, mouth diameter along the peel) was found. The terms are surfer vocabulary.
- The Hutt et al. (2001) skill table values were not retrievable: ResearchGate, BioOne (connection refused) and the patent PDFs are image-based. Walker (1974) Look Lab Report 30 is not online in text form.
- There is no measured relation between peel angle and void size or shape. Mead & Black's orthogonal-gradient idea implies one, but it is untested.

## Q4. The velocity field in a plunging crest, and what a depth-averaged model misses

### Takeaway
Surface particle speed at the crest reaches about 0.8–0.95 of crest speed at onset and passes 1 soon after. Jets reach about 1.2–1.5 × crest speed, or up to about 1.7 × the linear phase speed. Meanwhile, mass conservation limits the depth-averaged velocity under a crest of H/h ≈ 0.6–1 to only about 0.4–0.5 c. A depth-averaged solver therefore carries the crest water at roughly half its true speed. It also has no overhanging water, so it misses both the lip's mass (A_J ≈ 0.01–0.3 H²) and its forward momentum. Roller models add back a layer moving at c.

### Cited Findings
- B = U/C ≈ 0.85 is the onset threshold (0.85–0.88 in shallow water), and B reaches 1.0 shortly after. Linear c/C = 0.8–1.1 near onset. [model] — [Derakhti et al. 2020](https://arxiv.org/html/1911.06896v1)
- Measured ratios of horizontal crest velocity to phase speed:
  - Stansell & MacFarlane (2002), PIV on focused-wave plungers and spillers at onset: U/c = 0.81 for plunging and 0.95 for spilling, so U/c > 1 is "not a necessary criterion".
  - Kjeldsen (1984): U/c = 1.73 "upon breaking", with c from the zero-upcrossing period.
  - Chia et al.'s own tank data: the actual crest speed c1 is 1.00–1.24 × the Eulerian estimate. Lagrangian U1/c1 is 1.26–1.31 for their strongest breakers, against 1.27–1.48 from wave-probe processing.
  
  [meas-lab, deep water] — [Chia et al., J. Hydrodynamics (2017/2018)](https://strathprints.strath.ac.uk/64231/1/Chia_etal_JH_2018_Kinematics_of_breaking_waves.pdf)
- Erinin et al.: crest speed at jet formation 1.52 m/s vs linear c0 1.358 m/s (≈ 1.12 c0); jet-tip impact speed 1.90–2.01 m/s [meas-lab] — [Erinin et al. 2023](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35)
- Feddersen et al.: "Wave breaking occurs when Eulerian fluid velocity u within the wave exceeds the wave phase speed C (e.g. Derakhti et al. 2020; Varing et al. 2021)" — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- For linear shallow-water waves, |u_m|/c scales with H0/h0. Near breaking, vertical velocities become large and the surface slope infinite. To produce a jet, the near-crest velocity must accelerate, and larger accelerations give larger overturns (heuristic) — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- How Boussinesq surf models put the crest momentum back (FUNWAVE-TVD docs):
  - Svendsen's (1984) roller area A = 0.9 H².
  - Roller thickness δ = rH with r = 0.45 tan θ, capped at 0.1638, i.e. a 20° breaking angle.
  - Momentum flux M = u0²d + (c² − u0²)δ, with the roller moving at the wave celerity. Schäffer et al. (1993) use c = 1.3√(gh), FUNWAVE uses √(gd).
  - Breaking switches on when η_t > C_brk1√(gh) (e.g. 0.45) and off below C_brk2√(gh) (0.35).
  
  — [FUNWAVE-TVD documentation: wave breaking, roller and undertow](https://fengyanshi.github.io/build/html/wavebreaking.html)

### Inferences
- **The depth-averaged model carries crest water at about half speed.** Across a bore of height H in depth h, mass conservation gives a depth-averaged U ≈ c·H/(h + H): 0.38 c at H/h = 0.6, 0.44 c at 0.8 and 0.50 c at 1.0. At onset the surface water moves at about 0.85–1.0 c, so it is about 1.9–2.3× faster than the depth-averaged U at H/h = 0.8. In the jet, at about 1.2–1.5 c, it is about 3× faster.
  - This is a standard continuity result, not taken from the sources above. It applies to a bore-like front and is only indicative for a pre-breaking crest.
  - The Madsen–Sørensen Boussinesq profile adds only a weak quadratic vertical correction, so it cannot recover a thin surface layer moving at about c.
- **What goes missing.** The solver loses the lip's water (A_J ≈ 0.01–0.3 H² per metre of crest, Q5) and its forward momentum ρ·A_J·u_jet. It has no overhang, so it cannot store the jet's potential energy, which scales with A_J·H_I². That energy is exactly the quantity tied to impact-zone turbulence and splash.
- **The game's face angle matches the roller convention.** Its 17° face is close to the 20° breaking-angle cap used in roller models. The shallow face is what the depth-averaged breaking parameterisation is *designed* to produce, not a bug. The barrel has to be added geometrically, and its lip needs its own mass and momentum.
- **Speed of the lip parcels.** A lip parcel launched at about 1.1–1.3 × crest speed horizontally is consistent with every measured source. The 1.6–1.73 end is only reached relative to the linear phase speed, or for the fastest particles inside the jet.

### Gaps
- There are no field measurements of the vertical velocity profile under a *plunging* surf-zone crest at onset. Search snippets pointed to Govender et al. (2002, JGR) and a 2022 Coastal Engineering roller study reporting "1.1 c at onset, up to 1.5 c", but both pages were blocked (403), so they are unverified.
- Barthelemy et al. (2018), the original B_th = 0.855 ± 0.05, was seen only in search snippets. Derakhti et al., which I opened, confirm B ≈ 0.85.

## Q5. How much water is in the lip, relative to the wave

### Takeaway
The best measured-to-modelled range for jet area at touchdown is A_J/H² ≈ 0.012 (gentle slope) to 0.27 (steep slope) in solitary-wave FNPF. The DNS of the Surf Ranch case gives 0.13–0.23, and the FNPF scaling for Surf Ranch gives 0.19. This is roughly a third to two-thirds of the void area, a few percent of the crest's excess volume, and several times smaller than the post-breaking roller (about 0.9 H²). A game lip can be checked against A_J/H² and a mean thickness of about A_J/L_O ≈ 0.05 H (gentle) to 0.25 H (steep).

### Cited Findings
- **Jet area (FNPF).** A_J/H_I² spans 0.012–0.266, fitted as A_J/H_I² = 37.072ψ0² − 0.587ψ0 + 0.020. It rises faster than void area, so A_J/A_O rises with ψ0. The jet is defined as the upper region where the free surface is multi-valued. Jet potential energy scales linearly with A_J·H_I² (r = 0.99) [model] — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- **Jet area (DNS, Surf Ranch case).** A_J/H_b² = 0.219 with no wind, 0.132 with onshore wind (Re* = 2400) and 0.229–0.219 with offshore wind. "Overturn jet area has not been previously examined experimentally or numerically" (before 2024). [model] — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **Lab jet area growth.** The area under the plunging jet at impact grew 86% from the weak to the strong lab breaker [meas-lab] — [Erinin et al. 2023](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35)
- **Jet metrics recommended but not yet measured in the field.** Robertson et al. suggest jet thickness/H_b and jet area/H_b² (after Grilli et al. 1997) as better intensity measures than the vortex ratio — [Robertson et al. 2014](https://pdfs.semanticscholar.org/5b55/f488369a29862dd720e5b2079159ecb940cb.pdf)
- **Post-breaking roller for scale.** Svendsen (1984) roller area ≈ 0.9 H², riding at c — [FUNWAVE-TVD docs](https://fengyanshi.github.io/build/html/wavebreaking.html)
- **Anecdotal heavy-slab lips.** At Teahupo'o the lip is "half the wave height" ([Shand, The Conversation](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301)) and "often as thick as it is tall" ([Wikipedia](https://en.wikipedia.org/wiki/Teahupo%CA%BBo)).

### Inferences
- **Share of the crest that goes over.**
  - A solitary wave at H/h ≈ 0.78 has an excess volume per unit crest of 4h²·√(H/3h) ≈ 3.35 H², so the jet is about 0.4–8% of it.
  - For a 10 s periodic wave in about 2.5 m depth (λ ≈ 50 m) with H = 2 m, the crest volume above mean level is about 15 m² per metre of crest (sinusoid estimate). The jet (0.5–1.1 m² for A_J/H² = 0.12–0.27) is about 3–7% of it.
  - So the lip is a thin fraction of the crest by volume, but a large fraction of H² in cross-section.
- **Checks a game lip should pass per metre of crest.** Evaluate the Q2 fits at the local ψ0 (clamped at 0.1 or less):
  - Mass ≈ ρ·A_J: about 120–270 kg per m of crest per m² of H² at reef slopes, and about 1 t per m of crest for H = 2 m at ψ0 ≈ 0.09.
  - Mean lip thickness ≈ A_J/L_O: about 0.04–0.07 H on 1:50–1:30 beaches, about 0.12 H at 1:20 and about 0.19–0.27 H at 1:15 and steeper.
  - A_J/A_O rising from about 0.3 to about 0.7 with ψ0.
- **Diagnosing a thin sheet.** If the game's lip parcels carry only a thin sheet, for example a fixed-thickness strip or only the water above some crest threshold, the barrel will look like a thin curtain even with a correctly sized void. The heavy-slab "fat lip" look comes mainly from A_J's quadratic growth with slope, not from a larger void.
- **The roller is a different, later layer.** The roller (0.9 H²) is several times the jet area. It forms after touchdown from the jet, the splash-ups and entrained water. Its mass should not be put into the flying lip.

### Gaps
- No direct laboratory or field measurement of jet cross-sectional area or thickness at touchdown for periodic surf-zone plungers was found. Grilli et al. (1997), Blenkinsopp & Chaplin (2008) and Chanson & Lee (1997) were not accessible.
- No field measurement of lip mass or thickness at heavy slabs exists in what I could find.
- The share of the crest that goes over, for random or periodic waves, is my estimate from standard wave-volume formulas. No source reports it directly.
