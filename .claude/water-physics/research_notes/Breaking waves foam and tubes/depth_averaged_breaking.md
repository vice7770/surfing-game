# Depth-averaged (Boussinesq / NSWE) wave breaking: face shape, onset, rollers, and crest reconstruction

Tag legend used below: **[M-field]** measured in the field; **[M-lab]** measured in a laboratory; **[Mod]** result of a numerical model; **[Par]** a closure setting or parameter chosen by modellers (not a measurement); **[Emp]** empirical fit; **[Gfx]** computer-graphics method. The game's own numbers (1 m cells, 1/60 s step, Madsen–Sørensen B = 1/15, Kennedy dη/dt eddy viscosity, NSWE switch at 0.8, ~17° solver face) come from the assignment brief, not from sources. "Abstract-level" marks a source I could only see as an abstract or search summary, not as full text.

## 1. Face steepness: what front slopes do depth-averaged breaking models produce, how do they compare with measurements, and what sets them (grid, limiter, eddy viscosity, NSWE switch)?

### Takeaway
Depth-averaged breaking closures do not predict a face angle from physics. They impose or regulate it:
- **Roller and slope criteria** start breaking at a front slope of about 20–30° and then let the face relax.
- **Kennedy's dη/dt eddy viscosity** works in effect as a front-slope clamp. With the standard constants it fully damps any face steeper than about 13–17°, which matches the game's ~17° face.
- **A pure NSWE shock** has a slope set by the grid instead.

Measured inner-surf-zone roller faces are 16–25° in the field, so a ~17° face is realistic for a broken bore. It is nothing like the vertical-to-overhanging face of a plunging crest, which no height field can represent.

### Cited Findings
**Measurements**
- [M-field] LiDAR measurements of 38 broken waves in the inner surf zone at Saltburn, UK (offshore Hs ≈ 1 m, Tp ≈ 10–11 s):
  - The roller angles were "2 to 6 times greater than the constant value of 5.7° (tan θ ≈ 0.1)" used in older roller energy models, i.e. about 11–34°.
  - On one tracked wave the roller angle fell from 25° to 18° in the first 8 m after breaking, then held at 16–22° over roughly 30 m.
  - Where the beach steepened, the angle then dropped by about another 10°. High roller angles coincided with faster height decay, and tan θ trended linearly with H.
  - The authors say these angles are consistent with the values used in Boussinesq-type models (Schäffer et al. 1993; Cienfuegos et al. 2010; Michallet et al. 2011).
  - — [Martins, Blenkinsopp, Deigaard & Power 2018, JGR Oceans (accepted manuscript)](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [M-field] In the same dataset, Lr·tan θ ≈ H (r² = 0.89, RMSE 0.06 m, scatter index 0.13). In the inner surf zone the sloping roller face spans the whole wave height. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)

**High-fidelity models**
- [Mod] With both a BEM potential-flow model and an LES/VOF model, solitary waves breaking on slopes reached the breaking parameter B = 0.85 "close to a time at which a vertical tangent appears on the crest front face". B then passed 1 shortly after. So at a real spilling or plunging onset the crest face goes locally vertical. — [Derakhti, Kirby, Banner, Grilli & Thomson 2020 (arXiv version)](https://arxiv.org/pdf/1911.06896)
- [Mod] A fully nonlinear potential-flow (FNPF) study ran 30 cases with slopes 1/100–1/10 and H0/h0 = 0.2–0.6. Front-face steepening during shoaling is faster on steeper slopes and for smaller H0/h0. Reported example front-face slopes:
  - min ∂η/∂x = −0.712 (≈35°) for s = 1/30, H0/h0 = 0.6.
  - −0.285 (≈16°) for s = 1/10, H0/h0 = 0.2.
  - I could not identify from the summary which instant these values refer to.
  - — [Pick & Feddersen 2026, JFM, "Scaling the shape of shoaling and overturning solitary waves"](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/scaling-the-shape-of-shoaling-and-overturning-solitary-waves/D43EDB6346C8975E77258A291CFCB4EF)

**What the models impose**
- [Par] **SWASH:** breaking is flagged where ∂ζ/∂t > α√(gh). α = 0.6 is advised: "This corresponds to a local front slope of 25°." A persistence threshold β = 0.3 (β < α) keeps neighbouring points breaking. The manual says the flag is unnecessary with "10 or so" vertical layers, because the front's phase speed is then resolved. — [SWASH user manual](https://swash.sourceforge.io/download/zip/swashuse.pdf)
- [Par] **Serre–Green–Naghdi model with an NSWE switch:** breaking starts when the maximum front slope Φ reaches Φi = 30°, the optimum Cienfuegos et al. (2010) found for their S–GN model. This slope criterion follows Schäffer et al. (1993); Lynett (2006) found it the least sensitive breaking threshold. — [Tissier, Bonneton, Marche, Chazel & Lannes 2012, Coastal Eng. 67](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Par] **Common hybrid detection:**
  - Slope criterion: ‖∇η‖ ≥ tan φc, with φc ∈ [15°, 30°] "depending on the flow configuration".
  - Surface-variation criterion: |ηt| ≥ γ√(gH), with γ ∈ [0.3, 0.65] depending on the breaker type.
  - — [Kazolea & Ricchiuto 2018, Ocean Modelling 123](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)
- [Par] **FUNWAVE roller option:** roller thickness ratio r = 0.45 tan θ, capped at r = 0.1638 by a 20° maximum breaking angle; local thickness δ = r(η* − η̄). — [FUNWAVE documentation, "Wave breaking, roller and undertow"](https://fengyanshi.github.io/build/html/wavebreaking.html)
- [Par] **Kennedy et al. (2000) eddy viscosity, as restated in an FNPF adaptation:**
  - B = 0 for ∂tη ≤ ∂tη*; B = ∂tη/∂tη* − 1 for ∂tη* < ∂tη < 2∂tη*; B = 1 for ∂tη ≥ 2∂tη*.
  - The threshold ∂tη* falls linearly from γI√(gh) to γF√(gh) over T* = 5√(h/g), "as suggested by Kennedy et al. (2000)".
  - γI and γF are calibration parameters that depend on bathymetry and breaker type. That study used γI = 0.3–0.6 and γF = 0.1–0.3.
  - The authors state that the simulated energy loss "suppresses overturning of the free surface allowing the wave form (and simulation) to remain stable".
  - — [Papoutsellis, Yates, Simon & Benoit 2019 (arXiv)](https://arxiv.org/pdf/1910.08982)
- [Par] **Kennedy constants as used in FUNWAVE:** γI = 0.65 and γF = 0.15, with mixing-length coefficient δb = 1.2. FUNWAVE-TVD sets B = 1 as soon as breaking starts instead of Kennedy's smooth ramp. Choi et al. (2018) retuned the thresholds to 0.45 and 0.35. — [FUNWAVE documentation](https://fengyanshi.github.io/build/html/wavebreaking.html)

**Grid, limiter and switch effects**
- [Mod] **Hybrid shocks are grid-dependent.** "It is well-known that once the waves are broken and represented as shocks, the front steepness depends on the spatial resolution δx."
  - On the Cox (1995) regular-wave test (H/h0 = 0.29) with δx = 0.04 m, the broken fronts were "a bit too steep".
  - The maximum crest before breaking grew as δx shrank, because coarser grids add numerical dissipation.
  - The modelled front asymmetry jumped at the switch to NSWE and then stayed nearly constant, while the measured asymmetry kept increasing.
  - — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Mod] **Hybrid closures are mesh-sensitive.** With the hybrid (NSWE-switch) closure, "numerical dissipation plays a key role, and unfortunately is sensitive to the size of the mesh".
  - Instabilities start at the Boussinesq/NSWE interface, at mesh sizes that vary from case to case.
  - In a solitary-wave test (A/h = 0.28, meshes Δx = 0.01, 0.005 and 0.001 m), an interface oscillation blew up "almost instantaneous[ly] on the finest mesh". This happened even with first-order upwinding at the interface.
  - With a turbulent-kinetic-energy eddy-viscosity closure, numerical dissipation was negligible and mesh sensitivity low.
  - — [Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)
- [Mod] **Celeris, the game's reference code**, uses the Kurganov–Petrova (KP07) central-upwind finite-volume scheme with a "generalized minmod limiter". The original release had no explicit breaking model: "the numerical dissipation of the scheme caused primarily by using the minmod limiter imitates physical dissipation introduced by wave breaking". — [Tavakkol & Lynett 2017, Celeris (arXiv)](https://arxiv.org/pdf/1611.05984)
- [Mod] **FUNWAVE-TVD** uses a MUSCL reconstruction "accurate up to the fourth-order", with a minmod limiter and (κ1, κ2) = (1/3, 1). Breaking is modelled by switching to NSWE. — [Shi et al., FUNWAVE-TVD manual v2.0](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.0.pdf)
- [Mod] **Madsen–Sørensen hybrid (β = 1/15), the game's equations:**
  - Limiters: on a run-up test, "the smoothness limiter improves the preservation of the wave peak" compared with the Superbee and monotonized-central limiters.
  - Under-shoaling: this model "under-shoals compared both to fully non-linear models and to other weakly non-linear models", so its pre-breaking waves are "shorter and less steep".
  - — [Bacigaluppi, Ricchiuto & Bonneton 2019 (arXiv; Water Waves)](https://arxiv.org/pdf/1902.03021)

### Inferences
- **Converting the dη/dt threshold to a slope.** For a progressive front, ∂tη ≈ c·|∂xη|, so the front slope satisfies tan φ ≈ γ√(gh)/c.
  - SWASH's own equivalence (α = 0.6 ↔ 25°) implies c ≈ 1.3√(gh).
  - With c between 1.0 and 1.3√(gh), Kennedy's onset γI = 0.65 corresponds to a 27–33° face, γI = 0.35 to 15–19°, and the final γF = 0.15 to 6.6–8.5°.
  - The eddy viscosity is fully on (B = 1) at 2γF = 0.30, i.e. a face of about 13–17°.
- **Why the game's face sits near 17°.** Once T* has elapsed (about 1.6–3.2 s for h = 1–4 m), a Kennedy closure applies full eddy viscosity to any face steeper than about 13–17°. That is essentially the game's ~17°. So the face angle is a clamp chosen by the closure constants, not a resolution limit.
- **Grid check.** A 17° face is H/tan 17° ≈ 3.3H wide: 3–13 cells at 1 m for H = 1–4 m. A captured shock in second-order TVD schemes normally spans only about 2–3 cells (textbook behaviour, not sourced here). So for H ≥ 2 m the closure and dispersion, not the grid, set the face; for H ≈ 1 m the two are comparable.
- **Where 17° is right and where it is wrong.** The solver face matches measured inner-surf-zone bores (16–22°). It is wrong only where the real wave plunges. The fix is therefore a separate lip/tube layer, not a steeper solver face. Pushing the solver steeper (lower δb, higher γF, earlier NSWE) invites the interface oscillations and mesh sensitivity reported for hybrid closures.
- **Under-shoaling delays triggers.** Madsen–Sørensen under-shoaling means pre-break crests are lower and faces gentler than in reality. That also delays any slope- or amplitude-based trigger.

### Gaps
- **Roller constants in the original papers.** Only the 20° maximum breaking angle was confirmed on an opened page (FUNWAVE documentation). The other Schäffer, Madsen & Deigaard (1993) and Madsen, Sørensen & Schäffer (1997) constants (terminal angle φ0 ≈ 10°, relaxation half-time t1/2 = T/5, roller shape factor fδ = 1.5) are widely quoted, but the papers are paywalled; not verified.
- **Measured lab front slopes.** Ting & Kirby (1994–1996; 1:35 slope, laser-Doppler anemometer plus capacitance gauges) and Kimmoun & Branger (2007; 1/15 slope, PIV in 14 windows) could not be opened (403). No measured front-slope values were extracted from them. Leads: [Ting & Kirby 1995 abstract](https://ui.adsabs.harvard.edu/abs/1995CoasE..24..177T/abstract), [Kimmoun & Branger 2007 abstract](https://ui.adsabs.harvard.edu/abs/2007JFM...588..353K/abstract).
- **Pick & Feddersen slopes.** The reference instant of their example front slopes is unknown.
- **Game code not checked.** How the game's closure constants actually compare with the conversion above was not checked against its code.

## 2. Onset criteria and breaker type: which are the most accurate and cheap, including on reefs and ledges?

### Takeaway
**Onset.** The best-supported physical onset criterion is kinematic, B = U_crest/C_crest:
- The precursor threshold is 0.85–0.88, and B reaches 1 at overturning. It has been validated with BEM and LES/VOF models from deep water to shallow slopes and bars.
- It has been implemented in a Madsen–Sørensen hybrid model, where it gave the best onset position.
- The cost is estimating crest speed. The threshold also had to be lowered to about 0.75 to offset the model's under-shoaling.

The cheap local criteria are serviceable but case-dependent:
- A/h (Tonelli–Petti) fires early.
- Front slope is the least parameter-sensitive.
- dη/dt is fully local but misses stationary hydraulic jumps.

Bore Froude numbers give a physical rule for when breaking stops.

**Breaker type.** It is controlled by slope-based parameters: Iribarren, Grilli's S0, and Pick & Feddersen's s/(H0/h0)^(1/4). On reefs, crest submergence also matters.

### Cited Findings
**Onset criteria**
- [Mod] **The B criterion (Derakhti et al. 2020).**
  - Definition: B is the normalized energy flux, which on the surface reduces to the crest fluid velocity U (in the direction of travel) divided by the crest speed C.
  - Barthelemy et al. (2018) found B ≈ 0.85 a robust precursor for deep and intermediate-depth wave packets. In shallow water the threshold ranged from 0.85 to 0.88.
  - Every breaking crest passed 0.85 and then 1; non-breaking crests stayed below 0.85.
  - The lead time from B = 0.85 to B = 1 shrinks as the Iribarren number ξ0 grows.
  - Surging waves on a 1/5 slope (11.31°, ξ0 = 2.26 and 2.61) went unstable at the toe and never reached the threshold.
  - The authors note that a precursor such as 0.85 is useful for "models that cannot directly resolve breaking and fail before waves reach B = 1".
  - The linearized estimate B = F (wave Froude number) is only a lower bound; steep crests "greatly exceed" it, partly because linear theory underpredicts crest velocity.
  - — [Derakhti et al. 2020 (arXiv)](https://arxiv.org/pdf/1911.06896); published as [JGR Oceans 125, e2019JC015886](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2019JC015886)
- [Mod] **Three detectors compared in a Madsen–Sørensen (β = 1/15) hybrid model (Bacigaluppi et al.).**
  - (1) Tonelli–Petti local nonlinearity E = A/h > 0.8. It rests on a transition Froude number ≈ 1.6 and on stable solitary waves being limited to about 0.78; breaking ends when E falls back to 0.55–0.25.
  - (2) Kazolea et al.'s combined slope and dη/dt criterion (γ = 0.6, φ = 30°).
  - (3) A convective criterion comparing the crest's surface-particle velocity with the wave celerity, at Fr_s,cr = 1, or 0.75 "set empirically, to account for the under-shoaling".
  - Result for (1): "a very early onset", a flattened crest and "very thin rollers". It also flagged the whole region shoreward of the still-water line (h < 0) as breaking, which inflated setup.
  - Result for (3): with Fr = 1 it gave the best onset position and post-break height decay in the Hansen & Svendsen tests, and was comparable to (2).
  - Estimating the celerity is described as the key difficulty.
  - — [Bacigaluppi et al. 2019](https://arxiv.org/pdf/1902.03021)
- [Par] **Tonelli–Petti as implemented in FUNWAVE-TVD:** "the ratio of wave height to total water depth is chosen as the criterion to switch from Boussinesq to NSWE, with threshold value set to 0.8". This wording conflicts with the amplitude over still depth (A/h) definition implemented by Bacigaluppi et al. — [FUNWAVE-TVD manual v2.0](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.0.pdf)
- [Par] + [M-lab] **Start and stop rules in the S–GN hybrid (Tissier et al. 2012).**
  - Onset at a 30° front slope.
  - Stop when the bore Froude number Fr1 = (c_b − u1)/√(g h1), rewritten in terms of the depth ratio h2/h1, falls below Frc = 1.3. Lab bores stop breaking at Fr 1.2–1.3 (Chanson 2008; Favre 1935; Treske 1994).
  - Front finding: fronts are located as peaks of the local NSWE energy dissipation. A front counts as "broken" when its dissipation, normalised by the bore value D_b = (ρg/4)·[g(h1 + h2)/(2h1h2)]^½·(h2 − h1)³, is at least 0.5.
  - One parameter set (Φi = 30°, Frc = 1.3) served all their test cases.
  - — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Par] **Region handling (Kazolea & Ricchiuto 2018).** Flagged cells are grouped into breaking regions. Each region is extended to the roller length or switched off according to Fr² = Hmax(Hmax + Hmin)/(2Hmin²). The slope criterion catches stationary or slow hydraulic jumps that dη/dt misses. — [Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)
- [Mod] **Parameters are case-dependent.** An analysis-of-variance sensitivity study on solitary waves over slopes found that "both the triggering conditions and the breaking models themselves use case depended/ad/hoc parameters". — [Joshi, Kazolea & Ricchiuto 2022, Water Waves](https://link.springer.com/article/10.1007/s42286-022-00068-2)
- [Par] + [M-lab] (abstract-level) **Relative trough Froude number.** The critical value is 1.36 in theory, from the transition between undular and fully developed hydraulic jumps; it was 1.47 when calibrated in a Boussinesq model. — [Okamoto & Basco 2006, Coastal Eng. 53](https://www.sciencedirect.com/science/article/abs/pii/S0378383906000342)
- [Mod] (abstract-level) **Convective criterion for undular bores.** A convective breaking criterion inside a Boussinesq model of undular bores was compared with Favre's (1935) tank experiments. — [Bjørkavåg & Kalisch 2011, Phys. Lett. A 375](https://www.sciencedirect.com/science/article/abs/pii/S0375960111002714); [UiB summary page](https://www.uib.no/en/rg/nonlinear-waves/58366/wave-breaking-boussinesq-models-undular-bores)

**Breaker type**
- [Mod] **Grilli et al. (1997), from BEM runs on slopes 1/100 to 1/8:**
  - No breaking on slopes steeper than 12°.
  - The largest non-breaking solitary wave is Hw_m = 16.9·d1/s² (slope 1/s).
  - Breaker type follows ζ0 = 1.521·m/√(Hw/d1) (m = slope): spilling below 0.025, plunging 0.025–0.30, surging 0.30–0.37.
  - — as reported in [Derakhti et al. 2020](https://arxiv.org/pdf/1911.06896)
- [Emp] **Surf-similarity and breaker index:**
  - ξ = tan β/√(H0/L0): below about 0.4 favours spilling, above about 0.4 plunging.
  - Battjes (1974): γb = 1.06 + 0.14 ln ξb.
  - Direct measurements give an "approx. 20% larger breaker index for plunging waves compared to spilling waves".
  - — [Coastal Wiki, Breaker index](https://www.coastalwiki.org/wiki/Breaker_index)
- [Mod] **Slope scaling of overturns (Pick & Feddersen 2026).**
  - s/(H0/h0)^(1/4) collapses breaking and overturning behaviour, and the breaker depth index scales with it.
  - Gentler slopes give "smaller, more inclined overturns with thinner jets".
  - Steeper slopes give "larger, more horizontally inclined overturns with thicker jets".
  - — [Pick & Feddersen 2026](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/scaling-the-shape-of-shoaling-and-overturning-solitary-waves/D43EDB6346C8975E77258A291CFCB4EF)

**Reefs and surf breaks**
- [M-lab] (abstract-level) **Crest submergence.** Flume tests on a submerged reef with a 1:10 offshore face showed that the relative depth over the reef crest, hc/H0, is the dominant factor. Less submergence gives a "considerable increase" in breaking intensity, measured by the air cavity under the plunging jet, along with less transmission and reflection. — [Blenkinsopp & Chaplin 2008, Coastal Eng. 55, 967–974](https://www.sciencedirect.com/science/article/abs/pii/S0378383908000604)
- [Emp] from surf photos, as summarised in a 2003 review — **Mead & Black (2001) vortex ratio.**
  - Barrel ("vortex") shapes of plunging waves at 28 "world-class" breaks were fitted with a cubic curve. The ratio of the vortex's height to its width is the vortex ratio.
  - Fit against the orthogonal seabed gradient X: Y = 0.065X + 0.821 (R² = 0.71). A low ratio means extreme plunging.
  - Intensity classes run from medium to extreme. The shallower gradient matters more than the deep one, and offshore wind raises intensity.
  - — [Scarfe, Elwany, Mead & Black 2003, "The Science of Surfing Waves and Surfing Breaks – A Review"](https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf)
- [M-field] (abstract-level) **Field onset data.** More than 1,600 breaking waves were observed at the Duck, NC research facility with LIDAR plus infrared cameras. Critical γ, steepness and phase speed were evaluated for onset and breaker type. — [Carini, Chickadel & Jessup 2021, Part 2](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2020JC016935) (full text returned 403)

### Inferences
- **Cheapest physics upgrade: a crest-local B = u_s/C.**
  - Take u_s from the Boussinesq quadratic velocity profile (see section 4) and C from tracking the crest over a few steps.
  - Treat B ≳ 0.75–0.85 as "lip forming"; the lower end offsets Madsen–Sørensen under-shoaling. Treat B ≥ 1 as "overturn now".
  - The existing Kennedy dη/dt flag can keep controlling dissipation only.
- **H/h versus A/h.** If the game tests crest-to-trough H/h ≥ 0.8 rather than local η/h or A/h, it switches to NSWE earlier than Tonelli–Petti's A/h (A < H). That compounds the early-onset, flattened-crest behaviour already reported for this criterion.
- **Reefs need more than one number.** Iribarren alone ignores reef submergence and ledge shape. Choose lip thickness and tube size from:
  - the local orthogonal slope (Mead & Black; Pick & Feddersen);
  - the relative depth over the ledge (Blenkinsopp & Chaplin);
  - B, for timing.
- **A physical stop rule.** Bore Froude number below about 1.3 means breaking ends. This fits reforming waves over channels or troughs.

### Gaps
- The classic Battjes (1974) breaker-type thresholds (ξ0 = 0.5 and 3.3; ξb = 0.4 and 2.0) and Galvin (1968) were not verified from an opened page. Only the "~0.4" divide was.
- No source was found that benchmarks onset timing or position error for Kennedy dη/dt versus H/h versus slope versus B under field conditions. The comparisons found are lab-scale and case-dependent.
- Robertson, Hall, Zytner & Nistor (2013) "Breaking waves: review of characteristic relationships" and Gourlay's reef work were not opened.
- **Mead & Black ambiguities:**
  - Secondary sources describe the vortex ratio as height/width or as length/width.
  - The units of X (probably "1 in X") are not stated in the opened review.
  - A search listing mentioned 48 images of 23 breaks, whereas the review says 28 breaks.

## 3. Rollers and bores: roller area, length, toe and slope; how roller models represent them; bore shape and speed

### Takeaway
**Measured roller geometry:**
- Area about 0.9H² (Svendsen), although area formulas disagree by up to an order of magnitude in implied dissipation.
- Length about 2.9–3H.
- Face slope 16–25° in the field, decaying after breaking and spanning the full height (Lr·tan θ ≈ H).
- Mean density about 0.87ρ.
- Speed about 1.14–1.3 times the linear shallow-water speed.

**Model representation.** Boussinesq roller models treat the roller as a passive surface layer carried at the wave celerity. Its thickness is found geometrically from the surface slope, and it only adds an excess-momentum term.

**Bores** follow Froude-number regimes: undular below about 1.3, breaking above about 1.45–1.5.

### Cited Findings
**Roller area**
- [Emp] Svendsen (1984): A = 0.9H², from a reanalysis of Duncan (1981).
- [Emp] Duncan's hydrofoil relation: A ≈ 0.11 × (roller length)². Martins et al.'s table writes it with the horizontal roller length Lr, hence a cosine term.
- [Emp] An Engelund-based form (Deigaard et al. 1991): A = H³/(4h tan θ).
- [M-field] In the Martins field data, the Duncan and Svendsen areas imply dissipation at least twice that of a hydraulic jump of the same height. Matching the data needed a mean roller density of about 0.87ρ, within the range of observed void fractions.
- [M-field] Estimated dissipation varies by an order of magnitude depending on the area formula chosen.
- — all from [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)

**Roller length**
- [M-lab] Roller length lr ≈ 2.9H for well-established breakers (Haller & Catalán, from video), consistent with Duncan (1981). — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [M-field] Lr correlates with H (r² = 0.62) and is slightly above Duncan's Lr = 2.91H. Near the break point rollers are shorter, because they are not yet fully developed (Haller & Catalán 2009). — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [M-field] Peaks in roller length lag peaks in roller angle by 5–7 m. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)

**How roller models represent the roller**
- [Par] **MIKE 21 BW (implements the Schäffer/Madsen surface roller).**
  - "The roller is considered a passive bulk of water isolated from the rest of the wave motion, while being transported with the wave celerity."
  - Breaking starts when the local surface slope exceeds a set angle, and the roller geometry then follows "a geometric approach".
  - Excess-momentum terms of the form R_xx = δ/(1 − δ/d)·(c_x − P/d)² are added, and similarly for xy and yy, where δ is roller thickness and P the flux. This formula is reconstructed from the documentation's equation; the documentation cites Madsen et al. (1997a, p. 258ff).
  - Roller celerity c = f_v√(gh), with f_v = 1.0 just outside the surf zone and 1.3 (the default) inside. The switch between the two follows an exponential in time with the same time constant as the breaking-angle relaxation.
  - The documentation calls wave breaking in MIKE 21 BW a "surface roller concept for spilling breakers".
  - — [DHI MIKE 21 BW Scientific Documentation 2017](https://manuals.mikepoweredbydhi.help/2017/Coast_and_Sea/MIKE21BW_Sci_Doc.pdf)
- [Par] **FUNWAVE roller:** δ = r(η* − η̄) with r = 0.45 tan θ (at most 0.1638 at 20°), and c = √(gd), noted as different from Schäffer et al.'s 1.3√(gh). — [FUNWAVE documentation](https://fengyanshi.github.io/build/html/wavebreaking.html)

**Bore speed and regimes**
- [M-field] Wave celerity in the surf zone averages 1.14 times linear theory (Tissier et al. 2011).
- [M-field] Booij's nonlinear celerity, c² ≈ g(h + H/2), fits the Martins data (c²/g ≈ 2.49H − 0.06, in metres). It cuts the RMSE from 0.86 to 0.25 m/s compared with Duncan's H = 0.6c²/g, which "consistently overestimates" H.
- — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [M-lab] **Bore regimes (Chanson 2008, via Tissier et al.).**
  - Fr1 below about 1.3: undular, non-breaking.
  - 1.3 < Fr1 < 1.45–1.5: undular train with a broken first wave.
  - Fr1 above 1.45–1.5: purely breaking bore.
- [Mod] The S–GN hybrid reproduced these transitions on a flat bottom (h1 = 1 m, Fr 1.10–1.90). It did show "disturbances … behind the breaking fronts" of unclear physical relevance.
- [Mod] The NSWE switch zone must be longer than the roller (l_NSW = 2.5·lr); results depend only weakly on it as long as l_NSW > lr.
- — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Par] Bacigaluppi et al. likewise use l_NSW = 2.5·lr with lr = 2.9(H2 − H1). — [Bacigaluppi et al. 2019](https://arxiv.org/pdf/1902.03021)
- [Mod] **Hybrid shock dissipation.** A hybrid closure's dissipation is the parameter-free Rankine–Hugoniot shallow-water value. It reproduces large-scale energy decay "quite well" for several breaker types. — [Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)

**Vorticity-based rollers**
- [Mod] (abstract-level) Veeramony & Svendsen (2000) solve a vorticity transport equation with vorticity generated in the roller, using a hydraulic-jump analogy. This gives velocity profiles as well as height decay. — [Coastal Eng. abstract](https://www.sciencedirect.com/science/article/abs/pii/S0378383999000587)
- [Mod] Such vertical-structure roller models "require an additional vertical discretization, and have so far been applied only to simple configurations". — [Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)

### Inferences
- **A render-side roller can be read straight from the solver state:**
  - Toe about 2.9–3H ahead of the crest.
  - Surface slope near 25° at onset, relaxing to 16–22°, and dropping about 10° more on steep inner beaches.
  - Thickness from Schäffer's geometric construction: the part of the wave above a tangent at angle φ.
  - Opacity or density about 0.87ρ.
  - Speed from the tracked crest, or 1.14–1.3√(gh).
- **Coverage.** Because Lr·tan θ ≈ H in the inner surf zone, whitewater should cover the whole front of a fully broken bore. Near the break point the roller is shorter than 3H and grows.
- **When foam should stop.** Fronts with bore Froude number below about 1.3 should shed their foam roller and become undular.

### Gaps
- No measured roller-thickness profile along the wave was found; the Schäffer thickness construction is defined by the model.
- The spatial distribution of roller aeration was not gathered. Kimmoun & Branger (2007) and Govender et al. (2002) returned 403.

## 4. Reconstruction: can a curling or overhanging crest, a steeper face, or a realistic roller be recovered from the depth-averaged state (for rendering and rider contact) without a 3D solver?

### Takeaway
No validated physics method recovers an overturning crest from a depth-averaged state. The information is gone, and the closures are built to suppress overturning. What does exist falls into four groups:
1. **Kinematic diagnostics** from the Boussinesq quadratic velocity profile. Crest surface velocity versus crest speed says when, and how hard, a lip should throw.
2. **Graphics methods** that attach a Lagrangian sheet or a procedural profile to detected fronts: Thürey et al. 2007, Tessendorf's Jacobian fold test, and the Surf's Up profile library.
3. **Coupled local high-fidelity solvers**: Boussinesq–RANS, SWE plus a 3D grid, multi-layer non-hydrostatic, and fully nonlinear potential flow.
4. **Parametric overturn geometry** from high-fidelity studies: Pick & Feddersen's slope scaling, Mead & Black's vortex ratio, and New's ellipse (see Gaps).

### Cited Findings
**Kinematics from the depth-averaged state**
- [Par] **Quadratic profile.** Boussinesq horizontal velocity is quadratic in z. In the FUNWAVE-TVD (Wei et al. / Chen 2006) form, u(z) = u_α + (z_α − z)∇A + ½(z_α² − z²)∇B, with A = ∇·(h u_α) and B = ∇·u_α. So near a steep crest the surface velocity differs from the depth-mean velocity. — [FUNWAVE-TVD manual v2.0](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.0.pdf)
- [Mod] **Precedent in this model class.** Crest surface-velocity (convective) criteria have been implemented in depth-averaged models: in a Madsen–Sørensen hybrid ([Bacigaluppi et al. 2019](https://arxiv.org/pdf/1902.03021)) and in a Boussinesq model of undular bores ([Bjørkavåg & Kalisch 2011, abstract-level](https://www.sciencedirect.com/science/article/abs/pii/S0375960111002714)).
- [Mod] **How U is measured in high-fidelity models.** In BEM, U is the actual surface particle velocity at the crest. In LES/VOF it is the maximum near-surface horizontal velocity within ±3Δx of the crest. The small uncertainty (ΔB < 0.015) holds only where the crest curvature is resolved. — [Derakhti et al. 2020](https://arxiv.org/pdf/1911.06896)

**Graphics methods**
- [Gfx] **Thürey, Müller-Fischer, Schirm & Gross 2007, real-time breaking waves on a shallow-water sim.**
  - Detection: a front is flagged where |∇H| > t_H and ∇H·u < 0, with t_H = p_H·g·Δt/Δx and p_H = 1/4. Flagged points are grown by p_d = 2Δx into connected lines.
  - Tracking: lines advect at c = √(gH), are projected onto the steepest point of the front, and are resampled to keep spacing between Δx/2 and 2Δx.
  - Sheet: particle rows spawn every t_g, are moved to the crest, and get velocity u_s = (1 + p_v·g·(H(x) − H_i))·u_l. They then fly ballistically (Euler steps with gravity).
  - Impact: a particle lowers the SWE height at its node by p_m and its 8 neighbours by p_m/8. There is no explicit mass transfer, which "leads to noise".
  - Rendering: the sheet is drawn double-sided to give thickness, with foam textured by particle lifetime.
  - Peel: breaking starts at the midpoint of the line and spreads outward, because a real wave "does not break as a whole at once".
  - Performance: test scenes ran at 40–75 fps including rendering on a 2.13 GHz Core 2 Duo (single thread) with a GeForce 7950. Frame time split: SWE 39.6%, breaking waves and particles 21.7%, meshing 18.9%, rendering 19.8%.
  - Limitation: chaotic shallow-water fields delete wave lines before the breakers develop.
  - — [Thürey et al. 2007, Pacific Graphics](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- [Gfx] **Tessendorf "choppy" displacement.** Moving surface points horizontally, x → x + λD(x, t), sharpens crests. Folding is detected by J = Jxx·Jyy − Jxy·Jyx, with Jxx = 1 + λ∂Dx/∂x and so on. J < 0 marks overlap, which the notes suggest as a signal for "spray, foam and/or breaking waves". — [Tessendorf, "Simulating Ocean Water" course notes](https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf)
- [Gfx] **Surf's Up (Sony Pictures Imageworks).**
  - Fluid simulation was "quickly ruled out" because animators needed full predictability and it was too processor-intensive.
  - The wave was built from "Predefined 2-D wave profiles" interpolated along the crest and in decoupled time, using spline interpolation.
  - Controls included "lip up/down, forward/back, trough depth, shoulder size, tube depth, tube length".
  - Whitewater came from a "crash curve" along the lip with interpolated "spill vectors", and a "wave rider" constraint kept boards on the surface.
  - — [Bredow et al. 2007, "Making Waves for Surf's Up"](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)

**Coupled local solvers**
- [Gfx] **SWE with a local 3D region (Chentanez, Müller & Kim 2014).** A local 3D Eulerian grid plus position-based-fluid particles is embedded in a shallow-water height field, with coupling "such that waves travel naturally across the border". A whale breach ran at 30 fps on a GTX 780 Ti with a 64³ 3D grid, a 512² SWE grid and about 112k particles. — [Chentanez, Müller & Kim 2014 (SCA; TVCG 2015)](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf)
- [Mod] (abstract-level) **Boussinesq plus RANS (Sitanggang & Lynett 2010).** A Boussinesq model covers the non-breaking zone and a RANS model the breaking zone, two-way coupled through a shared interface. The Boussinesq side is 1D and the RANS side 2D; it was validated on solitary and regular waves. — [ResearchGate listing](https://www.researchgate.net/publication/227707967_Multi-scale_simulation_with_a_hybrid_Boussinesq-RANS_hydrodynamic_model)
- [Mod] **Multi-layer non-hydrostatic (SWASH).** With "10 or so" vertical layers the front's phase speed is accurate enough to switch off the breaking flag. With few layers, dissipation "may be underestimated" unless the flag is used. — [SWASH user manual](https://swash.sourceforge.io/download/zip/swashuse.pdf)
- [Mod] **Fully nonlinear potential flow.**
  - Breaking can be added to FNPF with Kennedy-type eddy viscosity or with Guignard & Grilli's (2001) dissipative surface pressure, sized to hydraulic-jump dissipation. — [Papoutsellis et al. 2019](https://arxiv.org/pdf/1910.08982)
  - Pick & Feddersen used a 2D FNPF model to follow overturns up to jet impact, conserving energy and volume to within 2×10⁻³. They give "empirical expressions for overturning parameters and wave steepening rates" as functions of slope and H0/h0. The jet's potential energy at impact is "a strong function of jet area". — [Pick & Feddersen 2026](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/scaling-the-shape-of-shoaling-and-overturning-solitary-waves/D43EDB6346C8975E77258A291CFCB4EF)
- [M-lab] **Repeatability of plunging breakers.** Ten repeats each of three focused-packet plunging breakers (deep water) were measured and ensemble-averaged. The transition from laminar to turbulent flow was "a highly repeatable process", which supports template-based lips. — [Erinin, Liu, Wang & Duncan 2022 (arXiv abstract)](https://arxiv.org/abs/2210.01925)

### Inferences
Candidate pipeline for the game, cheapest first. These are my synthesis and have not been tested.
1. **Diagnostics layer**, per crest segment.
   - Compute from the solver: surface velocity u_s at z = η from the quadratic profile (the Madsen–Sørensen depth-averaged form has the same quadratic structure); crest speed C from tracking; B = u_s/C; local H and h; orthogonal bed slope s; time since onset; and front Froude number from h2/h1.
   - B crossing about 0.75–0.85 starts the lip. B ≥ 1 starts the throw.
   - Scale lip-tip speed from u_s. Lab jet tips have been reported at about 1.7C (see Gaps).
2. **Geometry layer.**
   - Choose the lip/tube cross-section from a parametric family indexed by s/(H/h)^(1/4) (Pick & Feddersen), a vortex ratio from s (Mead & Black) and reef submergence hc/H (Blenkinsopp & Chaplin). The cavity can be taken as roughly elliptical (New's √3 ellipse, see Gaps).
   - Sweep this section along a Thürey-style tracked crest line, with a peel point that travels along the line.
   - This replaces independent ballistic parcels with one coherent sheet whose base stays attached to the solver crest.
3. **Mass consistency.** Thürey's noise shows the cost of skipping mass transfer. If the tube void is subtracted from the height field, return the volume as a thickened front (roller) or through a smoothed mass exchange.
4. **Face lean and foam.**
   - Displace the rendered solver surface horizontally Tessendorf-style, driven by (u_s − C)·(time since onset). This makes the face lean forward without any solver change.
   - J < 0 then marks where the rendered face folds, i.e. where lip and foam belong.
   - Rider contact can keep using the unfolded solver surface, or the parametric tube once inside it.
5. **Roller layer after impact**, using the section 3 numbers.
6. **Expensive options.**
   - A local vertical-plane (2DV) multi-layer non-hydrostatic or FNPF solve along wave rays at the one or two active peaks, seeded from the Boussinesq state. Precedents: Sitanggang & Lynett, Chentanez et al., SWASH's layers.
   - Or an offline FNPF library of overturn shapes keyed by (s, H/h). Pick & Feddersen's single scaling variable suggests such a library could be low-dimensional.

### Gaps
- No physics paper was found doing "Lagrangian surface reconstruction", "virtual overturning", shock-fitted bores or sub-grid front tracking for display from Boussinesq or NSWE fields. Searches returned only the graphics methods above.
- **New (1983) ellipse:** several secondary sources surfaced by search agree that the loop or cavity under a plunging crest is well approximated by an ellipse with axis ratio √3. They disagree on the tilt of the major axis (about π/4 in one, about 60° in another). The primary JFM paper was not opened. Possible lead: [arXiv 2103.05851](https://arxiv.org/pdf/2103.05851), which was too large to fetch.
- **Chang & Liu (1998):** PIV jet-tip velocity of 1.68 × the linear phase speed (lab, H = 14.5 cm, L = 121 cm, d = 20 cm). This was seen only in a search summary; the primary was not opened.
- Pick & Feddersen's regression coefficients were not obtained; the full paper is needed.
- NHWAVE (σ-layer non-hydrostatic) breaking and Grilli's 3D FNPF breaking were not examined.

## 5. How spilling and plunging breakers look in these models versus reality, and what an observer notices first as "fake"

### Takeaway
A depth-averaged solver can reproduce a spilling breaker's large-scale behaviour reasonably well, provided whitewater is layered on: a sawtooth bore with a ~15–25° face, with correct height decay and setup. It cannot produce a plunging breaker at all: no vertical face, no overhang, no cavity, no splash-up. The closures are designed to prevent overturning.

The likely first "fake" cues are:
- a smooth, uniformly sloped face where a lip should be;
- breaking switching on along a whole crest at once instead of starting at a point and peeling;
- no aerated white mass, or whitewater appearing without the face first steepening;
- numerical kinks or oscillations at the Boussinesq/NSWE interface;
- wrong timing: early onset with a flattened crest, made worse by Madsen–Sørensen under-shoaling.

### Cited Findings
- [Gfx] "The effect of a breaking wave can naturally not be captured within a 2D simulation." Also: "a wave does not break as a whole at once, but the breaking process starts at a given position. It then spreads outward along the wave front." — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- [Mod] Eddy-viscosity dissipation "suppresses overturning of the free surface". — [Papoutsellis et al. 2019](https://arxiv.org/pdf/1910.08982)
- [Mod] **Artefacts of hybrid switching:**
  - "spurious oscillations at the interface between the breaking and no-breaking region", which many have seen but which are "poorly documented". — [Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)
  - "some disturbances occur behind the breaking fronts", and the abrupt switch "generates some disturbances" of small amplitude. — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Mod] In the original FUNWAVE, the eddy-viscosity breaking model and the beach slots were "additional sources of noise". They needed periodic dissipative filters, applied more often where breaking was active. — [FUNWAVE-TVD manual v2.0](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.0.pdf)
- [Mod] **Shape errors:**
  - Front asymmetry jumps right after the switch to NSWE and then stays constant, whereas measured asymmetry grows steadily; fronts are "a bit too steep" at fine grid spacing. — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
  - The local A/h trigger gives early onset, a flattened peak and very thin rollers. — [Bacigaluppi et al. 2019](https://arxiv.org/pdf/1902.03021)
- [Mod] Breaking approximations "are generally less accurate in the first stages of breaking, in particular for plunging breakers". — [Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
- [Par] The surface roller concept in MIKE 21 BW is explicitly for spilling breakers. — [MIKE 21 BW Scientific Documentation](https://manuals.mikepoweredbydhi.help/2017/Coast_and_Sea/MIKE21BW_Sci_Doc.pdf)
- [M-field] Real inner-surf-zone roller faces are 16–25°, so for broken bores the solver slope is not the giveaway. — [Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
- [Mod] The original Celeris relied on minmod-limiter dissipation instead of a breaking model. — [Tavakkol & Lynett 2017](https://arxiv.org/pdf/1611.05984)
- [Mod] A search summary states that the WebGPU version adds a Kennedy et al. breaking model and an advection–diffusion model for foam created by breaking. This was not confirmed in the README fetched. — [Celeris-WebGPU repository](https://github.com/plynett/plynett.github.io)
- [Gfx] In production, Surf's Up chose procedural profiles for the curl over simulation, for predictability. — [Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)

### Inferences
- **The owner's complaint probably splits in two.**
  - Plunging spots (reef, point) need an explicit lip/tube layer, driven by kinematic onset (B) and slope-scaled geometry.
  - Beach and inner-surf bores mostly need a proper roller and foam layer: length about 3H, face 16–25°, toe advancing at about 1.14–1.3√(gh). They also need breaking to start at a point and peel along the crest.
- **Rider contact.** Keep the solver face as the contact surface for stability and render the lip/roller layer in front of it. When the rider enters the tube, contact should switch to the parametric tube geometry, not the height field.

### Gaps
- No perceptual or user study was found on which breaking cues observers judge as fake. The ordering above is inferred from the model-limitation literature, not a sourced ranking.
- Few quantitative comparisons of full breaking-wave profiles (rather than gauge time series) against lab or field data were found for Kennedy-type eddy-viscosity Boussinesq models.
- The breaking and foam implementation details of Celeris-WebGPU (thresholds, T*, δb) were not found in its README.
