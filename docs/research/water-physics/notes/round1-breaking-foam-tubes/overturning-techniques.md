# Overturning lips and real tubes on top of (or instead of) height-field / depth-averaged water — techniques from graphics research, film and games

Scope: techniques for showing an overturning lip and a real tube (barrel) when the base water is a single-valued height field or depth-averaged solver. The game's current approach is a Boussinesq (Madsen–Sørensen) finite-volume solver with 1 m surf-zone cells (~3 ms/frame on the GPU tier). The lip is a sheet of ballistic parcels (about 4 per metre of crest, 8 layers). The tube is a "carved void": the lower half of a Longuet-Higgins curve subtracted from the height field. Known artifacts: column "teeth", a thin "8-parcel curtain", spray swamping the impact, and tubes about 1 m long at Hs 1.4 m.

Conventions: **Cited Findings** are published facts from pages I opened, unless marked "(search-index snippet, page not opened)". **Inferences** are my reasoning and are not published claims. Costs are given with the published hardware and year.

---

## 1. Hybrids that add overturning to shallow-water / height-field solvers (Thürey et al. 2007; Chentanez & Müller 2010, 2011; Chentanez, Müller & Kim 2014/2015; Irving et al. 2006; newer work)

### Takeaway
Only Thürey et al. 2007 builds a *connected* overturning sheet on top of a height field in real time. It is the direct ancestor of the game's parcel lip. The main difference is where the sheet comes from: a single tracked, adaptively resampled wave-front polyline emits rows of connected quads, and breaking starts at one point and spreads outward (a peel). The game instead has independent column onsets. Thürey's tube is only the gap under the sheet; the height-field face stays sloped. The NVIDIA line of work took a different route. In 2010 it turned breaking regions into non-interacting particles. In 2011–2014 it replaced the surface zone with a real 3D grid/particle patch. That patch can overturn in principle, but at the published resolutions (a 64³ grid with ~110–130k PBF particles, or a 128×34×128 tall-cell grid) it is far too coarse for a sub-metre tube.

### Cited Findings
**Thürey, Müller-Fischer, Schirm & Gross 2007 (Pacific Graphics), "Real-time Breaking Waves for Shallow Water Simulations"**
- The stated goal is overturning waves inside shallow-water (SW) simulations "such as waves near a beach, and surf riding characters in real-time". The method works with any model "that yield[s] a height field and velocity vectors at the surface" — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Front detection:** a grid point is a candidate if |∇H| > t_H and ∇H·u < 0 (the velocity opposes the gradient, which rejects wave backs). t_H = p_H·g·Δt/Δx with p_H = 1/4. The candidate set is widened by p_d = 2Δx and flood-filled into connected regions — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Line construction:** a polyline is built from a random seed point. It steps Δx along the height-field tangent and snaps each new point to the steepest gradient. It is built in both tangent directions and can close into a loop — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Tracking:** each line point is projected along −∇H onto the crest maximum, then forward onto the steepest point of the slope, using bisection with an initial step c (2–4 steps are usually enough). A point is dropped if it moves more than 2c or if |u_p| < t_H/2 (not steep enough). The line is resampled every step: a point is inserted when neighbours are more than 2Δx apart, points closer than Δx/2 are merged, and folding segments are merged — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Wave patch (the lip):** every interval t_g, one row of particles is spawned per line point and connected to the previous row to form quads. Special connection shapes handle inserted or removed points, so the surface stays closed — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Curl mechanism:** particle velocity is u_s = (1 + p_v·g·(H(x) − H_i))·u_l, where u_l is the line-point velocity and p_v scales a "potential energy" boost, so the top of the wave moves faster than the base. Particles are moved to the crest on creation and offset by −t_g·u_s so the patch overlaps the SW surface "for a smooth transition". After that they are integrated ballistically with Euler steps — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Impact and mass:** on contact with the SW surface, H(x) = H(x) − p_m and the 8 neighbours get p_m/8. Fluid mass is not transported with the patch, because modifying the height field along the front "leads to noise"; this is left as future work — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf). The patent text writes the impact as H(X) = H(X) + p_m (a sign discrepancy with the paper) — [US8204725B1](https://patents.google.com/patent/US8204725B1/en)
- **Thickness and rendering:** the particles become mesh vertices. A second copy of the patch is offset along the normal by p_m, x′ = x + p_m·n, and the sides are stitched to make a closed, thick mesh. The lower side "is chosen to represent the mass of the fluid according to the parameter p_m". Texture coordinates come from particle lifetime and position along the line; a foam texture is blended at the tip. Spray particles spawn where the patch hits the water and along the tip. A small bump map adds ripples — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Peel:** "a wave does not break as a whole at once… we select …" — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Rider:** "A scripted character is moved along the wave front, giving the impression …" There is no rider physics on the patch — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Cost (2007):** one core of an Intel Core 2 Duo 2.13 GHz plus a GeForce 7950, including rendering:

  | Scene | Grid | fps |
  |---|---|---|
  | Single waves | 140² | 43.6 |
  | Box interaction | 160×100 | 51.8 |
  | Submerged shelf | 150×80 | 75.2 |
  | Surfer | 200×100 | 40.6 |

  The text says "between 160k and 200k grid points", which conflicts with the table (16k–20k) — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Time split:** SW simulation 39.6%, breaking waves and particles 21.7%, mesh generation (vertices and normals) 18.9%, rendering and engine 19.8% — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **Stated limits:** chaotic SW states remove detected waves "before they can fully develop", so the method suits whole waves, not many small splashes. Future work lists patch–patch collision, SPH for splash and foam, and mass transport — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- A later assessment by Chentanez & Müller: "[TMFSG07]… Their method cannot be parallelized easily though." — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)

**Chentanez & Müller 2010 (SCA), "Real-time Simulation of Large Bodies of Water with Small Scale Details"**
- Regions a height field cannot represent, "including breaking waves", are automatically turned into spray, splash and foam particles. These are non-interacting point masses that exchange mass and momentum with the height field — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- A cell is breaking if all three hold: |∇η| > α·g·Δt/Δx; (h − h_prev)/Δt > v_min (fast rise, front of a wave); and ∇²η < l_min (top of a wave). They used v_min = 4, α = 0.45, l_min = −4 and found the rise test "more robust than" Thürey's ∇η·u < 0. Such waves are damped because in 2D they "produce disturbing ripples due to numerical instabilities" — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
- Cost: Core i7 2.67 GHz plus GTX 480 (CUDA). The GPU "Beach" scene totals 9.88 ms per frame including rendering, with about 220k active foam/spray/splash particles. The grid-size row of Table 1 is ambiguous in the extracted text. The coupling and the overshoot reduction do not conserve volume — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)

**Chentanez & Müller 2011 (SIGGRAPH), "Real-Time Eulerian Water Simulation Using a Restricted Tall Cell Grid"**
- Regular cubic cells sit on one tall cell per column at the bottom, with a level set surface and a GPU multigrid Poisson solver (two V-cycles plus one full multigrid per step). All examples run above 30 fps on one GTX 480 with Δt = 1/30 s — [Chentanez & Müller 2011 PDF](https://matthias-research.github.io/pages/publications/tallCells.pdf)
- Frame totals including rendering: Manip 29.06, Tank 27.29, Flood 32.33 and Lighthouse 33.09 ms. For Lighthouse, as extracted: pressure projection 9.77 ms, velocity extrapolation 2.05, level-set advection 0.61, velocity advection 0.67, remeshing 0.95. The Lighthouse sim/surface grid is 128×(32+2)×128 — [Chentanez & Müller 2011 PDF](https://matthias-research.github.io/pages/publications/tallCells.pdf)
- The Lighthouse scene is "a large scale simulation of waves crashing and breaking over a beach". Spray and mist are particles, foam is an advected map, and the surface detail is an FFT wave texture advected with the flow — [Chentanez & Müller 2011 PDF](https://matthias-research.github.io/pages/publications/tallCells.pdf)
- Listed future work: "couple our 3D solver with a 2D height field solver" — [Chentanez & Müller 2011 PDF](https://matthias-research.github.io/pages/publications/tallCells.pdf)

**Chentanez, Müller & Kim 2014 (SCA; TVCG 2015), "Coupling 3D Eulerian, Heightfield and Particle Methods…"**
- Near the surface, bulk water is represented by particles (PBF or SPH) and a 3D grid (density-field surface), switching "depending on the regions of interest". Shallow water equations (SWE) run outside the 3D domain. The authors say the hybrid avoids "the inability to represent configurations like overturning waves of height field based solvers" — [Chentanez, Müller & Kim 2014 PDF](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf); [TVCG 2015](https://dl.acm.org/doi/abs/10.1109/TVCG.2015.2449303)
- Whale breach: 30 fps on a GTX 780 Ti with a 64³ 3D grid, a 512² SWE grid and 112k PBF particles on average. Timings in ms:

  | Scene | 3D grid | Particles (count) | Grid | Particles | SWE | Coupling |
  |---|---|---|---|---|---|---|
  | WhaleDay | 64³ | 118k | 9.18 | 29.80 | 0.62 | 5.32 |
  | Pool | 64³ | 130k | 9.06 | 32.62 | 0.14 | 5.64 |

  2D runs were done on the CPU — [Chentanez, Müller & Kim 2014 PDF](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf)
- Admitted drawbacks: "our coupling algorithm does not model a true physical process", and the coupling parameters need tuning. The scenes are whale, dam break and pool; none is a surf-zone plunging breaker — [Chentanez, Müller & Kim 2014 PDF](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf)

**Irving, Guendelman, Losasso & Fedkiw 2006 (SIGGRAPH), tall cells, offline**
- Tall cells with linear pressure profiles hold most of the volume. Within an "optical depth" of the surface, full 3D Navier–Stokes with a particle level set runs on uniform cells. Height-field/SWE methods "do not support overturning or other interesting three-dimensional behavior" — [Irving et al. 2006 PDF](http://physbam.stanford.edu/papers/stanford2006-01.pdf)
- Cost on a cluster of 4-processor 2.6 GHz Opteron machines:
  - Boat wake at 1500×300 horizontal resolution: about 3 min per frame on 16 processors.
  - River at 2000×200: about 25 min per frame on 20 processors.

  — [Irving et al. 2006 PDF](http://physbam.stanford.edu/papers/stanford2006-01.pdf)

**Newer (2018–2026) hybrids found**
- Wang et al. 2026 (to appear, SIGGRAPH Asia 2026), "Hamiltonian Two-Way Coupling of Nonlinear Waves and 3D Flows". Linear or non-dispersive 2D models coupled to strongly nonlinear 3D solvers "produce visible reflections and artifacts at the 2D–3D interface". Their fix is a nonlinear, dispersive Zakharov-based 2D model with canonical coupling. The full system "runs over 4× faster than a pure GPU NB-FLIP simulation on the same domain" — [Wang et al. 2026 abstract](https://arxiv.org/abs/2608.25203). Per the HTML full text as summarised by my fetch tool (treat as tentative): the 3D side is narrow-band FLIP in Warp with a CUDA AMG-PCG pressure solve; no dedicated breaking or plunging examples are shown; and the nonlinearity parameter is kept small near the breaking threshold — [Wang et al. 2026 HTML](https://arxiv.org/html/2608.25203v1)
- Jeschke & Wojtan 2023: a height field split into shallow-water bulk flow plus Airy surface waves, "the first heightfield wave model capable of simulating complex interactions between both …". The abstract does not address breaking — [Jeschke & Wojtan 2023 abstract](https://history.siggraph.org/learning/generalizing-shallow-water-simulations-with-dispersive-surface-waves-by-jeschke-and-wojtan/). A real-time 512 m scene is claimed (search-index snippet, not verified) — [NVIDIA research page](https://research.nvidia.com/publication/2023-08_generalizing-shallow-water-simulations-dispersive-surface-waves)
- Xue et al. 2025: a global FFT ocean coupled with local wave-particle patches in real time. No breaking is mentioned — [arXiv 2511.02852](https://arxiv.org/abs/2511.02852)
- Algis, Bramas, Darles & Aveneau 2025, "Arc Blanc": a real-time ocean framework (free surface plus solid coupling, velocity at any depth). No breaking is mentioned — [arXiv 2503.03326](https://arxiv.org/abs/2503.03326)
- Huang et al. 2021, "Ships, Splashes, and Waves on a Vast Ocean": FLIP near objects coupled to an adaptively remeshed boundary-element (BEM) domain for long-range dispersive waves, "at modest additional costs". The abstract makes no real-time claim — [arXiv 2108.05481](https://arxiv.org/abs/2108.05481)

### Inferences
- **The teeth come from where the lip is emitted.** The game's parcel lip is in effect a Thürey wave patch whose emission is decided per column. Thürey emits whole rows from one coherent front polyline on a shared clock t_g, so neighbouring vertices of the sheet always share an emission time. That removes the "column teeth" by construction. Adopting the polyline and resample rules (insert above 2Δx, merge below Δx/2 — at the game's 4 parcels/m these would be scaled to parcel spacing) plus a single peel origin that spreads outward is a direct, low-cost fix for the stage mismatch.
- **Thickness can be sourced, not tuned.** Thürey's thickness is a single constant p_m tied to the mass deposited on impact. A more physically honest version would set local sheet thickness from the crest volume flux the Boussinesq state implies at launch. This addresses the thin "8-parcel curtain" and keeps impact mass consistent. It would also fix Thürey's admitted lack of mass transport, if the same volume is removed from the height field at launch and returned at impact (the Chentanez 2010 mass/momentum exchange pattern).
- **A sheet alone does not make a tube.** Thürey's tube is whatever gap exists between the ballistic sheet and a sloped SW face. The game's measured 17° face means the face under the sheet must still be reshaped (today's carved void, or the swept profiles of §2).
- **3D patches are too coarse at published resolutions.** At the game's 1 m cells, a 64³ patch spans 64 m, and a Hs 1.4 m tube is roughly one cell across. Resolving a sub-metre cavity with about 8 cells needs cells of 0.1 m or smaller. Worked example: a 20 m (along crest) × 10 m × 4 m patch at 0.1 m is 800k cells, about 3× the 262k cells of the 64³ grid that took ~9 ms on a GTX 780 Ti in 2014, before particles and coupling. Section 7 compares hardware.
- **The 2026 coupling result matters for this game.** It suggests a Boussinesq far field (weakly dispersive, weakly nonlinear) is a better coupling partner than SWE. But no paper found couples a breaking 3D patch to a Boussinesq far field, so this would be research, not integration.
- **Determinism depends on implementation.** Thürey seeds each line at a random point (needs a seeded RNG and fixed iteration order). Grid solvers with fixed iteration counts and ordered reductions can be bitwise-repeatable on one device. Particle methods are repeatable when every scatter uses integer atomics (see §4).

### Gaps
- I could not view Thürey's figures, so I cannot say from the paper whether the patch looks round or thick at the tube. Only the construction (constant-thickness offset sheet) is documented.
- I found no 2018–2026 real-time paper that builds a connected overturning sheet on a height field. Newer hybrids target dispersion or coupling seams, not plunging.
- The hardware and per-frame costs of the 2026 coupled examples were not given in the pages I could read.

---

## 2. 2D-slice / extrusion methods (Mihalef, Metaxas & Sussman 2004 and successors, including shipped and film uses)

### Takeaway
Slice methods are the most "sourced" way to get round, thick, connected, peeling tubes without a real-time 3D solver. You compute or look up physically simulated 2D plunging profiles and sweep them along the crest, with each column's "slice time" kept close to its neighbours'.
- **Mihalef 2004:** a 2D Navier–Stokes breaker library, extruded, then advanced in 3D offline.
- **Wang et al. 2006:** 2D particle (MPS) simulation extruded with fractal noise.
- **Surf's Up 2007:** a 2D profile library interpolated in "4-D" (profile, crest position, decoupled time) with a rider constraint.
- **True Surf 2025:** blends 2D vertical-slice animations authored from a custom 2D water simulation, peeling from spilling to barrel. It shipped on Meta Quest.

Classic 2D potential-flow boundary-element models (Longuet-Higgins & Cokelet 1976) are the physics source of overturning jet shapes, and have a 3D extension over real bathymetry (Grilli et al. 2001).

### Cited Findings
**Mihalef, Metaxas & Sussman 2004 (SCA), "Animation and Control of Breaking Waves"**
- Premise: "each vertical slice of a three dimensional breaking wave (parallel to the …" — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- A library of 2D breakers is computed with a coupled level-set/volume-of-fluid (CLSVOF) Navier–Stokes solver from linear-theory initial conditions. Slope ε = kA of 0.5–0.7 gives plunging breakers; below 0.5 gives spilling. A 2D run "takes 3-4 minutes for a 128 × 64 grid" (2004 hardware) — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- The animator picks each 3D slice from the library and the program rewrites the 3D level set in that slice's plane. A "soft update" also updates neighbouring slices "so that no two neighboring slices are more than one time step apart". The 3D velocity comes from the slices, interpolated between them. The resulting surface "does not need to be a height field, it does not even …" (a tube) — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- The 3D continuation shows "the formation of the air tube under the wave front, immediately after …", plus 3D fingering of the secondary jet — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- Cost: 3D animations took "about 10-12 min/frame… for a resolution of 128 × 128 × 64 …". Building a 3D shape took about 5 min, mostly marching cubes. Rendering took 4–6 min per 640×480 frame in Vue d'Esprit — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- The authors warn against using the 2D library alone, without the 3D solve: "mass won't necessarily be conserved", and object interaction is hard unless objects are invariant along the crest — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- A survey summary: the 3D simulation "is then computed by extruding the desired profile along the parallel direction …" — [Darles et al. 2011 survey](https://arxiv.org/pdf/1109.6494)

**Successors and relatives**
- Wang, Zheng, Chen, Fujimoto & Chiba 2006 (J. Zhejiang Univ. Sci. A): a 2D MPS particle simulation is "expanded to 3D representation using fractional Brownian motion". The surface is rebuilt from the 2D outlines and splashes come from particle properties (abstract via search index) — [Wang et al. 2006](https://link.springer.com/article/10.1631/jzus.2006.A1018). Thürey et al. describe this as "an approach to use slices of 2D simulations for wave simulations in real-time" — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **True Surf (True Axis; Meta Quest launch Dec 18, 2025), founder Luke Ryan:**
  - "I was particularly interested in trying to have a wave that could …"
  - "The idea came to simply create a series of 2D animations of …"
  - "we created a custom 2D water simulation to create all the reference …"
  - For VR they "had to overhaul everything to handle viewing from everywhere, camera going in …".

  — [Meta True Surf blog](https://www.meta.com/blog/true-surf-launch/)
- **Surf's Up (Sony Pictures Imageworks, 2007):**
  - The wave is a procedural system in which "Predefined 2-D wave profiles create a 4-D sampled surface interpolation, with the …". Interpolation uses splines because they give "a nice fluid curve tangent that guaranteed to interpolate directly through actual …".
  - Shared controls: "lip up/down, forward/back, trough depth, shoulder size, tube depth, tube length, front …". Named wave types include "pipeline", "mavericks" and "spilling breaker".

  — [Imageworks "Making Waves for Surf's Up"](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- A student project summarising the Surf's Up course notes: "Blendshapes of several wave profile curves were used for the creation of …"; particle systems made the whitewater; tools were Maya, Houdini and RenderMan — [Fan 2009 MSc thesis](https://nccastaff.bournemouth.ac.uk/jmacey/MastersProject/MSc09/Fan/msc_thesis_finellafan.pdf)

**Physics sources for overturning profiles**
- Longuet-Higgins & Cokelet 1976 (Proc. R. Soc. A 350): 2D irrotational surface waves are tracked with marked free-surface particles (a mixed Eulerian–Lagrangian, or MEL, scheme). An integral equation is solved each step for the normal velocity. A freely running wave "steepens and overturns", and the method is described as faster and more accurate than grid-based ones (abstract via search index) — [Longuet-Higgins & Cokelet 1976](https://royalsocietypublishing.org/doi/10.1098/rspa.1976.0092)
- Grilli, Guyenne & Dias 2001: fully nonlinear 3D potential flow with a higher-order 3D boundary-element method and MEL updating. It applies "from deep to shallow water over complex bottom topography up to overturning and breaking", with very high mass and energy conservation — [Grilli et al. 2001](https://digitalcommons.uri.edu/oce_facpubs/188/)
- Keeler & Bridson 2014 (SCA best paper) solve 3D irrotational flow using only a surface mesh (deep water). They state that "for overturning waves with splashes, 3D simulation of the free-surface Navier-Stokes equations …" — [Keeler & Bridson 2014](https://history.siggraph.org/learning/ocean-waves-animation-using-boundary-integral-equations-and-explicit-mesh-tracking-by-keeler-and-bridson/)

### Inferences
- **This family replaces the carved void outright.** Instead of subtracting the lower half of one Longuet-Higgins curve sized from wave height, each breaking column draws and collides with a full profile (face + lip + tube cavity) taken from a library. The library would be computed offline with a 2D solver (CLSVOF Navier–Stokes as Mihalef did, or a 2D MEL boundary-element model as Longuet-Higgins & Cokelet did). It would be indexed by quantities the Boussinesq state provides (local depth, bed slope, wave height and period, onset time). That keeps "sourced over hand-shaped" honest: the shape comes from 2D physics; only the sweeping is a modelling assumption.
- **Coherence along the crest fixes both teeth and short tubes.** The key constraint is Mihalef's "soft update", which Surf's Up calls "decoupled time" and True Surf does as blending: a slice-time field τ(s) along the crest whose gradient is bounded. Neighbouring columns then cannot be at wildly different stages, which removes the teeth. The tube length becomes the length of crest where τ lies in the plunging window. That length is set by how fast the onset sweeps along the crest (the peel rate, which the Boussinesq plus bathymetry already predicts), not by the lifetime of one parcel strip. This directly targets the "1 m tubes at Hs 1.4 m".
- **Thickness and roundness come from the physics.** They come from the 2D solution's jet cross-section, not from 8 parcel layers, which addresses the "thin curtain".
- **Rider collision is cheap and deterministic.** The collision surface is the swept profile. Each column holds a closed 2D curve, so the rider tests point-in-profile or signed distance against a sampled curve; it is multi-valued-safe and CPU-cheap. This matches Surf's Up's "wave rider" constraint: the rider lives in wave-attached coordinates (position along crest, arc length along the profile). Table lookup plus interpolation is deterministic on CPU and GPU alike.
- **Mass is not conserved** when the 3D solve is skipped, as Mihalef warns. The remedy is to keep the Boussinesq as the mass ledger: remove at launch, return at impact.
- **Runtime 2D solves per column are unlikely to pay off.** Running a 2D MEL boundary-element solve per crest column live would be the most physics-honest option. It needs a dense solve with a few hundred surface nodes, every substep, for dozens of columns. I did not find a published real-time per-column implementation; precomputing the library is the safer path.

### Gaps
- The cost of Wang et al. 2006 and whether it was truly real-time were not found (abstract only).
- True Surf's slice count, blending scheme, how the along-crest peel is parameterised, and how the rider collides were not disclosed.
- The full Surf's Up SIGGRAPH 2007 course notes (hosted at flash.sonypictures.com) could not be fetched; only the Imageworks sketch and a thesis summary were read.
- The Longuet-Higgins & Cokelet and Grilli details come from abstracts and index summaries, not full texts.

---

## 3. Lagrangian / vector-displacement surfaces that can overhang without a 3D solver

### Takeaway
Displacement-based surfaces (Gerstner/Fournier–Reeves, Tessendorf "choppy" FFT waves, the choppy wave model) can only overhang by folding. The published forms are fore-aft symmetric or weakly nonlinear, and their folds are treated as artifacts or foam markers, not jets. The breaking-specific procedural variants make curls cheaply (under 1 ms on a GPU in 2010) but are hand-shaped: Gonzato & Le Saëc's stretch and plunge functions, Jeschke 2003's staged parametric waves, and de Lima 2010's vertex-shader waves. Wave curves and water surface wavelets add detail on top of a simulation; they do not create overhangs. Driving a horizontal (Lagrangian) displacement from the solver's own velocity field is plausible and would inherit onset, peel and height from the Boussinesq state. I found no published instance on an SWE or Boussinesq solver.

### Cited Findings
- **Fournier & Reeves 1986** modify Gerstner's trochoidal particle orbits (x = x0 − A·e^{ky0}·sin(kx0 − ωt), y = y0 − A·e^{ky0}·cos(kx0 − ωt)) to follow seabed changes. Circular orbits become elliptic, which "permits to control the waves' shape, more or less crested" — [Darles et al. 2011 survey](https://arxiv.org/pdf/1109.6494). Their model could "detect the position, direction, and speed of spilling breakers in order to …" — [Fan 2009 MSc thesis](https://nccastaff.bournemouth.ac.uk/jmacey/MastersProject/MSc09/Fan/msc_thesis_finellafan.pdf)
- **Gonzato & Le Saëc** extend that model once "the wave's crest starts to curl over". They add "a stretch function [that] imitates Biesel law by progressively stretching the wave …" — [Darles et al. 2011 survey](https://arxiv.org/pdf/1109.6494)
- **Peachey 1986** computes each wave's vector from depth using Airy theory and "first proposed to use particle systems in order to represent spray generated …" — [Darles et al. 2011 survey](https://arxiv.org/pdf/1109.6494). Fan describes it as "a similar approach that used basic shapes other than sinusoids" — [Fan 2009 MSc thesis](https://nccastaff.bournemouth.ac.uk/jmacey/MastersProject/MSc09/Fan/msc_thesis_finellafan.pdf)
- **Tessendorf's choppy waves:** each surface point moves horizontally to x + λ·D(x,t), with D computed from the height field's Fourier amplitudes. Near some wave tops "the surface actually passes through itself and inverts". Reducing λ defeats this, but "this might actually be a useful effect to signal the production of …". The fold test is the Jacobian of x → x + λ·D: J < 0 in overlap regions — [Tessendorf course notes](https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf)
- **The choppy wave model** (Nouguier, Chapron & Guérin 2009, JGR Oceans) is "based on horizontal rather than vertical local displacement of a linear surface". For a single wave "it coincides with the Gerstner solution", and it is "limited to the lowest-order nonlinearity". The authors note that forward-face asymmetry could be added "through a generalization of the horizontal displacement D(r,t) to steepen slightly the …" — [Nouguier et al. 2009 PDF](https://archimer.ifremer.fr/doc/00000/6832/6022.pdf)
- A production ocean system warns: "Higher chop gives crisper wave crests but can result in self-intersections or …" — [Crest docs](https://crest.readthedocs.io/en/latest/user/waves.html)
- **Jeschke, Birkholz & Schumann 2003:** every surface point, including foam, is a function of time and space built from cosine, exponential, rotation and scaling functions, "without using information from previous time steps" — [Fan 2009 MSc thesis](https://nccastaff.bournemouth.ac.uk/jmacey/MastersProject/MSc09/Fan/msc_thesis_finellafan.pdf). The wave life cycle blends a parametric function through the stages "round, breaking and collapsing", and "interactive" meant at least 5 fps — [de Lima et al. 2010 PDF](https://sbgames.org/papers/sbgames10/computing/full/full4.pdf)
- **de Lima, Braun & Musse 2010 (SBGames):** a plane mesh is deformed in a vertex shader through "Wave Forming, Wave Moving and Wave Breaking", where the first stage "is responsible for folding the wave geometry". "Simple wave breaking effects can be rendered using less than one millisecond", and without the particle system 1,200 waves render at 30 fps — [de Lima et al. 2010 PDF](https://sbgames.org/papers/sbgames10/computing/full/full4.pdf)
- **Wave curves** (Skřivan et al., SIGGRAPH 2020) are "a post-processing step which takes a simulation as input and increases its …", using wave packets on spline curves — [Wave Curves page](https://visualcomputing.ist.ac.at/publications/2020/WaveCurves/). It was used on Avatar: The Way of Water for ripples on the bulk fluid surface — [Unity/Wētā blog](https://unity.com/blog/industry/technology-behind-avatar-the-way-of-water)
- **Water surface wavelets** (Jeschke et al., SIGGRAPH 2018) "faithfully simulate wave interactions with moving obstacles in real time while simultaneously …". It is a 2D wave simulation, generalising Fourier methods — [Water Surface Wavelets page](https://visualcomputing.ist.ac.at/publications/2018/WSW/)
- Precedent for velocity-driven curl on a solver: Thürey et al. already use the SW velocity for their sheet particles, boosted with height (u_s = (1 + p_v·g·(H − H_i))·u_l), so the crest outruns the base — [Thürey et al. 2007 PDF](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)

### Inferences
**Can the solver's own velocity drive the crest curl?** Yes, as a Lagrangian skin on the render/contact mesh:
1. Seed marker vertices on the face near the crest.
2. Advect them horizontally with a surface velocity reconstructed from the Madsen–Sørensen state. The depth-averaged velocity under-represents crest particle speed; a Boussinesq vertical-profile correction would be needed (standard Boussinesq theory, not sourced here).
3. Where crest markers outrun the wave celerity (the kinematic breaking idea, not sourced here), their horizontal positions overtake the face points ahead. The mesh folds (Tessendorf's J < 0) and an overhang appears.

Why this is attractive:
- The curl's onset, peel and height come from the solver, which is honest.
- The overhang stays connected to the face, with no seam and no teeth, because the face and lip are one mesh.
- It is a pure function of solver state plus marker history, so it is deterministic.

Its weaknesses:
- The fold is geometry, not fluid: there is no mass in it, and the face under the fold stays at the solver's 17°.
- Self-intersection handling is needed where J < 0.
- The fold's thickness and roundness are not physically meaningful.
- Practically, it would need to hand the fold's leading part to ballistic parcels at the fold point (as the game already does) and still reshape the face (carve or swept profile).

Other conclusions:
- The rider must then collide with the displaced mesh (a multi-valued query), not a height lookup. That keeps the drawn-equals-collided rule, but costs a spatial query per contact.
- A symmetric displacement (Gerstner/choppy wave model) cannot produce a plunging lip. The forward-face asymmetry has to come from the solver's velocity asymmetry, or from the "generalized D" the choppy-wave-model authors suggest.
- The procedural methods (Jeschke 2003, de Lima 2010, Gonzato & Le Saëc) give reliable, cheap curls but are hand-parameterised shapes. They fail the "sourced over hand-shaped" preference unless their parameters are fitted to 2D physics profiles, which turns them into the §2 slice library.
- Wave curves and wavelets are useful for surface detail on the face and lip (ripples), not for barrel structure.

### Gaps
- The Fournier–Reeves and Peachey 1986 papers were not opened directly; their descriptions come from the Darles survey and the Fan thesis. Whether the original Fournier–Reeves surfaces overhang explicitly could not be confirmed from a primary text.
- The Jeschke 2003 WSCG PDF (dspace.zcu.cz) returned 503; its shape functions and cost are known only second-hand.
- I found no published method that uses a shallow-water or Boussinesq solver's velocity to drive a horizontally displaced, overturning render/contact mesh.

---

## 4. Local 3D patches near the break on the GPU (FLIP/APIC, SPH, PBF, MPM, vertical 2D slice solvers; WebGPU/WebGL)

### Takeaway
Published real-time particle and grid liquids handle about 10⁵ particles or about 64³ cells in roughly 10–40 ms on 2013–2014 desktop GPUs. WebGPU MLS-MPM demos handle about 1–3×10⁵ particles today. No published real-time work shows a surfable plunging tube from a local 3D patch. A jet-only particle patch is affordable in a browser. A patch that also carries the face, so that it forms the tube cavity at 0.1–0.2 m resolution, is at or beyond budget. Coupling such a patch to a dispersive depth-averaged solver while it breaks is unsolved in the literature I found.

### Cited Findings
- **Position Based Fluids** (Macklin & Müller 2013): "128k particles, 2 sub-steps, 3 density iterations per frame, average simulation time …" on a GTX 680 (CUDA). Collisions use signed distance fields stored as volume textures. Rendering is ellipsoid splatting with screen-space filtering. Stated limits: particle stacking at boundaries, and slow Jacobi convergence — [Macklin & Müller 2013 PDF](https://matthias-research.github.io/pages/publications/pbf_sig_preprint.pdf)
- **Chentanez, Müller & Kim 2014:** particles cost more than the grid (29.8 ms for 118k PBF particles vs 9.18 ms for a 64³ grid on a GTX 780 Ti) — [Chentanez, Müller & Kim 2014 PDF](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf)
- **Tall-cell 3D grid:** the beach-waves scene takes 33.09 ms per frame including rendering at 128×(32+2)×128 on a GTX 480 — [Chentanez & Müller 2011 PDF](https://matthias-research.github.io/pages/publications/tallCells.pdf)
- **WebGPU MLS-MPM** (WebGPU-Ocean, TypeScript + Vite):
  - "~100,000 particles on integrated graphics" and "~300,000 particles on decent GPUs".
  - The SPH mode manages 30,000 particles at best on integrated graphics, and "SPH mode seems to crash on Mac".
  - "2 simulation steps per frame", with screen-space fluid rendering.

  — [WebGPU-Ocean README](https://github.com/matsuoka-601/WebGPU-Ocean)
- The same author reports real-time "~100,000 particles on an iGPU", smooth running on an iPad Air 3, and particle-to-grid scatter via WebGPU `atomicAdd` — [Codrops, Feb 2025](https://tympanus.net/codrops/2025/02/26/webgpu-fluid-simulations-high-performance-real-time-rendering/)
- WGSL atomics: "An atomic type is specified as atomic<T>, where T is i32 or u32", in workgroup or storage memory only. There are no float atomics — [Tour of WGSL](https://google.github.io/tour-of-wgsl/types/atomics/atomic-types/)
- **Coupling patterns:**
  - Particles that leave a height field as point masses carrying mass and momentum, and give them back on landing — [Chentanez & Müller 2010 PDF](https://matthias-research.github.io/pages/publications/hfFluid.pdf)
  - FLIP near objects coupled to a BEM far field for dispersive waves — [Huang et al. 2021](https://arxiv.org/abs/2108.05481)
  - A narrow-band FLIP patch coupled to a nonlinear dispersive 2D model to suppress interface reflections — [Wang et al. 2026](https://arxiv.org/abs/2608.25203)
- **Vertical 2D slice solvers per column:** Mihalef's 2D runs took 3–4 min each at 128×64 on 2004 hardware and were used offline — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf). True Surf used a custom 2D simulation offline, to create animation reference — [Meta True Surf blog](https://www.meta.com/blog/true-surf-launch/)

### Inferences
- **Jet-only budget (fits).** For a 30 m breaking crest segment, a jet cross-section of a few tenths of a m² gives on the order of 10 m³. At 0.1 m spacing (1,000 particles/m³) that is about 10⁴ particles, well inside WebGPU MLS-MPM's published iGPU budget. The water would render as a screen-space splatted surface.
- **Jet plus face (does not fit).** A patch that includes the face (for example 30 × 10 × 2 m) is about 6×10⁵ particles at 0.1 m, above the published iGPU budget and near the discrete-GPU one, before any coupling cost.
- **Determinism.**
  - Particle-to-grid scatter with integer (fixed-point) atomics is order-independent and so repeatable. WGSL forces integer atomics, which helps. The float work elsewhere is repeatable on one device, but may differ across GPUs and browsers. That matters if the "client-run sea with handover" multiplayer design expects identical results across machines.
  - SPH or PBF neighbour search needs a stable sort to be repeatable.
- **Rider collision creates a dilemma.** A GPU particle surface is only available to the CPU via asynchronous buffer mapping in WebGPU, at least one frame late, and does not exist on the CPU-fallback tier. There are two options:
  - (a) The rider collides with an authoritative analytic surface (swept profile, §2) and the particle patch is cosmetic. This breaks "collide with what is drawn" wherever particles are drawn.
  - (b) The rider collides with the patch. This requires a GPU-side rider contact query and gives up CPU-tier parity.
- **Where a 3D patch fits.** Augment, don't replace: seed the jet from the swept profile or parcel launch state, run it for the pour and impact (splash-up, aeration), and feed mass back to the Boussinesq on landing (the Chentanez 2010 pattern). Keep the rider on the authoritative profile. This could also address "spray swamping the impact", because the impact becomes a volume-conserving collision instead of a spray emitter.
- **Per-column 2D solvers at runtime.** A 10 m × 4 m window at 5 cm spacing is about 16k cells or particles per slice; 64 slices is about 1M elements per step. This is heavier than the jet-only 3D patch, so per-column 2D solves are better done offline (the §2 library).

### Gaps
- I found no published real-time demonstration (research or shipped) of a plunging, rideable tube from a local 3D FLIP/SPH/PBF/MPM patch.
- I found no published FLIP, tall-cell or PBF benchmarks on Apple-silicon GPUs or in WebGPU, other than the WebGPU-Ocean particle counts (which give no ms timings or exact GPUs).
- Published per-frame costs of real-time vertical 2D slice solvers were not found.

---

## 5. Film pipelines (Surf's Up, Moana, Avatar: The Way of Water, Kon-Tiki, In the Heart of the Sea, surf CG) and data-driven / neural breaking waves

### Takeaway
The one film that needed characters riding inside barrels, Surf's Up (2007), explicitly rejected fluid simulation. It built the wave as a procedural "character": 2D profiles interpolated along the crest and in decoupled time, with a rider constraint and a lip "crash curve" driving whitewater. Films where water physics is the hero (Moana, Avatar: The Way of Water, The Wave) used APIC/FLIP/multi-solver setups on top of procedural or implicit oceans, at costs of days per simulation. I found no data-driven or neural method for synthesising breaking-wave lips or tubes for graphics.

### Cited Findings
**Surf's Up (Sony Pictures Imageworks, 2007).** All quotes are from [Imageworks "Making Waves for Surf's Up"](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf) unless noted.
- The wave had to give "the look and feel of real masses of curling, breaking water" while allowing "100% interaction with fully animated surfing characters".
- Why not simulation: "Fluid dynamics and fluid simulation based approaches… were quickly ruled out due …" The wave was "decoupled… from time based methods" and made "a hero CG character".
- **Rider constraint:** "A special geometric constraint… called a wave rider, which allowed the user …".
- **Whitewater:** "The rig contained ray intersection along the lip, called the crash curve, …". A "Wave Train" deformer matched the render displacement shader in the animators' scenes.
- The SIGGRAPH 2007 course was given by Bredow, Schaub, Kramer, Hausman, Dimian and Duguid — [Imageworks course page](https://www.imageworks.com/node/2676)

**Moana (Walt Disney Animation Studios, 2016)**
- More than 900 shots needed ocean interaction ("boat wakes, splashes, shorelines, walls of water, and highly art-directed sentient water"). The pipeline was redesigned around "a lightweight implicit ocean representation" with a flexible authoring process — [Moana pipeline talk](https://history.siggraph.org/learning/the-ocean-and-water-pipeline-of-disneys-moana/)
- Simulations used a proprietary APIC solver, "Splash". Art direction worked by incorporating "natural swells and flows to support the building of designed shapes" — [Moana: Performing Water](https://history.siggraph.org/learning/moana-performing-water-by-frost-stomakhin-and-narita/)

**Avatar: The Way of Water (Wētā FX, 2022)**
- Loki, Wētā's multiphysics framework, combined solvers for "procedural water waves, bulk water, spray, mist, hero bubbles, diffuse bubbles, foam, …". The film had 2,225 water shots, with some "taking up to eight days of simulation". Wave curves added ripples on the bulk surface — [Unity/Wētā blog](https://unity.com/blog/industry/technology-behind-avatar-the-way-of-water)

**Other live-action and surf films**
- Kon-Tiki (2012): Houdini-generated ocean surfaces with composited foam, a CG splash library, Naiad simulations where foam met the raft, and a hero wave built with Storm Studios' ocean toolkit (search-index snippet of fxguide, page not opened) — [fxguide Kon-Tiki](https://www.fxguide.com/fxfeatured/kon-tiki-water-sims-digital-sharks/)
- The Wave (Bølgen, 2015): stacked, interacting Houdini simulations, "5 or 6 days" per simulation pass and over 25 TB of data per shot (search-index snippet, page not opened) — [Art of VFX The Wave](https://www.artofvfx.com/the-wave-bolgen-vfx-breakdown-gimpville/)
- Point Break (2015): the page I opened names the vendors (Image Engine, Scanline VFX, Spin VFX, UPP) and production VFX supervisor John Nelson, with no technique details — [Art of VFX Point Break](http://www.artofvfx.com/point-break/)

**Data-driven / neural**
- Searches returned CNN work that *classifies* breaking type from infrared or video imagery, and generic graph-network surrogates for SPH. I found no graphics method that synthesises breaking-wave lips or tubes with learned models (see Gaps). One example of the classification work: [Deep Neural Networks for Active Wave Breaking Classification](https://arxiv.org/pdf/2101.11478) (search result, not opened).

### Inferences
- Surf's Up is the strongest production precedent for this game's goals: a "real barrel", riders inside it, predictability, and interactive rates in an animator's viewport. Its architecture is the §2 slice approach:
  - a library of 2D profiles,
  - interpolation along crest length and decoupled time,
  - named shape parameters, including tube depth and tube length,
  - a rider constraint in wave-attached coordinates,
  - whitewater launched from a lip "crash curve".

  What the game would add is driving τ(s) and the shape parameters from the Boussinesq state (onset, peel rate, height, depth) instead of animators. That is where physics honesty comes from.
- Film simulations (APIC/FLIP, Loki) show what full 3D costs: days per shot. They are not a runtime option, but they are a possible *source* of reference profiles, as True Surf did with its own 2D simulation.
- The "crash curve" idea maps directly onto the game's impact-spray problem. It emits whitewater from where the lip intersects the face, weighted by energy, which gives a controllable, sourced spray budget instead of spray swamping the impact.

### Gaps
- In the Heart of the Sea (2015): no technical source on its ocean or waves was found.
- Kon-Tiki and The Wave details come only from search-index snippets (pages not opened).
- Avatar: The Way of Water and Moana: no published detail found on *breaking-wave or barrel* construction specifically.
- Surf documentaries' CG (for example Chasing Mavericks): no technical sources found.
- Neural or data-driven breaking-wave synthesis for graphics: none found. The searches ("neural network data-driven breaking wave animation", "learned simulator … plunging breaking wave") returned only classification and generic SPH-surrogate work.

---

## 6. Shipped games: what surf games and general ocean tech do for lips and tubes

### Takeaway
Surf games that show tubes use authored or procedural profile systems, not fluid simulation. The best-documented recent one, True Surf (2025), blends 2D vertical-slice animations built from a custom 2D water simulation, peeling from spilling to barrel. General-purpose ocean tech documents FFT, Gerstner or wave-particle displacement with foam, and no overturning lip; the "chop" displacement that could fold a surface is explicitly treated as an artifact. Examples: Sea of Thieves, Assassin's Creed IV, Uncharted 4, Crest, Unreal Water and NVIDIA WaveWorks. For most classic surf games (Kelly Slater's Pro Surfer, Transworld Surf, Surf World Series, Barton Lynch) I found no primary technical disclosure.

### Cited Findings
**Surf games**
- **True Surf** (True Axis; Meta Quest launch Dec 18, 2025): 2D vertical-slice animations blended to make "a wave that could change shape as it peels from a spilling …". The animations came from a "custom 2D water simulation" plus an animation tool. VR required reworking for "camera going in the barrel, duck diving". Live conditions use Surfline forecast data — [Meta True Surf blog](https://www.meta.com/blog/true-surf-launch/)
- **Transworld Surf** (Angel Studios, 2001):
  - The Xbox version was "nominated for GameSpot's annual 'Best In-Game Water' award"; Wikipedia gives no wave-tech detail — [Wikipedia Transworld Surf](https://en.wikipedia.org/wiki/Transworld_Surf)
  - A secondary account says Angel Studios built a procedural animation system in which algorithms generated the wave's shape and motion. Designers could specify break timing and barrel length (a barrel "long enough to surf"), and real fluid dynamics was rejected because it would require editing the seabed to tweak a wave (search-index snippet; the page returned 403) — [Surfertoday TWS](https://www.surfertoday.com/surfing/the-story-of-the-transworld-surf-video-game)
- **Kelly Slater's Pro Surfer** (Treyarch, 2002): the article I opened gives only a colour note ("artist just gradually shifted to that teal color on the wave based …"), no wave construction — [Kotaku KSPS](https://kotaku.com/the-water-in-this-2002-surfing-game-is-blowing-peoples-minds-2000714695)
- **Barton Lynch Pro Surfing** (Bungarra Software; released Nov 2023 per a search-index snippet of its [Steam page](https://store.steampowered.com/app/1776170/Barton_Lynch_Pro_Surfing/)): only marketing-level claims ("hardcore physics & beautifully brutal waves"); CEO Andrew West's statements are about design and timeline, not technology — [Stab Barton Lynch](https://stabmag.com/news/surfings-got-a-new-video-game-on-the-way/)
- **Surf Sandbox** (nocanwin, released 25 Aug 2026): "Adjust bottom contours, wave height, period, and frequency"; players can "get barreled". No technology disclosed — [Steam Surf Sandbox](https://store.steampowered.com/app/4480760/Surf_Sandbox/)

**General ocean tech**
- **Sea of Thieves** (Rare): "The underlying ocean water simulation is an implementation of the FFT technique …". A wave-peak mask comes "from the FFT choppiness vertex offsets", and foam forms at wave peaks. No breaking lips — [Sea of Thieves SIGGRAPH 2018 talk](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)
- **Assassin's Creed IV:** the ocean was upgraded from AC III to support all Beaufort levels, with "a third layer of small waves", better foam and lighting. No breaking-wave details — [fxguide AC4](https://www.fxguide.com/fxfeatured/5-things-you-need-to-know-about-the-tech-of-assassins-creed-iv-black-flag/)
- **Uncharted 4:** Naughty Dog has "a separate engine just to render the water effects", described as "rather inexpensive to compute". No breaking-wave details in the article opened — [GamingBolt Uncharted 4](https://gamingbolt.com/naughty-dog-reveals-the-tech-behind-uncharted-4-taas-ps4-gpu-usage-deferred-lighting-and-more)
- **Crest (Unity):** FFT waves plus a Gerstner component "especially useful for Trochoidal waves and shoreline waves", and dynamic waves from objects. Higher chop "can result in self-intersections or 'inversions'"; no breaking or overturning feature — [Crest docs](https://crest.readthedocs.io/en/latest/user/waves.html)
- **Unreal Engine Water:** "Unreal Engine only provides the Gerstner wave simulation model", extensible via Blueprint or C++ — [Unreal docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/simulating-waves-using-the-water-waves-asset-in-unreal-engine)
- **NVIDIA WaveWorks:** the simulation "runs in the frequency domain using spectral wave model for wind waves …". Features are dual JONSWAP spectra, interactive waves and foam; no breaking or overturning — [NVIDIA WaveWorks](https://developer.nvidia.com/waveworks)

### Inferences
- The shipped-game consensus for barrels is *profiles, not simulation*: TWS per the secondary account, True Surf explicitly, and the Surf's Up film. The one modern title that documents its method keeps the physics in an offline 2D simulation and blends slices at runtime. That is the same architecture proposed in §2, and it has shipped on Quest-class mobile hardware.
- General ocean engines never overturn. Their displacement ("chop") folds are suppressed as "inversions". None is a model for lips, but their foam-from-fold heuristics (J < 0) are a cheap, sourced foam trigger.
- The game's distinguishing features — real bathymetry and a Boussinesq solver that predicts onset and peel — are exactly what the profile-based games lack. TWS reportedly rejected seabed-driven waves because they were hard to control. The game's advantage is to drive the slice clock and profile choice from the solver.

### Gaps
- Kelly Slater's Pro Surfer, Transworld Surf, the Surf's Up game (2007), Surf World Series (Climax, 2017), Barton Lynch Pro Surfing and Riptide GP: no primary technical talks, post-mortems or developer posts on lips or tubes were found. The Surf World Series interviews (Red Bull, GamingBolt) either returned empty or mention only per-location wave styles (search-index snippet).
- "The Surfer": no game by this name was found. A 2024 feature film of that name exists, but I found nothing on its wave VFX.
- The AC IV GDC ocean talk and the Uncharted 4 "Rendering Rapids" talk themselves were not accessed. The claim that Uncharted 4 used wave particles appears only in a search-index snippet.

---

## 7. Fit to the game: which candidates replace or augment the parcel lip + carved void (synthesis)

### Takeaway
Across research, film and games, the only approaches that deliver a round, thick, connected, peeling, rideable barrel at game cost are profile-sweep methods. They draw a sourced 2D profile per crest column, with a slice clock that is smooth along the crest (Mihalef 2004 → Surf's Up → True Surf). The Thürey-style coherent front line is the best real-time scaffold for tracking where and when to sweep, and for emitting a connected lip. Local 3D particle patches are affordable only for the jet and pour, and are best treated as augmentation. Displacement-driven curls are possible, but they are geometric folds without mass.

### Cited Findings
- Hardware context for the target machines:

  | GPU | FP32 throughput | Memory bandwidth | Source |
  |---|---|---|---|
  | Apple M4 Pro | 9.2 TFLOPS (third-party claim) | 273 GB/s | [flopper.io M4 Pro](https://flopper.io/gpu/apple-m4-pro) |
  | Apple M4 Pro 20-core | 8.1 TFLOPS | — | [nanoreview](https://nanoreview.net/en/gpu-compare/apple-m4-pro-gpu-20-core-vs-apple-m1-gpu-8-core) (search-index snippet; page returned 403) |
  | Apple M1 8-core | 2.6 TFLOPS | — | same nanoreview snippet |
  | GeForce GTX 780 Ti (the 2014 hybrid's GPU) | 5,045.7 GFLOPS | 336.5 GB/s | [Wikipedia GeForce 700](https://en.wikipedia.org/wiki/GeForce_700_series) |

- WebGPU offers only i32/u32 atomics — [Tour of WGSL](https://google.github.io/tour-of-wgsl/types/atomics/atomic-types/)
- The published costs, look and rider handling behind the table below are cited in §1–§6.

### Inferences
**Comparison against the game's constraints** (determinism, drawn = collided, physics honesty, real-barrel look, M4 Pro target, M1 slow-but-OK). Citations for the "published" columns are in the sections referenced.

| Technique | Lip/tube look | Published cost (hardware, year) | Control | Determinism | What rider collision needs | Fit to parcel lip + carved void |
|---|---|---|---|---|---|---|
| Thürey 2007 front line + particle-sheet patch (§1) | Connected quad sheet from a tracked front; constant-thickness offset (p_m); peel from a chosen point; tube = gap over the sloped SW face | 40.6 fps total at 200×100 on one Core 2 core + GeForce 7950 (2007); sheet + particles ≈ 22%, meshing ≈ 19% | p_H, p_v, p_m, t_g, point spacing, peel origin | CPU serial; seeded RNG for line seeds | Mesh query on the sheet; face still from the height field | **Augment/replace the parcel emitter**: single front polyline, row emission on a shared clock, adaptive resampling → removes teeth, connected sheet. Still needs face reshaping |
| Chentanez & Müller 2010 breaking → particles (§1) | Spray/splash/foam particles; no sheet, no tube | 9.88 ms total, beach scene, GTX 480 (2010) | Three thresholds | GPU; seeded emission needed | Particles only (cosmetic) | **Augment impact only** (mass/momentum-exchanging spray) |
| Tall-cell 3D grid, GPU (Chentanez & Müller 2011) (§1) | True 3D level set; can overturn; coarse | ~30–33 ms incl. render at 128×34×128 (GTX 480, 2011) | Physics only | Fixed multigrid iterations → per-device repeatable | SDF from level set, GPU→CPU readback | **Replace in a local patch?** Resolution cost of a sub-metre tube is prohibitive; no CPU tier |
| 3D grid + PBF + SWE hybrid (Chentanez, Müller & Kim 2014) (§1) | 3D near region of interest; not shown on breakers | 30 fps; 64³ + 112k particles + 512² SWE (GTX 780 Ti, 2014) | Coupling params need tuning | Particles need integer-atomic scatter / stable sort | GPU query; latency | **Research-grade augmentation**; coupling seam with Boussinesq unsolved for breaking |
| Mihalef 2004 slice library → 3D NS (§2) | Physical plunging profiles; air tube + secondary jet; genus > 0 | 3–4 min per 2D run (128×64); 10–12 min per 3D frame (2004 CPU) | Per-slice library choice; soft update | Library lookup deterministic | Point-in-profile per column | **Replace the carved void** with swept library profiles (offline-computed); 3D solve dropped |
| Surf's Up profile interpolation + wave rider (§2, §5) | "Real masses of curling, breaking water"; tube depth/length controls | Interactive in the animator's viewport (2007) | Named shape controls + decoupled time | Deterministic | Wave-attached rider constraint | **Replace** (same as above) with the Boussinesq driving the controls instead of animators |
| True Surf 2D-slice blending (§2, §6) | Peels spilling → barrel; camera inside barrel | Ships on Meta Quest (2025) | Authored from custom 2D sim | Deterministic | Undisclosed | **Strongest shipped precedent** for the replace path |
| 2D MEL-BEM per column (LH&C 1976; 3D: Grilli 2001) (§2) | Physically exact potential-flow jet | Not published for real time | Physics only | Deterministic if serial | Per-column profile | **Best source for the offline library**; runtime use unproven |
| Lagrangian displacement from solver velocity (§3; no published instance) | Fold connected to face; no mass; face still 17° | n/a | Via solver state | Deterministic | Multi-valued mesh query | **Augment the lip look**; must still reshape face and hand off to parcels |
| Procedural curls (Gonzato; Jeschke 2003; de Lima 2010) (§3) | Hand-shaped curls | < 1 ms (GPU, 2010) | Parameters | Deterministic | Mesh query | Fails "sourced over hand-shaped" unless fitted to 2D physics (→ slice library) |
| WebGPU MLS-MPM jet patch (§4) | Volumetric pour/splash; screen-space surface | ~100k particles iGPU, ~300k decent GPU (2025, no ms given) | Physics only | Integer atomics help; cross-GPU float differs | GPU-only; async readback | **Augment pour/impact** (cosmetic or mass-coupled); rider stays on the authoritative profile |

Ranked recommendation (inference):
1. **Keep the Boussinesq as the ledger and clock.** It already predicts onset, peel direction and rate, height and depth.
2. **Replace per-column onsets with a Thürey-style front polyline per breaking segment**, carrying a slice-time field τ(s) whose along-crest gradient is bounded (Mihalef's soft update / Surf's Up's decoupled time). This kills the teeth.
3. **Replace the carved lower-half Longuet-Higgins void with full swept profiles** (face + lip + cavity) from an offline 2D physics library (2D CLSVOF Navier–Stokes or 2D MEL-BEM), indexed by the Boussinesq state. That same swept surface is what is drawn and what the rider collides with, in wave-attached coordinates like Surf's Up's "wave rider". This fixes thickness, roundness and tube length, and keeps CPU/GPU tier parity and determinism.
4. **Keep ballistic parcels only for what leaves the profile:** the pour after impact, splash-up and spray. Emit them from a lip "crash curve" with an energy budget, so spray stops swamping the impact.
5. **Optionally (M4 tier only), add a WebGPU MLS-MPM jet/pour patch as a cosmetic or mass-coupled augmentation.** Use fixed-point integer atomics for repeatability. The rider stays on the profile.

**Hardware scaling.** Many grid and particle fluid steps are memory-bandwidth bound. The M4 Pro's quoted 273 GB/s is *below* the GTX 780 Ti's 336.5 GB/s, although its quoted FP32 is higher. So 2014 GTX 780 Ti timings should not be expected to shrink much on the M4 Pro, and WebGPU adds browser overhead. The M1 (2.6 TFLOPS quoted) is roughly 3× slower in FP32 than the M4 Pro.

### Gaps
- No candidate has published timings on Apple-silicon GPUs or in WebGPU, apart from WebGPU-Ocean's particle counts (no ms given).
- The M1's memory bandwidth was not verified here.
- Cross-device (GPU/browser) floating-point repeatability of WebGPU compute was not researched. It matters for the multiplayer sea handover.
- How True Surf and Surf's Up handle rider-versus-profile collision at runtime (beyond Surf's Up's viewport "wave rider" constraint) is undisclosed.
