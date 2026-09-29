# Surf-zone foam that visibly ages: an implementation recipe

Researched 2026-09-29 against `origin/main` at 60b4727. Tags:
- **[field]** field measurement; **[lab]** laboratory measurement; **[DNS]** direct numerical simulation; **[model]** theory, fit or parameterisation;
- **[prod]** film or game production practice; **[game]** this repository, cited by `path:line`;
- **[my model]** my own prototype (scratch only, not game code); **[inference]** my reasoning from the cited numbers.

Access: *(full text)* read in full; *(abstract)* abstract only, usually via the OpenAlex API because the publisher blocked automated access; *(snippet)* search summary only, not opened. I could not open the Claude Doc "Wave Physics Research" (no docs tool in this session), so this note builds on the earlier notes in `research_notes/Breaking waves foam and tubes/whitewater_foam.md` and `research_notes/Barrel profile library and Padang reef/roller_geometry.md`.

The prototype is in the session scratchpad, not in the repo: `<session scratchpad>/bake/` (`ks_bake.py`, `preview.py`, `chords.py`, `voronoi_stats.py`, and the images `preview_stages.png` and `logc_t*.png`). The scratchpad is temporary; copy the script into a scratch worktree if it is wanted later.

---

## 0. Recipe at a glance

1. **Clock.** Add a foam-weighted "turbulent age" channel to `FoamField`: the number of eddy turnovers the foam has lived through, driven by the aeration field's turbulence. Optionally also carry plain age in seconds, and a formation length scale.
2. **Texture.** Bake the life cycle offline as the concentration of floating foam clustered by a compressible, time-correlated kinematic simulation of surface turbulence, with compressibility C = 0.5 (measured). Store it Gaussianised in a 3D texture (x, y, turbulent age), for example 512² × 32 R8, plus a small inverse-transform table.
3. **Shader (Rich only).**
   - Two flow-map phases, blended with a variance-preserving Gaussian blend.
   - Threshold at Φ⁻¹(1 − F), so the covered fraction still equals the FoamField value exactly.
   - Local bubble layers N = c/c_threshold, and albedo R(N) = 0.55·(1 − e^(−N/5)). The anchors are 1 layer = 0.10 and ≥ 25 layers = 0.55.
   - Composite foam over the bubble-lit water as a layer, not as opaque paint.
4. **Deformation.** Carry a foam-weighted stretch tensor B = F·Fᵀ, and stretch the texture at the existing streak anchors. This replaces the constant STREAK_STRETCH = 7.
5. **Convergence.** Add the compression factor exp(−∇·u·dt) to FoamField's semi-Lagrangian step. Optionally feed dense foam from plume degassing, so bigger plunges stay white longer (Callaghan).

Classic stays byte-identical. Everything visual goes into `RICH_FOAM`. The FoamField changes are physics, which both looks consume, as in G9 Part B.

---

## 1. Why today's lace reads as "giraffe skin" (diagnosis)

### Cause, in code
- **[game]** The lace is one Voronoi F2−F1 network:
  - 0.7 m cells, one jittered point per cell (`src/scene/foamPattern.ts:17-22`, `:52-70`);
  - baked into a 512² RG8 tile that repeats every 44.8 m (`:92-126`);
  - thresholded so the covered fraction equals the foam value (`:149-164`).
- **[game]** The only inputs are foam amount, flow, time and footprint (`foamPattern.ts:226`). There is no age. The same network shows at every age; only the band width changes with the foam value.
- **[game]** The renderer only receives dense + residual summed: `src/wave/SurfZoneSimulation.ts:878` writes `dense[i] + residual[i]` into the green channel of the surface texture (`src/scene/WaterSurface.ts:130-137`). Freshness in Rich comes from the aeration void fraction (`src/scene/water/churnTexture.ts:40-46`), not from foam age.
- **[game]** The two flow-map phases are cross-faded **after** thresholding: `mix( weight*coverA + (1-weight)*coverB … )` (`foamPattern.ts:234-236`). At mid-phase two half-strength networks overlap. Neyret (2003) calls this "ghosting effects and contrast fading" (§4).
- **[game]** Streaks are the same Voronoi tile stretched 7× along the current on steep faces (`src/scene/water/streaks.ts:3-11`, `:48-51`). The stretch is a hand constant, not the flow's deformation.
- **[game]** Rich foam is one opaque colour, `#d8f2e9`, about (0.69, 0.89, 0.82) in linear RGB under three's default colour management (`WaterSurface.ts:261`). It is mixed opaquely over the water (`src/scene/water/richWaterGlsl.ts:87`). Old lace is therefore as bright as fresh foam.

### Evidence, measured on an equivalent pattern [my model]
I rebuilt the construction in numpy (one uniformly jittered point per cell, F2−F1, threshold by quantile) and measured run lengths along rows and columns:

| Pattern | Void chord at coverage 0.65 / 0.40 / 0.22 | Void-chord CV |
|---|---|---|
| Voronoi F2−F1 | 0.53 / 0.64 / 0.78 cells, i.e. 0.37 / 0.45 / 0.55 m at 0.7 m cells | 0.45–0.59 |
| Clustering bake (§3) at the same coverages, ages 2 / 5 / 12 s | voids grow 1.6 → 2.3 → 3.6 L_int | 0.59 → 0.72 → 0.83 |

- The Voronoi voids are nearly one size at every coverage, and the walls are uniform-width bands of a complete network. That is the "giraffe".
- Real floater networks have multiscale voids, a few thick bright ridges with many thin dim threads, dangling and broken filaments, and coarsen as they age (§2).

### What the player sees and what goes wrong
The player sees the same honeycomb, at the same scale and brightness, from the bore front to foam a minute old. Nothing says "this foam is old", and the cell regularity is the tell of a procedural pattern.

---

## 2. The life cycle to encode: stages, timescales, brightness, cell size

### 2.1 Measured anchors

- **Reflectance and area of a single whitecap over its life.** Koepke 1984 *(full text)*: North Sea platform, wind 7.5–8.5 m/s, water 15–16 °C, photos at 1 s intervals. [field]
  - A patch's **area grows** while its **reflectance falls**. Normalised area a(t) = 1 − exp(−β·t^γ), with β = 0.25 s⁻¹ and γ = 1 for whitecap patches, and β = 0.7, γ = 0.4 for wind foam streaks, which "spread fastest when they have just been generated".
  - Reflectance peaks about 1.5 s after generation. Individual patches reach 55%; the mean is always lower.
  - A patch falls below the 10% "white" threshold at about 7.5 s. Streaks sit near 10% (one bubble layer, per Whitlock), decline slowly (Table I's cumulative streak value only falls from 10% to 9.0% over 10 s), "are fairly stable" and live more than 10 s.
  - Cumulative area-weighted reflectance (Table I): 41% (1 s), 35% (2 s), 30% (3 s), 28% (4 s), 25% (5 s), 23% (6 s), 21% (7 s), 19% (8 s), 18% (9 s), 16% (10 s).
  - Dense clear-water foam reflects about 55% up to 0.8 µm (Whitlock et al., lab). A model of more than 25 uniform bubble layers also gives about 55% (Stabeno & Monahan). Foam-free rough sea is about 5.5%. Foam is assumed isotropic, "in agreement with visual inspection".
  - [inference] Backing the instantaneous patch-mean reflectance out of Table I with Koepke's a(t) gives roughly **0.41 (0.5 s), 0.33 (1.5 s), 0.25 (2.5–3.5 s), 0.18 (4.5–5.5 s), 0.14 (6.5 s), 0.10 (7.5 s)**. The table's integer rounding makes later values noisy.
  - [PDF (EUMETSAT copy)](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- **Foam area over time, lab.** Callaghan, Deane & Stokes 2017 *(full text)*: Scripps glass seawater channel, 30 Hz, 2 mm pixels. [lab]
  - Foam area grows quickly while air is entrained, peaks at A_o, then decays. Filtered seawater fits A(t) = c₀·tⁿ·exp(−t/c₁) with n = 1.25 and c₁ = 0.39 s for that lab wave (r² = 0.99).
  - In filtered seawater the decay is about exponential throughout. With surfactant (Triton X-100) it turns "from approximately exponential to approximately linear after an initial, temporary rise". The two diverge at 1.5–3 t_Ao.
  - Clean-water foam "persists for only as long as it is supplied by … sub-surface bubbles", with a roughly 1:1 foam-decay to plume-degassing time. With surfactant, foam decay times were about 3× the plume decay times.
  - Their speculation: early on, large bubbles (r > 0.7 mm) surface into large, fast-rupturing foam cells. Later the foam is replenished by smaller bubbles that Marangoni forces stabilise.
  - [Imperial Spiral PDF](https://spiral.imperial.ac.uk/server/api/core/bitstreams/efad1bcb-9b9a-4876-8882-f28798d8467c/content); [doi:10.1002/2017JC012809](https://doi.org/10.1002/2017JC012809)
- **Whitecap decay times at sea.** Callaghan, Deane & Stokes 2012 *(abstract)*: 552 whitecaps. Decay times range 0.2–10.4 s; the area-weighted effective value is 1.4–4.8 s; decay time rises with maximum patch area. [field] — [doi:10.1029/2012JC008147](https://doi.org/10.1029/2012JC008147)
- **Salt versus fresh water.** Monahan & Zietlow 1969 *(abstract)*: salt-water whitecap area decays "almost exponentially with a time constant of 3.85 seconds", against 2.54 s for fresh water. Salt water has relatively more bubbles below 500 µm radius. [lab] — [doi:10.1029/JC074i028p06961](https://doi.org/10.1029/JC074i028p06961)
- **Single surface bubbles.** They last 2–4 s (Zheng et al. 1983, via Hwang); lifetimes are Weibull-distributed, and surfactant roughly doubles survival (Watanabe & Saruwatari 2024 *(abstract; PDF skimmed)*). [lab] — [arXiv:1906.11202](https://arxiv.org/pdf/1906.11202); [Flow 4 E17, doi:10.1017/flo.2024.19](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/2B134D64B6264326C041E2B69BBE7BC8/S2633425924000199a_hi.pdf/clustering-coalescing-and-bursting-processes-in-surface-bubbles-of-surfactant-water-flows.pdf)
- **Field reflectance.** Dierssen 2019 *(full text via fetch)*: Long Island Sound, wind 10–12 m/s, Hs 1.5–2 m. [field]
  - Whitecap reflectance averages about 40% in the visible; stage A foam with many layers about 50%; "thin foam … ~18%".
  - Submerged bubbles give "amplifications of the background water reflectance", not white. Lambertian was assumed.
  - [Frontiers](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014/full)

### 2.2 Where the lace comes from (the mechanism behind "opening cells")

Foam is a floater: it cannot follow water that sinks. Surface turbulence has upwellings (sources, ∇·u > 0) and downwellings (sinks). Foam leaves the sources and collects in the sinks, forming string-like clusters. This happens without inertia, surface tension or waves.
- **Mechanism.** Lovecchio, Marchioli & Soldati 2013 *(full text, arXiv)*, DNS of open-channel turbulence with floaters.
  - Floaters "leave quickly the upwelling regions gathering in downwelling regions".
  - The clusters "over-live the surface turbulent structures which produced them".
  - The correlation dimension D₂ decays from about 2 (uniform) to about 1 (lines) "at an exponential rate", with a decay time of "approximately one surface eddy turnover time" (the Larkin et al. result they cite).
  - [DNS] — [arXiv:1305.3705](https://arxiv.org/pdf/1305.3705); [PRE 88, 033003](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.88.033003)
- **Network shape and timing.** Boffetta, Davoudi, Eckhardt & Schumacher 2004 *(full text, arXiv HTML)*, DNS with a free-slip surface at Re_λ ≈ 145.
  - Measured surface compressibility C ≈ 0.45; earlier work found C ≃ 0.5.
  - Clustering is visible by 3.1 large-eddy turnover times. Tracers gather "on a network of narrow ridges with bigger empty voids in between" (Lyapunov dimension ≈ 1.15).
  - Finite time correlation of the flow matters, and weakens clustering at intermediate C.
  - [DNS] — [arXiv:nlin/0408031](https://arxiv.org/html/nlin/0408031v1); [PRL 93, 134501](https://doi.org/10.1103/PhysRevLett.93.134501)
- **Compressibility and the concentration distribution.** Larkin, Bandi, Pumir & Goldburg 2009 *(full text)*, jet-stirred tank, Re_λ ≈ 160.
  - Surface compressibility C = ⟨(∇₂·v)²⟩/⟨(∇₂v)²⟩ = **0.49 ± 0.02**.
  - The concentration PDF is sharply peaked at zero, with a **power-law tail over two decades**.
  - [lab] — [arXiv:0911.1784](https://arxiv.org/pdf/0911.1784); [PRE 80, 066301](https://doi.org/10.1103/PhysRevE.80.066301)
- **Clustering as compressible surface flow.** Cressman et al. 2004 *(abstract)*: tracers are "dominated by rapidly changing patches of the surface flow divergence" and form multifractal clusters. [lab+DNS] — [NJP 6, 53](https://iopscience.iop.org/article/10.1088/1367-2630/6/1/053)
- **Divergence as the dominant cause.** Gutiérrez & Aumaître *(full text, arXiv)*: horizontal divergence is the dominant clustering cause for real floaters on a deformed surface. They state C is "close to 0.5 near the surface, for free surface flows"; they measured about 1/6 in their MHD layer, about the value for a 2D slice of isotropic 3D turbulence. [lab] — [arXiv:1410.7824](https://arxiv.org/pdf/1410.7824)
- **Length scale of surface structures behind a breaking front.** Wang, Leng & Chanson 2017 *(full text)*, hydraulic jumps and bores, citing Chachereau & Chanson 2011 and Murzyn et al. 2007.
  - The integral length of free-surface turbulent structures "increased from 0·5 × d₁ close to the toe to 3 × …". Here d₁ is the inflow depth.
  - Roller-toe transverse wavelengths are about 1.2 d₁ in the lab; in the Qiantang bore the peaks are about 1 and 5–10 d₁ (range 0.7–25).
  - [lab/field] — [UQ PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- **Surf-zone turbulence intensity and decay.**
  - [game] `AerationField` stirs TKE toward (0.15·√(g h))²·B, citing Ting & Kirby's √k/√(gh) ≈ 0.1–0.2 (`src/wave/AerationField.ts:15-25`). It decays with an e-folding time of T/3 when unstirred (`:125-127`) and is advected (`:213`).
  - [lab review] van der Zanden et al. 2019 *(full text, authors' version)*: on plane-sloping beds, TKE shows "a sharp increase … directly under the wave front, followed by a …" (Okayasu 1986; Ting & Kirby 1995; De Serio & Mossa 2006). Under plunging waves in deep water or over a bar trough it "can take over a few wave cycles to dissipate fully". — [Aberdeen AURA PDF](https://aura.abdn.ac.uk/server/api/core/bitstreams/81f11741-e106-43cd-be95-8c8cf7c3900f/content)

### 2.3 The stages

Times below are after the roller passes a given point. The measured deep-water column comes from Koepke's 8 m/s whitecaps. Surf-zone foam is larger, surfactant-rich and fed by deeper plumes, so it runs slower: up to about 3× (Callaghan 2013/2017), and longer for bigger patches (Callaghan 2012).

| Stage | Deep-water time (measured) | Surf-zone clock (physics) | What happens | Covered fraction inside the patch | Bubble layers → reflectance (per covered texel) | Cells and walls |
|---|---|---|---|---|---|---|
| **A · dense, bubbly (active + plume-fed)** | 0 → about 1.5 s; reflectance peaks near 1.5 s (Koepke) | The roller passes in about L_r/c ≈ 2.9H/c (the 2.9H roller length is from `roller_geometry.md`), then the plume feeds foam for about plume depth / w_b (CDS13 1:1; game plume 0.3–0.8 H, w_b 0.25 m/s → 1.2–3.2 s for H = 1 m; about 10 s for a 3 m reef plunge) | Surface fed by rising bubbles; roller "mushrooms", and "holes" that look darker because clear water lies beneath (Wüthrich et al. 2022, in `roller_geometry.md`) | ≈ 1 | ≥ 25 layers → 0.50–0.55 (Whitlock; Stabeno & Monahan; Dierssen stage A about 0.50). Ship-bow foam 0.50–0.75 (Moore, via Dierssen) | Surface structures about 0.5 d₁ at the toe → 3 d₁ at the back of the roller (Chanson). Mottled, nearly uniform white |
| **B1 · spreading, opening cells** | about 1.5–4 s: envelope a(t) grows to 0.63 by 4 s, patch-mean reflectance falls to about 0.25 | About 1–2 turnovers T_int = L_int/u′ (§4.1): about 2–6 s for d₁ = 1–2 m | Upwellings open clear holes; foam is swept into sinks; D₂ falls from 2 toward 1 | Falls from 1 as the foam thins (FoamField coverage) | Mixed: thick ridges 0.3–0.5, thin skin 0.1–0.2 | Voids appear at about 1–2 L_int; walls wide and continuous |
| **B2 · lace** | about 4–8 s: below the 10% "white" threshold at about 7.5 s | About 2–5 turnovers; the turbulence largely decays within a period (van der Zanden 2019) | "Network of narrow ridges with bigger empty voids" (Boffetta); power-law ridge intensity (Larkin) | 0.1–0.4 | 1–3 layers → 0.10–0.25 in threads; piles in convergence lines up to 0.4–0.5 | Voids about 2–4 L_int; ridges narrow, a few bright, many dim, some broken |
| **C · streaks, residual** | more than 10 s; streaks "fairly stable" at about 10%, falling slowly (Koepke) | Turbulence gone; the pattern is frozen ("clusters over-live" the turbulence, Lovecchio). The mean flow now stretches, carries and compacts it (Chickadel 2003; Rodríguez Padilla 2021 use it as a passive tracer, in `whitewater_foam.md` §3) | Lines stretched along strain; fragments; gathered at convergences (rip plumes, fronts, swash line) | 0.02–0.15 | 1 layer → about 0.10 | Voids 4–6+ L_int; long thin lines aligned with the stretch |

- **[inference] Why brightness falls.** Brightness falls because the foam loses bubble layers, not because a white decal fades. With Koepke's two anchors (1 layer ≈ 10%, ≥ 25 layers ≈ 55%), a saturating fit R(N) = 0.55·(1 − e^(−N/5)) gives:
  - 0.10 at 1 layer, 0.18 at 2, 0.25 at 3, 0.35 at 5, 0.48 at 10 and 0.55 at 25.
  - The 2-layer value matches Dierssen's 18% thin foam. The fit is Kubelka–Munk-like; its constant of 5 layers is fitted, so treat it as provisional.
- **[inference] Absolute numbers.** Surf-zone L_int is not measured. For d₁ ≈ 1 m and the mid value κ_L = 1 of Chanson's 0.5–3 d₁:
  - voids about 1 m in B1, 2–4 m in lace, 4–6 m in late residual;
  - today's lace voids are 0.37–0.55 m at every age.
  - Treat the whole scale as **provisional** until it is measured from footage (§9).

---

## 3. How to produce the texture

### 3.1 Options compared

| Option | Physics honesty | Parameters sourced? | Effort | Verdict |
|---|---|---|---|---|
| **A. Kinematic simulation (KS) of compressible surface turbulence + floating foam concentration** | The measured mechanism (Lovecchio; Boffetta; Larkin) | C = 0.5 measured; spectrum and turnover from KS practice (Fung et al. 1992); length and time scales from Chanson and Ting & Kirby | ~200 lines of FFT code, minutes to bake | **Recommended**: simplest honest option |
| B. 3D DNS of decaying turbulence under a free-slip lid, then advect foam on the surface | Most honest | Yes | Days of work, hours to run | Use only to validate A if its statistics are disputed |
| C. Houdini-style repellant particles | Repellants act like upwellings. The SideFX docs say they "give rise to a cellular foam structure" (in `whitewater_foam.md` §9) | No: rate, radius and strength are artist values | Needs Houdini | Production practice, provisional |
| D. Voronoi with growth (Johnson–Mehl hole nucleation) | Hole opening in a thinning raft | No: nucleation rate and rim speed are unsourced | Low | It is today's giraffe with a growth law |
| E. Bubble coarsening / drainage (von Neumann; power diagrams: Busaryev et al. 2012) | Right physics at the **bubble** scale (0.1–10 mm) | Partly: surface bubble sizes, lifetimes | Medium | Use only for a close-up micro layer (§3.5), not the lace |
| F. Wētā "wet foam" SPH (Wretborn, Flynn & Stomakhin 2022) | Film production; physically inspired | No | High | Out of scope |
| G. Measured texture from drone footage | A measurement | Yes, if the ground sampling distance is known | Tiling and age alignment are hard | Use to **validate** A (§9) |

- Wretborn et al. 2022 *(abstract)*: bubbles as discrete air particles two-way coupled to a sparse Euler flow; "as bubbles reach the surface, they are converted into foam and simulated …". [prod] — [doi:10.1145/3528223.3530059](https://dl.acm.org/doi/10.1145/3528223.3530059)
- Busaryev et al. 2012 *(abstract)*: bubble sites as a weighted Voronoi diagram, with Plateau's laws, surface-bubble clusters, bursting and coalescing. [model] — [doi:10.1145/2185520.2185559](https://doi.org/10.1145/2185520.2185559)
- Fung, Hunt, Malik & Perkins 1992 *(abstract)*: KS by random Fourier modes, with Gaussian amplitudes and unsteadiness in which large eddies advect small ones. "The structure of the velocity field is found to be similar to …". [model] — [doi:10.1017/S0022112092001423](https://doi.org/10.1017/S0022112092001423)

### 3.2 Recommended bake (option A), concrete

- **Domain.** Periodic square of side 16 L_int on a 512² grid, or 32 L_int on a 1024² grid, so dx = L_int/32 (about 3 cm at L_int = 1 m). It tiles seamlessly because every Fourier mode fits the domain.
- **Surface velocity.** u = ∇⊥ψ + ∇φ, with Gaussian random ψ and φ of equal spectra, so the compressibility C = E_φ/(E_φ + E_ψ) = 0.5 (Larkin 0.49 ± 0.02; Boffetta 0.45).
  - Spectrum: E(k) ∝ k⁴ at low k, peaking at k_p ≈ 1.7/L_int, with a k^(−5/3) range out to about 16 k_p. [model] The spectrum shape is KS practice, so provisional.
- **Time correlation.** Each mode follows an Ornstein–Uhlenbeck process with correlation time τ_k = λ⁻¹·(k³E(k))^(−1/2), λ ≈ 0.5–1 (Fung et al.'s unsteadiness idea). This time correlation is required (Boffetta 2004).
- **Stationary intensity.** Bake the flow at constant intensity u′ and let the game's clock (§4.1) handle decay. The texture is then universal, indexed by turnovers s = ∫u′/L_int dt.
- **Foam.**
  - Concentration c starts uniform (mean 1).
  - Advection is conservative: flux form (for example MUSCL with a limiter), or semi-Lagrangian times the Jacobian exp(−∇·u·dt) with a mass fix, as in my prototype.
  - A small diffusion D ≈ 10⁻³ L_int·u′ (provisional) stands for the finite width of a bubble raft.
  - Bursting is **not** baked. It is uniform first-order loss, so it factors out: N(x,t) = c(x,s)·N̄(t), and the shader applies N̄ (§5).
- **Output slices.** 24–32 slices, spaced log-uniformly in s from 0.05 to about 8–12 turnovers, plus a uniform s = 0 slice. For each slice:
  - store G = Φ⁻¹(rank(c + ε)), the Gaussianised rank (Heitz & Neyret 2018), as R8 over ±4σ;
  - store the inverse table G → log₂ c, 256 bins per slice, R16F.
  - The small ε is a sparse-bubble background, so ties in empty areas rank smoothly.
- **Sizes.**

  | Bake | Texel | Tile | Raw size |
  |---|---|---|---|
  | 512² × 32 R8 | L_int/32 (3 cm at L_int = 1 m) | 16 L_int (16 m) | 8.4 MB |
  | 1024² × 24 R8 | L_int/32 | 32 L_int (32 m) | 25 MB |

  - The inverse table is 32 KB. The chase camera at 8 m sees about 4 mm per pixel at 1440p [inference], so ridges want 2–3 cm texels. The tile should be at least 3–4× the largest late void (§2.3), i.e. 16 m or more.
- **Checks written into the bake's test.**
  - Measured C of the flow is 0.50 ± 0.05.
  - Visible network by about 3 turnovers (Boffetta).
  - Heavy-tailed concentration PDF (Larkin).
  - Seamless wrap; exact Gaussian marginal per slice.
- **Where it runs.**
  - Offline, as a script alongside `scripts/whitewater-report.ts`, or in Python.
  - Ship it as an asset. Alternatively bake on first load in a worker with WebGPU compute; my estimate is seconds on an M4 Pro.

### 3.3 Prototype result [my model]
- **Set-up.** `ks_bake.py`: 256² grid over 12 m, peak wavelength 1.5 m (L_int ≈ 0.40 m), u′ = 0.5 m/s, C measured 0.51. The flow decayed with τ_u = 6 s. 811 steps took **6.7 s on this Apple M1 (8 GB)**. A 1024² bake would take roughly 5–10 min in numpy [inference].
- **Preview.** `preview_stages.png` shows six stages. Each is thresholded to a plausible coverage path (0.97, 0.85, 0.65, 0.40, 0.22, 0.12 at 0.5, 1, 2, 5, 12, 30 s) and shaded with R(N) plus the layer-over-water formula of §5. The sequence reads as dense mottled → holes → cells → lace with bright ridges and dim fringes → broken threads → fragments.
- **Patch-mean reflectance.** 0.39, 0.37, 0.30, 0.20, 0.125, 0.089. That is Koepke's instantaneous series (0.41 → 0.10 over 7.5 s) stretched about 1.5–2× in time, which is the direction surf-zone foam should go.
- **Void chord.** It grew from 0.8 to 6 L_int, and its CV from 0.59 to 0.83 (§1).
- **Limit.** Semi-Lagrangian diffusion at 4.7 cm pixels widened the ridges to about 0.3–0.4 m. A 1024² flux-form bake is needed for honest ridge widths.

### 3.4 How Surf's Up indexed and splatted its foam cycle [prod]
Kluyskens 2007 *(full text)*:
- "A foam pattern (convection) life cycle is simulated and rendered as a repeatable texture". It was an image sequence used as a 3D shader, "X and Z being U and V, and the sequence being the Y axis".
- "A hybrid RenderMan splatting shader takes 'bites' out of this structure." Attribute-carrying particles and rendered attribute maps set "placement, life cycle stage, deformation and fading". At the leading edges of licks and waves the shader "switches to attribute texture map lookups" for precision.
- The result was "beyond any procedural texturing method that tries to depict foam using noise functions".
- No resolution, frame count or cycle length is published.
- The game's 1 m FoamField is the "attribute map" path. The per-pixel flow-mapped, hex-offset lookup (§4.2) is the "bite".
- [PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)

### 3.5 Optional close-up layer (tube camera)
- At 1–3 m the pixels are about 1 mm, so bubbles show. A small 256² tile at about 1 mm per texel (a 25 cm tile), made from a power-diagram bubble packing, could modulate brightness inside covered foam.
  - Surface bubble radii 0.1–5 mm; the size spectrum steepens above about 1 mm (Deane & Stokes, via `whitewater_foam.md` §6).
  - Settled foam has mm-scale roughness: mean 3.2 mm, range 1.7–6.3 mm (Hansen & MacMahan *(snippet)*, in `roller_geometry.md`).
- Do **not** bake bubble coarsening with age. Callaghan 2017 suggests late foam is replenished by *smaller*, stabilised bubbles. Provisional; this is polish (the owner's order item 3).

---

## 4. Driving it from the game's fields

### 4.1 Yes, FoamField needs an age channel (a Lagrangian memory)
- **Why.**
  - The dense/residual ratio is 0 for lace 5 s old and 60 s old alike (`src/wave/FoamField.ts:96-105`).
  - Pattern stage depends on turbulence *experienced*, not on coverage.
  - Streaks need memory of deformation.
- **Method.** The standard marine "age concentration" approach: mean age is the concentration-weighted first moment of the age distribution (Deleersnijder, Campin & Delhez 2001 *(abstract)*; Delhez et al. 2003 *(full text)*). [model] — [Delhez et al. 2003 PDF](https://www.vliz.be/imisdocs/publications/59211.pdf)
- **Channel Σ = F·s** (F = dense + residual), with s the turbulent age in turnovers. Per step, using the same backtrace weights as dense and residual:
  1. Advect Σ with the same weights (and the same compression factor, §4.4).
  2. Apply the foam loss to Σ in proportion. Uniform bursting removes age-mass with the foam, so Σ ← Σ·(F_after decay and lace transfer)/(F_before).
  3. Age: Σ += F·(√k / L_int)·dt, with k from `AerationField.turbulence` and L_int = κ_L·d₁ (d₁ = still depth = restLevel − bed; κ_L = 1 provisional, sourced range 0.5–3).
  4. Add the source and splashes as zero-age foam; Σ is unchanged, so the mean age drops.
  5. When F is clamped at 1, scale Σ and Π (= F·B, §4.3) by the same factor.
- **Why this clock.** The pattern then **freezes when the turbulence dies**, which is physically right (Lovecchio), and keeps evolving under continuous inner-surf breaking. It ties plunge-vs-spill differences to the turbulence the solver already has, not to per-spot constants. That matches the G9 rule: reef-vs-beach differences come from bed slope and wave height.
- **Optional channels.**
  - Plain age a (Σₐ += F·dt), for the Koepke validation report and debugging.
  - A formation scale (Σ_L = F·L_int at the source), so the pattern scale travels with the foam. Render two fixed scale octaves and blend them in Gaussian space (§4.2); scaling texture coordinates per pixel would swim.
- **Handover.** Add the new arrays to `stateArrays()` (`SurfZoneSimulation.ts:480-490`) and to `followWindow`. Foam texture may differ between players (Q6), but the handover exists, so keep it continuous.
- **Transport to the page.** A new per-node "foam state" buffer (s, B₁₁, B₁₂, B₂₂) is carried in the snapshot like `aeration` (`src/wave/SurfZoneRunner.ts:555-561`). It is uploaded as an RGBA16F or RGBA32F texture every other frame, like the flow (`WaterSurface.ts:366-373`). Buffers are already transferred, not copied (`src/game/WorkerSurfZone.ts:161`).

### 4.2 Flow-map advection without visible repetition
- **Keep** the two phases and the static-in-still-water trick (`foamPattern.ts:195-198`).
- **Blend before the threshold, in Gaussian space, preserving variance.**
  - G = (w·G_A + (1 − w)·G_B)/√(w² + (1 − w)²). The blend of independent N(0,1) samples stays N(0,1), so "covered iff G ≥ Φ⁻¹(1 − F)" keeps the exact covered fraction, and there is no ghosting or contrast loss.
  - This is Neyret 2003's fix: blend the base functions before the non-linear shading, because a simple weighted sum "produces artifacts such as ghosting effects and contrast fading". It is also Heitz & Neyret 2018's histogram-preserving operator (Gaussianise → variance-preserving blend → inverse transform).
  - [model] — [Neyret 2003 PDF](http://www-evasion.imag.fr/Publications/2003/Ney03/neyret161.pdf); [Heitz & Neyret 2018](https://eheitzresearch.wordpress.com/722-2/)
- **Break the repetition.**
  1. **Free:** rotate the tile lattice to the crest axis by an angle with an irrational slope (say 31.7°, tan = 0.618; not 26.6°, whose slope ½ repeats every √5 tiles), so same-age foam along a 100 m bore does not repeat every tile length along x.
  2. **Higher graphics presets:** use hex-tiling with a random offset and rotation per hex, 3 samples per phase (Mikkelsen 2022 *(full text)*, adapting Heitz & Neyret), blended with the same Gaussian operator. The pattern is isotropic, so rotation is safe. [prod/model] — [JCGT 11(3)](https://jcgt.org/published/0011/03/05/paper-lowres.pdf)
- **Latency (period) choice.** Neyret: the regeneration period must be neither too short, where the motion illusion fails, nor too long, where texture stretches. Its ideal "depends on the velocity and the deformation", and he adapts it per location from accumulated strain with two layers. Keep 2 s for now. With the B tensor (§4.3) carrying long-term stretch, a longer period is safe for old residual foam; try 3–4 s for s > 3.
- **Background.** Vlachos 2010 (in `whitewater_foam.md` §9): distortion is fine for about the first third of a cycle, and noise removes the pulsing.

### 4.3 Stretching by strain (streaks)
- **Per cell.** Carry the foam-weighted left Cauchy–Green tensor B = F·Fᵀ as Π = F·B (3 floats):
  - advect it;
  - update DB/Dt = L·B + B·Lᵀ, with L = ∇u from the solver's u = q/h by central differences;
  - new foam enters with B = I.
- **Cap.** Limit the stretch ratio at √(λ₁/λ₂) ≤ 7–10. Today's 7 is the provisional placeholder; lines are known to fragment, but no measured value was found.
- **Shader.** At each of the existing 6 m streak anchors (`streaks.ts:18-33`, `:91-97`), map local coordinates by the deviatoric stretch: along ÷ √(λ₁/λ₂), across × √(λ₁/λ₂). Sample the lace **stage** texture there. This replaces STREAK_STRETCH and the steepness mask with the flow's own deformation, so streaks appear where the water really stretches foam: face runs, rip necks, longshore shear.
- **Scalar alternative.** Neyret's accumulated strain d += ‖e‖·dt, with e = ½(∇u + ∇uᵀ), gives stretch without direction. Use it only to set the flow-map period.

### 4.4 Convergence lines
- **Compression factor.** In `FoamField.advect` (`FoamField.ts:110-141`), multiply each departure value (dense, residual, Σ, Π) by exp(−(∇·u)·dt). Foam as a floater obeys ∂F/∂t + ∇·(F u) = S − L; the current scheme solves the non-conservative form.
- **Physical caveat [inference].** In the depth-averaged model ∇·u = −(1/h)·Dh/Dt, so foam bunches under rising water and at the bore front, and spreads in troughs. The net effect over a wave cycle comes from mean-flow convergence: rip necks, feeder currents, fronts and the swash turnaround. Surface and depth-averaged velocity differ under undertow; that is out of scope.
- **Evidence.** Convergence compacting foam is the floater mechanism of §2.2 at resolved scale; rip "plumes of … foam" (NWS, in `whitewater_foam.md` §3).
- **Cost:** one exp and four differences per cell.
- **Optional, physics: plume-fed dense foam.**
  - Clean-water foam lasts as long as bubbles keep surfacing (CDS13 1:1). So set τ_dense per cell from the aeration plume, τ ≈ depth/w_b × S (S = 1–3 for surfactant, provisional), or add a foam source proportional to the degassing flux.
  - This makes big plunges (reef) stay white longer, with no per-spot constants. It fixes the "reef residual 8 s is the shortest" contradiction already on record (`SurfZoneSimulation.ts:205-210`; Callaghan 2012/2013).
- **Optional, provisional: sub-grid spreading.** Koepke's area growth a(t) is the plume's upwelling pushing foam outward, and line bubble plumes drive flows that scale as (g·q_air)^(1/3) ([model], [arXiv:2607.00960](https://arxiv.org/html/2607.00960), citing Bulson 1961). A radial outflow term from the aeration gradient could reproduce the growth. The coefficient is unsourced.

---

## 5. Lighting

- **Albedo per covered texel, linear, spectrally flat in the visible:** R(N) = 0.55·(1 − e^(−N/5)).
  - Local layers N = c/c_threshold, from the inverse table: N = 2^(log₂c(G) − log₂c(G_threshold)).
  - Examples: fresh 0.50–0.55, 2 layers 0.18, a monolayer 0.10.
  - Sources: Koepke; Whitlock via Koepke; Dierssen 40% average, 50% stage A, 18% thin. Frouin 1996 finds the drop only in the near infrared (`whitewater_foam.md` §4).
  - **Replace** the tinted `#d8f2e9` (linear about 0.69 / 0.89 / 0.82, `WaterSurface.ts:261`) with a neutral albedo. The green should come from the water seen through thin foam, not from the foam.
- **Sit the foam over the bubble-lit water as a layer, not opaque paint** [inference, two-stream adding]:
  - R_total = R_f + T_f²·R_under/(1 − R_f·R_under), with T_f ≈ 1 − R_f (visible absorption is small).
  - R_under is today's Rich `waterUnder`: body blended to the plume by void fraction (`richWaterGlsl.ts:84-86`).
  - Thin lace over a turquoise plume then reads as a pale veil, and the plume shows through (Dierssen; Bohren via `whitewater_foam.md` §4). Thick fresh foam hides it.
- **Far field.** Keep the footprint fade to the mean (`foamPattern.ts:228-229`). The mean is now (covered fraction F) × (the mean covered albedo from a small 2D table over stage s and F, precomputed from the bake), not F × one colour.
- **Specular.** Measured foam reflectance is diffuse:
  - Koepke: isotropic, "in agreement with visual inspection";
  - Dierssen: assumed Lambertian;
  - a 2025 lab BRDF study reports "diffuse reflection characteristics", with BRDF·cos θ an inverted U *(snippet only, [doi:10.1016/j.infrared.2025.106065](https://doi.org/10.1016/j.infrared.2025.106065))*.
  - [inference] A population of spherical bubble caps reflects the sun into nearly all directions, weighted by Fresnel (water F0 0.02), so it adds a broad sheen, not a highlight. Keep the broad lobe (`richWaterGlsl.ts:89`, roughness 0.7 under foam) and add no sharp foam highlight.
  - Sub-pixel sparkle from bubble caps is plausible only at tube-camera distances; unmeasured, so polish.
  - The backlit foam glow, `0.18·fresh·…` (`richWaterGlsl.ts:90`), is a hand value: mark it provisional.
- **Contrast problem the owner must see.** Rich multiplies the water body by `bodyGain = 4` for readability (`richWaterGlsl.ts:97`; `WaterSurface.ts:420`). I evaluated the game's own body formula (`src/scene/waterOptics.ts:74-92`) at view cos 0.5 and sun cos 0.8 [inference, computed from code]. Green-channel body reflectance R (before → after ×4):

  | Spot | 0.5 m | 1 m | 2 m | 3 m | 6 m |
  |---|---|---|---|---|---|
  | Beach | 0.30 → 1.18 | 0.25 → 0.98 | 0.18 → 0.70 | 0.13 → 0.53 | 0.08 → 0.31 |
  | Reef | 0.43 → 1.74 | 0.40 → 1.60 | 0.34 → 1.37 | 0.29 → 1.17 | 0.19 → 0.74 |

  - Over the surf zone's shallow sand, the gained water is therefore **as bright as, or brighter than,** today's foam (0.89 in green), and far brighter than physical fresh foam (0.55).
  - A monolayer thread (0.10) laid over it would read **darker** than the water.
  - Physically, fresh foam is several times brighter than even shallow sandy water. The game also uses the sub-surface R directly as an above-water albedo, which by itself errs high; I did not re-verify the size of that bias this round.
  - Check this on the water sheet (`?inpage&waterSheet&whitewater`) before tuning foam.
  - Fixes:
    - **(a)** Apply the same gain to the foam's diffuse, letting albedo exceed 1 in the shader and the Neutral tone mapper (exposure 1.05, `src/main.ts:217-218`) compress fresh foam. This keeps measured ratios but may clip fresh foam in sun.
    - **(b)** Move the gain into exposure for Rich. This keeps physical albedos but is a global look change.
  - Either one reopens G8's Rich balance: **owner decision**.

---

## 6. Cost and what changes in which files

**Renderer.** The renderer is WebGL2 only (three `WebGLRenderer`). WebGPU is used by the solver (`src/wave/gpu/GpuBoussinesq.ts:195`; `src/game/PhysicalMode.ts:101`). All the shading work is WebGL2 work; the WebGPU tier needs no renderer change.

| Item | Cost (estimate unless measured) |
|---|---|
| Today's lace (2 fetches) | about 0.1 ms, measured by timer query in G4 (`docs/superpowers/plans/2026-09-25-g4-advected-foam.md:111`) |
| New lace | 2 phases × (1 trilinear 3D fetch + 1 table fetch), plus 1 table fetch for the far mean: about 0.2–0.3 ms at 1440p on M4 Pro; about 0.6–1 ms on M1 Air |
| With hex-tiling (× 3 samples per phase) | about 0.5–0.8 ms M4 Pro; leave it off on M1 Air |
| Streak anchors | 4 anchors × 2 phases stay 8 fetches as today, now on the stage texture |
| GPU memory | 8.4 MB (512² × 32 R8) or 25 MB (1024² × 24); tables under 100 KB; foam-state texture about 1 MB (60k nodes × RGBA16F) |
| Worker CPU | FoamField update measured 0.41–0.59 ms for 37k cells with 2 fields (G4 record `:107`). Σ, Π (3) and compression add about 0.3–0.5 ms per step, about 2–3% of a core at 60 Hz |
| Asset | 8–25 MB raw (compresses well); or bake on load in a worker |

- **Mipmaps.** A 3D texture's mips also halve the age axis. Keep the no-mip-plus-footprint-fade approach, or use a `DataArrayTexture` with mips and blend 2 layers by hand (+2 fetches per phase).
- **File changes** (none made; research only):
  - **`scripts/bake-foam-cycle.ts`** (new) or a Python script. Writes `public/…/foam-cycle.bin` plus JSON (tables, seed, parameters, source notes). Its test checks C, Gaussian marginals and seamlessness.
  - **`src/scene/water/foamCycle.ts`** (new, Rich only). Loads the `Data3DTexture` and tables; GLSL: stage from s, Gaussian two-phase sample, Φ⁻¹ threshold, N and R(N), layer compositing; CPU mirrors for tests, in the style of `foamPattern.ts`. Leave `foamPattern.ts` untouched, because Classic and the far field use it and Classic shaders are pinned by `src/scene/waterLooks.test.ts:31-45`.
  - **`src/scene/water/richWaterGlsl.ts`.** `RICH_FOAM` uses `foamCycle`; neutral R(N); the layer formula over `waterUnder`; churn kept for the active roller only (freshness), until the roller-as-geometry work (order item 2) replaces it.
  - **`src/scene/water/streaks.ts`** (Rich path). Stretch from B at the anchors; remove the steepness mask and the constant 7.
  - **`src/scene/WaterSurface.ts`.** New uniforms: stage texture, tables, foam-state texture; a varying for s and B per vertex; upload every other frame.
  - **`src/wave/FoamField.ts`.** Σ (and optionally Σₐ, Σ_L) and Π arrays; the compression factor in `advect`; proportional loss on Σ and Π in `update`; `addSplash` dilution; `followWindow`.
  - **`src/wave/SurfZoneSimulation.ts`.** A `writeUniformFoamState` resampler, `stateArrays` keys, κ_L constant with source; optional plume-fed τ_dense.
  - **`src/wave/SurfZoneRunner.ts`**, `src/scene/PhysicalSurfaceSource.ts`, and the `SurfaceSource` interface: a `foamState` buffer and `writeFoamState?`.
  - **Docs:** new rows in `docs/research/whitewater-sources.md` (R(N) anchors, C, κ_L, clock, cap, S); a design record; a waterSheet `&foamAge` false-colour view for checking.

---

## 7. Ranked changes (payoff against cost)

| # | Change | What the player sees | Cost | Risk | Must hit |
|---|---|---|---|---|---|
| 1 | Neutral per-texel albedo R(N) + layer compositing (using today's F only, N̄ from F) | Old lace goes dim and see-through over green water; fresh foam stays bright | ALU only | **Blocked by the gain issue (§5):** over shallow sand the gained water (0.5–1.7) outshines physical foam, so decide §8.1 first | 0.55 → 0.10 per texel; patch mean follows Koepke's shape |
| 2 | FoamField Σ (turbulent age) + bake + stage lookup | Foam visibly ages: solid → holes → lace → threads, and freezes as the water calms | Medium (bake script, 1 channel, shader) | κ_L wrong ⇒ wrong scale; same-age bands repeat | C = 0.5; network by about 3 turnovers; voids grow with s |
| 3 | Gaussian variance-preserving two-phase blend | No double networks every 1 s | ALU | None known | Exact covered fraction |
| 4 | Convergence compression | Foam lines at rip necks, bore fronts and the swash line; rip plumes | Trivial | Changes where foam is in both looks (physics) | — |
| 5 | B-tensor stretch at anchors | Streaks where water stretches, not on every steep face | Medium | Blow-up without a cap | Cap marked provisional |
| 6 | Plume-fed τ_dense | Reef whitewater stays white for seconds; beach spill fades faster | Low | Changes timing in both looks | Callaghan 0.2–10.4 s; bigger breaks last longer |
| 7 | Hex-tiling (higher presets) | No repetition along long bores | +3× fetches | M1 cost | — |
| 8 | Close-up bubble layer | Bubbles in the tube camera | Low | None known | Surface bubble sizes |

---

## 8. Decisions only the owner can make

1. **Rich body gain versus measured foam contrast** (§5): foam diffuse × gain, gain → exposure, or keep a non-physical foam boost marked provisional.
2. **Physics changes in FoamField** (compression, plume-fed decay) change where foam lies in **both** looks. Classic's shaders stay byte-identical, as with G9 Part B's physics. Confirm that this is acceptable.
3. **Scale κ_L** (0.5–3 d₁ sourced range; mid value provisional): accept provisional now, or measure first (§9).
4. **Ship an 8–25 MB baked asset, or bake on load.**
5. **Replace the hand-authored churn now, or with the roller-geometry work** (order item 2).

---

## 9. Gaps, and what to measure to remove "provisional"

- **Surf-zone lace scale.** No measurement of lace void or ridge size against time since bore passage was found for any surf zone. Measure it from drone footage with a known ground sampling distance, at the owner's references (Supertubos, J-Bay/Snapper, Teahupo'o):
  - void chord and ridge width against distance behind the bore ÷ bore speed;
  - coverage inside the patch.
  - Koepke's photographic reflectance method (two references: adjacent water and fresh foam at 0.55) gives relative lace brightness from ordinary footage.
- **R(N).** Its constant of 5 layers and a monolayer at 10% are from 1982–84 sources through Koepke. Whitlock et al. and Stabeno & Monahan were not opened.
- **Streak cap and line fragmentation.** No source found.
- **Turbulence clock.** The √k/L_int clock inherits `TURBULENCE`'s provisional decay (T/3). van der Zanden supports "within one period" on plane slopes and "a few periods" over bar troughs.
- **Not opened:** Ducasse & Pumir 2008 (synthetic free-surface flows reproducing intermittent floater distributions; PubMed page blocked); Monahan & Lu 1990 stage-A duration (the abstract gives none); Ting & Kirby 1995 (behind a bot wall; used via van der Zanden 2019); the 2025 foam BRDF paper (snippet only).

---

## 10. Sources opened this round

**Full text**
- Koepke 1984, *Appl. Opt.* 23:1816 — [EUMETSAT copy](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)
- Callaghan, Deane & Stokes 2017, *JGR Oceans* — [Imperial Spiral PDF](https://spiral.imperial.ac.uk/server/api/core/bitstreams/efad1bcb-9b9a-4876-8882-f28798d8467c/content)
- Lovecchio, Marchioli & Soldati 2013 — [arXiv:1305.3705](https://arxiv.org/pdf/1305.3705)
- Larkin, Bandi, Pumir & Goldburg 2009 — [arXiv:0911.1784](https://arxiv.org/pdf/0911.1784)
- Boffetta et al. 2004 — [arXiv:nlin/0408031](https://arxiv.org/html/nlin/0408031v1)
- Gutiérrez & Aumaître — [arXiv:1410.7824](https://arxiv.org/pdf/1410.7824)
- Wang, Leng & Chanson 2017 — [UQ PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)
- van der Zanden et al. 2019 — [AURA PDF](https://aura.abdn.ac.uk/server/api/core/bitstreams/81f11741-e106-43cd-be95-8c8cf7c3900f/content)
- Kluyskens 2007, *Surf's Up Beach Break* — [PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- Neyret 2003, *Advected Textures* — [PDF](http://www-evasion.imag.fr/Publications/2003/Ney03/neyret161.pdf)
- Mikkelsen 2022, *Practical Real-Time Hex-Tiling* — [JCGT](https://jcgt.org/published/0011/03/05/paper-lowres.pdf)
- Delhez et al. 2003, age of radioactive tracers — [VLIZ PDF](https://www.vliz.be/imisdocs/publications/59211.pdf)
- Dierssen 2019 — [Frontiers](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014/full)
- Carini et al. 2015 — [PDF](https://faculty.washington.edu/jmt3rd/Publications/Carini2015.pdf); gives no residual-foam lifetime
- Heitz & Neyret 2018 — [author page](https://eheitzresearch.wordpress.com/722-2/)

**Abstract only**
- Callaghan et al. 2012 — [doi:10.1029/2012JC008147](https://doi.org/10.1029/2012JC008147)
- Callaghan et al. 2013 — [doi:10.1175/JPO-D-12-0148.1](https://doi.org/10.1175/JPO-D-12-0148.1)
- Monahan & Zietlow 1969 — [doi:10.1029/JC074i028p06961](https://doi.org/10.1029/JC074i028p06961)
- Monahan & Lu 1990 — [doi:10.1109/48.103530](https://doi.org/10.1109/48.103530)
- Cressman et al. 2004 — [NJP](https://iopscience.iop.org/article/10.1088/1367-2630/6/1/053)
- Fung et al. 1992 — [doi:10.1017/S0022112092001423](https://doi.org/10.1017/S0022112092001423)
- Busaryev et al. 2012 — [doi:10.1145/2185520.2185559](https://doi.org/10.1145/2185520.2185559)
- Wretborn, Flynn & Stomakhin 2022 — [doi:10.1145/3528223.3530059](https://dl.acm.org/doi/10.1145/3528223.3530059)
- Watanabe & Saruwatari 2024 — [Flow PDF](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/2B134D64B6264326C041E2B69BBE7BC8/S2633425924000199a_hi.pdf/clustering-coalescing-and-bursting-processes-in-surface-bubbles-of-surfactant-water-flows.pdf) (PDF skimmed)
- Bubble-curtain scaling — [arXiv:2607.00960](https://arxiv.org/html/2607.00960)

**Snippet only**
- 2025 sea-foam BRDF experiment — [doi:10.1016/j.infrared.2025.106065](https://doi.org/10.1016/j.infrared.2025.106065)
