# The whitewater roller as geometry: a build recipe for Breakline (drawn, collided, identical online)

Researched 2026-09-29 by the water-physics agent. Code was read on `origin/main` at 60b4727 (exported to the scratchpad; the main checkout lagged at 2cb54a2). This round builds on three earlier notes and does not repeat them except where a number is re-checked:
- `../Barrel profile library and Padang reef/roller_geometry.md`: the roller's physics.
- `../Barrel profile library and Padang reef/swept_surface_build.md`: the swept barrel's front line, loft, seam and contact.
- `../Breaking waves foam and tubes/whitewater_foam.md`: foam, spray and colour.

The sibling file `foam_lifecycle.md` (another agent) owns the ageing look of residual foam. This file covers the active roller only.

**Tags**
- [meas-field] field measurement; [meas-lab] lab measurement.
- [model] theory, parameterisation or numerical model.
- [prod] film or game production practice.
- [spec] a standard or language specification.
- [code] this repository, cited as `path:line` on origin/main 60b4727.
- [meas] measured here by me, with the method given; [calc] arithmetic on cited numbers.
- [inference] my own reasoning.

**Access**
- (full text): I read the paper or PDF.
- (figure): I read a rendered figure myself.
- (abstract) or (snippet): I read only the abstract, or only a search-engine summary.
- (decoded): the Surf's Up SIGGRAPH 2007 course notes set their body text in a letter-substitution font. I decoded it with a map recovered from known words (author names, section titles, "SIGGRAPH 2007"). Italic words use a second cipher and are paraphrased from context.

**Not opened:** the Claude Doc tab "Swept barrel build", because this agent has no docs tool. I used `swept_surface_build.md`, which that tab was built from.

## At a glance: the recipe in ten lines
1. **Reuse the barrel's front line.** The swept barrel already tracks the front as one line (Thürey et al. 2007; Padang spec item 13.2), with a persistent along-crest coordinate σ and a slice clock τ. Add roller attributes to its points; do not track a second line.
2. **Analyse a section per slice.** Each step, read the solver's surface along the slice normal. From it take the crest, steepest point, toe (20% of the maximum gradient, Martins et al. 2018), trough, H, h₁, h₂, the bore Froude number Fr₁ = √(r(r+1)/2) with r = h₂/h₁, the roller length L_r, the face angle θ and the speed c.
3. **Give each slice a roller state:** forming, active, shedding. Key it on:
   - Kennedy breaking at the front;
   - Fr₁: on at 1.45 or more, off below 1.3 (Tissier et al. 2012, after Chanson 2008);
   - the barrel's slice clock, for plunging slices;
   - the shoreline, where h₁ → 0.

   Hysteresis and smoothing along the crest stop it flickering.
4. **Cross-section.** An aerated lens from the crest to a rounded toe holds the field-calibrated water area of 0.33–0.36 H² (Martins 2018).
   - Void fraction inside: C = 0.9·ζᴺ (Shi et al. 2023b), with mean ᾱ = 0.13–0.4.
   - The top stands above the solver surface by the lens's air (ᾱ·t) plus turbulence. The underside lies (1 − ᾱ)·t below it.
5. **Draw it as the barrel loft's own post-collapse stage.** The loft profile becomes "solver section + lens": one mesh, one seam, one contact path.
6. **Turbulence** is a vertical displacement on the loft lattice (σ, ξ, step count), from pcg3d value noise.
   - Amplitude reaches d′max ≈ 0.13–0.4 h₁ (standard deviation) in the toe half of the roller (Wang, Leng & Chanson 2017).
   - Its scales grow from 0.5 h₁ at the toe to 3 h₁ at the back. The toe wanders at wavelengths of about 1 h₁ and 5–10 h₁.
   - The integer hash is the same on the CPU (float64) and the GPU (float32).
7. **Contact goes through the existing `SurfWater` sample.** Replace the P11 `ROLLER_SHARE` push with:
   - surfaceY = the loft top, triangle-exact;
   - voidFraction(y) = the lens profile;
   - flow(y) = c inside the roller, blending to the depth-averaged current below.

   No new force terms.
8. **Look (Rich).**
   - Coverage goes from a fingered toe to a solid crest band, with albedo about 0.4–0.55 at the crest.
   - Under gaps the water is bubbly green-cyan.
   - Residual foam stays the FoamField's.
   - Texture is advected by the lens's own flow, so the handover to residual foam is continuous.
9. **Spray** comes from the toe line (fingers and crowns, launched at 30–45°) and from the crest (wind), at rates set by dissipation. Spray and mist may differ between players.
10. **Cost** on an M1 under heavy load [meas]: about 0.07 ms per step for the section analysis and about 0.8 µs per contact query. Drawing adds a noise term to the barrel loft's vertex shader.

---

## 1. Detecting and tracking the bore front and its toe; the roller's life from break point to swash

### Takeaway
No second tracker is needed. The swept barrel's tracked front line already sits on the breaking front, and the roller only needs per-slice attributes. Each step they come from a 1D section of the solver surface along the slice normal. The surf-zone literature supplies every part of that analysis:
- the front's crest and trough, as the surface extrema nearest the front (Tissier et al. 2012);
- the toe, as the 20%-gradient up-crossing (Martins et al. 2018);
- the bore Froude number, from the crest and trough depths alone;
- a Froude rule for breaking: bores stop breaking below 1.3 and break fully above 1.45–1.5.

Svendsen (1984) gives the roller's life. Whatever the breaker type, there is a rapid outer (transition) region lasting 5–8 breaker depths, then a bore-like inner region.
- On a plane beach the bore keeps breaking to the shoreline. There it hands its momentum to the still water, and the run-up is a thin splashed layer (Yeh et al. 1989).
- Over a bar trough its Froude number falls, and it stops breaking.

### Cited Findings
**What the game already has**
- [code] **Breaking fields.** On stage 2 the breaking model mirrors the solver's Kennedy strength B ∈ [0, 1] and breaking age per cell (`src/wave/Breaking.ts:81-86`).
  - The solver computes B from the continuity rise rate against η_t\*, which ramps from the onset fraction to 0.15√(gh) over T\* = 5√(h/g).
  - The eddy viscosity is ν = B·δ²·h·η_t, capped at 0.3·h·√(gh) (`src/wave/BoussinesqSolver.ts:367-409`, `MAX_EDDY` at `:92`).
- [inference] **B marks the roller's core, not its extent.** On a travelling front η_t = c·|∇η|, so B > 0 marks a band around the steepest part of the face, not the crest-to-toe roller. B is a good "is this front breaking" flag, but not a measure of the roller's extent.
- [code] **Crest speed.** `crestMotion` takes c = η_t / |∇η| at the steepest point of the face within 10 m shoreward, travelling down that gradient (`src/wave/CrestKinematics.ts:55-78`).
- [code] **Crest finder.** `findCrest` is a 1D maximum along the travel axis with parabolic refinement (`src/game/waveLab/crestTracker.ts:30-50`).
- [code] **Existing roller physics in the solver.** The plunge zone's constants already cite this physics (`src/wave/BoussinesqSolver.ts:11-22`):
  - roller length and angle, L·tanθ ≈ H (Martins);
  - the impact's reach (Chanson);
  - "a zone following a bore would end where its Froude number falls …".
- [code] **The shared breaking threshold.** "Breaking" is B > 0.3 in several places:
  - `SurfZoneSimulation.ts` (the breaking counts near `:635` and `:653`);
  - `CURL_BREAKING = 0.3` in `src/physics/waveFrame.ts`;
  - `BORE = 0.3` in `src/physics/PhysicalSurfWater.ts:12`.

**Front detection and termination in Boussinesq models**
- [model] (full text) **Tissier, Bonneton, Marche, Chazel & Lannes (2012)**, Coastal Eng. 67:54–66 — [PDF](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)
  - **Front:** a wave front is "the parts of the waves lying between the crest and the trough …". Fronts are centred on local maxima of the energy dissipation D(x, t).
  - **Depths:** h₁ and h₂ are "approximated by the water depth at the trough and the crest of …".
  - **Broken or not:** the normalised dissipation Γ = ∫_front D dx / D_b uses D_b, the shock value ρg[g(h₂+h₁)/(2h₁h₂)]^½ (h₂−h₁)³/4. Γ ≥ 0.5 is broken.
  - **Onset:** a critical front slope Φᵢ = 30°.
  - **Cessation:** "Bores stop breaking when their Froude number Fr₁ = (c_b − u₁)/(gh₁)^½ …". From mass and momentum conservation, Fr₁ = √{[(2h₂/h₁ + 1)² − 1]/8}. Measured cessation values are "1.2 to 1.3 (Chanson, 2008; Favre, 1935; Treske, 1994)"; they set Fr_c = 1.3.
  - **Regimes:** after Chanson (2008), bores are non-breaking undular below 1.3; undular with a broken front wave between 1.3 and 1.45–1.5; purely breaking above 1.45–1.5.
  - **Switch zone:** the dispersion-off zone is l_NSW = 2.5·l_r, with l_r ≈ 2.9H (Haller & Catalán).
  - **Beach and trough:** on their plane-beach test the waves "keep breaking … until the shoreline". Over a trough, "the bore Froude number would decrease and eventually get smaller than Fr_c".
- [model] (full text) **Bacigaluppi et al. (2019)**, per-cluster implementation — [arXiv 1902.03021](https://arxiv.org/pdf/1902.03021)
  - Flag cells by slope ≥ tanφ (φ = 14–33°, default 30°) or ∂_tη/√(gh) > γ (0.35–0.65).
  - Cluster adjacent flagged cells, and take H₂ (maximum) and H₁ (minimum) in each cluster.
  - Terminate if Fr_b < 1.3; otherwise set l_r = 2.9(H₂ − H₁) and l_NSW = 2.5·l_r.
  - **Guards:** rollers whose switch zone l_NSW is no longer than 4Δx are dropped; breakers closer than 4Δx are merged; detections on the rear side are rejected by the sign of the celerity.
- [meas-lab] (full text) **Misra et al. (2008)**, Phys. Fluids 20:035106 — [PDF](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Misra-et-al-2008-POF-weak-hydraulic-jump.pdf)
  - **A caveat to the 1.3 threshold.** Weak hydraulic jumps "provide a simplified description of the flow in spilling breakers in the …".
  - Breaker indices of 0.4–0.7 give a jump depth ratio of 1.2–1.35, which is Fr 1.15–1.26 by Bélanger's equation.
  - Their Fr = 1.19 jump broke "with no visible undular characteristics". The breaking/undular boundary is "very sensitive to the flow conditions".
  - **Toe by curvature:** they define the toe as "the location of the maximum positive curvature of the free surface". They cite Brocchini & Peregrine's "foot" for the base of a fully turbulent front.

**Field definitions and the roller's life**
- [meas-field] (full text) **Martins et al. (2018)**, JGR Oceans 123 — [Bath repository PDF](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)
  - **Roller extent:** the roller is "the part of the wave profile from the wave crest, through the …".
  - **Toe:** a "surface gradient up-crossing value set at 20% of the maximum surface elevation …". Smaller thresholds put the toe at a trough that "can sometimes be well in front of the roller"; larger ones put it inside the roller.
  - **Angle history:** "a rapid initial reduction in roller angle from 25° to 18° occurs …", then a roughly constant angle.
  - **Length and height:** "L_r tanθ ≈ H" holds with r² = 0.89 and RMSE 0.06 m.
  - **Speed:** mean surf-zone celerity is 1.14 × linear theory. Booij's c² ≈ g(h + H/2) fits their data.
- [model + meas-lab] (full text) **Svendsen (1984)**, ICCE 1984 ch. 4 — [PDF](https://icce-ojs-tamu.tdl.org/icce/index.php/icce/article/download/3785/3468)
  - "From a point somewhat after breaking the waves become bore-like irrespective of …"
  - "The roller is defined as the recirculating part of the flow above …"
  - "The mean water level is horizontal or weakly sloping after the start …", which is "comparable to the distance of the most obvious transformations of the wave shape". That point is the transition from the outer to the inner region.
- [meas-lab] (abstract) **Yeh, Ghazali & Marton (1989)**, "Experimental study of bore run-up", JFM 206 — [Cambridge](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/experimental-study-of-bore-runup/FB3EAE8F738AE30137147990C835CF33)
  - Near the shoreline a bore "first decelerates by compressing its wave form and then suddenly accelerates". The cause is "momentum exchange" with the still water, not a genuine bore collapse.
  - "A single bore motion degenerates into two successive run-up water masses."
  - For a fully developed bore, "the bore front overturns directly onto the dry beach surface, and the …".
- [prod/model] (via `swept_surface_build.md` §1) **Thürey et al. (2007)** track the front, not the crest, with resampling at Δx/2–2Δx. Points are deleted when they move more than 2c or are no longer steep. See that file for the determinism rules: seed by lowest index, integer point IDs, fixed iteration order.

### Inferences (the recipe)
1. **Section analysis per slice** [inference; values sourced as marked]. Every step, or every second step (the roller's parameters change over about 1 s), for each loft slice of the barrel's front line:
   - **Sampling.** Sample the solver surface η = h + bed and the depth h along the slice's horizontal normal n (the line's smoothed normal, pointing the way the front travels).
     - Range: from u = −max(10 m, 4H) to +max(10 m, 6H), in 0.5 m steps.
     - Use plain bilinear interpolation of the solver arrays. The analysis does not need to be pixel-exact; only the drawn and collided top must be (§2).
   - **Points on the section:**
     - Steepest point u_s: the maximum of −∂η/∂u near u = 0. Thürey's tracker already places line points there.
     - Crest u_c: the nearest local maximum of η behind u_s, refined by a parabola as `findCrest` does.
     - Trough u_tr: the nearest local minimum ahead of u_s (Tissier's "closest extrema").
     - Toe u_t: the first u > u_s where −∂η/∂u ≤ 0.2·max(−∂η/∂u) (Martins).
   - **Quantities:**
     - H = η(u_c) − η(u_tr); h₂ = h(u_c); h₁ = h(u_tr); r = h₂/h₁; Fr₁ = √(r(r+1)/2). This is Tissier's Eq. 10 rearranged.
     - L_r = u_t − u_c; θ = atan[(η(u_c) − η(u_t))/L_r]. Martins fit a line from crest to toe; this is its two-point version.
     - c: the line point's own tracked speed, smoothed over about 0.3 s, cross-checked against `crestMotion`.
     - B_front: the maximum Kennedy B on the section between u_c and u_t.
2. **A readable rule of thumb** [calc]. Fr₁ = 1.3 is H/h₁ ≈ 0.40; Fr₁ = 1.45–1.5 is H/h₁ ≈ 0.60–0.68. So a front whose height is below about 0.4 of the trough depth sheds its roller, and one above about 0.6 is fully breaking.
3. **Fallback for small bores** (Bacigaluppi's 4Δx guard) [inference]. On the 1 m grid, a roller shorter than 4 m (H below about 1.4 m) is under-resolved, so its measured toe jitters.
   - Blend toward the sourced relation L_r = H/tanθ_stage, with θ_stage going from 25° at birth to 18–19° once developed (Martins).
   - The weight on the measured L_r is min(1, L_r,measured / 4Δx).
4. **State per slice** [inference; thresholds sourced]. The states are NONE, FORMING, ACTIVE, SHEDDING and SURGE.
   - **Birth (NONE → FORMING):**
     - A plunging slice starts when the barrel's slice clock passes the point where the library profile's void is gone (§2, the stage A → B blend).
     - A spilling slice starts when B_front ≥ 0.3 and Fr₁ ≥ 1.45, or when the library's spilling sequence says a roller has started.
   - **Growth (FORMING → ACTIVE).** The lens area ramps from 0 to its developed value over the outer region: 5–8 h_b of travel (Svendsen), about 2–3 s for a 1.5 m breaker.
     - The area rule (§2) is calibrated on inner-surf-zone bores. Near the break point rollers are shorter and not yet developed (Martins; Haller & Catalán).
     - The ramp's shape is provisional: roller length peaks lag roller angle peaks by 5–7 m (Martins).
   - **Shedding (ACTIVE → SHEDDING)** when any of these holds for at least 0.2 s:
     - Fr₁ < 1.3;
     - B_front < 0.1 (the solver has stopped dissipating);
     - the line point is deleted.

     While shedding, the lens thickness, bulking and coverage decay with an e-folding time of t_crest / w_b. Here w_b = 0.25 m/s is the game's bubble rise speed (`AERATION.riseSpeed`, `src/wave/AerationField.ts:13`), which gives about 1–2 s for a 1–2 m bore. Foam and plume air already made stay in `FoamField` and `AerationField`.
   - **Reactivation (SHEDDING → ACTIVE)** when Fr₁ ≥ 1.45 and B_front ≥ 0.3 again: re-breaking on an inner bar.
   - **Swash (SURGE)** when h₁ < 0.1 m (provisional) or the toe cell is dry.
     - Fr₁ is meaningless there, because h₁ → 0 sends it to infinity.
     - The lens is capped at half the local depth and becomes the foamy run-up tongue (Yeh et al.: a thin splashed-up layer).
     - It sheds when the front stalls (c < 0.5 m/s, provisional) or at the run-up limit.
5. **Two breaking signals** [inference]. The solver's Kennedy termination (η_t\* relaxing to 0.15√(gh)) and Tissier's Froude rule are different criteria. Requiring both for ACTIVE avoids whitewater drawn where the solver is not dissipating. The roller report should count slices where they disagree.
6. **Smoothing along the crest** [inference; guard sourced]. Treat the slice states as a 1D array over σ:
   - close gaps shorter than 4 m between ACTIVE runs;
   - drop ACTIVE runs shorter than 4 m (Bacigaluppi's 4Δx rule, in metres);
   - clamp the lens scale factor g ∈ [0, 1] to change by at most 0.1 per 0.5 m slice. This is the Mihalef/Surf's Up rule the barrel uses for its slice clock.
   - near both line ends, force g → 0 over the last 3–5 m (Surf's Up's "shoulder").
7. **Determinism and handover** [inference].
   - Everything above runs in the worker's fixed 1/60 s step on the solver arrays. On the GPU tier those are the field read back each frame (ADR 0004 amended).
   - Per line point, the handover state is its ID, σ, roller age, state, and any smoothed values (L_r, θ, c). That is a few KB.
   - Add them to `SurfZoneState` next to the barrel's slice clocks (`src/wave/surfZoneState.ts:8-16`, `SurfZoneSimulation.stateArrays` at `:480-500`).
   - Threshold comparisons must use only +, −, ×, ÷, `Math.sqrt`, `Math.min`/`Math.max` and integer operations (§3.4). A comparison that flips on one client and not another would change whether the roller exists, which is visible.

### Gaps
- **Froude thresholds** come from rectangular-channel bores: 1.2–1.3 for cessation (Chanson, Favre, Treske via Tissier) and 1.45–1.5 for purely breaking (Chanson 2008 via Tissier). Misra's Fr 1.19 breaking jump shows the boundary is sensitive to conditions. I found no surf-zone field measurement of the Froude number at which a real bore stops breaking over a trough.
- **Outer-region length.** The 5–8 h_b comes from lab mean-water-level data (Svendsen). Martins' 8 m is one field wave. I found no measurement of how the roller's area grows through the outer region.
- **Tracker robustness.** No published test of Thürey-style tracking on a dispersive Boussinesq solver (see `swept_surface_build.md` §1).

---
## 2. The roller's geometry: cross-section, sweep, join, and turbulent displacement

### Takeaway
**The underside cannot be measured.** No measurement shows where a field roller's underside is: LiDAR sees only the top, and Martins states that no interface is observable. The cross-section is therefore built from three measured constraints:
1. the field-calibrated water area of the roller, 0.33–0.36 H², which does not depend on the assumed density (Martins 2018);
2. the measured vertical distribution of air in lab bore rollers: a power law from zero to 0.9 below the "surface", with the C = 0.5 contour as the characteristic surface (Shi et al. 2023b);
3. the measured surface roughness of lab breaking bores: standard deviation d′max ≈ 0.13–0.4 of the inflow depth, largest in the toe half; integral scales from 0.5 to 3 inflow depths; toe wavelengths about 1 and 5–10 inflow depths (Wang, Leng & Chanson 2017, figure read).

**Mass conservation fixes where the lens sits.**
- The solver's η is the water-only surface. The aerated top therefore stands above it by the lens's air column (ᾱ·t), and the underside lies (1 − ᾱ)·t below it.
- With a quarter-ellipse lens, the underside's depth under the crest is 0.154 H for L_r = 2.9H, whatever the density [calc].
- Lidar and pressure agree in the inner surf zone to RMSE 0.05–0.07 m (Brodie et al. 2015). The bulking should therefore be a few centimetres for metre-high bores, which this recipe gives.

**Drawing it:** the roller is the post-collapse stage of the barrel's own loft.
- The loft's per-slice profile blends from the library profile to "solver section + lens" once the void has gone.
- The seam, mask and contact machinery of the swept surface are reused unchanged.

**Turbulent displacement:** apply it at the loft's vertices from an integer hash on (σ, ξ, step count). The CPU and GPU then evaluate the same vertices, and the collided and drawn tops agree to float precision.

### Cited Findings
**Cross-section**
- [meas-field + model] (full text; figure read, p. 32) **Martins et al. (2018), Fig. 7.**
  - The roller area under a LiDAR profile (H ≈ 0.55 m) is drawn as a band under the face, from the crest to the toe.
  - Its lower interface is "assumed to have an ellipsoidal shape close to the roller toe", explicitly "to facilitate the calculation".
  - Areas: 0.12 m² (Eq. 16 with ρ_r = 0.8ρ), 0.24 m² (0.4ρ) and 0.37 m² (Duncan's 0.11(L_r/cosθ)²).
  - Their calibrated forms are A = 0.326·(ρ/ρ_r)·H² (Eq. 16), 0.362 for a less energetic group, and 0.364 ± 0.059 over 38 individual waves. The water-equivalent area ρ_r·A/ρ is therefore 0.33–0.36 H² (±0.06 wave to wave).
- [model] (full text) **Svendsen (1984).** "Experimental information on the roller area A is only available for waves …"; the approximation is A = 0.9H² (Eq. 3.8).
  - [code] The game carries this as `ROLLER_AREA = 0.9` (`src/wave/PlungingLip.ts:55`). It sizes the foam ball's sprites from it (`src/wave/SprayCloud.ts:344-384`, `FOAM_BALL_VOLUME` at `:89`).
  - Martins shows this family of formulas overestimates inner-surf-zone dissipation (`roller_geometry.md` §1).
- [meas-lab + model] (full text) **Wang, Leng & Chanson (2017)**, ICE Eng. Comput. Mech. 170 — [PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
  - **Profile:** the C = 0.5 elevation of a steady jump is self-similar, (Z₅₀ − d₁)/(d₂ − d₁) = ((x − X_toe)/L_r)^0.536 (Eq. 5e; 3.8 < Fr₁ < 10).
  - **Air layers:** the shear-layer peak void fraction decays as C_max = 0.5·exp(−3.4 (x − X_toe)/L_r), and its height rises linearly, (Z_Cmax − d₁)/(d₂ − d₁) = 0.56 (x − X_toe)/L_r.
  - **Two regions:** a shear region with a local maximum of void fraction, and above it a free-surface region "in which the void fraction increased monotonically to unity"; Y₉₀ is the elevation of C = 0.9.
  - **Bores behave like jumps:** air entrainment in breaking bores with Fr₁ > 1.5 is "very similar to those of a breaking hydraulic jump with low Froude numbers".
- [meas-lab] (full text) **Shi, Wüthrich & Chanson (2023b)**, IJMF 159:104337, a breaking bore with Fr₁ = 2.4 and Re = 2.3×10⁵ — [UQ reprint](https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023b.pdf)
  - **Where the air is:** "Large void fraction data were observed immediately downstream of the roller toe. …"
  - **Surface definition:** "the characteristic free-surface profile might be defined as the contour of C_EA = 0.5".
  - **Analytic profiles (Table 3):**
    - near the toe: C = 0.9·((z − d₁)/(z₉₀ − d₁))ᴺ;
    - in the recirculation zone near the surface: an error function about z₅₀ (Chanson 1989);
    - in the developing shear layer: a Gaussian about Z_Cmax (Chanson 1995).
  - **Fitted diffusivities:** D\* = 0.014·exp(−1.2 (x − x_toe)/d₁) + 0.0025 and D# = 0.014 (x − x_toe)/d₁ + 0.0189.
- [meas-field] (abstract via Crossref) **Brodie, Raubenheimer, Elgar, Slocum & McNinch (2015)**, JTECH 32(10) — [doi:10.1175/JTECH-D-14-00222.1](https://doi.org/10.1175/JTECH-D-14-00222.1)
  - On a steep sandy beach, lidar and pressure estimates of inner-surf water level agree with r² = 0.98 and RMSE 0.05 m; swell-sea wave heights with r² = 0.87 and RMSE 0.07 m.
  - Lidar needs "sufficient foam present on the water surface to generate returns".
- [meas-lab] (full text) **Misra et al. (2008).** A weak jump's recirculating "reverse-flow region" sits "entirely above the mean surface", with a mean inclination of 18° against 17° for Duncan's hydrofoil breakers.

**Surface roughness and toe (lab, to be Froude-scaled)**
- [meas-lab] (full text; Fig. 7 read) **Wang, Leng & Chanson (2017).**
  - **Where it is largest:** "the maximum roller surface fluctuations were observed in the first half of roller", measured from the toe.
  - **Size:** d′max/d₁ is about 0.13–0.18 for breaking bores at Fr₁ = 1.4–1.6 (their data; Docherty & Chanson 2012) and about 0.3–0.4 at Fr₁ = 1.7–2.1 (Toi & Chanson 2013). The jumps sit on a dashed line through about 0.15 at Fr₁ = 2 and 0.45 at Fr₁ = 4.
  - **Misprinted legend:** the legend prints the fit as "d′max/d₁ = 1·5 × (Fr₁ − 1)". The plotted line is 0.15 × (Fr₁ − 1). This resolves the "unverified" flag in `roller_geometry.md` §1: the coefficient is 0.15, not 1.5 [figure read].
  - **Toe motion:** the toe's horizontal oscillation "was larger than and proportional to the maximum vertical depth fluctuation", at "0·4 times" its frequency. "An uplifted roller surface position was typically coupled with a downstream shifting …".
  - **Toe perimeter:** lab bore L_w/d₁ ≈ 1.2. In Qiantang tidal bores the range is 0.7–25, with peaks at 1 and 5–10. Coherent toe structures have integral lengths of 2–5.5 d₁.
  - **Surface structures:** integral length rises from 0.5 d₁ near the toe to 3 d₁ at the roller's end (Chachereau & Chanson 2011; Murzyn et al. 2007).
- [meas-lab] (full text) **Misra et al. (2008).** Laboratory steady spilling breakers show surface and toe fluctuations with peak frequencies of 0.47–3.75 Hz (Duncan, cited there). Their jump had h₀ = 8.6 cm.
- [meas-lab] (via `roller_geometry.md` §4, JFM article page) **Wüthrich, Shi & Chanson (2021).**
  - Fingers occur at about 4.5 Hz and live 0.10–0.15 s; crowns at 3.5–4.2 Hz; holes live under 0.1 s.
  - The lab bores had d₁ = 0.084–0.097 m (inflow depths confirmed in the 2022 companion paper [PMC9363398](https://pmc.ncbi.nlm.nih.gov/articles/PMC9363398/)).

**Production and technical practice for the surface**
- [prod] (full text) **Moana's ocean pipeline** (Palmer et al., SIGGRAPH 2017 Talks) — [PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Palmer_The-Ocean-and-Water-Pipeline-of-Disneys-Moana.pdf)
  - "Low-frequency components contributed to the meshed result, while high-frequency components were deferred …"
  - Simulation regions were stitched in "using a custom blend node" that "dampened the simulation as it approached the region boundary".
- [prod] (full text) **Moana's crashing waves** (Byun & Stomakhin, SIGGRAPH 2017 Talks) — [PDF](https://alexey.stomakhin.com/research/siggraph2017_waves.pdf)
  - Waves were "profile curves which represented the animation keys", swept "along artistically driven shape curves with different time offsets".
  - "Additional height field displacement was added on top to give the waves …"
- [model] (full text) **Jarzynski & Olano (2020)**, "Hash Functions for GPU Rendering", JCGT 9(3) — [PDF](https://jcgt.org/published/0009/03/02/paper.pdf)
  - "pcg3d and pcg4d fall on the Pareto Frontier and are a good …". pcg3d is v = v·1664525u + 1013904223u, followed by two rounds of cross-multiplying and an xor-shift by 16.
  - An earlier pcg3d version came from Unreal Engine.
- [spec] **GLSL ES 3.00 §4.1.3:** "Highp unsigned integers have exactly 32 bits of precision"; overflow will "wrap" to "the low-order n bits" — [Khronos PDF](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf).
- [spec] **WGSL, Integer Types:** "Expressions on concrete integer types that overflow produce a result that is modulo 2^bitwidth" — [WGSL source](https://raw.githubusercontent.com/gpuweb/gpuweb/main/wgsl/index.bs); [W3C WGSL](https://www.w3.org/TR/WGSL/).
- [spec] **ECMA-262 (Math object):** `Math.sqrt` returns 𝔽(the square root of ℝ(n)), which is correctly rounded. `Math.exp` and `Math.hypot` return "an implementation-approximated Number value" — [ECMA-262 numbers and dates](https://tc39.es/ecma262/multipage/numbers-and-dates.html).

**What the game already has for this**
- [code] **A matching CPU/GPU surface.** `sampleCubicSurface` (`src/scene/water/cubicSurface.ts:15`) and its GLSL twin `waterCubicPars` (`:41`) evaluate the same Catmull-Rom surface over the render nodes that `PhysicalSurfWater` samples. This is a working precedent for a CPU function and a shader that must agree.
- [code] **An integer hash.** `pcg2d` uses `Math.imul` and `>>> 0`, so it is exact in JS (`src/scene/foamPattern.ts:31-43`). The churn texture and foam pattern already use it.
- [code] **Eddies are sine-based.** The body eddies are a sum of `Math.sin` modes (`src/physics/eddies.ts:54-62`). That is fine for forces felt only on the owner's machine, but not a pattern for anything drawn for everyone (§3).
- [code] **A dense Rich patch.** Rich water draws a 96 m patch at 0.25 m vertex spacing where the camera looks (`src/scene/water/richPatch.ts:5-8`). Its placement depends on the camera, so it cannot define a surface shared online.

### Inferences (the recipe)
**2.1 Cross-section per slice, stage B (the roller after any tube has collapsed).** [inference; constants sourced as marked]

With ξ = (u − u_c)/L_r (0 at the crest, 1 at the toe) and K = 0.33–0.36 (Martins):
- **Lens thickness, crest to toe:** t(ξ) = t_c·√(1 − ξ²) for 0 ≤ ξ ≤ 1. This quarter ellipse is thickest at the crest (the jump-roller analogy) and rounded near the toe (Martins' "ellipsoidal … close to the roller toe").
- **Thickness at the crest:** t_c = 4K·H² / [π·(1 − ᾱ)·L_r]. At L_r = 2.9H this is t_c ≈ 0.154H/(1 − ᾱ): 0.18H at ᾱ = 0.13, 0.21H at 0.25, 0.26H at 0.4 [calc].
- **Rear taper (provisional):** behind the crest, t = t_c·(1 − (ξ/ξ_b)²) for −ξ_b ≤ ξ < 0, with ξ_b ≈ 0.3. This stands for Duncan's turbulent wake behind the breaker. Behind it lie the FoamField and AerationField. The taper is outside Martins' crest-to-toe area.
- **Top:** z_top = η(u) + ᾱ·t(ξ) + d(σ, ξ, t), where d is the turbulence of §2.4. The bulking ᾱ·t is simply the lens's air volume per unit area, sitting above the water it displaces (conservation). At the crest it is 0.02H at ᾱ = 0.13, 0.05H at 0.25 and 0.10H at 0.4 [calc]. For H = 1 m that is 2–10 cm, within Brodie's 5–7 cm lidar-versus-pressure RMSE.
- **Underside:** z_u = η(u) − (1 − ᾱ)·t(ξ). At the crest it is 0.154H below η for L_r = 2.9H, independent of ᾱ [calc]. That is above trough level, consistent with air being "concentrated above trough level" (Cox & Shin; Govender & Mocke, in `roller_geometry.md` §2).
- **Void fraction inside:** α(z) = 0.9·ζᴺ with ζ = (z − z_u)/(z_top − z_u) ∈ [0, 1] (Shi 2023b's near-toe form).
  - The mean is ᾱ = 0.9/(N + 1): N = 2.6 gives ᾱ = 0.25, N = 5.9 gives 0.13, N = 1.25 gives 0.4.
  - The drawn and collided top is the C = 0.9 level (Chanson's Y₉₀).
  - The C = 0.5 "characteristic surface" of Shi 2023b lies at ζ = 0.56^(1/N): 0.8 of the lens height for N = 2.6.
  - A board meets a soft froth first and firmer mixture below (§3).
- **Mean density ᾱ.** Recommend ᾱ = 0.25 (ρ_r = 0.75ρ) as provisional. It lies between Martins' best fit of 0.87ρ (which they call too dense for the roller as a whole) and Duncan's 0.61ρ. This is the owner's gameplay dial, within 0.13–0.4 (§6).
- **Lens scale factor.** g ∈ [0, 1] multiplies t (from §1: growth, shedding, line ends).
- **Worked example** [calc]: a Supertubos-like beach bore with H = 1.5 m, mean depth 2.5 m and trough depth h₁ ≈ 1.9 m:
  - c ≈ √(g(h + H/2)) = 5.6 m/s;
  - Fr₁ ≈ 1.6, breaking;
  - developed L_r ≈ 4.4 m (θ ≈ 19°), and 3.2 m at birth (25°);
  - t_c ≈ 0.31 m; bulking 8 cm; underside 23 cm below η at the crest.

**2.2 Sweep: the roller is the barrel loft's stage B.** [inference]
- The swept barrel builds, per slice, a profile of N fixed samples (back → crest → lip → tip → underside → cavity → face → toe) from an offline library indexed by the slice clock τ (`swept_surface_build.md` §2).
- Once a slice's library profile has no cavity left (after the pit, plus the void's reshaping window of about 0.5 s; O'Dea et al. 2021 via `along_crest_barrel.md`), blend the profile sample by sample from the library to stage B over 0.3–0.5 s: w_B = smoothstep(τ_gone, τ_gone + Δ, τ).
- Stage B takes the same sample layout. The lip and cavity samples collapse onto the crest (zero-length edges, harmless). The face samples spread over ξ ∈ [−ξ_b, 1 + 0.3] at the solver section plus the lens top.
- The library tool must export its late post-impact stages with their samples at those ξ positions, so the blend lands like on like.
- Spilling slices that never overturn use stage B, plus the library's small spilling curl while it lasts.
- **Why one mesh rather than a separate roller skin:**
  - one seam with the height field, already solved for the barrel (pinned ends, 1–2 cell overlap, hole mask with a dithered band; `swept_surface_build.md` §3);
  - one contact path;
  - no z-fight between two surfaces at the toe.
- **Why not a displacement of the Rich dense patch:** its vertices depend on the camera (`richPatch.ts`). Remote clients would draw a different lattice, and "what the rider hit" would stop being a shared object.
- **Sample density.** Put about 40 of the N samples across the lens (0.1 m spacing at L_r = 4 m) and space slices 0.25–0.5 m apart near the camera. Whatever the lattice cannot resolve is simply absent from both the drawing and the collision, which keeps them identical.

**2.3 Joining the water and the barrel.** [inference]
- **Loft ends.** At the back (ξ ≤ −ξ_b) and ahead of the toe (ξ ≥ 1.3) the stage-B profile is the solver section itself: lens and turbulence are both zero. The loft's pinned ends therefore join the water mesh exactly as the barrel's do. Sample the section with the same Catmull-Rom (`cubicSurface.ts` / `waterCubicPars`) that the water mesh and `PhysicalSurfWater` use.
- **Along the crest.** The lens scale g tapers to 0 over the last few metres of each line end (the shoulder).
- **Handover from the barrel.** The library-to-stage-B blend (2.2) is the join. The foam-ball sprites (`TubeRoller`, `src/wave/PlungingLip.ts:74`; `SprayCloud.roll`, `src/wave/SprayCloud.ts:349`) should fade over the same window. Their volume should come from the lens (water area 0.33–0.36 H²), not from `ROLLER_AREA = 0.9`.
- **Behind the roller.** The water stays the plain height field with the FoamField and aeration looks. Optional and the owner's call: bulk the whole aerated patch by the AerationField's air column (≤ 0.2 × plume depth, `src/wave/AerationField.ts:13`). It is physically consistent but would also change the collided surface outside the roller.

**2.4 Turbulent displacement that stays deterministic.** [inference; scales sourced; amplitudes lab-scaled]
- **Where it is applied.** Only at loft vertices (σᵢ, ξⱼ), as a vertical offset d added to z_top. Coordinates are the roller's own: σ, and u − u_c in metres. Structures therefore ride with the roller at c, as the roller water does (Svendsen; Shi 2023a).
- **Noise:** 3D value noise from pcg3d on integer lattice coordinates.
  - Space: the lattice index is floor(σ/λ) and floor(u/λ) with a per-octave salt.
  - Time: the lattice index is floor(stepCount/K), and the fraction is (stepCount mod K)/K. Both are exact integers in float32 and float64.
  - Interpolate with a quintic fade (a polynomial; no sin, cos or exp). Use two octaves.
- **Why it is deterministic:**
  - The integer hash gives bit-identical lattice values in JS (`Math.imul`, `>>> 0`), GLSL ES 3.00 (highp uint wraps) and WGSL (u32 modulo 2³²).
  - The interpolation differs only at float32 rounding, about 10⁻⁶ m.
  - A floor that lands on the other side of a lattice line between float32 and float64 is harmless, because value noise is continuous there.
- **Amplitude.** The standard deviation of d at its peak is d′max, with h₁ = the section's trough depth:
  - 0.13–0.18 h₁ for Fr₁ = 1.4–1.6;
  - 0.3–0.4 h₁ for Fr₁ = 1.7–2.1 (Wang, Leng & Chanson Fig. 7, bores);
  - interpolate linearly in Fr₁ and cap at 0.4 h₁.
  - In terms of H this is about 0.2–0.3 H for surf bores at Fr₁ = 1.5–2 [calc]. It is lab data at Re ≈ 10⁵ extrapolated by Froude similarity, so it is provisional; tune within the range against film.
- **Envelope along ξ:** peak over the toe half (ξ ≈ 0.5–0.9, "first half of roller" from the toe); about 0.4 of the peak at the crest; 0 at ξ = 1 (the toe moves instead, below) and at the rear end. Multiply by g.
- **Length scale λ(ξ):** from 0.5 h₁ near the toe to 3 h₁ at the rear of the roller (integral lengths). The second octave is λ/2.
- **Time scale.** The lattice step in time is the Froude-scaled structure lifetime: t_field = t_lab·√(h₁/d₁,lab), with d₁,lab ≈ 0.09 m.
  - Fingers (0.10–0.15 s in the lab) become 0.4–0.6 s at h₁ = 1.5 m and 0.6–0.9 s at h₁ = 3 m. So K ≈ 24–54 steps.
  - Lab event rates of 3.5–4.5 Hz scale to about 0.8–1.1 Hz at h₁ = 1.5 m. The 0.47–3.75 Hz toe and surface oscillations of steady lab breakers scale to 0.1–0.9 Hz [calc].
  - This refines the "1–2 Hz" in the brief: 1–2 Hz fits bores with h₁ ≈ 0.3–1 m.
- **Toe line.** Before building the lens, shift the toe per slice: u_t′ = u_t + A_toe·N_toe(σ, t).
  - A_toe ≈ 1–2 d′max (the horizontal oscillation is larger than the vertical);
  - octaves at wavelengths of 1 h₁ and 5–10 h₁;
  - time rate 0.4× the surface rate;
  - one-sided excursions allowed (the lab saw "backshifts of the toe" and negative instantaneous toe celerity).

  The shifted toe changes L_r locally, so the whole lens breathes with it ("an uplifted roller surface … coupled with a downstream shifting of jump toe").
- **Render-only below the lattice.** Foam micro-roughness (2–6 mm), holes and mushrooms at the toe, and finer boils go into normal and coverage maps. The owner allows foam texture to differ between players. Normal maps do not move the surface, so nothing the rider hits differs.
- **Moana's precedent** splits frequencies the same way: low frequencies in the shared, meshed surface; high frequencies in rendered displacement. Here the "mesh" band is everything the loft lattice carries, and it is shared and collided.

### Gaps
- **No field measurement of the underside.** The quarter-ellipse (thickest at the crest) follows the jump and bore analogy. Martins' own drawing is nearer a band of even thickness along the face with a rounded toe, and they say it was drawn for convenience. Our own Basilisk 2D runs (the barrel library) can settle this: extract the late-stage α field and the dividing streamline in the wave frame (Svendsen's definition). Until then, the shape is provisional.
- **Roughness is lab data.** All amplitudes, scales and rates come from lab bores and jumps with d₁ ≈ 0.08–0.12 m, extrapolated by Froude similarity. No field measurement of surface fluctuations on a surf-zone roller was found. Brodie 2015 constrains only the mean offset between lidar and pressure.
- **Bulking is loosely bounded.** Brodie's 5–7 cm RMSE mixes several effects, including linear pressure transfer. It is not a direct measure of roller bulking.

---
## 3. Contact: what the board and body should feel, and how to sample it deterministically on the CPU

### Takeaway
The game's bodies already read everything the roller changes:
- the surface height and slope;
- the void fraction, which sets the mixture density ρ(1 − α) for buoyancy, planing pressure and drag;
- the water velocity at the sampled height.

So the roller needs no new force terms; it changes what `SurfWater.sampleAt` returns. That keeps to the milestone's rule for the P11 push, "changing what the bodies sample; no added force".

What bodies should then feel, sized from physics:
- **Soft, bogging support.** The top ~35% of the lens is too airy to float a prone surfer statically.
- **A shoreward carry at the bore speed c** inside the roller. The recirculating roller moves at c (Svendsen 1984, and measured by Shi et al. 2023a).
- **An impact** as the toe passes a paddler: roughly ½ρ_r·C_d·A·(c + v)², with the front's impulsive peak at most 1.5× the quasi-steady value (Yeh et al. 2014, via the earlier notes).
- **Turbulent jostling** from the existing eddies.

Sampling is deterministic and cheap. The CPU rebuilds the four loft vertices around a contact point with the same function the GPU draws, interpolates the triangle, and evaluates the lens profile. That took about 0.8 µs per query on a loaded M1 [meas].

### Cited Findings
**What the game samples and applies**
- [code] **The hull** floats, planes and drags in the mixture: density = ρ·(1 − voidFraction) (`src/physics/hullForces.ts:158-160`). Buoyancy follows the hydrostatic gradient down a sloping surface, and pressure and ITTC friction use the relative flow (`:136-196`).
- [code] **The swimmer** (`DetachedSurfer`) uses the same mixture density for buoyancy and drag, with drag capped at mass/dt per step (`src/physics/DetachedSurfer.ts:563-579`).
- [code] **The attached rider's body parts** drag with C_d = 0.9. A prone rider's parts are partly sheltered by the parts ahead: "the prone body and board drag about 45 N at 1.7 m/s" (`src/physics/AttachedRider.ts:37-46`).
- [code] **Today's roller push (P11).** "Within ROLLER_SHARE of the set-up under the surface the flow is carried …". It applies only while the current runs within 60° of shoreward (`src/physics/PhysicalSurfWater.ts:17-31`; applied at `:151-159`, with `ROLLER_SHARE = 0.5`).
- [code] **Air today.** Bodies sample the plume's depth-averaged void fraction within the plume's depth (`PhysicalSurfWater.airAt`, `:346-357`), and turbulence k from `AerationField.turbulence` (`:364-373`).

**What the roller water does**
- [model] (full text) **Svendsen (1984):** the roller's "absolute mean velocity … equals the propagation speed c".
- [meas-lab] (full text) **Shi, Wüthrich & Chanson (2023a)**, IJMF 159:104338 — [UQ reprint](https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023a.pdf)
  - **Set-up:** a bore with Fr₁ = 2.4, d₁ = 0.084 m, d₂ = 0.245 m and Re = 2.03×10⁵.
  - **Speed:** "the velocity in the large recirculation zone compared well with the mean bore celerity".
  - **Two populations:** the velocity PDF is bimodal, "with positive and negative peaks corresponding to the predominate velocity in the …".
  - **Vertical velocities** were smaller than the longitudinal ones, and positive (buoyancy-driven) beyond (x − x_toe)/d₁ > 4.
- [meas-lab] (full text) **Misra et al. (2008).** Turbulence is produced in a "thin, curved shear layer" running from the toe, "decaying rapidly away from the toe … with both increasing depth and downstream distance". In their weak jump the reverse flow was small (maximum 2.38 cm/s) and localised above the mean surface.

**Proxies re-used from `roller_geometry.md` §2–3** (opened in that round; not re-opened here)
- **Static float in a mixture:** submerged volume = m / (ρ(1 − α)). A 78 kg rider with a 30 L board floats statically only while α < 0.28 (0.44 with a 60 L board). A breath-holding swimmer loses static float at α ≈ 0.04 [inference there].
- **Duncan–Martins shear on the face under the roller:** ≈ 330·H Pa at θ = 18° and L_r = 2.9H [inference there, from the field-calibrated ρ_r·A = 0.326·ρ·H²].
- **Tsunami-bore loads** (Yeh et al. 2014, ICCE): the leading-edge impulsive force is at most about 150% of the later quasi-steady force (from two small lab studies). The resistance coefficient is about 2 for a square column.
- **People in floodwater** (Arrighi et al. 2017, HESS). Measured instability pairs: 0.26 m deep at 3.0–3.1 m/s, and 0.33 m at 2.6 m/s, for a 1.70 m, 68 kg subject. Body C_d runs from about 1 (low Froude number) down to 0.1 (high).
- **Debris speed:** debris is "always less than or equal to the bore front velocity" (Matsutomi et al. 2008, via a Frontiers review).
- **Tidal-bore surfers** ride 0.3–0.6 m bores at 2.5–3.1 m/s (Sélune; Chanson's tidal-bore page).
- [meas-lab] (snippet only) **Aerated impacts** (Bullock, Obhrai, Peregrine & Bredmose 2007, Coastal Eng. 54): aeration "does not always reduce the peak pressure", and entrapped air can increase force and impulse by spreading the pressure in time and space. Not opened (ScienceDirect 403).

### Inferences (the recipe)
**3.1 What each body should feel** [inference; numbers from the proxies above; worked example H = 1.5 m, c = 5.6 m/s, t_c = 0.31 m, ᾱ = 0.25]
- **Support ("bogging").**
  - With α = 0.9·ζ^2.6, the mixture falls below the static-float limit α < 0.28 above ζ ≈ 0.64. The top ~36% of the lens (≈ 11 cm at the crest for H = 1.5 m) cannot hold a prone rider on a 30 L board.
  - The board sinks visibly into the whitewater until faster flow or denser water supports it. For a standing rider, planing lift and fin loads fall with ρ(1 − α), so the board rides deeper and noses up in the soup.
  - This is how whitewater feels, and it emerges from `hullForces` unchanged, provided the sampled α varies with height inside the lens (3.3).
- **Carry.**
  - Inside the lens the water moves at c along the front's normal (Svendsen; Shi 2023a), about 5–6 m/s for a 1.5 m bore.
  - A prone board in the upper lens is dragged toward c through body-part drag (`AttachedRider`, C_d 0.9) and hull pressure and friction.
  - **Check against Duncan–Martins:** the force on the board and body should come out near 330·H Pa × the contact area, about 250 N on 0.5 m² at H = 1.5 m. That is about the same as gravity along a 19° face for 78 kg (≈ 250 N).
  - **Check against tidal-bore surfing:** a board on a 0.3–0.6 m bore should be carried at 2.5–3.1 m/s.
  - **Physical limits:** debris never outruns the front, so a board that drops below the lens falls behind at the bore's depth-averaged u = c·(1 − h₁/h₂). That is 0.33c for h₂/h₁ = 1.5 and 0.5c for 2.
- **Impact on a paddler facing the roller.**
  - The relative speed is c + v_paddle (5–7 m/s). The dynamic pressure is ½ρ_r(c + v)², about 10–19 kPa at ρ_r = 0.75ρ.
  - The quasi-steady force on 0.15 m² of head, shoulders and board edge with C_d ≈ 1 is 1.4–2.8 kN [calc]. The front's peak should come out at no more than about 1.5× that (Yeh 2014 cap), and the whole event lasts L_r/(c + v) ≈ 0.5–0.9 s (L_r 3.2–4.4 m).
  - All of this emerges from drag in the sampled flow, as the toe's step from ū to c sweeps past each body node. The cap is a check, not a coded force.
- **Turbulence.** Keep the existing eddies driven by k from the `AerationField` (Ting & Kirby ratio 0.15). They are felt only on the rider's owner's machine, so their use of `Math.sin` (`eddies.ts:54-62`) is acceptable; nothing drawn for other players depends on them.
- **Knock-down.** A wading or fallen surfer in 0.3–0.6 m of bore flow at 2–3 m/s is past the measured human-instability pairs (Arrighi). Being knocked over is the right outcome and needs no special rule.

**3.2 Replace the P11 push with the lens** [inference]
- Delete the `ROLLER_SHARE` block (`PhysicalSurfWater.ts:151-159`). Where the sample point lies in an ACTIVE or SHEDDING slice's lens, use:
  - `flow(y) = ū + S(ζ)·g·(c·n̂ − ū)`, with S(ζ) = smoothstep(0, 0.3, ζ). The bottom 30% of the lens is the shear layer (Misra: "a thin, curved shear layer"), and the rest is the recirculating roller at c.
  - The vertical component is unchanged (continuity reconstruction); Shi measured small vertical velocities.
- Three things differ from P11:
  - c is the front's measured speed, not √(g·d);
  - the direction is the front's normal, not the current's direction, so there is no 60° test;
  - the thickness is the lens's, not half the set-up.

**3.3 Deterministic CPU sampling** [inference; timing measured]
For a contact point p at step n:
1. **Find the slice.** Start from last step's slice index for this body and walk at most ±4 slices to the nearest slice segment. Break ties by the lower index. This gives σ and u = (p − origin)·n̂.
2. **Find the lattice cell.** Get ξ = (u − u_c)/L_r, then the loft sample index j with ξⱼ ≤ ξ < ξⱼ₊₁.
3. **Build the four vertices.** Evaluate (σᵢ, ξⱼ), (σᵢ₊₁, ξⱼ), (σᵢ, ξⱼ₊₁) and (σᵢ₊₁, ξⱼ₊₁) with the vertex function:
   - the section η from `sampleCubicSurface` on the render nodes, the same function as `waterCubicPars` on the GPU;
   - plus g·ᾱ·t(ξ);
   - plus d(σ, ξ, n) from pcg3d.
4. **Interpolate.** Split the quad into the same two triangles the index buffer uses, and interpolate within the triangle containing p. This gives surfaceY and the slope. What is hit is then exactly what is drawn, within float32 rounding, even between vertices.
5. **Evaluate the lens at the sample height y.** ζ′ = (y − z_u)/(z_top − z_u), clamped to [0, 1], stretched to the displaced top. Then α = 0.9·ζ′ᴺ, and flow as in 3.2. Below the lens, α comes from the plume (`airAt` as today).

   Do not double-count the air: inside the lens use max(α_lens, α_plume). Both describe air near the surface, and the lens is the better-resolved one.
6. **Cost:** 1000 queries took 0.79 ms median on an Apple M1 (Node 22.17.0, V8, load average 18–36) [meas]. That is about 0.8 µs per query, each rebuilding four vertices with Catmull-Rom and two noise octaves. Four contact points × 4 sub-steps × a few riders is under 0.05 ms per step.

**3.4 Determinism rules for anything drawn for everyone** [inference, from the specs cited in §2]
- **Pure function of shared state.** The roller must depend only on:
  - the solver arrays, the tracked line, and the roller state that is handed over on join;
  - the step count.

  No `Math.random`, no wall clock, no render-frame time, no camera-dependent lattice.
- **Deterministic arithmetic.** Use only +, −, ×, ÷, `Math.sqrt` (correctly rounded by ECMA-262), `Math.floor`, `Math.min`/`Math.max`, `Math.imul`, and `>>>`.
  - Write sqrt(x·x + y·y) rather than `Math.hypot`.
  - Use no `Math.exp`, `Math.pow`, `Math.sin` or `Math.cos` in the roller's geometry or thresholds; those are "implementation-approximated" and may differ between browsers.
  - For the s^0.54-style power laws, ship a table or a polynomial.
- **Why small differences are tolerable but thresholds are not.** The roller never feeds back into the solver (like the foam and aeration fields). Last-bit differences between engines therefore cannot grow chaotically. They only matter where they flip a comparison (a state change or a line's topology), hence the rule above for thresholds.
- **The GPU draws; it never decides.** The GPU evaluates the same vertices in float32 for drawing only. Nothing read back from the GPU's roller feeds physics (the WGSL and GLSL float rules allow reassociation and fusion; see `swept_surface_build.md` §4).
- **Contact is soft, not a hard SDF.** If the swept barrel's contact uses a hard signed-distance constraint for green water (`swept_surface_build.md` §4), the roller's part of a stage-B profile must be marked soft. Either run the SDF on the lens underside, or skip the constraint there and let buoyancy, pressure and drag in the mixture do the work. Otherwise boards would stand on top of the froth. This is an interface point to agree with the Padang session.

### Gaps
- **No measurements on people or boards.** No force or speed has been measured on a surfer or board in surf-zone whitewater. The numbers above are proxies: tsunami bores on rigid columns, floodwater on people, tidal-bore surfers, and the Duncan–Martins balance.
- **Mixture drag coefficients.** Drag coefficients in aerated water are unmeasured for bodies of this size. The mixture-density scaling assumes bubbles much smaller than the body, which holds for 0.1–100 mm bubbles.
- **Aerated impacts.** Whether aeration softens or sharpens the impact on a body is open: Bullock 2007 (snippet) says it can do either.

---
## 4. Rendering: opacity and brightness, the handover to residual foam, spray from the toe and crest, and what films and games did

### Takeaway
**How it should look, from measurements:**
- The roller reads as a continuous band from the crest to the toe, brightest at the crest and ramping down toward the toe (Haller & Catalán 2009).
- The toe is not a soft alpha fade. It is a patchy perimeter of fingers, mushroom-like foam clumps and short-lived "holes", which look darker because clear water lies beneath (Wüthrich et al. 2022).
- Fresh roller foam reflects about 40–55% of light; aerated water in the gaps is green-cyan, not white (Koepke 1984; Dierssen 2019; Bohren).
- Active foam moves with the roller at c. Residual foam is left behind, stops advancing, and cools and dims (Carini et al. 2015; Rojas & Loewen 2010; Yang & Potter 2021).

**Implementation.** The roller's coverage comes from the same lens and toe noise as its geometry. Its foam texture is advected by the lens's own flow, so the handover to the FoamField's residual foam, which moves with the depth-averaged current, is continuous rather than a seam.

**Spray** comes from the toe line (fingers and crowns throwing droplets forward at modes of 30° and 45°) and from the crest (wind), in amounts set by dissipation.

**Film and game practice agrees on emitting from a curve.** Surf's Up and Moana both drove whitewater from a curve carried by the wave (the crash curve, or the wave's peak area), scaled by the wave's energy. Both instanced pre-simulated whitewater along it and anchored particles to where they were born. Surf's Up added a hand-directed lower "skirt" of whitewater to blend into the ocean. Here, the sourced toe and lens do that job instead, because a hand-authored skirt would break the owner's "real" rule. True Surf states only that whitewater had to be re-engineered to look right from any angle in VR.

### Cited Findings
**Look of the roller** (from `whitewater_foam.md` §1–4 and `roller_geometry.md` §4 unless marked)
- [meas-lab] (abstract) **Haller & Catalán (2009):** roller optical intensity "ramp[s] up from the toe of the wave roller on the front …" — [doi:10.1029/2008JC005185](https://doi.org/10.1029/2008JC005185).
- [meas-field] **Brightness of foam:**
  - Koepke (1984): dense fresh foam ≈ 55%; streaks ≈ 10%; foam-free sea 5.5%.
  - Dierssen (2019): ≈ 40% for intense breaking, ≈ 50% for stage A, ≈ 18% for thin foam; submerged bubbles give "a more green-peaked reflectance spectrum".
- [meas-lab] (full text via PMC) **Wüthrich, Shi & Chanson (2022):** "holes" are 3D air cavities that look darker because clear water lies beneath; "mushrooms" are foamy accumulations at the toe — [PMC9363398](https://pmc.ncbi.nlm.nih.gov/articles/PMC9363398/).
- [meas-lab] (via the JFM 924 article page) **Wüthrich, Shi & Chanson (2021), droplets:**
  - ejected at 16.8°–83.1°, with modes near 30° and 45°;
  - modal diameter 2.5–3 mm;
  - at about 1.5× the bore-front speed (summary);
  - fingers at about 4.5 Hz in the lab.
- [meas-field] **Active versus residual foam:**
  - In thermal IR, active roller foam is warm and residual foam "cools quickly" (Carini et al. 2015).
  - Whitecaps "stop advancing before stage A ends" (Yang & Potter 2021, abstract).
  - Under spilling breakers the bubble cloud advances at about 100% of the phase speed (Rojas & Loewen 2010, abstract).
- [code] **The game's foam.**
  - FoamField adds dense foam at a rate ∝ B × bore dissipation (4/s for the reference bore) and advects it with the depth-averaged velocity, which is slower than c. The dense foam decays into residual lace (`src/wave/FoamField.ts:15`, `:82-107`, `:110-141`).
  - Rich churn "freshness" follows the aeration field's void fraction from 0.02 to 0.15 (`src/scene/water/churnTexture.ts:41-46`).
  - The spray cloud emits from bore faces at 0.6 drawn particles per unit of foam made (`SPRAY_PER_FOAM`, `src/wave/SprayCloud.ts:81`). Offshore wind blows spray off steep crests above 4 m/s (`FEATHER_ONSET`, `:94`).
  - The Rich foam ball is drawn as lit churn sprites (`src/scene/water/richSpray.ts:51-58`).

**Film and game practice**
- [prod] (decoded) **Surf's Up course notes**, SIGGRAPH 2007 course 13 (Bredow et al.) — [PDF](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
  - **Three features of aerated water:** the *whitewater*, "the large forward explosion in front of the wave caused by the …"; the *lip spray*, "the spray ripping back off the lip as it falls"; and the *foam ball*, "the backwards explosion of the water inside and around the tube".
  - **The crash curve.** "The source of the whitewater was a line, carved along the lip …"
    - Its vertices held an energy-hit flag, which toggled on "wherever the lip had crashed into the trough" (found by ray-intersecting the lip with the trough), and an energy "greatest when it first crashed and lessened the further it evolved".
    - Their product gave "the initial velocity magnitudes for the whitewater simulation".
  - **The skirt.** "The specific motion of the whitewater, the direction of dispersion and pulsing …"
  - **Whitewater mist**, "birthed from the whitewater", was "designed to drag and hang in the air above the wave", rendered with the Splat sprite renderer.
  - **The real-time preview plugin** used a pre-simulated, loopable particle "clip", "a simulated cross-section of a larger whitewater system". It was "only about 500 centimeters across", about 150 frames and "on the order of two thousand particles", baked "with gravity forces removed".
    - The clip was "instanced end-to-end along the arc of the crash curve … rotated to …", so particles appeared only where the wave was crashing.
    - Each particle was attached "to the crash curve's location at the time of that particle's birth, …". Dynamics were applied analytically by particle age.
    - These particles later seeded the final renders, up to millions of points through a RenderMan clustering plug-in.
    - The earlier `swept_surface_build.md` could not decode the clip's size and frame count; they are 500 cm and 150 frames.
  - **The foam ball** was simulated in the flattened reference space (Pref) "to simplify the collision calculation … with a static, flat limit surface", then warped back into the tube.
  - **Blending lip spray.** To blend lip spray into the wave, they varied "the amount of occlusion of the wave over a short initial span …".
- [prod] (full text) **Making Waves for Surf's Up** (Bredow et al. 2007 sketch): "ray intersection along the lip, called the crash curve, which was interpolated …" — [PDF](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf).
- [prod] (full text) **Surf's Up Beach Break** (Kluyskens 2007) — [PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
  - All whitewater was pre-simulated seed points expanded at render time, "about 200GB of particle data for each beach".
  - Surface foam was a pre-simulated "foam pattern (convection) life cycle … rendered as a repeatable texture", which looked "beyond any procedural texturing method that tries to depict foam using noise functions".
- [prod] (full text) **Moana: Crashing Waves** (Byun & Stomakhin 2017): "The wave deformer stored the peak area of wave geometry and we …"
  - For tsunami shots they "placed 10 different versions of pre-simulated crashing waves on top", deformed "not to have gaps between each other and the core wave geometry", with different time offsets.
  - Final surfaces were combined by level-set compositing.
- [prod] (full text) **Moana: Performing Water** (Frost, Stomakhin & Narita 2017): the water character's "skirt" (where it meets the ocean) was integrated "by leveraging geometry and vdb blending techniques", with the skirt simulation "advect[ing] flow towards the character" — [PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Frost_Moana-Performing-Water.pdf). So in Moana "skirt" is also a blending region, not a physical feature.
- [game-doc] (full text) **True Surf** (Meta blog, 18 Dec 2025): "we needed a new way of rendering all the white water, looking …". The wave engine blends "2D animations of vertical slices" made from "a custom 2D water simulation" — [Meta blog](https://www.meta.com/blog/true-surf-launch/).
  - The App Store notes for version 1.1.59 say "new white water physics", without detail (via `roller_geometry.md` §5).
  - No technical description was found (Surfline 403; the developer interview was unreachable).
- [prod] (abstract via OpenAlex; ACM 403) **Lopatin, Vossers & Malan-Revell (SIGGRAPH 2024 Talks):** open-world games such as Assassin's Creed Odyssey and Death Stranding use "animated height displacement maps" for shore waves, which cannot handle "overhangs and changing topology of collapsing oceanic waves". They propose "a set of approximation curves" fitted to wave simulation data — [doi:10.1145/3641233.3664308](https://doi.org/10.1145/3641233.3664308).

### Inferences (the recipe for Rich; Classic is discussed in §6)
**Coverage and brightness**, per loft vertex, with render-only parts allowed to differ online:
- **Coverage:** cov = g × smoothstep(1.0, 0.75, ξ) × toeMask(σ, ξ, t) × holes(σ, ξ, t).
  - toeMask is 1 behind the displaced toe u_t′ and ragged beyond it: fingers at the toe-noise wavelengths.
  - holes is a render-only cellular mask near the toe, with lifetimes Froude-scaled from under 0.1 s in the lab to about 0.3–0.4 s at h₁ = 1.5 m.
- **Where coverage is low,** draw the water with its bubbly tint: brighter and greener with the lens's α (Dierssen; Bohren), using the existing `freshness`/churn path.
- **Where coverage is high,** draw foam with linear albedo 0.40–0.55 at the crest band, ramping down toward the toe (Haller & Catalán). Only the crest band reaches the top of the range, matching stage-A foam (Dierssen 50%).
- **Why not optical depth.** Do not fade the lens by thickness. With bubbles about 1 mm across, even millimetres of aerated water are optically thick [inference from geometric-optics extinction, σ ≈ 1.5 α/r]. The toe's translucency is coverage, not thin-layer transparency.
- **Normals:** the loft's own normals (§2) plus a foam micro-normal of 2–6 mm (Hansen & MacMahan, via `roller_geometry.md` §4) and churn domes (`churnTexture.ts`).
- **Shadows:** the loft already casts and receives shadows through its depth material (`swept_surface_build.md` §5). At low sun the lumpy roller top self-shadows, which is a strong scale cue.

**Handover to residual foam** [inference]
- **Texture advection.** Advect the roller's foam texture with the lens's sampled flow: c inside the roller, falling to ū at the rear taper. Use two-phase flow maps (Valve) or Neyret-style advected coordinates, as in `whitewater_foam.md` §9.
  - Foam on the roller then travels with it.
  - Foam at the rear decelerates to the current's speed and becomes FoamField foam, which the FoamField is already making there (its source ∝ B × dissipation) and advecting at ū.
  - This follows Surf's Up's rule of anchoring particles where they were born, applied to a texture.
- **Look split.** Across the rear taper (ξ = −ξ_b … 0), cross-fade from the roller look (fresh, bright, "active") to the FoamField look (`foam_lifecycle.md`, age-indexed).
- **An interface for the foam look.** Export an `active` scalar per loft vertex (= cov), plus a top-down mask if the water mesh needs it, so the foam look knows where active roller foam ends.
- **Shedding.** When a slice sheds, the lens fades over t_c/w_b (§1). Nothing new is added to FoamField or AerationField: their foam and plume air already exist from the bore's own dissipation (`aerateBores`, `src/wave/SurfZoneSimulation.ts:890-901`). This avoids double-counting air.

**Spray and mist** [inference; rates stay the game's render densities, which may differ online]
- **From the toe line** (u_t′ per slice):
  - events at the Froude-scaled finger and crown rate: about 0.8–1.1 Hz at h₁ = 1.5 m, from the lab's 3.5–4.5 Hz. The lab counted events across a 0.7 m wide channel, so how the rate grows with toe length is unknown; provisional;
  - droplets launched forward at 30° and 45° modes (range 17–83°), at up to about 1.5c;
  - millimetre drops, which do not Froude-scale.
- **From the crest line** (u_c per slice), when offshore wind exceeds the existing feathering onset: spray blown back over the wave.
- **Amounts** keep today's rule, proportional to the bore's dissipation (`SPRAY_PER_FOAM`), but spawned on these two lines instead of across the whole bore face.
- **Mist:** keep Surf's Up's lesson and let a secondary mist hang and drag above the roller to soften hard particles. Physically, this is the lingering fine fraction of `whitewater_foam.md` §5.
- **Fade-in.** When spray is born on a surface, fade its occlusion in over its first few frames (Surf's Up's lip-spray fix), so it doesn't look pasted on.

**What to borrow from production, and what not** [inference]
- **Borrow:**
  - an emitter curve carrying energy: our crash curve (already Padang spec 13.6), plus the roller's toe and crest lines;
  - particles anchored at birth;
  - pre-simulated clips, but only if they come from a physics simulation (for example the Basilisk splash-up), and only for spray, mist and foam-ball visuals;
  - the frequency split: shared lattice for geometry, maps for the fine band.
- **Do not borrow:**
  - an artist-directed skirt, or speeds and gravity "manipulated in non-real world ways". Both are what Surf's Up says was not physical, and both break the owner's "real" rule;
  - Voronoi "scale enhancement" as geometry.

### Gaps
- **No surf-zone field data for the look:** no field albedo of surf-zone rollers specifically, and no measured spatial statistics of holes or fingers on field bores.
- **Nothing public from games.** No published technical description of True Surf's or any surf game's whitewater. Surf's Up's whitewater simulation itself is "outside the scope" of its notes.

---
## 5. Cost, the files that would change, and the risks

### Takeaway
The roller is cheap if it rides on the barrel's loft and its section analysis uses plain bilinear sampling:
- about 0.07 ms per simulation step for the analysis;
- about 1 µs per contact query;
- a noise term in a vertex shader that already exists.

The risks are dependency and consistency, not speed:
- it cannot start before the barrel's front line and loft exist;
- it inherits the solver's bore shape;
- its thresholds must not flicker, or differ between players.

### Cited Findings
- [meas] **Timings.** Apple M1 (8 GB), Node v22.17.0 (V8), macOS 15 (Darwin 24.6), 2026-09-29, with other sessions running (load average 18–36, so medians are pessimistic). Synthetic curved bore (H ≈ 1.2–1.5 m) on a 160 × 320 grid of 1 m cells. Scripts: `<session scratchpad>/roller/roller_bench.mjs` and `roller_bench2.mjs` (scratchpad; may be deleted).

  | Work | Size | Median | p95 |
  |---|---|---|---|
  | Section analysis, renderer-exact (4×4 Catmull-Rom) | 301 slices × 120 samples | 2.02 ms | 2.91 ms |
  | Section analysis, lite (bilinear) — recommended | 151 slices × 60 samples | 0.065 ms | 0.071 ms |
  | Stage-B loft on the CPU (Catmull-Rom + lens + 2 noise octaves) | 301 × 48 = 14,448 vertices | 2.10 ms | 2.38 ms |
  | Contact queries (four-vertex rebuild, triangle, α, flow) | 1000 queries | 0.79 ms | 0.89 ms |
- [meas, from `swept_surface_build.md` §6] **The barrel loft alone** costs 0.19–0.93 ms per frame on the CPU for 7.8k–38.5k vertices (M1). On the GPU it is a vertex-shader loft fed by a slice texture of about 5–10 KB per frame.
- [code] **Hooks the recipe would use:**
  - `SurfZoneSimulation.afterWater` (`src/wave/SurfZoneSimulation.ts:590-598`);
  - the handover arrays (`:480-544`) and `SurfZoneState` (`src/wave/surfZoneState.ts:8-16`);
  - the worker snapshot's transferable buffers (`src/game/SurfZoneWorkerCore.ts:24-28`);
  - `PhysicalSurfWater.sampleAt` (`src/physics/PhysicalSurfWater.ts:106-172`).

### Inferences
**Budget** (target M4 Pro; M1 accepted as slow; measured, never a gate):
- **Worker, per step:**
  - lite analysis ≈ 0.07 ms on M1 [meas];
  - state machine and smoothing: tens of µs [inference];
  - contact queries: under 0.05 ms for a few riders [calc from meas].
- **GPU, per frame:**
  - the added per-vertex work is about 16 hashes plus interpolation, roughly 300–400 ALU operations, and the section's Catmull-Rom (16 fetches) the barrel loft already needs;
  - at 20k–40k loft vertices that is well under 0.1 ms on an M4 Pro [inference, not measured].
  - Roller fragment shading costs about the same as the Rich water over the roller's screen area.
- **CPU loft fallback:** not needed for drawing, because WebGL2 draws the vertex-shader loft. It is 2.1 ms per frame for 14k vertices on M1 [meas] if ever required.
- **Network:** handover state is about 10 values × a few hundred line points (a few KB). The per-frame worker-to-page slice buffer is about 32 B × 600 slices ≈ 20 KB, transferable.

**Files that would change** (the roller follows the barrel's Part B; names of Part B modules are not yet fixed):
- **New in `src/wave/`:**
  - `RollerField.ts`: section analysis, state machine, lens parameters, contact helpers.
  - `rollerNoise.ts`: pcg3d plus quintic value noise, with a GLSL twin string (and WGSL if the loft moves to compute). Follow the `cubicSurface.ts` pattern of a CPU function and a shader text tested together.
- **`src/wave/SurfZoneSimulation.ts`:**
  - update the roller in `afterWater` after breaking and the lip;
  - add its state to `stateArrays`, `exportState` and `importState`;
  - expose the slice buffer.
- **`src/wave/surfZoneState.ts`:** the roller's per-point arrays, or a `roller` header next to `lip`.
- **Worker snapshot types:** `src/game/SurfZoneWorkerCore.ts` and the host that owns snapshot buffers.
- **`src/physics/PhysicalSurfWater.ts`:**
  - `sampleAt` and `surfaceAt` read the lens: surface, slope, α(y), flow(y);
  - delete the P11 `ROLLER_SHARE` push;
  - `airAt` takes the maximum of lens and plume air.
- **The barrel's loft module** (Part B, `src/scene/water/…`): stage-B profile in the vertex shader, the `active` coverage attribute, and the depth and shadow material.
- **Rich shading** (`src/scene/water/richWaterGlsl.ts` or the loft's material): coverage, albedo ramp, bubbly tint, micro-normals, flow-advected foam texture.
- **Spray and foam ball:**
  - `src/wave/SprayCloud.ts`: spawn spray on the toe and crest lines.
  - `src/wave/PlungingLip.ts`: size the foam ball from the lens, not `ROLLER_AREA = 0.9`, and fade it through the stage A → B blend.
- **Tests and a report, `npm run report:roller`.** Per spot, report:
  - L_r·tanθ against H (field r² 0.89);
  - θ at birth and when developed (25° → 16–22°);
  - lens water area (0.33–0.36 H²);
  - c against √(g(h + H/2));
  - Fr₁ at shedding, and disagreements between Kennedy and Fr;
  - push on a prone rider against 330·H Pa;
  - a paddler's impact peak over its quasi-steady force (≤ 1.5);
  - CPU against GPU vertex agreement (≤ 1 mm);
  - handover parity;
  - timings.
- **Parity tests:** an integer pcg3d test (JS against expected words, and against GLSL on a small render); the triangle-exact contact test ("the rider hits what is drawn").

**Risks** (with the check that catches each)
1. **Dependency on the barrel.** No front line or loft means no roller. Roll out behind the same per-spot switch as the swept surface (Padang first).
2. **The solver's shape shows through.** The top follows the solver's η plus a few centimetres of bulking. If the solver's bore is too steep or too gentle (θ outside 16–25°, or L_r·tanθ far from H), the roller shows it. The roller report catches this; the cause would be in the solver, and would be raised as such.
3. **Flicker, and mismatch between players online.** States, gaps and line ends that flip at thresholds show as popping, and online as whitewater present for one player but not another. Guard with hysteresis (1.3 / 1.45), 4 m closing and opening along the crest, a Lipschitz clamp on g, deterministic arithmetic in comparisons, and handover of the roller state.
4. **Breaking signals disagree.** Kennedy's termination and the Froude rule can disagree, giving whitewater without dissipation or the reverse. Require both for ACTIVE, and count disagreements.
5. **Gameplay.** α up to 0.9 at the top can make the soup unrideable, or the carry can be too weak. Use ᾱ and N as dials within the sourced range, and check against the Duncan–Martins force and tidal-bore speeds (2.5–3.1 m/s on 0.3–0.6 m bores).
6. **Hard contact would be wrong.** If the barrel's contact enforces SD ≥ 0 on the whole profile, boards stand on the froth. Mark the lens as soft (§3.4) and agree the interface with the Padang session.
7. **Small bores jitter.** On a 1 m grid a roller under about 4 m long has a jittery toe. Use the parametric fallback (§1.3).
8. **Roughness amplitude is uncertain.** 0.2–0.3 H standard deviation is lab-extrapolated and could read as too lumpy. Tune within 0.13–0.4 h₁ against film of the reference spots (Supertubos, J-Bay/Snapper, Teahupo'o).
9. **Vertex budget on long closeouts.** Use LOD with coarser slices far away (2 m) and drop the noise octaves beyond about 100 m. Remote riders far from the camera may then sit a few centimetres off the coarse drawn surface, which is invisible at that distance.
10. **Overlapping fronts.** A reformed wave, a crossing peak, or a new roller running into old foam can overlap loft footprints. Needs a rule, for example the shoreward front drawn on top, or merging lines as Thürey does.
11. **Reports shift.** The collided surface changes in whitewater, so re-run the catch, ride, duck-dive and hold-down reports.
12. **Shader twins drift.** The TS, GLSL and WGSL versions of the noise must stay identical; add a parity test like `cubicSurface`'s.

---

## 6. Decisions that are the owner's, not mine
1. **Classic look.** The roller changes the surface the rider hits, so by the one-water rule Classic must draw its geometry too, with Classic shading. That is the same call the owner made for the swept barrel (Padang spec item 15, "Classic draws the swept surface too"). Otherwise a rider in Classic sinks into whitewater that is not drawn. This reopens "Classic unchanged" in the roller's footprint.
2. **Roller density ᾱ, within 0.13–0.4** (provisional 0.25). It sets how high whitewater stands (2–10 cm per metre of H) and how much boards bog. Best chosen after a playtest.
3. **Bulk the plume too?** Whether aerated water behind the roller (the plume) should also raise the surface by its air. This is physically consistent, but would change the collided surface over whole whitewater patches.
4. **Roughness within the sourced range,** 0.13–0.4 h₁ standard deviation, judged on film.
5. **Cross-section shape.** Thickest at the crest (the jump analogy, provisional here) or an even band along the face (Martins' drawing). This can be settled from our own Basilisk runs when the barrel library is built.

---

## Sources opened this round
- Tissier et al. 2012, Coastal Eng. 67 (full text): https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf
- Bacigaluppi et al. 2019 (full text): https://arxiv.org/pdf/1902.03021
- Misra et al. 2008, Phys. Fluids 20 (full text): https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Misra-et-al-2008-POF-weak-hydraulic-jump.pdf
- Martins et al. 2018, JGR Oceans (full text; Fig. 7 read): https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf
- Svendsen 1984, ICCE ch. 4 (full text): https://icce-ojs-tamu.tdl.org/icce/index.php/icce/article/download/3785/3468
- Yeh, Ghazali & Marton 1989, JFM 206 (abstract): https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/experimental-study-of-bore-runup/FB3EAE8F738AE30137147990C835CF33
- Wang, Leng & Chanson 2017 (full text; Fig. 7 read): https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf
- Shi, Wüthrich & Chanson 2023a, IJMF 159:104338 (full text): https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023a.pdf
- Shi, Wüthrich & Chanson 2023b, IJMF 159:104337 (full text): https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023b.pdf
- Wüthrich, Shi & Chanson 2022 (full text via PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC9363398/
- Brodie et al. 2015, JTECH 32 (abstract via Crossref): https://doi.org/10.1175/JTECH-D-14-00222.1
- MIKE 21 BW Scientific Documentation 2017 (full text; roller concept, no angle values): https://manuals.mikepoweredbydhi.help/2017/Coast_and_Sea/MIKE21BW_Sci_Doc.pdf
- Surf's Up course notes, SIGGRAPH 2007 (decoded): https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf
- Making Waves for Surf's Up (full text): https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf
- Surf's Up Beach Break (full text): https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf
- Moana: ocean and water pipeline (full text): https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Palmer_The-Ocean-and-Water-Pipeline-of-Disneys-Moana.pdf
- Moana: Crashing Waves (full text): https://alexey.stomakhin.com/research/siggraph2017_waves.pdf
- Moana: Performing Water (full text): https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Frost_Moana-Performing-Water.pdf
- True Surf launch, Meta blog (full text): https://www.meta.com/blog/true-surf-launch/
- Lopatin, Vossers & Malan-Revell, SIGGRAPH 2024 Talks (abstract via OpenAlex): https://doi.org/10.1145/3641233.3664308
- Jarzynski & Olano 2020, JCGT 9(3) (full text): https://jcgt.org/published/0009/03/02/paper.pdf
- GLSL ES 3.00 specification §4.1.3: https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
- WGSL, Integer Types: https://raw.githubusercontent.com/gpuweb/gpuweb/main/wgsl/index.bs
- ECMA-262, Math object: https://tc39.es/ecma262/multipage/numbers-and-dates.html
- Bullock et al. 2007, Coastal Eng. 54 (snippet only; 403): https://www.sciencedirect.com/science/article/abs/pii/S037838390600192X

---

## Summary
- **Track:** reuse the swept barrel's front line.
  - Each step, read a solver section per slice: crest, toe (20% gradient), trough, H, h₁, h₂, Fr₁ = √(r(r+1)/2), L_r, θ, c.
  - The roller forms after the tube's void has gone (plungers) or when a front breaks with Fr₁ ≥ 1.45 (spillers).
  - It develops over 5–8 breaker depths, and runs at c.
  - It sheds below Fr₁ = 1.3 (over troughs), when the solver stops dissipating, or at the shoreline, where it becomes the run-up's thin splashed layer.
  - Smooth and hysteresis-guard the states so they never flicker or differ between players.
- **Shape:**
  - an aerated lens from the crest to a rounded toe, holding 0.33–0.36 H² of water;
  - void fraction 0.9ζᴺ, mean 0.13–0.4 (0.25 provisional);
  - top = solver η + the lens's air (2–10 cm per metre of H) + turbulence;
  - underside ≈ 0.15H under η at the crest.
  - It is drawn as the post-collapse stage of the barrel loft: one mesh, one seam, one contact path.
- **Turbulence:**
  - pcg3d value noise at the loft's vertices, keyed on σ, ξ and the step count, so it is bit-identical in its hashes on the CPU and GPU;
  - standard deviation up to 0.13–0.4 h₁ in the toe half, scales 0.5 → 3 h₁;
  - the toe wanders at 1 h₁ and 5–10 h₁ wavelengths, at about 0.1–1 Hz at field scale.
- **Contact:** no new forces.
  - The lens changes what `SurfWater.sampleAt` returns: the surface (triangle-exact), α(y), and flow(y) = c in the roller.
  - Boards bog in the airy top, get carried at up to c (about 330·H Pa, as a check), and paddlers take a drag hit capped near 1.5× quasi-steady.
  - It replaces the P11 `ROLLER_SHARE` push.
- **Look:**
  - coverage from a fingered, holed toe to a solid crest band;
  - albedo 0.4–0.55 at the crest; green-cyan bubbly water in the gaps;
  - foam texture advected by the lens flow, so the handover to FoamField residual foam is continuous;
  - spray from the toe (30–45°) and crest (wind).
  - Surf's Up's crash curve and clip instancing carry over, but its hand-directed "skirt" does not: our sourced toe replaces it.
- **Cost:** about 0.07 ms per step for the analysis and about 0.8 µs per contact query on a loaded M1. The GPU work is inside the barrel loft's vertex shader.
- **Main risks:**
  - the dependency on Part B;
  - the solver's bore shape showing through;
  - threshold flicker, and online mismatch;
  - soft versus hard contact at the lens;
  - Classic drawing.
