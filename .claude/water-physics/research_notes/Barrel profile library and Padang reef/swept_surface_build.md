# Building a swept breaking-wave surface on a height-field sea: front tracking, lofting, seams, rider collision, rendering and cost

Researcher notes, 2026-09-28. Scope: how to build, in real time, ONE breaking-wave surface for Breakline. Along a tracked breaking-front line, each crest slice gets a 2D overturn profile (face, lip, air cavity) from an offline library, at its own stage via a "slice clock". The slices are lofted into one mesh, blended into the Boussinesq height-field surface behind the crest and ahead of the toe, drawn, and used for rider collision in wave-attached coordinates.

**Evidence tags**
- **[pub]** Published in the cited source. I paraphrase it rather than quote it.
- **[pub-dec]** Published in the Surf's Up SIGGRAPH 2007 course notes. That PDF's body font is a simple letter-substitution encoding. I decoded it here with a mapping recovered from known words. Words decode cleanly, but italic attribute names use a second cipher, so I name them from the matching patent text (for example Pref and "time"). Several decoded passages are word-for-word the same as the Sony patent US8610721B2, which I also opened, and that match cross-validates the decoding.
- **[snippet]** A search-index summary only; I did not open the page.
- **[meas]** Measured here by me; not published. The method is given where it is used.
- **[calc]** Arithmetic on cited numbers.
- **[code]** The game's own repository, cited by file path.

Everything in the **Inferences** subsections is my reasoning, not a published claim. The sibling notes in `.claude/water-physics/research_notes/Breaking waves foam and tubes/` already cover what the techniques are: Thürey 2007, Mihalef 2004 slices, the Surf's Up overview, True Surf, and lip translucency. These notes cover how to build the surface, and cross-reference those files instead of repeating them.

---

## 1. Tracking the breaking front as a line on a height-field simulation (Thürey et al. 2007, contour and ridge alternatives, stable parameterisation through growth, splits and merges)

### Takeaway
Thürey et al. 2007 remains the only published real-time front-line tracker on a shallow-water height field. The method is:
- detect steep, forward-facing cells;
- flood-fill them into regions;
- trace a polyline along the height-field tangent, at grid spacing, snapped to the steepest gradient;
- each step, advect each point by projecting it onto the crest maximum and then forward onto the steepest point;
- resample: insert above 2Δx, merge below Δx/2, merge folds, and give new points averaged attributes.

It tracks the **front**, not the **crest**, because the crest is ill-defined at saddles, and moves emitted geometry to the crest afterwards. Two alternatives are workable: marching-squares contours of a breaking-strength field, and differential-geometric ridge (crest) detection. Contours handle splits and merges but lose point identity every frame. Ridges are scale-sensitive and noisy on a 1 m grid.

For the swept surface, what matters most is a **persistent along-crest coordinate and a smooth slice clock** carried on the tracked points. The render and collision loft can then be resampled uniformly every frame. Surf's Up (time splined between control rings) and Mihalef (neighbouring slices at most one time step apart) both show that the stage must vary smoothly along the crest.

### Cited Findings
- **[pub] Detection.** A grid point is a front candidate when |∇H| > t_H and ∇H·u < 0. The velocity test rejects wave backs. The threshold is t_H = p_H·g·Δt/Δx with p_H = 1/4. The candidate set is widened by p_d = 2Δx to close gaps, then split into disconnected regions by flood fill — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Line construction.**
  - A random candidate is the seed.
  - The line steps Δx along the height-field tangent t = (g2, −g1), or its opposite, where ∇H = (g1, g2).
  - Each new point is re-centred onto the steepest-gradient point along the gradient line through it.
  - The line is grown in both directions until it leaves the region. It closes into a loop if it returns within p_d of its first point.
  - Candidates within p_d of an existing line are removed, so no second line starts beside it.
  - Branches are not handled directly: a branch becomes two lines that may merge later.

  Source: [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Tracking (advection).**
  - Each point moves along −∇H from the previous step.
  - It is first projected onto the height-field maximum (in case the crest has passed it), then projected forward onto the steepest point of the slope.
  - Both projections use bisection with an initial step equal to the wave speed c = √(gH); 2–4 bisection steps usually suffice.
  - A point is deleted if it moved more than 2c, or if |u_p| < t_H/2 (no longer steep).

  Source: [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Resampling.** A point is inserted where neighbours are more than 2Δx apart, and neighbours closer than Δx/2 are merged. Folds are removed by merging segments where (p_{n+1}−p_n)·(p_{n−1}−p_n) > 0. New points take the average of their neighbours' properties, so segments stay near grid scale for the line's whole life — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Why the front and not the crest.** Tracking the crest would simplify particle generation. However, the crest line is poorly defined at saddle points and saddle lines of the height field, so Thürey tracks the steepest front and moves new sheet particles back to the crest along −u_l — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Peel.** The mid-point of the line is chosen as the breaking tip. Sheets are then generated from a region that grows outward from it — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Stated limitation.** In chaotic shallow-water states, detected waves are removed before they fully develop. The method therefore suits whole waves, not many small splashes — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Ridge definition** (the crest-detection alternative). A bright ridge is a connected set of points where the field has a local maximum along the main principal-curvature direction. In the principal (p, q) frame: L_p = 0, L_pp < 0, |L_pp| ≥ |L_qq|, or the same with p and q swapped. Ridge curves are much more sensitive to the chosen smoothing scale than edges, and no single scale captures all ridges — [Lindeberg 1998, Edge detection and ridge detection with automatic scale selection (KTH copy)](https://people.kth.se/~tony/papers/cvap191.pdf)
- **[pub] Contour extraction** (the second alternative). d3-contour computes contour polygons from a rectangular grid of values, with marching squares per the repository description. The output is GeoJSON MultiPolygons covering the area where values ≥ each threshold. An optional smooth mode places crossings by linear interpolation — [d3-contour docs](https://d3js.org/d3-contour/contour); [d3-contour repo](https://github.com/d3/d3-contour)
- **[pub-dec] Smooth stage along the crest (Surf's Up).**
  - A hierarchy of control rings drove the per-cross-section "time" attribute, at coarse and fine granularity.
  - Time was splined between control rings to give a smooth transition between crashing regions and newly forming ones.
  - The mesh was dense enough that some cross-sections were simply interpolated between their two nearest neighbours.

  Source: [Surf's Up SIGGRAPH 2007 course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub] Neighbouring-slice constraint (Mihalef).** When an animator picks one slice's 2D evolution, a "soft update" also updates the neighbouring slices, so that no two neighbours are more than one time step apart. The authors say this gives the right look over most of the domain — [Mihalef, Metaxas & Sussman 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- **[pub-dec] Line ends (Surf's Up "shoulder").** A per-cross-section shoulder value marked the part of the patch, at its lateral extremities, that never breaks. At time 0 on every cross-section the patch was a plain rectangle, and raising time along its length made the wave shape grow out of the patch's centre line — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf). The neighbouring loft and per-cross-section-time sentences also appear in [US8610721B2](https://patents.google.com/patent/US8610721B2/en); I did not check the patent for the rectangular-patch sentence.
- **[code] The game's current crest finder.** It scans along the travel axis for a local maximum with 0.1 m prominence, places the crest by a parabola through three samples, and re-finds it within ±4 m each frame — `src/game/waveLab/crestTracker.ts`. The rider's wave frame already carries wave-attached quantities: ahead-of-crest distance, crest speed, face fraction, curl distance and side, and the peel speed requirement c/sin α — `src/physics/waveFrame.ts`.

### Inferences
- **Two layers of line.**
  1. **Sim line.** A Thürey-style tracked polyline in the deterministic simulation, with integer point IDs and per-point attributes: stage τ, along-crest coordinate σ, local height H, still-water base, and propagation direction. It updates at sim rate and is serialisable for online checks.
  2. **Loft line.** Rebuilt every frame by resampling the sim line uniformly in arc length (for example 0.5 m). Attributes are interpolated from the sim points.

  Because the loft is regenerated from scratch each frame, it needs none of Thürey's special "connection shapes". Those exist only because his sheet was persistent particle rows spawned over time. Each frame's loft is a clean M×N grid.
- **A stable parameterisation comes from σ, not the vertex index.**
  - Give each sim point a persistent σ (metres along the crest) at birth.
  - Inserted points average σ from their neighbours (as Thürey does for all properties). Merged points average too.
  - When two lines join, keep the longer line's σ and re-base the absorbed line's σ by a constant offset so it continues monotonically. Hide the jump in texture phase with a short cross-fade.
  - When a line splits, both parts keep their σ.

  UVs and anything else meant to stay put along the crest should use σ, so uniform per-frame resampling never makes textures swim.
- **Carry the slice clock on the sim points and smooth it.**
  - Advance τ by dτ/dt = 1/T_life(local state).
  - Then apply one or two passes of Laplacian smoothing in σ, plus a Lipschitz clamp: |τ_i − τ_{i+1}| ≤ δ per loft-slice spacing, with δ ≈ one library stage (the Mihalef rule).
  - Surf's Up saw shape collapse where time changed quickly between neighbouring cross-sections (see §2). This clamp is the direct guard against it.
  - Worked example [calc, with assumed values]: a peel speed v_p and a stage life T give |∂τ/∂s| = 1/(v_p·T). With v_p = 10 m/s and T = 2.5 s, the full stage range spans 25 m of crest. At 0.5 m slices that is Δτ ≈ 0.02 per slice, about 1.3 stages of a 64-stage library. That is inside the one-stage-per-slice rule, give or take.
- **Which detector.**
  - Thürey's front test uses only first derivatives and suits the 1 m grid. Keep it for seeding and per-point tracking.
  - Where the solver already has a smooth breaking-strength or roller field, a marching-squares contour of it at a threshold is a good deterministic seeder and topology oracle: it finds new sections, splits and merges. Then match the contour to the existing sim line by nearest σ.
  - Do not track a Hessian ridge directly on the 1 m grid. Lindeberg shows ridges are strongly scale-dependent, and second differences are noisy.
  - Get the crest point per slice the way `findCrest` already does: a 1D search for the maximum along the slice direction, with a parabola fit. That is exactly where the profile's origin should sit.
- **Slice frame.**
  - Use world up and the horizontal propagation direction n. Take n from the smoothed line normal, or from −∇H smoothed along σ. Do not use a Frenet frame of the line, which flips at inflections (see §2).
  - Where the crest's plan-view radius of curvature R is smaller than the profile's extent on the concave side, adjacent slice planes cross and the loft folds (the offset-curve cusp condition).
  - Clamp the frame's turning rate. Equivalently, smooth n more strongly where R is small, or shorten the profile's back and toe extents there.
- **End handling.** Force τ → 0 (the unbroken stage, which equals the height-field cross-section) over the last few metres at each line end. Slices can then appear or disappear at the ends without any visible change. This is the Surf's Up "shoulder" idea.
- **Determinism.** The sim line must be computed in the lockstep simulation, with:
  - a fixed iteration order;
  - seeds chosen deterministically rather than Thürey's random seed (for example the lowest-index candidate);
  - integer IDs, and tie-breaks on IDs.

### Gaps
- Thürey says lines can merge but does not say how per-point attributes or parameterisation are reconciled at a merge. The σ re-basing above is my design, not a published one.
- The Wave Curves paper, whose splines carry Lagrangian wave packets, may describe spline resampling that keeps attributes stable. Its PDF is 20 MB, and I only saw the abstract on the [Wave Curves page](https://visualcomputing.ist.ac.at/publications/2020/WaveCurves/). Not verified.
- I found no measured robustness data for Thürey's tracker on a Boussinesq (dispersive) solver. His tests used a non-dispersive semi-Lagrangian SW solver.

---

## 2. Lofting varying 2D profiles along a curved crest into one mesh whose tube opens and closes (sweep and skinning, unequal point counts, Surf's Up "4-D sampled surface interpolation", spline surfaces, GPU generation)

### Takeaway
The production precedent is Surf's Up. The body of the wave was a row of cross-sections, each a NURBS profile blended through about 11 life-cycle targets by its own 0–1 time. The row was lofted into one rectangular, parametrically navigable patch, with per-profile attributes (time, energy) interpolated onto every vertex. The 4-D interpolation (profile 2-D × length × decoupled time) used splines. Where time changed quickly between neighbours, point-wise blending collapsed the shape, and adding edge-length and angle interpolation fixed it.

For a game, the robust recipe has three parts:
1. **One fixed topology.** Every profile is resampled offline to the same N points, with landmark-aligned arc-length spacing, as one open curve running back → crest → lip outside → tip → lip underside → cavity → face → toe.
2. **The tube needs no topology change.** It "opens and closes" by shape: the lip retracts at τ = 0, and the cavity collapses to zero area.
3. **A dense stage table.** Linear or spline interpolation can then run in a vertex shader from a profile texture (WebGL2) or in a compute pass (WebGPU).

### Cited Findings
- **[pub] Surf's Up: the "4-D" system.** Predefined 2-D wave profiles make a 4-D sampled surface interpolation. The third dimension is the length parameter; the fourth is decoupled time. Animators drove decoupled time and sampled shape parameters through simple UI manipulators — [Bredow et al. 2007, Making Waves for Surf's Up](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- **[pub] Surf's Up: spline interpolation.**
  - The 4-D interpolation used splines only. Rotation-based approaches were tried first.
  - Splines were chosen as an efficient scheme with smooth tangents that pass exactly through the sampled data.
  - Any per-profile value (energy, time, speed, crash) was output as an interpolated per-vertex value.
  - Shared controls: lip up/down and forward/back, trough depth, shoulder size, tube depth, tube length, front and back length, non-uniform scale.

  Source: [Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- **[pub-dec] Surf's Up: the rig and the loft.**
  - One hand-modelled NURBS cross-section had about eleven blendshape targets, covering a pipeline wave from birth to resolve, driven by a single 0–1 time attribute.
  - Extra blendshapes shaped lip thickness, trough depth, height and face slope.
  - CV placement and interpolation over time drove how ocean texture stretched over the wave.
  - Cross-sections were placed in a row and lofted into one surface. Each kept its own time, so parts of the wave could be more or less evolved.
  - A custom lofting plug-in passed each cross-section's time and energy to every surface point.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf). The same statements appear in [US8610721B2 (Charbonnel, Sony; priority 18 May 2007)](https://patents.google.com/patent/US8610721B2/en)
- **[pub-dec] Surf's Up: the shape-collapse pitfall and its fix.**
  - Plain point-based shape interpolation collapsed the shape where the wave twisted sharply, caused by quick changes in time between adjacent cross-sections.
  - Combining point interpolation with edge-length and angle interpolation worked best. The team cited Alexa, Cohen-Or & Levin's SIGGRAPH 2000 As-Rigid-As-Possible paper.
  - Forward motion was just a parent transform, and the rings bent the wave relative to it.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub] Beach break (Surf's Up, Kluyskens 2007).** Lines of particles were emitted toward the beach. Each particle controlled a curve profile whose shape depended on its position above the seabed and on accumulated depth information. The series of profiles was skinned into the wave surface, and displacement maps were derived from these surfaces for compositing in the shader — [Kluyskens, Surf's Up Beach Break](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- **[pub] True Surf (2025).** The game built a series of 2D animations of vertical wave slices and blended between them, so a wave could change from spilling to plunging as it peels. The animations were made with a custom 2D water simulation plus an animation tool — [Meta blog, Dec 18 2025](https://www.meta.com/blog/true-surf-launch/)
- **[pub] Why linear vertex blending is fragile.**
  - Blending by parameterisation depends on how both curves are parameterised and oriented, and can give unnatural in-between shapes.
  - Interpolating signed curvature against arc length, then integrating, is intrinsic (independent of position, orientation and parameterisation). However, the result need not close, so a closing step is needed: Sederberg et al.'s adjustment, or Saba et al.'s nearest-closed-curve optimisation.
  - Shape blending is described as two problems: vertex correspondence first, then the vertex path.

  Source: [Saba, Schneider, Hormann & Scateni 2014](https://www.inf.usi.ch/hormann/papers/Saba.2014.CBO.pdf). **[snippet]** The original intrinsic method (Sederberg, Gao, Wang & Mu, SIGGRAPH 1993) interpolates edge lengths and inter-edge angles instead of vertex positions — [ACM DL entry](https://dl.acm.org/doi/10.1145/166117.166118) (search summary; page not opened). The Surf's Up course notes (above) describe using the same kind of edge-length and angle interpolation.
- **[snippet] Lofting across topology changes.** Building surfaces from planar contours involves three coupled problems, correspondence, tiling and branching, which Bajaj, Coyle & Lin 1996 solve together — [search-index summary](https://link.springer.com/chapter/10.1007/10704282_33). Not opened.
- **[pub] Sweep frames.**
  - The Frenet frame twists unwantedly for sweep surfaces, and is undefined at inflection points, which causes discontinuities.
  - Rotation-minimising frames (RMF) avoid this.
  - The double-reflection method builds each frame from the previous one with two plane reflections: reflect by the chord x_{i+1} − x_i, then by the difference between the new tangent and the reflected old tangent.
  - It has fourth-order global error, against second order for the projection (Klok) and rotation (Bloomenthal) methods, at about the same per-frame cost.

  Source: [Wang, Jüttler, Zheng & Liu 2008](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/Computation-of-rotation-minimizing-frames.pdf)
- **[pub] Game-side extrusion practice (Unite 2015).**
  - Each path sample has an oriented frame built from tangent plus an up reference.
  - Shape vertices and precomputed 2D normals are transformed by that frame.
  - UV v runs with the path index.
  - An arc-length lookup table (cumulative chord lengths) re-parameterises the path for even UVs.

  Source: [Holmér, "A coder's guide to spline-based procedural geometry", snippet gist](https://gist.github.com/unitycoder/98acd7b8068282ed4726)
- **[pub] Thürey's mesh topology.** The persistent sheet is built from rows of particles. When line points were inserted or removed between rows, marked "connection shapes" keep the surface closed. Only one insertion or merge per point is allowed per spawn interval — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] WebGL2 generation from data.** A vertex shader can build geometry from gl_VertexID with no vertex attributes. The lesson cautions that heavy per-vertex computation costs performance — [WebGL2 Fundamentals, drawing without data](https://webgl2fundamentals.org/webgl/lessons/webgl-drawing-without-data.html)
- **[pub] WebGL2 texture filtering.**
  - In the internal-format table, RGBA16F and RG16F are marked filterable, while R32F, RG32F and RGBA32F are not. The lesson notes that half- and full-float formats are always available in WebGL2 but not filterable by default — [WebGL2 Fundamentals, data textures](https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html)
  - OES_texture_float_linear enables linear filtering of float textures and is available in WebGL2 contexts — [MDN OES_texture_float_linear](https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float_linear)
- **[pub] WebGPU generation.**
  - Feeding vertices from storage buffers (vertex pulling) is gaining popularity but may be slower than classic vertex buffers on some older devices — [WebGPU Fundamentals, storage buffers](https://webgpufundamentals.org/webgpu/lessons/webgpu-storage-buffers.html)
  - three.js ships a WebGPU example in which a TSL compute shader rewrites mesh positions and normals every frame. It is WebGPU-only, with no WebGL2 fallback — [three.js webgpu_compute_geometry](https://threejs.org/examples/webgpu_compute_geometry.html)
- **[code]** The current lip sheet is rebuilt on the CPU from the snapshot's parcels each frame. Strips of neighbouring columns are joined when thrown within LINK_TIME, with half-column ribbons at the sides — `src/scene/LipSheetMesh.ts`. The per-frame CPU geometry upload pattern therefore already exists.

### Inferences
- **Profile representation (offline, in the library tool).** Store each profile as one open polyline of N points. Choose N = 128 for hero waves; 64 is enough far away (§6). Resample piecewise by arc length between fixed landmarks, with a fixed point budget per segment. For example:
  - back end → crest: 20
  - crest → lip tip: 36
  - lip tip → throat (where the lip underside meets the face): 32
  - throat → toe: 40

  With the same landmark at the same index in every stage and every family, any linear blend lands like on like: tip to tip, throat to throat. That is the correspondence half of shape blending. The Surf's Up patent's discontinuity point of the surface normal is a usable automatic lip-tip detector for the library tool ([US8610721B2](https://patents.google.com/patent/US8610721B2/en)).
- **The tube opens and closes without topology change.**
  - At τ = 0 the lip segment collapses onto the crest: zero-length edges and degenerate quads, which are harmless.
  - The tube opens as the lip segment grows.
  - After the jet touches down, the cavity is where the curve comes near itself. Allowing the lip tip to penetrate slightly below the face is fine for opaque rendering, since the depth test hides it.
  - It is **not** fine for signed-distance collision: a self-intersecting polygon breaks the inside/outside sign (§4).
  - Library fix: after touchdown, trim the jet where it meets the face. Optionally store the enclosed cavity as a second closed loop, used only for collision and whitewater, until the collapse hands over to parcels.
- **Interpolating stages.**
  - Make the stage table dense enough (≥ 64 stages per family) that linear interpolation between neighbouring stages is visually exact. It then runs in hardware (RGBA16F bilinear filtering along the τ axis) or with two texel fetches.
  - Where the library is sparse, or neighbouring slices differ by many stages (strong twisting), densify it offline with intrinsic interpolation (edge-length and turning angle, Sederberg / Surazhsky–Elber), not at runtime. This is Surf's Up's collapse fix moved to bake time.
  - If motion shows "ticking" at stage boundaries, switch to Catmull–Rom across four stage rows. That is four fetches, and matches the Surf's Up spline choice.
- **Across-crest interpolation.** Adjacent loft slices sit at different τ. Every quad is therefore itself a blend between stages, so the τ Lipschitz clamp in §1 is what keeps the loft from twisting. Where the clamp would have to bite hard, halve the slice spacing locally.
- **Frames: RMF is not needed for the crest loft.** Gravity fixes "up", and the slice plane is vertical, so the frame is simply (n, up) from the smoothed horizontal normal. Keep RMF / double reflection for any sweep along a genuinely 3D curve, such as a ribbon along the lip-tip curve for spit or spray emitters.
- **Suggested GPU data layout.**
  - **Profile texture** (static): width N, height = stages × families, RGBA16F. Each texel holds (u, z) in units of breaking height, local jet thickness, and one attribute such as surface speed or energy. A second texture holds the 2D normal (n_u, n_z) and the reference coordinate (see §5).
  - **Slice texture** (rewritten every frame): 2 RGBA32F texels per slice, holding origin xy, base z, direction n xy, H scale, τ, σ and a family blend. This is about 10 KB for 300 slices [calc: 301 × 32 B].
  - **Index buffer:** one static grid of M_max × N.
  - **Vertex shader:** fetch the slice data, fetch the profile at (j, τ) (filtered or two fetches), then P = origin + n·u·H + up·(base + z·H).
- **Normals.** The 2D profile normal (as in the Unite extrusion) is exact only when neighbouring slices share a stage. Where τ varies along the crest, the surface also slopes along s. Compute n = normalize(∂P/∂s × ∂P/∂u):
  - ∂P/∂u comes from the stored 2D tangent;
  - ∂P/∂s comes from evaluating the neighbouring slices (two extra evaluations in the vertex shader, or central differences in a compute pass).
- **One code path.** WebGPU is optional in Breakline, so the loft must work in WebGL2 anyway. The vertex-shader loft runs in both renderers: ShaderMaterial / onBeforeCompile for WebGL2, TSL for WebGPU. A compute-pass version is an optimisation, not a necessity at these vertex counts (§6).
- **CPU copy.** The same loft in TypeScript (float64) is required anyway for collision and the deterministic simulation (§4). It also serves as a fallback path (measured cost in §6).

### Gaps
- I found no published real-time game implementation of a lofted overturning surface with timings. Surf's Up was an interactive Maya rig and published no rig timings. True Surf does not disclose its runtime method beyond "blend 2D slice animations".
- The ARAP paper (Alexa et al. 2000) that Surf's Up cites was not opened here.
- I found no published comparison of vertex-shader lofting against compute lofting in browsers on Apple GPUs.

---

## 3. Joining the swept surface to the height-field mesh without seams or cracks (blend zones, stitching, overlap and depth, alpha versus opaque, film and game practice)

### Takeaway
The best-documented precedent is Surf's Up's own choice:
- after trying to deform large ocean grids by the wave geometry, the team kept the hero wave and the ocean as **separate surfaces that seam together**;
- the ocean shader cuts an **opacity hole** using a top-down map of the wave patch;
- the geometry keeps **a small overlap**;
- boundary positions are made equal: the wave's reference position at its edge equals the ocean's position.

Terrain LOD adds the rasterisation lesson: morph geometry across a transition band, and remember that T-junctions still drop pixels. So rely on overlap, not on exact edge matching alone. A shipped surf game (Barton Lynch Pro Surfing) was still fixing "gaps between water and waves" per location in 2024.

For Breakline:
- pin the profile ends to the height field with the same sampling rule the water mesh uses;
- extend the loft 1–2 m past the seams;
- hide the height-field mesh inside the loft footprint with a per-frame mask, cross-faded by complementary dither in the overlap band;
- keep everything opaque.

### Cited Findings
- **[pub-dec] Surf's Up: separate surfaces plus a hole.**
  - Early tests arbitrarily deformed large ocean grids by the animated wave geometry. The team then chose to treat the hero waves and the ocean as separate objects seamed together.
  - A rectangular wave patch that could be navigated parametrically was highly desirable.
  - The seam was an opacity hole in the ocean where the wave was, plus a small geometric overlap.
  - The hole came from an orthographic render of the wave patch's UV space, projected into the flattened reference space (Pref). The camera matrix was stored with the map, and the shader used it to cut the hole and manage the opacity overlap.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf); the hole and overlap sentence is also in [US8610721B2](https://patents.google.com/patent/US8610721B2/en)
- **[pub-dec] Surf's Up: boundary equality.** For a seamless blend, the Pref position at the wave's edge equalled the ocean's Pwave position, so the two could not disagree. The team also described the character wave's boundary as a window moving over a static ocean — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub-dec] Surf's Up: one displacement library.** The Wave Train displacement ran as a RenderMan plug-in for rendering, with Maya and Houdini visualisers. Each linked one shared external library so that surface positions were identical across packages. A small high-resolution grid could be dropped anywhere to preview true displacement — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf). Making Waves describes the Wave Train deformer matching the render displacement shader in animators' scenes — [Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- **[pub] Surf's Up beach break.** Skinned profile surfaces were turned into displacement maps and composited in the shader, instead of rendering the swept surface as geometry — [Kluyskens 2007](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- **[pub] Thürey's overlap.** New sheet particles are placed at the crest and then offset backwards by t_g·u_s, so the sheet overlaps the shallow-water surface for a smooth transition. The rendered sheet is two offset copies stitched at the sides, and its lower copy represents the fluid mass — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Terrain LOD seams (geometry clipmaps).**
  - Power-of-two mismatches leave gaps between levels, so geometry near each level's outer boundary morphs to the coarser level. The blend weight ramps from 0 to 1 across a transition band, and a width of n/10 grid units works well.
  - Even without gaps, T-junctions along boundaries drop pixels in rasterisation, so boundaries are stitched with zero-area triangles.
  - The morph costs about 10 vertex-shader instructions.

  Source: [Losasso & Hoppe 2004](https://hhoppe.com/geomclipmap.pdf)
- **[pub] Shipped game evidence (Barton Lynch Pro Surfing, v1.11, 30 Oct 2024).** The patch notes list:
  - fixing gaps between water and waves, with individual fixes per location;
  - a new mesh for a "forward filler";
  - removing ocean-plane jitter;
  - driving waves from "Ocean Profiles";
  - fixing collisions where the player passed through waves.

  Source: [DayOne patch report](https://playday.one/2024/10/30/barton-lynch-pro-surfing-sees-graphical-improvements-in-latest-free-patch/)
- **[pub] Transparency without sorting.** Weighted blended OIT renders transparent surfaces in any order into an RGBA16F and an R8 target, then composites. The author reports it faster than sorting and free of sorting pops for particles. Its weight function must be tuned to the expected depth range and opacity (curves for about 1–100 surfaces) — [McGuire 2014](https://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html)

### Inferences
- **Why a hole is mandatory, not optional.** Inside the loft footprint, the height field's smooth hump occupies the tube's air cavity. If it is drawn, the rider sees a wall of water inside the barrel. The height-field mesh (and height-field collision) must be suppressed wherever the loft owns the water, which is exactly Surf's Up's opacity hole.
- **Recommended join (opaque everywhere).**
  1. **Pinned ends.** The loft's first and last k samples (k ≈ 4–8) blend z toward the height field. The weight is 1 at the end sample and the profile's own shape inward. The ends must sample the height field with **the same function the water mesh rasterises**: triangle-interpolated between 1 m grid vertices, not bilinear. Otherwise the end sits millimetres to centimetres off the drawn surface on a steep back.
  2. **Overlap.** Extend the loft 1–2 cells past each seam line (back and toe) and past both line ends. At the line ends τ → 0, so the loft there already equals the height-field cross-section.
  3. **Hole mask.** Each frame, rasterise the loft footprint top-down into an R8 mask (0.25–0.5 m texels over the surf zone). The value is 1 inside, ramping to 0 across the overlap band. The water fragment shader discards where mask > threshold. In the band, use **complementary dither**: the ocean draws a pixel only if noise ≥ w, the loft only if noise < w, with the same screen-space noise. Each pixel then shows exactly one opaque surface, with no z-fighting and no sorting.
  4. **Matching shading.** Both meshes use one material function. Across the band, the loft's normal is blended toward the height-field normal, and foam and flow textures are sampled in the same world-anchored space.
- **Alpha blending the loft is the wrong default.**
  - It forces back-to-front ordering against the ocean and spray.
  - It loses depth writes needed by refraction, fog and screen-space reflections.
  - It makes the thick, dark tube interior see-through.

  Keep alpha for spray, mist and foam particles only, preferably with weighted blended OIT (McGuire) or additive blending.
- **Alternatives considered.**
  - *(a) Deform the ocean grid to the wave (vector displacement).* It cannot express the overhang on a grid not aligned with the crest. Surf's Up tried deforming ocean grids and abandoned it.
  - *(b) Explicit stitch strip between loft edge vertices and height-field grid vertices.* Watertight, but a per-frame retriangulation as the crest crosses the grid, and the clipmap paper shows T-junction pixel drops even then. Not worth it.
  - *(c) Beach-break-style displacement compositing into the height-field mesh.* Fine for single-valued licks and whitewater bores, not for the lip.
- **Physics must follow the same partition.** Inside the footprint the rider collides with the loft; outside, with the height field. In the blend band the two agree by construction (step 1), so there is no step in the collision surface at the seam.

### Gaps
- No game developer has published the details of their wave–ocean seam; Barton Lynch's per-location fix is unspecified. The dither-cross-fade recommendation is inference.
- The Unity LOD cross-fade documentation (a dithered transition precedent) returned no usable text, so I cite no source for the dither technique.

---

## 4. Collision against a multi-valued surface in wave-attached coordinates (per-slice point-in-profile / SDF, interpolation between slices, continuous collision for a fast board, Surf's Up "wave rider", surf games, determinism)

### Takeaway
- Surf's Up's "wave rider" was a Maya geometry constraint: a locator slides freely over the wave patch but can't leave it. It was used for blocking animation, not final physics. The Making Waves sketch describes it as keeping the board "above water" without the board distorting as the face changes shape.
- For a game, the natural equivalent is this. Convert the board's contact points into wave coordinates (s along crest, u across, z up). Evaluate the **interpolated profile at that s** (the same interpolation the renderer draws). Take a 2D signed distance to its closed polygon. Keep the board's contact points at SD ≥ 0, oriented to the SDF gradient.
- A 128-point query costs about 3 µs in V8 on an M1 **[meas]**, so sub-stepped or conservative-advancement continuous collision is affordable. A fast board against a lip 0.1–0.5 m thick needs one or the other.
- Determinism means CPU-only float64 code using +, −, ×, ÷ and sqrt. Avoid Math.sin, cos, atan2, exp and pow (implementation-approximated) and anything computed on the GPU (WGSL may reassociate and fuse).

### Cited Findings
- **[pub] Surf's Up "wave rider" (sketch).** The published wave character included a geometric constraint, the wave rider, that let a user move a surfboard freely across the wave. It automatically stayed above water and did not distort as the face changed shape or its coordinates shifted — [Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- **[pub-dec] Surf's Up "wave rider" (course notes).**
  - Wave Riders were locators constrained to the wave patch with Maya's geometry constraint: free to move over the surface, never off it.
  - They were good for blocking character and camera animation but generally did not drive final animation.
  - A Wave Train patch and a wake visualiser were attached to them.
  - The wake-trail tool dropped one particle per frame behind the rider. Each particle ray-intersected the nearest surface location and anchored itself in Pref space, so it slid over the wave as the wave rolled under it. The particles were lofted into a ribbon.
  - The ribbon revealed boards sliding sideways (not tracking), and wave speed wrong relative to the surfer: the trail ran straight up the face when the surfer crossed too slowly.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub] Thürey's surfer** was scripted to move along the wave front, with no rider physics — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Exact 2D polygon SDF.** Take the minimum distance from the point to each edge, by clamped projection onto the segment. Get the sign from a crossing (winding) test that flips a sign variable at each qualifying edge. Cost is O(N) per query — [Quilez, 2D distance functions (sdPolygon, sdSegment)](https://iquilezles.org/articles/distfunctions2d/)
- **[snippet] Interpolating shapes between slices.** Shape-based interpolation (Raya & Udupa 1990, IEEE TMI):
  - convert each slice to a signed distance image (positive inside, negative outside);
  - interpolate the distance images;
  - take the non-negative set as the in-between object.

  Source: [search-index summary; DOI 10.1109/42.52980](https://doi.org/10.1109/42.52980); the PubMed page was CAPTCHA-blocked. Bill Lorensen published an implementation — [GitHub lorensen/ShapeBasedInterpolation](https://github.com/lorensen/ShapeBasedInterpolation) (listing only, not opened)
- **[pub] Continuous collision options (Catto, GDC 2013).**
  - Ignoring the problem gives tunnelling.
  - Thicker geometry helps until speeds rise, and then needs a speed cap.
  - Speculative contacts slow a body before impact. They need special handling for restitution and can cause ghost collisions.
  - Time of impact (TOI) can either stop the body at the TOI, which loses time and visibly hitches, or sub-step, which is smooth but CPU-heavy.
  - Conservative advancement bounds motion by distance over maximum approach speed. It can take hundreds of iterations when shapes are close, because it approaches the root from one side only.
  - Catto's alternative lets the separation go negative along a separating axis and root-finds (bisection or better).
  - Diablo 3 used TOI plus sub-stepping only for dynamic-versus-static pairs, because of cost.

  Source: [Catto 2013, Continuous Collision](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf)
- **[pub] Shipped surf game collision trouble.** Barton Lynch Pro Surfing's v1.11 notes list the player passing through the first few waves, and water-plane collision failing through the waves — [DayOne patch report](https://playday.one/2024/10/30/barton-lynch-pro-surfing-sees-graphical-improvements-in-latest-free-patch/). True Surf's launch post says nothing about board–wave collision — [Meta blog](https://www.meta.com/blog/true-surf-launch/)
- **[pub] JavaScript math determinism.**
  - ECMAScript defines Math.sin (and the other transcendental functions) to return an implementation-approximated value. The spec defines "implementation-approximated" as set by an external source, with the spec giving only the ideal.
  - Math.sqrt is defined as the Number nearest the exact real square root, i.e. correctly rounded.

  Source: [ECMA-262, Math object](https://tc39.es/ecma262/multipage/numbers-and-dates.html); [ECMA-262, terms](https://tc39.es/ecma262/multipage/overview.html). MDN warns that many Math functions have implementation-dependent precision, so different browsers, or the same engine on another OS or CPU, can give different results — [MDN Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)
- **[pub] GPU math determinism (WGSL §15.7).**
  - Implementations may reassociate operations, and may fuse them when the result is at least as accurate.
  - f32 division is only accurate to 2.5 ULP.
  - Inputs and outputs of the accuracy-listed operations may be flushed to zero.
  - WGSL's own fma may be computed as a separate multiply and add.

  Source: [W3C WGSL](https://www.w3.org/TR/WGSL/)
- **[pub] Cross-platform float determinism in practice (Box2D v3).**
  - FMA contraction is disabled (-ffp-contract=off) and fast-math is never used.
  - sinf, cosf and atan2f are replaced with custom approximations that give identical results everywhere.
  - sqrtf is kept because it is deterministic.
  - Multithreaded results are ordered deterministically with per-thread bit arrays merged by bitwise OR.
  - Apple M2 and AMD Ryzen gave identical results.
  - Catto judged fixed-point would likely be slower, and prone to overflow and implementation difficulty.

  Source: [Box2D, Determinism (Aug 2024)](https://box2d.org/posts/2024/08/determinism/)
- **[meas] Query cost.** Apple M1 (8 GB), Node v22.17.0 (V8), macOS (Darwin 24.6), 2026-09-28, other sessions running. Test: SDF from a point to a closed polygon made of an N-point profile plus two closing vertices 50 m below, with crossing-number sign; two neighbouring slices interpolated. Results: **3.0 µs per query with N = 128; 1.07 µs with N = 64** (median of 20,000 queries). Script: `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/bench/loft_bench.mjs` (scratchpad; may be deleted).

### Inferences
- **Wave coordinates for the rider.** Reuse what `waveFrame.ts` already does along the travel direction, generalised to the loft:
  1. Find the rider's nearest point on the loft line. Search only the few segments around last step's s, and break ties by segment index. This gives s and a fractional slice index i + f.
  2. Compute u = (p − origin)·n and z = p_z − base.
- **Collide with what is drawn.** Interpolate the profile vertices at i + f exactly as the renderer does, with the same stage lerp and the same end blending. Then take one polygon SDF (O(N)).
  - Interpolating the two slices' SDFs (the shape-based approach) is also valid and costs the same, but it is not what is drawn.
  - With a thin lip that shifts more than its own thickness between slices, blending SDFs can open a gap the lip does not have. Profile-first interpolation avoids that.
- **Closing the polygon.** Close the open profile by running straight down from the toe and back ends to a deep line (the seabed, or −50 m) and joining them. Water is then "inside".
  - The air cavity becomes a concavity of the polygon, open to the air at the tube mouth in 3D but closed in 2D once the lip touches down. The crossing test marks it correctly as outside (air) as long as the polygon does not self-intersect.
  - **Pitfall:** after touchdown, a jet that penetrates the face flips signs in the overlap. Hence the library-side trim or two-loop representation in §2.
- **Board constraint à la wave rider.** Represent the board by a few contact points: nose, tail and two rails. Each step:
  1. Integrate the board's dynamics.
  2. For each contact point, compute the SD and its gradient ∇SD (edge normal, or finite difference).
  3. Resolve penetration (SD < 0) along ∇SD as a contact constraint, with friction from the rider model.
  4. Align the board's up to the averaged normal.

  That is the physics analogue of "stay above water without distorting as the face changes shape". Inside the tube, also test the rider's head and shoulders against the ceiling (the lip underside). Contact there can trigger the wipeout or hold-down logic.
- **Continuous collision budget [calc from meas].**
  - Board speed relative to a moving lip can reach about 15–20 m/s (board ~10–12 m/s plus lip and crest motion; assumed values). That is 0.25–0.33 m per 1/60 s step, comparable to lip thickness, so a discrete test can tunnel.
  - Option A: 4× sub-stepping of the contact queries at 240 Hz. 4 contact points × 4 sub-steps ≈ 16 queries ≈ 50 µs per rider per step at N = 128.
  - Option B: conservative advancement against the SD, capped at 8 iterations, then a bisection fallback (Catto's warning about slow CA convergence).
  - Option C: speculative contacts for the board bottom, which only needs "don't cross the face". Catto notes the ghost-contact risk.
  - With a handful of riders, all three fit easily in the sim budget.
- **Determinism checklist for online play.**
  - Loft line tracking, slice clock, profile lookup and SDF all run on the CPU in float64 TypeScript inside the lockstep sim.
  - Only +, −, ×, ÷, sqrt, Math.min/max, comparisons and integer ops (|0, Math.imul) are used.
  - Anything that needs a trig function uses a shared polynomial approximation (the Box2D pattern) or a table shipped with the game.
  - The profile library is shipped as binary Float32/Float64 arrays, never regenerated at load with Math.* functions.
  - Iteration order is fixed, with no reductions across Web Workers in nondeterministic order.
  - The GPU mesh is visual only and must never feed back into the sim, because WGSL permits reassociation and fusion and GLSL is looser still.
  - This mirrors Surf's Up's "one external library for every package" rule.
- **Fixed-point is unnecessary.** JS arithmetic on doubles is deterministic when restricted as above, and Box2D reached cross-platform determinism with plain floats.

### Gaps
- No shipped surf game has published how it constrains the board inside a tube: not True Surf, Barton Lynch, Surf World Series (the 2017 interviews I opened cover only gameplay) or Surf Sandbox (whose Steam and news pages give no technique).
- Raya & Udupa were read only as a search summary.
- The 3 µs figure is V8 on M1. JavaScriptCore (Safari) and SpiderMonkey (Firefox) were not measured.

---

## 5. Rendering specifics (normals and tangents on a lofted surface, UVs for flow-mapped foam and lip streaks, level of detail, thickness for translucency, sorting with transparent spray)

### Takeaway
Surf's Up gives the key rendering idea for a lofted wave: a **reference space (Pref)**. A flattened, time = 0 copy of the wave moves with it, and its positions serve as texture coordinates. Surface texture then appears to stay with the water while the wave deforms and moves under it, and the same space fixes motion vectors. On top of that:
- Thürey shows that thickness can be an offset layer, and that UVs can come from "position along the line" and "age";
- flow maps (Valve) give moving streaks cheaply;
- the clipmap transition band gives pop-free LOD;
- weighted blended OIT handles spray over an opaque wave.

The lofted surface is well suited to all of these because it has a clean (s, u) parameterisation.

### Cited Findings
- **[pub-dec] Pref space (Surf's Up).**
  - A simple texture locked to the patch's local UVs is uninformative, because texture has to slide over the surface as the wave advances.
  - The team built a secondary animated reference space, stored as a point attribute (Pref). It was a completely flat, time = 0 version of the wave moving at the wave's rate.
  - World positions of that flat wave served as UVs for ocean texture, so the texture appeared static while the wave moved under it.
  - Flattening avoided streaking along the vertical axis.
  - Every texture, particle or bound object used Pref.
  - Hundreds of hours went into hand-tailoring Pref for each wave style.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf); [US8610721B2](https://patents.google.com/patent/US8610721B2/en)
- **[pub-dec] Wave-space attributes (Surf's Up).** The rig output world position (Pwave), Pref, per-cross-section wave time, wave v (the parametric direction across the forward motion), shoulder, and energy (per blendshape stage, used for whitewater). In (wave time, wave v) space the lip sits at a constant v, which made it easy to isolate as a lip-spray emitter and to place "curl foam" and "back foam" regions — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub-dec] Motion vectors (Surf's Up).**
  - Plain deformation blur failed. Once the wave had tubed, the vertices of the inside face simply moved forward between frames, while the water there actually moves up and forward.
  - The fix treated the wave as a deformation passing through static water: deform the current frame's Pref shape by the next frame's Pref-to-Pwave mapping.
  - The forward-falling face needed a special reversed-vector correction.

  Source: [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- **[pub] Thürey: thickness, UVs and foam.**
  - A second copy of the sheet is offset along the normal by p_m, and the sides are stitched into a closed thick mesh.
  - Texture coordinates are the particle's lifetime and its position along the line.
  - A foam texture is blended in at the tip, and a small bump map adds ripples.
  - Mesh generation (vertices and normals) took 18.9% of frame time.

  Source: [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)
- **[pub] Per-vertex attributes from profiles.** Surf's Up's interpolator also carried any value attached to the input profiles (energy, time, speed, crash) to every vertex. A "crash curve" along the lip, with quaternion-interpolated spill vectors, fed a real-time whitewater particle preview — [Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf). **[pub-dec]** In the course notes, the crash curve was a NURBS curve bound to the lip with energy and time attributes at its CVs. A pre-simulated, loopable whitewater "clip" was instanced end to end along it, oriented to the curve normal and scaled by energy, so particles appeared only where energy was non-zero. The clip was 1?0 frames of about two thousand particles; the middle digit, and the digit in the clip's width in centimetres, did not decode — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf).
- **[pub] Flow maps (Valve, 2010).**
  - A low-resolution 2D flow-vector texture (about 4 texels per metre) distorts a normal map in the flow direction.
  - Distortion looks right only for about the first third of UV space, so two layers offset by half a phase are cross-faded to hide the restart.
  - Per-point offsets reduce repetition, and a noise texture reduces the pulsing.
  - Normal strength is scaled down with flow speed.
  - Cost versus two scrolling normal maps: 2 extra texture fetches and 21 extra ALU instructions (ps2.0b / Xbox 360 class hardware).

  Source: [Vlachos, Water Flow in Portal 2, SIGGRAPH 2010](https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf)
- **[pub] Pop-free LOD.** Morph geometry toward the coarser level across a transition band. For clipmaps, n/10 grid units works well, at about 10 vertex-shader instructions — [Losasso & Hoppe 2004](https://hhoppe.com/geomclipmap.pdf)
- **[pub] Transparent spray.** See the weighted blended OIT entry in §3 ([McGuire 2014](https://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html)). Lip translucency models (thickness-driven transmittance, forward-scatter lobe) are covered in `.claude/water-physics/research_notes/Breaking waves foam and tubes/lip_tube_rendering.md`.

### Inferences
- **UVs.** Use u = arc length along the profile, in metres, measured from the crest landmark (lip-side positive), and v = σ, the persistent along-crest coordinate from §1. Metres keep texel density even as the lip stretches. σ keeps textures still along the crest while the loft is resampled.
- **A physics-based Pref for free.** Surf's Up hand-authored Pref. The offline 2D simulations that make the library already know which water parcel sits at each surface point. Store a Lagrangian label per profile sample, such as the parcel's initial horizontal position in the wave frame, and interpolate it like any other attribute. Using it as the texture coordinate across the profile makes foam, streaks and ripples move with the water: up the face, over the lip and down the curtain. Its time derivative is the flow vector for Valve-style two-phase flow maps (lip streaks aligned with the curtain's fall).
- **Normals and tangents.** Use the analytic cross product from §2. Because u is arc length along the profile and v is along the crest, the tangent frame for normal maps is simply T = ∂P/∂u and B = ∂P/∂s, normalised and Gram–Schmidt'd, with no MikkTSpace bake. The lip's underside is part of the same curve, so single-sided rendering with consistent winding gives correct outward normals inside the tube. Double-sided rendering is needed only if the library omits the underside.
- **Thickness.** Store the local water thickness along the normal per profile sample in the library (the jet's thickness on the lip, a large value on the face). Pass it as a vertex attribute to the existing lip translucency terms. This replaces Thürey's p_m offset layer and the parcel-sheet thickness.
- **LOD.** Keep N fixed per LOD and vary slice spacing with distance (0.5 m near, 2 m far). For a far LOD with N/2 samples, put every landmark on an even index so decimation keeps them. Cross-morph odd vertices toward their even neighbours' midpoint over a distance band, clipmap-style, to avoid popping. Beyond ~150–200 m the loft can end at τ → 0 and let the height field alone draw the wave.
- **Draw order.**
  1. Opaque ocean with the hole mask, and opaque loft (dithered band).
  2. Foam as surface texture, not particles, where possible.
  3. Spray, mist and pour parcels as transparent, using WBOIT or additive blending.

  three.js orders transparent objects per object, not per particle, so large particle clouds need OIT or order-independent blending. [Inference based on three.js behaviour; not verified against its docs in this session.]
- **three.js pitfalls when vertices come from a shader.**
  - The CPU-side bounding sphere is stale: set `frustumCulled = false`, or update the bounding sphere from slice extents every frame.
  - Shadow and depth passes need a matching custom depth material, or shadows use the undeformed grid.
  - Raycasts against the mesh use CPU data, so use the CPU loft for any gameplay queries.

  [Inference.] The repository's `src/scene/ShadowRig.ts` suggests shadows are in use.
- **Motion vectors, if TAA or motion blur is used.** Take Surf's Up's lesson: loft vertex velocity is not water velocity. Compute velocities from the reference (Pref-like) mapping, or accept blur artefacts on the curtain.

### Gaps
- No published real-time measurements of Pref-style texturing on a game wave.
- The weighted blended OIT timings on Apple GPUs are unknown; the source post gives none.
- I found no public details of how True Surf or Barton Lynch texture their lips.

---

## 6. Costs: vertex counts and generation cost for 30–150 m of crest with 64–128 samples per profile, WebGL2 versus WebGPU

### Takeaway
The swept surface is small by GPU standards: about 2k–38.5k vertices and 3.8k–76k triangles across the requested range.
- **CPU path:** on an Apple M1 in V8, the full per-frame loft (profile lookup, placement, height-field end blending, normals) takes **0.19–0.93 ms median [meas]**. It uploads 0.07–1.4 MB per frame.
- **GPU path:** the vertex-shader loft uploads only a ~5–10 KB slice texture per frame plus a static 64–128 KB profile texture, and does trivial per-vertex work.
- **WebGPU compute** buys nothing essential at this size, because the WebGL2 vertex-shader path must exist anyway.

The historical anchor is Thürey 2007: mesh plus normals was 18.9% of frame time on a 2007 single-core CPU at 40–75 fps.

### Cited Findings
- **[meas] CPU loft cost.** Apple M1 (8 GB), Node v22.17.0 (V8), macOS (Darwin 24.6), 2026-09-28. The machine was not idle, so p95 values are inflated.

  Method:
  - synthetic 64-stage library;
  - per vertex: linear stage lerp, scale by H, place along the horizontal slice normal, and blend toward a bilinear 1 m height field over 8 samples at each profile end;
  - normals by central differences on the (slice, sample) grid, plus normalise;
  - Float32 output;
  - 200 warm-up frames, then 400 timed frames.

  | Crest | Slice spacing | Samples | Vertices | Triangles | Upload at 36 B/vertex | Loft median | p95 |
  |---|---|---|---|---|---|---|---|
  | 150 m | 0.5 m | 128 | 38,528 | 76,200 | 1.39 MB | 0.93 ms | 2.3 ms |
  | 150 m | 1 m | 128 | 19,328 | 38,100 | 0.70 MB | 0.46 ms | 1.1 ms |
  | 30 m | 0.5 m | 128 | 7,808 | 15,240 | 0.28 MB | 0.19 ms | 0.43 ms |
  | 150 m | 1 m | 64 | 9,664 | 18,900 | 0.35 MB | 0.24 ms | 0.60 ms |

  Script: `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/bench/loft_bench.mjs` (scratchpad; may be deleted).
- **[meas] Collision query cost:** 3.0 µs (N = 128) and 1.07 µs (N = 64) per two-slice query on the same machine (§4).
- **[pub] Thürey 2007 costs.** Intel Core 2 Duo 2.13 GHz, single-threaded, with a GeForce 7950. Frame time split: shallow water 39.6%, breaking waves and particles 21.7%, mesh generation (vertices and normals) 18.9%, rendering and engine 19.8%. Whole scenes ran at 40–75 fps including rendering. The text says 160k–200k grid points, which conflicts with Table 2's resolutions (for example 200×100) — [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf). **[calc]** At 40–75 fps, 18.9% is about 2.5–4.7 ms per frame for mesh and normals on that 2007 CPU.
- **[pub] Mihalef 2004** (offline reference). The 3D slice-driven animations took about 10–12 minutes per frame at 128×128×64, on hardware the paper states as a Pentium 3 at 2.6 GHz with 2 GB RAM. Building one 3D geometry took about 5 minutes, mostly marching cubes — [Mihalef et al. 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- **[pub] Cost of small shader add-ons.** The clipmap transition morph is about 10 vertex-shader instructions — [Losasso & Hoppe 2004](https://hhoppe.com/geomclipmap.pdf). Flow maps cost 2 texture fetches and 21 ALU instructions over two scrolling normal maps — [Vlachos 2010](https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf)
- **[pub] API notes.**
  - WebGL2 has no compute. Vertex-shader generation from gl_VertexID and textures is supported, with a caution about heavy per-vertex maths — [WebGL2 Fundamentals](https://webgl2fundamentals.org/webgl/lessons/webgl-drawing-without-data.html)
  - 16-bit float textures filter natively in WebGL2; 32-bit float needs OES_texture_float_linear — [WebGL2 Fundamentals, data textures](https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html); [MDN](https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float_linear)
  - WebGPU storage-buffer vertex pulling may be slower on some older devices — [WebGPU Fundamentals](https://webgpufundamentals.org/webgpu/lessons/webgpu-storage-buffers.html)
  - The three.js compute-geometry path is WebGPU-only — [three.js example](https://threejs.org/examples/webgpu_compute_geometry.html)

### Inferences
- **Full vertex-count table [calc].** Slices = length/spacing + 1; vertices = slices × N; triangles = 2(slices − 1)(N − 1).

  | Crest | Slice spacing | N | Vertices | Triangles |
  |---|---|---|---|---|
  | 30 m | 1 m | 64 | 1,984 | 3,780 |
  | 30 m | 1 m | 128 | 3,968 | 7,620 |
  | 30 m | 0.5 m | 64 | 3,904 | 7,560 |
  | 30 m | 0.5 m | 128 | 7,808 | 15,240 |
  | 150 m | 1 m | 64 | 9,664 | 18,900 |
  | 150 m | 1 m | 128 | 19,328 | 38,100 |
  | 150 m | 0.5 m | 64 | 19,264 | 37,800 |
  | 150 m | 0.5 m | 128 | 38,528 | 76,200 |
- **GPU vertex-shader path (WebGL2 and WebGPU).** Per vertex: about 2–5 texture fetches (slice data, profile at two stages or one filtered fetch, optionally the height field for the end blend) and about 40–80 ALU operations, three times over if neighbours are evaluated for normals. For ≤ 40k vertices this is a tiny fraction of the game's existing water-mesh and full-screen shading work.
  - Per-frame traffic: the slice texture (≈ 32 B × slices, so 5–10 KB), against 0.07–1.4 MB of vertex data on the CPU path.
  - Static data: profile textures of 64 stages × 128 samples × 8 B = 64 KB per RGBA16F texture, per family.
  - I expect GPU time well under 0.1 ms on M4 Pro and M1. That is not measured.
- **CPU path.** It fits comfortably. The worst case, 0.93 ms median, was measured on the slow target (M1), and M4 Pro should be faster; that is not measured here. The unknown is the browser's buffer upload: WebGL bufferSubData of ~1.4 MB per frame goes through Chrome's GPU-process command buffer, and its cost on M1 and M4 has not been measured here. Use the CPU loft for collision (only the few slices near riders are needed) and the GPU loft for drawing. That keeps upload tiny and still gives a full CPU copy for fallback or debugging.
- **WebGPU compute adds little** at 10k–40k vertices, beyond being able to compute normals from stored neighbours in one pass. The vertex-shader path is shared by both renderers, which avoids two implementations of the most visible surface.
- **Budget summary** (target M4 Pro, M1 accepted as slow):
  - sim line tracking: a few hundred points, tens of µs (inference);
  - CPU collision: ≈ 50 µs per rider per step with 4× sub-stepped contacts at N = 128 (§4, calc from meas);
  - GPU loft: well under 1 ms (inference);
  - mask pass: one small top-down draw into an R8 target, cheap (inference);
  - CPU fallback loft: ≤ 1 ms on M1 at the largest size (meas).

### Gaps
- No measurement of WebGL2 bufferSubData or texSubImage upload cost, or of vertex-shader loft GPU time, in Chrome or Safari on M1 or M4 Pro. A GPU timer query (EXT_disjoint_timer_query_webgl2 where exposed), or a frame-time A/B test in the running game, is needed.
- The benchmark ran in Node (V8), not Safari's JavaScriptCore or Firefox's SpiderMonkey.
- There are no published costs for any shipped surf game's wave mesh generation.
