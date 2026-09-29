# Underwater: what the water mass does beneath surf, how it looks from below, how to render it (research round 5)

Written 2026-09-29 for Breakline's water-physics knowledge base. Code is cited as `path:line` on `origin/main` at `e513af9`. The owner asked to work on "below water and mass carried bodies of water that create that beautiful …"; this round reads that as the whole underwater experience.

This round builds on, and does not repeat:
- round 1, `../Breaking waves foam and tubes/whitewater_foam.md` §4 (foam and bubbly-water colour, Dierssen, Zhang, Bohren via Flatau) and §6 (Chanson 2002's plume, Rojas & Loewen, bubble spectra via Hwang);
- round 3, `../Whitewater build research/foam_lifecycle.md` §2.1 (Callaghan: foam lives as long as the plume feeds it; Monahan & Zietlow: salt water has more small bubbles) and `roller_build.md` (the roller layer, its push, the undertow's feel);
- round 4, `../Spray and mist research/spray_mist.md` (the optical-depth rule τ = 1.5·w/r, two-stream whiteness, and the M1 render-cost measurements reused in §4.3 here).

**Tags.** [meas-field] field measurement; [meas-lab] laboratory measurement; [model] published simulation or theory; [computed] my own calculation from sourced inputs (script: `scratchpad/uw/calc/underwater_calc.py`, may be deleted); [prod] film or game practice; [code] the game's code; [anecdote] photos or interviews; [inferred] my reasoning, provisional. "(abstract)" means only the abstract was opened; "via X" means the number is reported by X, which was opened, and the primary was not.

---

## 0. The answer in brief

- **Why the underwater view reads flat today.**
  1. One fog for every spot, every hour: a flat `FogExp2('#367e83', 0.035)` (`src/main.ts:166`). Squared-exponential fog keeps 97 % contrast at 5 m and 61 % at 20 m, then walls off near 60 m [computed]. The game's own water optics (`src/scene/waterOptics.ts:35-40`) say the Beach should fade to a black-target visibility of about 2 m and the Reef to about 22 m, with red gone within 10 m at the Reef [computed].
  2. The surface is shaded from below as if seen from above. There is no Snell's window and no mirror of total internal reflection: the Rich shader flips the normal and runs the above-water bed-reflectance formula (`src/scene/water/richWaterGlsl.ts:146`, `src/scene/waterOptics.ts:198-222`).
  3. Light doesn't come from above. The seabed is an unlit painted gradient (`src/scene/SpotSeabed.ts:12-16`) that looks the same at noon and at sunset; the water has no brightness gradient with direction, although real underwater radiance is about 25× brighter looking up than looking level (Tyler 1960) [meas-field].
  4. The water doesn't move. Bubbles are 7 cm white dots (`src/scene/BubblePoints.ts:19-21`) that ride the depth-averaged current, rise at 0.25 m/s and die in 3 s (`src/wave/BubbleCloud.ts:21-26, 63-66`). Nothing shows the ±2 m surge of each wave, the undertow, the plunge vortex or sand.
  5. The plume is paint: from below the Rich water whitens the ceiling "plainly" (`richWaterGlsl.ts:84-86`) instead of filling a volume.
  6. The player almost never sees any of it. Ride cameras stay at least 0.8 m above the local surface (`src/scene/SpectatorCamera.ts:136, 149, 154`); duck-dives and hold-downs are only heard, as a muffle (`src/audio/soundMapping.ts:275`).
- **What moves under a surf wave (sourced).**
  - Orbital surge: under 1.4 m, 12 s waves in 3–5 m of water the whole column sloshes ±1.8–2.4 m at 0.9–1.3 m/s, almost uniformly with depth; vertical motion is ±0.35 m at mid-depth and zero at the bed [computed, linear theory from Bosboom & Stive]. Field: about ±1 m/s near the bed under plungers [meas-field, via Aagaard et al. 2021].
  - Undertow 0.05–0.4 m/s over a barred beach in a storm [meas-field, Duck94]; up to 0.8 m/s near the bed on a bar's lee slope [meas-lab, large scale]. Rips 0.3 m/s mean, pulsing above 1 m/s over 25–250 s [meas-field, RIPEX].
  - Plunge: the air tube is carried down, squeezed and fragmented; a spanwise vortex forms at each splash-up, about every 2√(2H_b/g) ≈ 1.1–1.3 s for 1.5–2 m breakers; tilted bubble columns (obliquely descending eddies, ≤ 45°) trail behind toward the bed [meas-lab + model]. The plunge vortex spans nearly the whole water column at near-prototype scale [meas-lab].
  - Bubble plume: void fraction above 10 % when young, about 1 % within one or two wave periods; less than 5 % of the entrained air is left one period after breaking (Lamarre & Melville, via Derakhti & Kirby) [meas-lab]; millimetre bubbles rise at about 0.2 m/s, 50 µm ones at 0.5 cm/s [meas-lab]; visible bubbles linger 25–40 s in a near-full-scale plunge [meas-lab].
  - Sand: plunging vortices throw isolated sediment clouds more than 0.5 m up, sometimes filling the column; near-bed mean concentrations 3–7 kg/m³ on a plunging beach [meas-field, review]; 0.24–0.36 mm sand settles at 2.8–4.8 cm/s [computed].
- **What it looks like from below (sourced).** A 97° window of sky with a hard edge, a mirror beyond it (widening to about 122° on 16° slopes and almost 180° under breaking waves, Lynch 2014, abstract); caustic flashes above 1.5× the mean up to about 200 times a minute at 1 m depth, the brightest about 10× (Dera & Stramski 1986; Darecki et al. 2011); shafts that stay steeper than about 42° above horizontal whatever the sun [computed]; bubble clouds that are white where lit, dark beneath, greenish in their thin edges, and glint near 80° from the light [meas-field + computed].
- **What others do.** Film: murk, particulate, caustics, light beams and surface images (Finding Nemo). Games: per-channel exponential fog toward a scatter colour, the underside with Fresnel and a total-internal-reflection term, tiled or simulated caustics, shafts from projected caustics or volumetric fog, a meniscus at the waterline (Crest, HDRP, Crysis, Subnautica).
- **What to change, ranked** (§6): (1) optics from the spot's own water, (2) the surface from below, (3) tracers carried by a 3D flow rebuilt from the solver, (4) the plume as a volume, (5) shafts and caustics on bodies, (6) sand clouds, (7) an underwater ride camera and waterline (owner's call), (8) the barrel's cavity and vortex from below once the swept surface exists. Items 1–2 are shader-only; the whole package is an estimated 0.6–1.3 ms on the M4 Pro and 2–4 ms on the M1 Air, only while the camera is under.

---

## 1. The game today [code]

### 1.1 Going under is one switch for the whole frame
- The camera is "below" when its own point is more than 0.1 m under the surface at its x, z (`src/game/PhysicalMode.ts:627-631`), checked every frame (`src/main.ts:924, 938`) and for water-sheet shots (`:303`).
- Below, `setUnderwater` swaps the scene fog to `FogExp2('#367e83', 0.035)`, sets the background to the same flat colour and hides the sky group (`src/main.ts:165-167, 1061-1068`).
- So a camera straddling the surface fogs everything or nothing: there is no per-pixel waterline and no meniscus.
- The renderer is three.js `WebGLRenderer` (WebGL2) (`src/main.ts:214`); compute runs only in the solver's WebGPU worker. Anything drawn underwater must be WebGL2 (fragment passes, render targets, transform feedback).

### 1.2 The fog ignores the spot's water
- `FogExp2` multiplies contrast by exp(−(0.035·d)²): 0.97 at 5 m, 0.89 at 10 m, 0.61 at 20 m, 0.33 at 30 m, 0.14 at 40 m, 0.01 at 61 m [computed]. Grey-level contrast of 0.01 is roughly where a black target vanishes (§3.1).
- The spot's optics exist and already drive the water seen from above: pure-water absorption from Pope & Fry (`src/scene/waterOptics.ts:15`), per-spot particle scattering b_p = 2 (Beach), 1 (Point), 0.15 m⁻¹ (Reef) (`:35-40`), beam attenuation c = a + b (`:59-61`). The fog uses none of it, and never changes with depth below the surface, sun height or look.

### 1.3 The surface from below
- The water is a `MeshPhysicalMaterial` with `DoubleSide` (`src/scene/WaterSurface.ts:281-288`).
- Rich flips the normal on back faces (`src/scene/water/richWaterGlsl.ts:146`), so `waterViewCos` stays positive and the body block runs the above-water formula: it refracts the view with the air-to-water ratio 1/1.333 (`src/scene/waterOptics.ts:198`), so no ray is ever totally reflected, and colours the ceiling with the bed reflectance as if looking down (`:217-223`).
- The underside gets Classic's roughness 0.62 (`src/scene/water/specular.ts:24-28`, whose comment already names the missing physics: past Snell's window the water "reflects itself").
- The plume and foam are drawn on the ceiling "from below plainly" (`richWaterGlsl.ts:74-86`), with no volume under them.

### 1.4 The seabed and caustics
- The seabed is an unlit `MeshBasicMaterial` painted from `#d6c69c` (shallow) to `#2f5f66` (12 m and deeper) (`src/scene/SpotSeabed.ts:12-16, 70`). Its brightness doesn't follow the sun: only 60 % of it is modulated by the caustic map and a Beer–Lambert factor on the refracted sun path (`:7, 41-45`). At sunset it stays as bright as at noon.
- The caustic map refracts sun rays through the solver's surface plus the FFT chop onto a 48 m window around the view, 384² rays into 512² texels (about 9.4 cm each), capped at 16× flat-water light, every frame (`src/scene/CausticMap.ts:15-20, 92-112, 164-185`; `src/main.ts:957-958`).
- Only the bed and the water seen from above read it. Bodies don't. It isn't dimmed under foam or bubble plumes (the pass has no foam input), so caustics keep dancing under whitewater [inferred from code].

### 1.5 Bubbles and the plume
- `BubbleCloud` runs in the worker every step (`src/wave/SurfZoneRunner.ts:89, 301, 444`). It spawns only where the foam field's bore source is positive (`src/wave/BubbleCloud.ts:83`), about 2,000 bubbles per set (`:22-23`), 0.3–1.2 m under the surface whatever the wave's size (`:25, 92`). Bubbles ride the depth-averaged current, rise at 0.25 m/s and die after 3 s (`:21, 26, 63-66`).
- `BubblePoints` draws them as unlit 7 cm points, colour `#f2fbff`, opacity 0.7 (`src/scene/BubblePoints.ts:19-21`): the same white confetti at noon, at sunset and in the dark.
- The plunge plume lives in `AerationField`: void fraction and plume depth per cell, plunge depth 0.8 H and bore depth 0.3 H (provisional), one rise speed 0.25 m/s, cap 0.2 (`src/wave/AerationField.ts:13, 82-117, 120-139`), plus turbulence k after Ting & Kirby (`:15-25, 72-80`). The rider feels it (buoyancy, turbulence); `BubbleCloud` ignores it; the Rich water only paints it on the surface.

### 1.6 A 3D velocity already exists, for bodies
- `PhysicalSurfWater.sampleAt` rebuilds the flow at any height (`src/physics/PhysicalSurfWater.ts:106-171`):
  - horizontal: u/ū = kh·cosh(ks)/sinh(kh), capped at 2, with k from the peak period at the local depth (`:160-168`);
  - vertical: from continuity, −∇·q times sinh(ks)/sinh(kh) (or s/h in shallow water) (`:147, 164-170`);
  - in bores (breaking > 0.3): uniform, plus a roller carry toward B·√(gd) within half the set-up below the surface (`:11-31, 151-159`);
  - air: the plume's void fraction as a top hat down to the plume depth (`:346-357`); turbulence from 0.3 of the surface's at the bed to 1 at the top (`:364-373`).
- `PhysicalBodyWaterField` reconstructs w = ū·∇z_b − s·∇·ū from continuity (`src/physics/PhysicalBodyWaterField.ts:68-98`).
- `eddies.ts` adds a seeded 6-mode eddy field, 0.5–2 m wavelengths, with a descending bias of 0.3 σ after Nadaoka et al. (`src/physics/eddies.ts:3-16, 64-72`).
- The render side already uploads the depth-averaged current ū (`src/wave/SurfZoneSimulation.ts:928-942`) every other frame (`src/scene/WaterSurface.ts:366-373`), the heights, the bed and the aeration. A tracer can be moved by the very field that pushes the rider.

### 1.7 Who sees underwater today
- Ride views hold the camera at least 0.8–1.5 m above the local surface (`src/scene/SpectatorCamera.ts:136, 149, 154`).
- Duck-dives go 0.35–0.69 m deep (median) and relaxed hold-downs last 10.9 s (7.5–17.8 s, 10th–90th percentile) in the game's own reports (`docs/research/duck-dive-report.md`, `docs/research/holddown-report.md`). Both are only heard: the world muffles when the rider's head is under (`src/audio/soundMapping.ts:275`) and a bubble loop plays when the camera is (`:227`).
- The rider's own physics already swims "up toward the light" (`src/physics/DetachedSurfer.ts:147-150, 625-626`), a cue the picture never gives.
- The underwater view appears in the Wave Lab's jump point 3, 'below' (`src/game/waveLab/WaveLab.ts:34`; `src/scene/SpectatorCamera.ts:164-170`), the free fly camera (down to 0.3 m above the bed, `src/scene/FlyCamera.ts:35, 111`), and the water sheet's `below` and `ww-below` shots (`src/dev/waterSheet.ts:194, 94`).
- The session plan calls profile and underwater views "optional inspection tools" (`docs/research/session-experience-plan.md:68`); the wave plan already asked for per-channel Beer–Lambert underwater fog and light shafts (`docs/research/wave-formation-plan.md:369-371`).

### 1.8 Screenshots
The spawning session is capturing today's `below` and `ww-below` shots. The notes above predict what they show: a flat teal fog, a pale matte ceiling with white plume paint, uniform white dots, and a painted bed with caustics that ignore the foam.

---
## 2. What moves under a surf wave

### 2.1 Orbital motion and surge

**Takeaway.** In surf-zone depths the whole column sloshes back and forth with each wave, nearly the same speed top to bottom, over a few metres. The vertical part shrinks to nothing at the bed, so particle paths are flat ellipses that flatten toward the bed. This surge is the single most readable "water moving under water" cue, and the solver already carries it in ū.

- [model, textbook] Linear theory: the horizontal orbital amplitude is û(z) = ω·a·cosh k(h+z)/sinh kh; in shallow water (kh < π/10) it is uniform with depth, û = √(gh)·H/(2h), and the horizontal excursion is û/ω. Paths are ellipses that flatten toward the bed, where vertical motion is zero. At second order the orbits don't close and there is a drift in the wave direction. Shoaling makes the near-bed velocities skewed and asymmetric. — Bosboom & Stive, *Coastal Dynamics*, §5.4.1 ([LibreTexts](https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive)/05%3A_Coastal_hydrodynamics/5.04%3A_Wave_orbital_velocity_pressure_and_bed_shear_stress/5.4.01%3A_Wave_orbital_velocities))
- [computed] For the game's practice swell and bigger (linear theory, H taken as the local height):

  | H, T | depth h | kh | near-bed û | excursion ± | vertical semi-axis at mid-depth / surface |
  |---|---|---|---|---|---|
  | 1.4 m, 12 s | 2 m | 0.23 | 1.55 m/s | 3.0 m | 0.35 / 0.70 m |
  | 1.4 m, 12 s | 3 m | 0.29 | 1.23 m/s | 2.4 m | 0.35 / 0.70 m |
  | 1.4 m, 12 s | 5 m | 0.38 | 0.93 m/s | 1.8 m | 0.34 / 0.70 m |
  | 1.4 m, 12 s | 8 m | 0.49 | 0.72 m/s | 1.4 m | 0.34 / 0.70 m |
  | 2 m, 12 s | 5 m | 0.38 | 1.34 m/s | 2.6 m | 0.49 / 1.0 m |
  | 3 m, 14 s | 8 m | 0.42 | 1.57 m/s | 3.5 m | 0.73 / 1.5 m |

  Surface and bed speeds differ by under 10 % at these kh: the column moves almost as one.
- [meas-field] Durras Beach, NSW (swell, plunging breakers): cross-shore velocity near the bed swings about ±1 m/s with each breaker, and vertical velocity reaches about ±0.5 m/s (read from the review's Fig. 15). Aagaard & Hughes measured instantaneous w up to about 1 m/s at 15 cm above the bed under plungers, with w_rms twice that of spillers of the same height. — via [Aagaard et al. 2021, *J. Mar. Sci. Eng.* 9, 1300](https://doi.org/10.3390/jmse9111300) ([Utrecht copy](https://dspace.library.uu.nl/handle/1874/413580))

**Inference.** At the Wave Lab's `below` camera (lineup, 4–8 m of water) specks should sway ±1.4–1.8 m with each 12 s wave and bob ±0.3–0.5 m. Inside the break they should sway ±2.4–3 m. Today nothing sways.

### 2.2 Stokes drift, bore transport and the undertow

**Takeaway.** Waves carry mass shoreward between trough and crest; breaking adds the roller's mass. Where the shore is closed, the same mass returns seaward below trough level: the undertow. The circulation is onshore in a thin top layer and offshore beneath, strongest over and just shoreward of the break.

- [model, textbook] The wave's mass flux is q = E/c above trough level; in the surf zone q = E/c + α·E_r/c with the roller energy E_r and α of order 1 (0.22–2 in the literature). The depth-mean return current below the trough is −q/(ρh). The vertical structure comes from a non-depth-averaged momentum balance with an eddy viscosity. — Bosboom & Stive §5.5.1 and §5.5.6 ([5.5.1](https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive)/05%3A_Coastal_hydrodynamics/5.05%3A_Wave-induced_set-up_and_currents/5.5.01%3A_Wave-induced_mass_flux_or_momentum), [5.5.6](https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive)/05%3A_Coastal_hydrodynamics/5.05%3A_Wave-induced_set-up_and_currents/5.5.6%3A_Vertical_structure_of_the_wave-induced_currents))
- [computed] With E = ρgH²/8 and c = √(gh), the return current from the wave part alone is gH²/(8ch): 0.15 m/s for H = 1.4 m in 3 m of water, 0.27 m/s in 2 m, 0.31 m/s for H = 2 m in 3 m. The roller roughly doubles it.
- [meas-field] Duck94 storm (10–12 Oct 1994), barred beach: cross-shore mean currents 0.05–0.4 m/s; undertow strongest on top of and on the shoreward slope of the bar, with the "classic parabolic" profile of strong breaking; weak in the trough; nearly uniform on the bar's seaward slope. — [Garcez Faria 1997, NPS dissertation](https://calhoun.nps.edu/server/api/core/bitstreams/7a30faa6-893a-4ede-af9a-5f711de8fe8c/content) (chapter published as [Garcez Faria et al. 2000, JGR](https://doi.org/10.1029/2000JC900084), abstract: roller mass flux can match or exceed the organised wave part)
- [meas-field] Duck (abstract): predominantly offshore mean flow, with onshore flow confined to a thin surface layer. — [Haines & Sallenger 1994, JGR](https://doi.org/10.1029/94JC00427)
- [meas-lab, large scale] CIEM flume, regular plunging waves (T = 4 s, H = 0.76–0.85 m) over a bar on a 1:12 beach: undertow up to 0.8 m/s close to the bed on the bar's shoreward slope; a wave-averaged circulation rises over the bar crest and sinks in the inner surf zone. — [van der Zanden et al. 2018, JGR](https://ris.utwente.nl/ws/files/29784531/Zanden_et_al_2018_Journal_of_Geophysical_Research_Oceans.pdf); [van der A et al. 2017](https://doi.org/10.1002/2016jc012072) (abstract)
- [model] How depth-averaged Boussinesq models carry the roller: total flux P = u₀·d + (c − u₀)·δ while breaking, with the roller of thickness δ moving at c = √(gd) and the water below at u₀; δ = r·(η* − η̄), r = 0.45·tan θ, capped at 0.164 (20° face); the undertow then follows from the local balance. — [FUNWAVE-TVD documentation, breaking, roller and undertow](https://fengyanshi.github.io/build/html/wavebreaking.html) (after Schäffer et al. 1993)
- [inferred] A bore therefore carries its top (the aerated roller) shoreward at the bore's speed, 3.4–4.9 m/s for H = 0.5–1 m (see the Roller page), while the water under it drifts back. Seen from below: bubbles race shoreward in a band at the surface; specks near the bed stall or slide seaward.

### 2.3 Rip currents

- [meas-field] RIPEX, Sand City, Monterey Bay, 44 days, Hs 0.2–3 m: mean rip speeds O(0.3 m/s) across conditions, mean maxima near 1 m/s; infragravity pulses raise the instantaneous flow above 1 m/s for 25–250 s; flow in the surf zone depth-uniform except for near-surface shear from Stokes drift; no undertow over the transverse bars, where the flow was shoreward. Up to 2 m/s has been reported (Short 1985). — [MacMahan et al. 2005, *Marine Geology* 218](https://calhoun.nps.edu/server/api/core/bitstreams/b2de88ce-653b-4133-9d3e-bf1d78390d59/content)
- [agency] Widths about 5–90 m, typical 0.3–0.6 m/s, up to 2.4 m/s; seen as dark gaps with plumes of sand or foam beyond the break. — [NOAA NWS](https://www.weather.gov/safety/ripcurrent-science) (round 1)
- [inferred] The solver resolves rips in ū, so a tracer in ū shows them for free: a river of hazy, bubbly or sandy water leaving through a channel, pulsing with the sets.

### 2.4 The plunging jet underwater: cavity, vortex, splash-ups, descending eddies

**Takeaway.** The lip traps an air tube, carries it down and breaks it into bubbles within about a second at lab scale. A spanwise vortex forms at the impact and again at every splash-up, each rolling up a cloud of bubbles that barely travels while the wave runs on. Behind, tilted columns of bubbles (obliquely descending eddies) reach toward the bed. In surf-zone depths the plunge vortex reaches the bed.

- [meas-lab] Deane & Stokes 2002, seawater flume, 10 cm plunging breakers (with field spectra, Hs 2.5–3.5 m): the jet traps a cavity; the flow circulates around it; about 1 s later the cavity has almost fragmented and its remnants are ringed by jet-made bubbles; 2 s later a quiescent plume remains. Bubbles above about 2 mm radius form only during the cavity's collapse; smaller ones form at the jet's contact all through the active phase. Open-ocean plumes reach "0.5 m or more" below the surface with void fractions above 10 %. — [Deane & Stokes 2002, *Nature* 418](https://pdodds.w3.uvm.edu/files/papers/others/2002/deane2002.pdf)
- [meas-field] (abstract) Surf zone off Scripps: the compacted air–water mass turns into individual bubbles within about 90 ms or less, both for jet intrusions and for the cavity; sub-millimetre air filaments fragment beneath wave-driven jets. — [Deane & Stokes 1999, JPO](https://doi.org/10.1175/1520-0485(1999)029<1393:AEPABS>2.0.CO;2)
- [meas-lab, via] Lamarre & Melville 1991: the cavity is first carried down, then squeezed and fragmented; the plume's potential energy is 30–50 % of the energy breaking dissipates. — via [Iafrati 2009, IWWWFB](http://www.iwwwfb.org/Abstracts/iwwwfb24/iwwwfb24_31.pdf) and [Derakhti & Kirby 2014, CACR-14-06](https://www1.udel.edu/kirby/papers/derakhti-kirby-cacr-14-06.pdf); primary [doi:10.1038/351469a0](https://doi.org/10.1038/351469a0) not opened.
- [model + meas-lab] Watanabe, Saeki & Hosking 2005 (3D LES with lab visualisation): each plunging jet makes spanwise "primary" vortices (Nadaoka's horizontal eddies); vortex loops stretched between them become rib vortices, which the authors identify with Nadaoka's obliquely descending eddies, seen in the lab as tilted columnar bubble clouds. Nadaoka found the mean strain axes behind a crest inclined about 45° or less. Splash-ups recur at t = 2√(2H_b/g), about T/8. Large bubbles ride the top of the vortex; small ones descend and spread, trapped toward vortex cores by the pressure gradient. In very shallow water the structure is squeezed and aligns with the bed. — [JFM 545, Hokkaido copy](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/1425/1/JFM545.pdf); Nadaoka, Hino & Koyano 1989 [abstract](https://doi.org/10.1017/S0022112089001783): breaking brings vorticity with non-zero mean and raises mass and momentum transport above a non-breaking wave's.
- [computed] 2√(2H_b/g) = 0.9 s (H_b = 1 m), 1.1 s (1.5 m), 1.3 s (2 m), 1.6 s (3 m).
- [meas-lab] Chanson, Aoki & Maruyama 2002, near-full-scale pseudo-plunging jet, 0.4 m of water, 5.8–6.1 m/s impact: the plume reached the bed in 0.23–0.27 s; its front moved at 30–45 % of the impact speed; at the bed it turned into a bubbly current along the bed under clear water, running 1–1.2 m before the bubbles rose; a "boiling" patch like a hydraulic-jump roller followed for 3–7 s; bubbles stayed visible until about 25–40 s; rising bubbles drove a strong vortical motion. — [Coastal Eng. 46](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [meas-lab, large scale] The plunging jet drives a short, intense downward and onshore pulse; the periodic plunging vortex extends over nearly the full water column and its turbulence reaches the bed. — [van der Zanden et al. 2018](https://ris.utwente.nl/ws/files/29784531/Zanden_et_al_2018_Journal_of_Geophysical_Research_Oceans.pdf)
- [model] Derakhti & Kirby 2014 (LES with a polydisperse bubble phase, validated on deep-water lab breakers): the jet and splash-up make two downburst vortices that stay nearly in place and form two semicircular bubble clouds (also seen by Rojas & Loewen 2010); near-surface void fraction in the second cloud passes 30 % and falls to about 1 % by 1.7 periods; the turbulent layer is about 0.75 H deep for plungers and 0.5 H for spillers during active breaking, and about twice that four periods later. — [CACR-14-06](https://www1.udel.edu/kirby/papers/derakhti-kirby-cacr-14-06.pdf) ([JFM](https://doi.org/10.1017/jfm.2014.637))
- [meas-lab] Deep water: breaking leaves a coherent vortex that drifts slowly downstream and deepens; kinetic energy and vorticity decay about as 1/t; 90 % of the lost energy is dissipated within four periods (Rapp & Melville). — [Melville, Veron & White 2002, JFM 454](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Melville-Veron-White-2002-JFM-Velocity-under-breaking-waves.pdf)
- [meas-lab] (abstract) PIV over a whole lab surf zone on a 1:15 slope, from breaking to swash, with void fraction estimated from the images and vorticity mapped. — [Kimmoun & Branger 2007, JFM 588](https://doi.org/10.1017/S0022112007007641). The HAL copy is behind bot protection and was not read.
- [inferred] From below the sequence reads: the silver air tube is driven down under the landing lip; a white wall of bubbles descends at about a third of the jet's speed and hits the bed in shallow water; the tube bursts into a rolling cloud; a second and third cloud appear every 1–1.5 s at each splash-up; the clouds hang nearly still as the wave passes, sink and fade; tilted bubble columns trail behind the bore.

### 2.5 Bubble plumes: depth, void fraction, sizes, rise speeds, lifetimes

| Quantity | Value | Conditions | Tag and source |
|---|---|---|---|
| Plume depth, plunging | Reaches the bed (0.4 m) in 0.23–0.27 s | Near-full-scale jet, 6 m/s | [meas-lab] Chanson 2002 |
| Plume depth, plunging | Vortex spans nearly the whole column | CIEM, H 0.76 m, bar | [meas-lab] van der Zanden 2018 |
| Turbulent/bubbly layer | 0.75 H plunging, 0.5 H spilling (active); about 1.5 H and 1 H after 4 periods | Deep-water lab, LES | [model] Derakhti & Kirby 2014 |
| Plume depth, spilling wind waves | Did not penetrate below the crest | Wind-wave tank | [meas-lab] Leifer et al. 2006 |
| Void fraction, young | > 10 % (open ocean); depth-averaged > 10 % next to impact, 4–6 % 1–1.2 depths on | Field; near-full-scale lab | [meas-field] Deane & Stokes 2002; [meas-lab] Chanson 2002 |
| Void fraction, bore region | Ensemble maxima 15–20 % above trough; linear rise then exponential decay | Lab plane slope | [meas-lab] Cox & Shin 2003 (abstract) |
| Void fraction, local | Peaks 2.4–96 %, time means 1.2–37 % | Lab plunger | [meas-lab] Rojas & Loewen 2010 (abstract, round 1) |
| Air left after one period | < 5 % of the initial entrained air | Lab focused breakers | [meas-lab] Lamarre & Melville 1991, via Derakhti & Kirby |
| Plume volume | Linear rise to a maximum, then exponential decay; maximum 1.3–1.6 × the initial air tube | Lab reef | [meas-lab] Blenkinsopp & Chaplin 2007, via Derakhti & Kirby; energy to entrain air and splash ≥ 6.5–14 % (abstract) |
| Size spectrum | a^(−3/2) below about 1 mm (jet and drops), a^(−10/3) above (fragmentation); steepens within 1.5 s as big bubbles leave | Lab and field | [meas-lab/field] Deane & Stokes 2002 |
| Size spectrum, surf | a^(−2.5) below 1 mm, a^(−4.5) above | 2 m of water, La Jolla Shores | [meas-field] Deane 1997 (abstract) |
| Size spectrum, surf lab | d^(−1.5 to −1.7), independent of place and depth; void fraction linear in turbulent intensity | Lab plane slope | [meas-lab] Mori, Suzuki & Kakuno 2007 (abstract) |
| Rise speed, mm bubbles | About 0.2 m/s, nearly constant for 0.5–50 mm diameter | Lab | [meas-lab] Chanson 2002 |
| Rise speed, small | 0.5 cm/s at 50 µm radius; > 3.4 cm/s above 170 µm; small bubbles behave as surfactant-coated | Lab | [meas-lab] Leifer et al. 2006 |
| Visible lifetime | Boiling 3–7 s; bubbles visible until 25–40 s | Near-full-scale, fresh water | [meas-lab] Chanson 2002 |
| Rise time [computed] | 5 s from 1 m for 1 mm bubbles; 29 s for 170 µm; 200 s for 50 µm (still water) | From the rise speeds above | [computed] |
| Small-bubble air share [computed] | Bubbles under 0.1 mm radius hold about 0.3 % of the sub-Hinze air volume | From the a^(−3/2) law | [computed] |

**Inferences.**
- The game's plunge depth 0.8 H sits at the measured lower bound; at the plunge point in surf depths (h ≈ 1.3 H) the plume should reach the bed. Its bore depth 0.3 H is on the low side of the 0.5 H spilling layer.
- One rise speed (0.25 m/s) and a 3 s life capture the big bubbles only. The long-lived part of what you see underwater is a milky haze of sub-100 µm bubbles, a fraction of a per cent of the air, rising at millimetres to centimetres per second and lasting tens of seconds to minutes; seawater makes more of them than fresh water (Monahan & Zietlow, round 3).

### 2.6 Turbulence reaching the bed

- [meas-lab] Breaking vortices invade the wave boundary layer and reach the bed at small and large scale; near-bed TKE rises five-fold from the shoaling to the breaking region; a 2D wave-averaged circulation carries breaking turbulence down in the bar trough, seaward along the bar's lee and up over the crest. — [van der Zanden et al. 2018](https://ris.utwente.nl/ws/files/29784531/Zanden_et_al_2018_Journal_of_Geophysical_Research_Oceans.pdf)
- [meas-field, review] Plunging breakers make horizontal-axis vortices ("downbursts") that reach the bed; spillers send turbulence down more slowly by obliquely descending eddies that hit the bed as isolated events some distance behind the crest; turbulent length scales are 0.1–0.3 h, up to 0.65 h under plungers. — [Aagaard et al. 2021](https://doi.org/10.3390/jmse9111300)
- [code] The game's eddies (`src/physics/eddies.ts:16`) use 0.5–2 m wavelengths and a descending bias, consistent with these scales; they reach the rider but no visual.

### 2.7 Sand clouds: a sandy beach against a clear reef

- [meas-field, review] Breaking waves hitting the bed lift large sediment clouds; under plungers up to 85 % of the suspended load came with large breaker vortices (Aagaard & Hughes 2010); clouds rise convectively, reach more than 0.5 m above the bed, can fill the whole column in violent plunging (photo: reddish-brown water in the overturning wave, Anloga, Ghana), and drift several metres before settling. Suspension lifts where the vortex's low pressure pulls on the bed (Sumer & Fuhrman). — via [Aagaard et al. 2021](https://doi.org/10.3390/jmse9111300)
- [meas-field] Near-bed wave-averaged concentrations: 3–7 kg/m³ at a swell beach with plunging breakers (Durras, D ≈ 0.36 mm), 1–4.5 kg/m³ at a wind-wave beach with spillers (Vejers, D = 0.21 mm), both rising with H/h (read from Fig. 11). Under plungers, concentration at 3.5 cm spikes to about 0.05–0.09 m³/m³ for 1–3 s after each breaker and falls near zero between (Fig. 15). — same review
- [meas-lab, large scale] 0.24 mm sand under a plunging wave over a bar: concentrations up to two orders of magnitude higher in the breaking region than in the shoaling and inner surf zones; time-averaged concentrations of about 1–3 kg/m³ fill the whole column over the bar near the plunge point, more near the bed (read from Fig. 3); the strongest vertical mixing is over the bar crest, by the circulation's upward flow and breaking turbulence. — [van der Zanden et al., ICCE 2016](https://icce-ojs-tamu.tdl.org/icce/article/download/8160/pdf)
- [computed] Settling speed (Ferguson & Church 2004 with C₁ = 18, C₂ = 1; formula via [Sylvester's explainer](https://zsylvester.github.io/post/grain_settling/); [paper](https://doi.org/10.1306/051204740933)): 0.7 cm/s at 0.1 mm, 2.2 at 0.2 mm, 2.8 at 0.24 mm, 4.8 at 0.36 mm, 6.8 at 0.5 mm; silt of 63 µm 0.3 cm/s. A sand cloud 1 m up clears in 20–50 s once the turbulence stops; silt hangs for minutes to an hour.
- [meas] Carbonate sands settle at 0.025–0.364 m/s in the authors' database (mostly grains over 0.25 mm; irregular shapes and densities). — [Riazi et al. 2020, *Sci. Rep.*](https://www.nature.com/articles/s41598-020-65741-3)
- [inferred] **Beach:** brown or tan clouds, lifted in puffs under each plunge, drifting seaward in the undertow and along rips, settling over tens of seconds, with a lasting murk from the fines. **Reef:** mostly hard bottom, so little sand; where there is sand, coarse white carbonate puffs that fall out within seconds, which is part of why reef water stays clear.

---
## 3. What it looks like from below: optics

### 3.1 Water colour and visibility

**Takeaway.** Underwater, contrast decays as a plain exponential of the beam attenuation along the line of sight, colour by colour. A black target vanishes at about 4.8/c. Light comes mostly from above: looking up is tens of times brighter than looking level, and looking down is darker still.

- [theory + meas] Horizontal contrast decays as C(r) = C₀·e^(−c_v r), with c_v the photopic beam attenuation. At a 2 % threshold a black target is seen to 3.9/c_v; observed sighting of a 0.2 m black disc is about 4.8/c_v (a 1 % threshold). — [Ocean Optics Web Book, contrast](https://www.oceanopticsbook.info/view/photometry-and-visibility/level-2/contrast)
- [meas] (abstract) Visibility = 4.8/c_photopic holds within about 10 % across many coastal and inland waters; c at 532 nm is an adequate stand-in. — [Zaneveld & Pegau 2003, *Opt. Express*](https://doi.org/10.1364/OE.11.002997); origin: [Davies-Colley 1988](https://doi.org/10.4319/lo.1988.33.4.0616) (abstract)
- [computed] From the game's own optics (`src/scene/waterOptics.ts:15-61`, R/G/B = 650/550/450 nm):

  | Spot | b_p | c (R, G, B), m⁻¹ | Visibility 4.8/c_G | Light left along 10 m (R, G, B) |
  |---|---|---|---|---|
  | Beach | 2 | 2.45, 2.16, 2.11 | 2.2 m | none (1 % after 2 m) |
  | Point | 1 | 1.39, 1.11, 1.06 | 4.3 m | none (11 % green after 2 m) |
  | Reef | 0.15 | 0.50, 0.21, 0.17 | 22 m | 0.7 %, 12 %, 19 % |

  Today's fog gives about 61 m everywhere (§1.2).
- [meas-field] Radiance distribution (Lake Pend Oreille, overcast): at 6.1 m the zenith radiance is 25× the horizontal and 175× the nadir; at 18.3 m 26× and 190×. — [Tyler 1960, SIO Ref. 60-9](https://misclab.umeoce.maine.edu/education/VisibilityLab/reports/SIO_60-9.pdf). [inferred] In sun the peak sits near the refracted sun's direction; the sunny data (report part I) were not opened.
- [prod] "In the real world, it's actually pretty hard to see underwater": a strong blue cast, and sunlight that doesn't reach deep. Subnautica's artists rejected the physical first pass; it decoupled the sun's attenuation from the eye path's, to read like professional underwater photos rather than physics. — [Game Developer, 2016](https://www.gamedeveloper.com/design/how-i-subnautica-i-plunges-deeper-into-rendering-realistic-water)
- [gap] Coastal water's green or yellow cast comes largely from dissolved organic matter absorbing blue; the game's optics have no such term, so the Beach's water may read cyan-grey rather than green underwater [inferred; source for the absorption spectrum not opened].

### 3.2 Snell's window and the mirror beyond it

**Takeaway.** Looking up, you see the whole sky squeezed into a cone about 97° wide, with a hard bright edge; outside it the surface is a perfect mirror of the water and bed below. Waves break the window into a moving mosaic and widen it; under breaking water it spreads to almost the whole ceiling.

- [computed] Critical angle arcsin(1/1.333) = 48.6°, window 97.2°. Fresnel reflectance from below is 2 % looking straight up and 100 % beyond 48.6°.
- [model] (abstract) The window widens with the maximum wave slope, from 97° on flat water to about 122° at 16°; breaking waves give a window almost 180° wide. The brightness of the dark ring outside it depends strongly on turbidity and upwelling light, especially in shallow water. — [Lynch 2014, *Appl. Opt.* 54 B8](https://doi.org/10.1364/ao.54.0000b8)
- [prod] Pixar's physical renderer on *Finding Dory* surfaced the critical angle's sharp switch between refraction and total internal reflection in the aquarium scenes, at first mistaken for a bug. — [fxguide](https://www.fxguide.com/fxfeatured/the-tech-of-pixar-part-2-finding-dory-making-waves/)
- [prod, code read] Crest shades the underside by refracting the sky through the surface with Snell's law (so beyond the critical angle nothing gets through) and adding the reflection of the underwater scatter colour with Fresnel. — [OceanReflection.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/OceanReflection.hlsl)
- [inferred] With per-pixel normals from the solver, the chop and the ripples, the window becomes a bright rippling patch overhead that slides with each swell; on the solver's 17–27° breaking faces it tilts toward the face. In shallow, bright-bottomed water (the Reef's carbonate sand) the mirror outside the window shows the bed, so it is not dark.

### 3.3 Caustics and light flashes

- [meas-field] Flashes (irradiance above 1.5× the mean) occur up to about 200 per minute at 1 m depth; their frequency falls exponentially with intensity, so flashes above 5× come at most about once a minute; the most probable duration at 1 m is 10–30 ms; deeper, flashes weaken and last longer. Focusing is strongest in clear water under clear skies with a high sun and light winds of 2–5 m/s. — [Dera & Stramski 1986, *Oceanologia* 23](http://www.iopan.gda.pl/oceanologia/OC_23/OC_23_15-42.pdf)
- [meas-field] (abstract) The brightest flashes exceed the average by about an order of magnitude and last milliseconds to tens of milliseconds; they fade rapidly with depth; sensors wider than a few millimetres understate them. — [Darecki, Stramski & Sokólski 2011, JGR](https://doi.org/10.1029/2011JC007338)
- [model + meas-field] Peaks 13× the mean at 0.86 m (Gernez et al. 2011); in a realistic modelled sea up to 8× at 1 m and 2× at 20 m, with flashes 2–10 m apart; gravity–capillary ripples focus at 10–50 cm, and 10 cm–1 m waves bunch the light at 1–4 m; local wind matters in the top 10 m; small structures blur with depth; open-ocean flashes to about 35 m (observed to 20.8 m). Up to 40× only with a 2.5 mm detector. — [Hieronymi, Macke & Zielinski 2012, *Ocean Sci.* 8](https://os.copernicus.org/articles/8/103/2012/os-8-103-2012.pdf)
- [inferred] The game's map has 9.4 cm texels and a 16× cap (`src/scene/CausticMap.ts:15-20`). Averaged over 9 cm, real peaks are lower than the millimetre-sensor values, so 16× is generous but not wrong for the shallows; the bigger error is that caustics persist under foam and plumes, where bubbles and foam diffuse the light (§3.5).

### 3.4 Light shafts

- [inferred, from the sources above] Shafts are the focused beams of §3.3 made visible by particles and bubbles scattering light sideways. They swing with the surface, fade with depth as focusing blurs, and need scatterers: pure water shows them faintly.
- [computed] Refraction keeps every shaft within 48.6° of vertical: at sunset (sun 5° up) shafts slant 48° from vertical, at a 45° sun 32°, at 75° 11°. Looking up, they converge toward the refracted sun by perspective.
- [inferred] A shaft's contrast against the diffuse glow decays roughly as e^(−(c−K)z): it halves every 4.7 m at the Reef, 0.7 m at the Point and 0.35 m at the Beach [computed with the game's optics]. So the Reef should show long swaying shafts, the Beach almost none.
- [inferred] Under whitewater there are no shafts: foam and the plume turn the sun into diffuse light. They come back as the foam clears.

### 3.5 Bubble clouds and foam, seen from below

- [computed] A cloud of bubbles of radius a and void fraction α has extinction c = 3α/(2a) (geometric optics, extinction efficiency 2; the round-4 rule in another form):

  | Cloud | c, m⁻¹ | Visibility 4.8/c |
  |---|---|---|
  | Young plume, 20 %, a = 1 mm | 300 | 1.6 cm |
  | 10 %, 1 mm | 150 | 3 cm |
  | 1 %, 0.5 mm | 30 | 16 cm |
  | 0.1 %, 0.3 mm | 5 | 1 m |
  | Fine haze, 10⁻⁴, 50 µm | 3 | 1.6 m |
  | 10⁻⁵, 50 µm | 0.3 | 16 m |

- [computed] Bubbles hardly absorb, so a cloud is white by multiple scattering; what gets through beneath it follows two-stream transmission 1/(1 + 0.75(1−g)τ): with g ≈ 0.85, τ = 10 passes 47 %, τ = 30 passes 23 %, τ = 100 passes 8 %. A fresh plume therefore glows on its sunlit top and sides and is a dim grey ceiling from underneath.
- [meas-field + model] (abstract) Bubbles matter optically above void fractions of about 10⁻⁶; inside clouds their backscatter exceeds 10⁻² m⁻¹, varying over five decades within minutes (Hs 3.2 m, wind 15 m/s). — [Terrill, Melville & Stramski 2001](https://doi.org/10.1029/2000JC000496). (abstract) Bubble entrainment can more than double reflectance within minutes, making the patch greener or yellower. — [Stramski & Tegowski 2001](https://doi.org/10.1029/2000JC000461)
- [meas-field] (abstract) In the Scripps surf zone, bubble plumes enhanced the scattering phase function at 60–80°. — [Twardowski et al. 2012](https://doi.org/10.1029/2011JC007347). [computed + meas-lab] That is the bubble's critical-angle scattering, at 180° − 2 × 48.6° = 82.8° from the light's direction ([Marston 1979](https://doi.org/10.1364/JOSA.69.001205), abstract): bubbles glint when you look roughly across the light.
- [observation, round 1] Where few bubbles are entrained the water is blue-green or green, brighter than the sea but not as bright as foam (Bohren via Flatau).
- [inferred] From below, surface foam is a diffuser: it reflects about 55 % (Koepke, round 1) and, absorbing little, passes most of the rest as diffuse light. Diffuse light escapes the window's rule, so foam patches glow white-grey across the whole ceiling, including outside the window where clear water looks like a dark mirror.

### 3.6 Sand clouds, seen from within

- [computed] Sand of diameter D at concentration C has c = 3C/(ρ_s D): 4.7 m⁻¹ per kg/m³ of 0.24 mm sand, so the measured 1–3 kg/m³ over a bar gives 5–14 m⁻¹ (visibility 0.3–1 m) and the near-bed 3–7 kg/m³ is opaque within 20–30 cm; 50 mg/L of 20 µm silt alone gives 2.8 m⁻¹.
- [meas-field] Colour: tan to reddish-brown, the colour of the bed's grains (the review's Fig. 10). Over the Reef's carbonate sand: white.

### 3.7 The tube and its cavity, seen from below

- [computed + inferred] The cavity's roof and walls are an air–water surface seen from the water side. Wherever the view meets them more than 48.6° off their normal (most of the time, looking along the tube), they are total mirrors: the tube reads as a silver, rippling cylinder that reflects the face and the plume. Where the view looks straight through the thin lip, the sky shows, bent.
- [inferred] Looking up through the lip toward the sun: the lip glow of the Graphics page (Pope & Fry path lengths), seen from the water side.
- [prod] Moana's walls of water had to be very smooth to limit refraction so the audience could see into them, and the index of refraction was cheated in some scenes; caustics magnified small meshing flaws. — [Frost, Stomakhin & Narita 2017](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Frost_Moana-Performing-Water.pdf); [Palmer et al. 2017](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Palmer_The-Ocean-and-Water-Pipeline-of-Disneys-Moana.pdf)
- [inferred] After the lip lands, §2.4's sequence: a white wall descending, the silver tube crushed into a rolling cloud, a new cloud every 1–1.5 s, tilted columns behind. This needs the swept barrel's cavity (the Basilisk profiles give its shape); the carved void today has no underside to see.

### 3.8 Inside a hold-down

- [computed] In a young plume (α 10–30 %, a ≈ 1 mm) visibility is a few centimetres: a white-out. One or two periods later (α ≈ 1 %) it is 15–30 cm. The fine haze left after that gives 1–15 m.
- [computed] Brightness depends on the plume above: τ = 30–100 overhead passes 8–23 % of the light, so a big hold-down is dim and grey-green; a small one is bright white. The only cue to "up" is that the light is brighter from above (Tyler's gradient, softened by scattering).
- [code] The game's relaxed hold-downs last 7.5–17.8 s (10th–90th percentile), and its swimmer already strokes toward the light (§1.7).

---
## 4. How films and shipped games render underwater, and at what cost

### 4.1 Film
- [prod] *Finding Nemo* (2003): the technical team listed what photoreal water needs underwater: murk (an underwater fog), particulate matter (little bits floating in the water), caustics dancing on the floor, light beams and surface images; the water was then caricatured on purpose. — [AWN 2003](https://www.awn.com/animationworld/finding-right-cg-water-and-fish-nemo)
- [prod] *Finding Dory* (2016): caustics path-traced with a bidirectional (VCM) integrator, then baked and re-projected for art direction; the physical renderer exposed total internal reflection (§3.2); volumes lit physically gave "rays through the volumes". — [fxguide](https://www.fxguide.com/fxfeatured/the-tech-of-pixar-part-2-finding-dory-making-waves/)
- [prod] *Moana* (2016): smooth water walls to limit refraction, a cheated index of refraction, bubbles and foam added sparingly (§3.7).

### 4.2 Games and engines
- [prod] **Crysis** (GDC 2008): procedural caustics in an extra pass from the real sun direction, three layers, a chromatic-dispersion approximation; underwater god rays are the same caustic shader projected along the sun onto several camera-facing planes, rendered into a render target 4× smaller than the screen and added to the frame; a subtle distortion underwater and droplets on the lens when surfacing; soft water particles. — [Sousa, GDC 2008](https://archive.org/details/GDC2008Sousa)
- [prod, code read] **Crest** (Unity): a full-screen underwater effect after the transparent pass using opaque depth; fog is per-channel, lerping the scene toward a scatter colour by 1 − e^(−density·distance), with the scatter colour from the same function that shades the surface (view-dependent, shadowed, a shallow sub-surface tint); caustics from a tiled texture with a mip bias so they are sharpest at a focal depth; a meniscus drawn where the underwater mask changes within three pixels along the horizon normal; the underside drawn with culling off; transparent objects need their own fog call; the effect is off when the camera is above water. — [docs](https://crest.readthedocs.io/en/stable/user/underwater.html), [UnderwaterEffectShared.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/Underwater/UnderwaterEffectShared.hlsl), [OceanEmission.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl)
- [prod] **Unity HDRP water**: underwater is a full-screen post effect, either an analytic absorption formula or, with volumetric fog on, part of the volumetric buffer with light shafts and shadowed shafts; a water-line boundary when crossing the surface; caustics simulated from a chosen wave band at a "virtual plane distance"; no caustics on transparent objects underwater; lower absorption distance means muddier water and weaker caustics. — [underwater view](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-underwater-view.html), [caustics](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-caustics-in-the-water-system.html)
- [prod] **Subnautica** (2016 update): water and lighting parameters stored volumetrically so they vary through the world; sunlight attenuates with depth; caustics from the actual surface and light shafts that follow them; the view path's attenuation decoupled from the sun's for readability (§3.1). — [Game Developer](https://www.gamedeveloper.com/design/how-i-subnautica-i-plunges-deeper-into-rendering-realistic-water)
- [prod] **Sea of Thieves**: its SIGGRAPH 2018 talk covers foam, clouds and ropes, not underwater; no public technical description of its underwater was found. — [Ang et al. 2018](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)
- [prod] **GPU Gems**: caustics by casting a ray per floor pixel up through the wave surface into a light texture ([ch. 2](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics)); crepuscular rays as a screen-space radial blur toward the light, sampled at lower resolution to save bandwidth ([GPU Gems 3, ch. 13](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process)). The radial blur needs the light on screen, which underwater (the sun sits inside Snell's window overhead) is rare in a level view [inferred].
- [prod] **Froxel volumetric fog** (Assassin's Creed IV, 2014): a 160 × 90 × 64 (or ×128) frustum volume, about 1.1 ms in total on its console GPU (1.6 ms at double resolution), 0.43 ms of it building density and lighting. — [Wronski 2014](https://bartwronski.files.wordpress.com/2014/08/bwronski_volumetric_fog_siggraph2014.pdf). WebGL2 has no compute shaders, so this route waits for a WebGPU renderer.

### 4.3 Cost on Apple GPUs and in this renderer
- [doc] Apple GPUs render in tiles held in fast on-chip memory; separate passes write intermediate results to device memory and read them back, which costs bandwidth and energy. — [Apple, TBDR](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering). [inferred] So do fog and the surface's underside inside the existing material shaders, and keep any ray-marched pass at half resolution with one composite.
- [doc] M4 Pro: 20-core GPU, 273 GB/s; its GPU is claimed 2× the M4's, and the M4's up to 2× the M1's. — [Apple newsroom](https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/) (manufacturer claims)
- [measured by round 4, M1 Air, WebGL2/ANGLE Metal, 2240 × 1260, ±50 %] One full-screen blended layer 0.12–0.25 ms; a half-resolution buffer 0.43–0.51 ms; tiny points 12–38 ns each (16k: 0.62 ms; 65k: 1.0–1.7 ms); a transform-feedback particle update 1.0–1.6 ns per particle (262k in 0.36 ms). The M4 Pro should be about 3× faster [inferred].
- [code report] Headroom: the M4 Pro rides at 4.7–5.4 ms of GPU a frame of the 8.3 ms at 120 Hz (High); the M1 Air at 7.7–8.7 ms of 16.7 ms at 60 Hz (Medium). — `docs/research/performance-study.md`
- [inferred] Every underwater effect below runs only while the camera is under water, where the sky dome is already hidden.

---

## 5. Rebuilding the 3D flow for tracers

**Takeaway.** The solver's depth-averaged current, its surface and bed are enough to rebuild the orbital flow at any height to the solver's own accuracy. Tracers integrated in that time-varying field reproduce the surge, the Stokes drift near the surface and the return flow below by themselves, because Lagrangian drift is what particles in an oscillating field do. Only the breaking roller and the turbulence need added terms, and the game already has both for the rider.

1. **Horizontal velocity at height s above the bed** (h = water depth, ū = the uploaded depth-averaged current):
   - Boussinesq form [model, FUNWAVE-TVD eqs. 1–3 after Nwogu and Chen]: u(z) = u_α + (z_α − z)∇A + ½(z_α² − z²)∇B, with A = ∇·(h u_α), B = ∇·u_α. — [Shi et al., CACR-11-04](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.1.pdf). Depth-averaged on a flat bed this becomes u(s) = ū − (s²/2 − h²/6)·∇(∇·ū) [computed].
   - The game's Airy form (`src/physics/PhysicalSurfWater.ts:160-168`): u/ū = kh·cosh(ks)/sinh(kh). The two agree within 0.3 % at kh ≤ 0.6 and within 2 % at kh = 1 [computed]. The Boussinesq form uses the field's own curvature, so it follows a spectrum and steep crests; the Airy form matches exactly what the rider feels. Use the rider's form so what drifts past is what pushes you [inferred].
2. **Vertical velocity** from continuity: w(s) = ū·∇z_b − s·∇·ū (`src/physics/PhysicalBodyWaterField.ts:96`; `PhysicalSurfWater.ts:147, 164-170` in the Airy shape).
3. **Bores** [model, FUNWAVE after Schäffer 1993]: a roller layer δ = r·(η* − η̄), r = 0.45 tan θ capped at 0.164, with η* the surface at the breaking point, moves at c = √(gd); the water below moves at u₀ = (P − c·δ)/(d − δ), which is the undertow under the bore. The game's roller carry (`PhysicalSurfWater.ts:151-159`) is the same idea.
4. **Turbulence**: add the eddy velocity of `src/physics/eddies.ts:64-72` with k from the aeration field (`src/wave/AerationField.ts:25`), falling to 0.3 of the surface value at the bed as for the rider (`PhysicalSurfWater.ts:364-373`); its descending bias, with the bore's forward motion, carries tracers down behind bores along tilted paths, as Nadaoka's eddies do [inferred].
5. **Buoyancy and settling** by tracer type: bubbles rise at 0.2 m/s (mm), 3.4 cm/s (170 µm), 0.5 cm/s (50 µm) [meas-lab]; sand sinks at 2.8–4.8 cm/s (0.24–0.36 mm) [computed]; neutral specks don't.
6. **Constraints**: keep tracers between the bed and the drawn surface (recycle any that leave), and read the flow texture between its 30 Hz updates (`src/scene/WaterSurface.ts:366-373`) with time interpolation [inferred].
7. **What emerges** [inferred]: the ±1.4–3 m surge of §2.1; a slow onshore creep near the surface and offshore creep near the bed (Stokes drift and its return, from the crest–trough asymmetry of the field); the bore's roller racing shoreward over a backward-sliding undertow; rips as depth-uniform rivers; bubbles and sand following all of it.
8. **Online**: tracers are cosmetic. Seeded per machine they differ in detail, but they are driven by the same shared sea state, so the motion players see agrees.

---
## 6. What to change, ranked by visual payoff against cost

All costs are estimates scaled from round 4's M1 measurements (§4.3), none measured for these effects; M4 Pro figures assume about 3× the M1. Everything is cosmetic online and runs only while the camera is under water. Look: Rich, unless the owner decides otherwise (§8).

| # | Change | What the player sees | Numbers to hit | Cost M1 / M4 Pro |
|---|---|---|---|---|
| 1 | **Optics from the spot's own water.** Replace Rich's flat `FogExp2` with per-channel exponential attenuation from `beamAttenuation` (`waterOptics.ts:59-61`); in-scatter that is brightest toward the surface and the refracted sun and dims with depth by e^(−Kz); light the seabed with the actual sun and sky through the water (it is unlit today) | Reef: blue-green, about 20 m to the edge of sight, reds gone by 10 m; Beach: close, murky green-grey; dusk goes dark; looking up is bright, looking down is dark | Visibility 4.8/c: Reef 22 m, Point 4.3 m, Beach 2.2 m (or the owner's floor); zenith : level : nadir about 25 : 1 : 1/7 | In-material maths: about 0.1–0.3 / < 0.1 ms; as one composite pass 0.12–0.25 / about 0.05 ms |
| 2 | **The surface from below.** In the water's back-face branch refract with n = 1.333: inside 48.6° show the sky map through (1 − R); beyond it reflect the underwater radiance of item 1 (a mirror of the water and bed); draw foam and dense plume as a diffuser that transmits sunlight everywhere; stop caustics under foam and plumes | A rippling bright disc of sky overhead with a hard edge and a dark silvery mirror around it; the window widening and fragmenting under breaking waves; whitewater as a glowing ceiling; the bed's caustics dying under a broken wave | 97.2° window, about 122° at 16° slopes, about 180° under breakers; R = 2 % straight up, 100 % beyond 48.6° | A few ALU ops and one environment fetch: < 0.05 ms on both |
| 3 | **Tracers carried by the rebuilt 3D flow** (§5), mainly neutral specks near the camera, plus sparse coarse bubbles | Specks sway ±1.5–3 m with every wave and bob ±0.3–0.7 m; drift seaward near the bed in the undertow; stream out through rips; swirl and sink behind a break | Surge 0.7–1.6 m/s near the bed for H = 1.4 m at 2–8 m depth; undertow 0.05–0.4 m/s (field); rips 0.3 m/s mean, > 1 m/s pulses | 32k points by transform feedback: 0.1–0.2 ms to move and 0.7–1.2 ms to draw on the M1; about 0.3–0.5 ms on the M4 Pro |
| 4 | **The plume as a volume**, ray-marched at half resolution through the slab from the surface to the plume depth, with c = 3α/(2a) from the `AerationField` the rider already feels; a render-side fine-bubble haze fed by each plunge and fading over tens of seconds; bubbles near the camera rising by size and glinting near 80° from the sun | A white cloud that fills in behind each break, rolls, sinks and thins over seconds; milky green water between sets; hold-downs that white out; the same air that sinks the rider is the air you see | Plume to 0.75 H (active), to the bed at the plunge point; α 10–30 % young, about 1 % after 1–2 periods, < 5 % of the air after one period; rise 0.2 m/s (mm) to 0.5 cm/s (50 µm); visible bubbles 25–40 s | 0.3–1.0 / 0.1–0.3 ms, plus about 0.1 ms for a few thousand near bubbles |
| 5 | **Light shafts and caustics on bodies.** March 12–16 steps per half-resolution pixel; at each step take the sun ray back to the surface and use the surface's local focusing (the paraxial lens formula of `crestFocalDepth`, `causticMath.ts:71-74`) to brighten the beam; fade by e^(−(c−K)z); gate by foam and plume. Light the rider and board from the caustic map when under | Swaying shafts in clear Reef water that vanish under whitewater and return as it clears; the caustic net crawling over the rider | Shafts no flatter than 42° above horizontal; contrast halving every 4.7 m (Reef) and 0.35 m (Beach) [inferred]; flashes above 1.5× the mean up to 200/min near 1 m, peaks about 10× | 0.3–0.8 / 0.1–0.3 ms; caustics on bodies about free |
| 6 | **Sand clouds.** A 2D suspended-sand field like the foam field: picked up where near-bed turbulence under plunges (and backwash) is strong, lifted with a Rouse-type profile, settled at w_s, carried by the near-bed flow; drawn in item 4's pass. Gated by bed material (`materialAt`) | Brown puffs thrown up under each Beach plunge, sometimes filling the column, drifting seaward and settling over tens of seconds; quick white puffs over Reef sand only | Near-bed 3–7 kg/m³ mean, spikes near 0.09 m³/m³ for 1–3 s; clouds above 0.5 m; w_s 2.8–4.8 cm/s | Field update about 0.1–0.3 ms per step (like the foam field; unmeasured); drawing shares item 4 |
| 7 | **An underwater ride camera and a real waterline** (owner's call): follow the rider under during duck-dives and hold-downs; per-pixel under/over mask with a thin meniscus line, droplets on surfacing | Players see all of the above in their own wipeouts instead of only hearing them | Hold-downs 7.5–17.8 s; duck-dives 0.35–0.7 m deep (game reports) | Camera logic; the mask and meniscus as one full-screen pass 0.12–0.25 / about 0.05 ms, only near the surface |
| 8 | **Later, with the swept barrel:** the cavity as a mirrored tube from below, crushed into rolling clouds every T/8 with tilted descending columns | The tube from underneath and the vortex rolling behind it | Splash-up every 0.9–1.6 s for H_b = 1–3 m; columns tilted ≤ 45° | Small (reuses items 2 and 4) |

**Why this order.** Tracers and plumes moving through a flat fog still read flat; items 1–2 are what make the view read as underwater at all, and cost almost nothing. Item 3 is the owner's "water moving under water" and the best payoff per millisecond after that. Items 4–6 give the violence of a break seen from below. Item 7 decides whether players ever see it outside the Wave Lab.

**Risks.**
- Physical Beach water (2 m visibility) may be too murky to read; Subnautica hit the same wall (owner's decision 1).
- Ray-marched passes and tens of thousands of points are the costly parts; on the M1 Air set counts and steps by benchmark (the existing rule).
- The Rich shader's back-face branch also draws the tube's underside today; with the swept barrel the mirror maths applies to the loft too.
- A render-side haze and sand field must not feed the rider, or they become physics that has to match online.

---

## 7. Showing the water mass moving

| Motion | What makes it visible | Driven by | Numbers | How it reads |
|---|---|---|---|---|
| **Orbital surge** | Neutral specks (particulate), 1–2 px, lit by item 1's light, dense enough near the camera to give parallax | ū with the Airy or Boussinesq shape; w from continuity (§5) | ±1.4–3 m, 0.7–1.6 m/s near the bed (H 1.4 m, T 12 s, h 2–8 m); ±0.35 m vertical at mid-depth | The whole field swings shoreward under each crest and back under each trough, in step with the ceiling's swell |
| **Stokes drift and return flow** | The same specks over several waves | Emerges from integrating the time-varying field | Depth-mean return about 0.15–0.3 m/s at 2–3 m depth for H 1.4 m [computed]; onshore only in a thin top layer [meas-field] | Near-surface specks creep in; near-bed specks creep out |
| **Bore transport and undertow** | Bubbles in the roller band; specks and sand below | Roller layer at c = √(gd) over u₀ below (§5, item 3) | Roller 3.4–4.9 m/s for H = 0.5–1 m; undertow 0.05–0.4 m/s field, 0.8 m/s large lab | A white band racing overhead while the water beneath slides back |
| **Rips** | Specks, haze and sand in a channel | ū itself (resolved by the solver) | 0.3 m/s mean, > 1 m/s pulses for 25–250 s | A hazy river leaving through a gap, pulsing with the sets |
| **Plunge vortex and bubble plume** | The plume volume (item 4) plus near bubbles swirled by the eddies | `AerationField` (air, depth, turbulence); eddies with the descending bias | Plume to 0.75 H or the bed; new cloud every 0.9–1.6 s; α 10–30 % → 1 %; < 5 % air after one period | A white wall drops, rolls into clouds that hang while the wave passes, then sink, tilt and thin |
| **Fine-bubble haze** | Low-density volume (item 4) | Seeded by plunges, rising at 0.5–3 cm/s, mixed by turbulence, carried by ū | c about 0.3–3 m⁻¹; lasts tens of seconds to minutes | Milky green water that builds through a set and clears between sets |
| **Sand clouds** | Sand density in item 4's pass (Beach), plus near grains | Pickup ∝ near-bed turbulence under plunges; settling w_s; near-bed flow | 3–7 kg/m³ near the bed, clouds above 0.5 m, w_s 2.8–4.8 cm/s | Brown puffs kicked up under each plunge, drifting seaward, raining out |

**Tracer budget (provisional).** No source gives a particulate density to render; choose one that shows motion with parallax: about 20–50k specks within 10–15 m of the camera, recycled around it (as *Nemo*'s "particulate" and camera-local systems do). Mark as a rendering choice.

---

## 8. Decisions only the owner can make

1. **Physical optics or a readability floor.** The game's own water gives 2.2 m of visibility at the Beach and a total white-out inside a young plume. Keep that, set a minimum visibility, or decouple the sun's attenuation from the eye path's as Subnautica did. Above water you already accepted a readability gain (`WATER_BODY_GAIN = 3`, `waterOptics.ts:99-103`; Rich 4×).
2. **An underwater ride camera.** Today duck-dives and hold-downs are only heard. Follow the rider under, or keep the camera above and leave underwater to the Wave Lab. If yes: does Classic get the new underwater look (it would otherwise show today's flat fog during wipeouts)?
3. **Classic unchanged.** Recommended: Classic keeps `FogExp2` and today's underside; everything here goes to Rich. One exception to consider: the per-pixel waterline (item 7) fixes a whole-frame flip that both looks share.
4. **Haze and sand as rendering or as simulation.** Recommended: render-side fields that never touch the rider, so they may differ online. Putting a second air class into `AerationField` would change buoyancy, and so the physics and the handover.
5. **Sand seen from above.** Whether Rich also tints the Beach's breaking faces brown where sand is lifted (a known photo cue, review Fig. 3 and Fig. 10).
6. **Order and budget.** Recommended: items 1–2 now; 3 next; 4 and 6 together; 5; 7 whenever you decide 2; 8 after the swept barrel. Tracer counts and march steps on the M1 Air by benchmark.
7. **Provisional values.** Accept, or fund measurement: the particulate density, the fine-bubble share, the undertow's vertical shape, the shaft contrast law.

---

## 9. Gaps and what was not opened

- **Not opened (paywall or bot protection):** Lamarre & Melville 1991 and Blenkinsopp & Chaplin 2007 and 2011 (used via Derakhti & Kirby, and abstracts); Kimmoun & Branger 2007 (abstract); Ting & Kirby 1994/1995/1996 (no abstract available; used only as the game's code cites them); Nadaoka et al. 1989 (abstract, and as described by Watanabe et al. 2005); Deane & Stokes 1999 and Deane 1997 (abstracts); Garcez Faria et al. 2000 (abstract; its dissertation chapter was read); Darecki 2011, Terrill 2001, Stramski & Tegowski 2001, Twardowski 2012, Lynch 2014, Marston 1979, Zaneveld & Pegau 2003 (abstracts); van der Zanden et al. 2017 on suspended sand (the ICCE 2016 summary was read instead); Tyler 1958 part I (sunny radiance data).
- **Not measured anywhere I found:** plume depth and void fraction under real surf-zone plungers in the field; the fine-bubble haze's concentration and lifetime in the surf zone; surf-zone beam attenuation at a named beach break; any particulate density to render.
- **Sea of Thieves:** no public description of its underwater.
- **Costs:** none of the §6 effects was timed; the M1 figures scale round 4's measurements and the M4 Pro figures assume 3× the M1.
- **CDOM:** the game's optics lack dissolved-organic absorption, which gives coastal water its green; the spectral source was not opened.

---

## 10. Sources

Opened in full unless marked.

**Water motion and currents**
- Bosboom & Stive, *Coastal Dynamics* (TU Delft Open, CC BY-NC-SA), §5.4.1, §5.5.1, §5.5.6 — [LibreTexts](https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive))
- Garcez Faria 1997, *Nearshore currents over a barred beach*, NPS — [Calhoun](https://calhoun.nps.edu/server/api/core/bitstreams/7a30faa6-893a-4ede-af9a-5f711de8fe8c/content); Garcez Faria et al. 2000 (abstract) — [doi](https://doi.org/10.1029/2000JC900084)
- Haines & Sallenger 1994 (abstract) — [doi](https://doi.org/10.1029/94JC00427)
- MacMahan, Thornton, Stanton & Reniers 2005, RIPEX — [Calhoun](https://calhoun.nps.edu/server/api/core/bitstreams/b2de88ce-653b-4133-9d3e-bf1d78390d59/content)
- van der Zanden et al. 2018, JGR 123 — [U Twente](https://ris.utwente.nl/ws/files/29784531/Zanden_et_al_2018_Journal_of_Geophysical_Research_Oceans.pdf); van der A et al. 2017 (abstract) — [doi](https://doi.org/10.1002/2016jc012072)
- Shi et al., FUNWAVE-TVD report CACR-11-04 — [PDF](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.1.pdf); FUNWAVE breaking, roller and undertow — [docs](https://fengyanshi.github.io/build/html/wavebreaking.html)

**Plunging jets, vortices, bubbles**
- Deane & Stokes 2002, *Nature* 418 — [PDF](https://pdodds.w3.uvm.edu/files/papers/others/2002/deane2002.pdf); Deane & Stokes 1999 (abstract) — [doi](https://doi.org/10.1175/1520-0485(1999)029<1393:AEPABS>2.0.CO;2); Deane 1997 (abstract) — [doi](https://doi.org/10.1121/1.420321)
- Watanabe, Saeki & Hosking 2005, JFM 545 — [Hokkaido](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/1425/1/JFM545.pdf); Nadaoka, Hino & Koyano 1989 (abstract) — [doi](https://doi.org/10.1017/S0022112089001783)
- Chanson, Aoki & Maruyama 2002, *Coastal Eng.* 46 — [PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- Derakhti & Kirby 2014, CACR-14-06 — [PDF](https://www1.udel.edu/kirby/papers/derakhti-kirby-cacr-14-06.pdf) (JFM version [doi](https://doi.org/10.1017/jfm.2014.637))
- Melville, Veron & White 2002, JFM 454 — [PDF](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Melville-Veron-White-2002-JFM-Velocity-under-breaking-waves.pdf)
- Iafrati 2009, IWWWFB 24 — [PDF](http://www.iwwwfb.org/Abstracts/iwwwfb24/iwwwfb24_31.pdf)
- Leifer et al. 2006, JGR 111 — [TNO](https://publications.tno.nl/publication/34610132/xa5thE/leifer-2006-bubbles2.pdf)
- Abstracts only: Lamarre & Melville 1991 [doi](https://doi.org/10.1038/351469a0) (not opened; via Derakhti & Kirby, Iafrati); Blenkinsopp & Chaplin 2007 [doi](https://doi.org/10.1098/rspa.2007.1901); Kimmoun & Branger 2007 [doi](https://doi.org/10.1017/S0022112007007641); Cox & Shin 2003 [doi](https://doi.org/10.1061/(ASCE)0733-9399(2003)129:10(1197)); Mori, Suzuki & Kakuno 2007 [doi](https://doi.org/10.1029/2006JC003647)

**Sediment**
- Aagaard, Brinkkemper, Christensen, Hughes & Ruessink 2021, review, *J. Mar. Sci. Eng.* 9, 1300 — [doi](https://doi.org/10.3390/jmse9111300), [Utrecht copy](https://dspace.library.uu.nl/handle/1874/413580)
- van der Zanden et al., ICCE 2016 — [PDF](https://icce-ojs-tamu.tdl.org/icce/article/download/8160/pdf)
- Riazi, Vila-Concejo, Salles & Türker 2020, *Sci. Rep.* — [article](https://www.nature.com/articles/s41598-020-65741-3)
- Ferguson & Church 2004 — [doi](https://doi.org/10.1306/051204740933) (formula via [Sylvester](https://zsylvester.github.io/post/grain_settling/))

**Optics**
- Tyler 1960, SIO Ref. 60-9 — [PDF](https://misclab.umeoce.maine.edu/education/VisibilityLab/reports/SIO_60-9.pdf)
- Ocean Optics Web Book, contrast — [page](https://www.oceanopticsbook.info/view/photometry-and-visibility/level-2/contrast); Zaneveld & Pegau 2003 (abstract) — [doi](https://doi.org/10.1364/OE.11.002997); Davies-Colley 1988 (abstract) — [doi](https://doi.org/10.4319/lo.1988.33.4.0616)
- Lynch 2014, Snell's window in wavy water (abstract) — [doi](https://doi.org/10.1364/ao.54.0000b8)
- Dera & Stramski 1986, *Oceanologia* 23 — [PDF](http://www.iopan.gda.pl/oceanologia/OC_23/OC_23_15-42.pdf); Darecki, Stramski & Sokólski 2011 (abstract) — [doi](https://doi.org/10.1029/2011JC007338)
- Hieronymi, Macke & Zielinski 2012, *Ocean Sci.* 8 — [PDF](https://os.copernicus.org/articles/8/103/2012/os-8-103-2012.pdf)
- Terrill, Melville & Stramski 2001 (abstract) — [doi](https://doi.org/10.1029/2000JC000496); Stramski & Tegowski 2001 (abstract) — [doi](https://doi.org/10.1029/2000JC000461); Twardowski et al. 2012 (abstract) — [doi](https://doi.org/10.1029/2011JC007347); Marston 1979 (abstract) — [doi](https://doi.org/10.1364/JOSA.69.001205)

**Rendering practice and hardware**
- *Finding Nemo* — [AWN 2003](https://www.awn.com/animationworld/finding-right-cg-water-and-fish-nemo); *Finding Dory* — [fxguide](https://www.fxguide.com/fxfeatured/the-tech-of-pixar-part-2-finding-dory-making-waves/); *Moana* — [Frost et al. 2017](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Frost_Moana-Performing-Water.pdf), [Palmer et al. 2017](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Palmer_The-Ocean-and-Water-Pipeline-of-Disneys-Moana.pdf)
- Crest — [underwater docs](https://crest.readthedocs.io/en/stable/user/underwater.html), [UnderwaterEffectShared.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/Underwater/UnderwaterEffectShared.hlsl), [OceanReflection.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/OceanReflection.hlsl), [OceanEmission.hlsl](https://github.com/wave-harmonic/crest/blob/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl)
- Unity HDRP — [underwater view](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-underwater-view.html), [caustics](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-caustics-in-the-water-system.html)
- Subnautica — [Game Developer 2016](https://www.gamedeveloper.com/design/how-i-subnautica-i-plunges-deeper-into-rendering-realistic-water)
- Crysis — [Sousa, GDC 2008](https://archive.org/details/GDC2008Sousa)
- Sea of Thieves — [Ang et al. 2018](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf) (no underwater content)
- GPU Gems ch. 2 — [NVIDIA](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics); GPU Gems 3 ch. 13 — [NVIDIA](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process)
- Wronski 2014, volumetric fog — [PDF](https://bartwronski.files.wordpress.com/2014/08/bwronski_volumetric_fog_siggraph2014.pdf)
- Apple, TBDR — [docs](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering); Apple M4 Pro — [newsroom](https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/)
