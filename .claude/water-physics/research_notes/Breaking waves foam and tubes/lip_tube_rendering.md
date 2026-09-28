# Lip, tube-interior, spray and impact-whitewater rendering for a browser surf game: real-time techniques, costs, and the visual cues of real barrels

Research date 2026-09-28. Tags: **[published]** = stated in the cited source; **[measured]** = a measurement reported by the source; **[computed]** = arithmetic done here from the cited published constants; **[inferred]** = my reasoning, not stated by any source. Direct quotations are avoided; source text is paraphrased. The Surf's Up course-notes PDF uses a scrambled font encoding; its text was recovered here by letter-substitution decoding, so its prose is reliable but its digits were not decodable (no numbers are taken from it).

## Q1. Which visual cues make a barrel read as real (lip glow, lip texture, glassy face vs turbulent lip, throat, light inside the tube, inner-wall reflections, the view out of the tube, spit), and what are the optics numbers?

### Takeaway
A real barrel reads through a small set of optical cues: a backlit lip that glows green-cyan only where it is thin and the viewer looks toward the sun, a thickness gradient that darkens toward the throat, an aerated and fraying leading edge, a glassy stretched face that mirrors the bright tube mouth at grazing angles, a dark high-contrast interior framing a very bright opening, and short-lived forward-scattering spray and spit. Pure-water absorption alone barely tints a sheet 0.1–0.3 m thick, so the emerald colour in photos needs a much longer effective light path (scattering by bubbles and particles, plus CDOM or phytoplankton). A shader that uses only the lip's geometric thickness will look like a pale glass curtain.

### Cited Findings

**Seawater absorption and colour**
- [published data] Pope & Fry (1997) pure-water absorption coefficients, converted to m⁻¹: 400 nm 0.0066; 420 nm 0.0045; 450 nm 0.0092; 475 nm 0.0114; 500 nm 0.0204; 525 nm 0.0417; 550 nm 0.0565; 575 nm 0.0772; 600 nm 0.222; 625 nm 0.283; 650 nm 0.340; 675 nm 0.448; 700 nm 0.624 — [OMLC data file pope97.txt](https://omlc.org/spectra/water/data/pope97.txt)
- [published] The OMLC compendium says the Pope/Sogandares measurements found blue absorption much lower than earlier work and moved the absorption minimum to about 420 nm (from the green) — [OMLC water absorption compendium](https://omlc.org/spectra/water/abs/index.html)
- [computed] Pure-water transmittance T = exp(−a·d) using the Pope & Fry values above — [OMLC pope97.txt](https://omlc.org/spectra/water/data/pope97.txt):

  | path d | 450 nm | 500 nm | 550 nm | 600 nm | 650 nm | 700 nm |
  |---|---|---|---|---|---|---|
  | 0.1 m | 0.999 | 0.998 | 0.994 | 0.978 | 0.967 | 0.940 |
  | 0.3 m | 0.997 | 0.994 | 0.983 | 0.935 | 0.903 | 0.829 |
  | 1 m | 0.991 | 0.980 | 0.945 | 0.801 | 0.712 | 0.536 |
  | 3 m | 0.973 | 0.941 | 0.844 | 0.513 | 0.361 | 0.154 |
  | 10 m | 0.912 | 0.815 | 0.568 | 0.108 | 0.033 | 0.002 |

  The 1/e lengths are about 108 m at 450 nm, 49 m at 500 nm, 18 m at 550 nm, 4.5 m at 600 nm, 2.9 m at 650 nm and 1.6 m at 700 nm.
- [published] In natural water, CDOM absorption follows a(λ) = a(440)·exp(−S(λ−440)) with S typically 0.012–0.022 nm⁻¹ (marine material near 0.01). Phytoplankton absorb in two peaks near 440 and 675 nm. Non-algal particles have flatter slopes of 0.006–0.013 nm⁻¹. The open ocean is dominated by water absorption and looks blue; coastal water with more phytoplankton, particles and CDOM looks greener or browner — [Ocean Optics Web Book: Absorption by Oceanic Constituents](https://www.oceanopticsbook.info/view/absorption/absorption-by-oceanic-constituents)
- [computed, with an assumed CDOM level] Adding an assumed a_CDOM(440) = 0.1 m⁻¹ with S = 0.015 nm⁻¹ (inside the range above) to pure water gives total absorption of about 0.095 (450 nm), 0.061 (500), 0.076 (550), 0.231 (600) and 0.344 (650) m⁻¹. Over a 3 m path, transmittance is then 0.75 / 0.83 / 0.80 / 0.50 / 0.36, so the transmitted light peaks near 500–550 nm (green-cyan) instead of in the blue. Model from the [Ocean Optics Web Book](https://www.oceanopticsbook.info/view/absorption/absorption-by-oceanic-constituents), water values from [OMLC](https://omlc.org/spectra/water/data/pope97.txt); the CDOM magnitude is an assumption.
- [published] Pure-water scattering has a Rayleigh-like angular shape and spectrum. It changes by about 30% with salinity and about 4% with temperature between 0 and 26 °C — [Ocean Optics Web Book: Water](https://www.oceanopticsbook.info/view/optical-constituents-of-the-ocean/water)
- [published] Unreal's Single Layer Water docs give example water absorption coefficients of R 0.0033, G 0.0016 and B 0.0011, so red is extinguished first with depth, then green, then blue — [Unreal Engine: Single Layer Water Shading Model](https://dev.epicgames.com/documentation/unreal-engine/single-layer-water-shading-model-in-unreal-engine?lang=en-US)

**Surface optics (reflection and refraction)**
- [published] Water's base reflectance at normal incidence is F0 ≈ 0.02, and Fresnel reflectance rises toward total reflection at grazing angles — [LearnOpenGL: PBR Theory](https://learnopengl.com/PBR/Theory)
- [computed] Using Schlick's approximation with F0 = 0.0204 (n = 1.333), reflectance is about 0.02 at 0–30° incidence, 0.05 at 60°, 0.24 at 75° and 0.64 at 85° (F0 from [LearnOpenGL](https://learnopengl.com/PBR/Theory)).
- [published] Snell's window: from underwater, the whole sky is squeezed into a cone of about 96–97°. Outside the cone the surface is dark or mirrors the underwater scene by total internal reflection, and the window dims toward its edge because more light is reflected at grazing angles — [Wikipedia: Snell's window](https://en.wikipedia.org/wiki/Snell%27s_window)
- [computed] The critical angle is 48.6° for n = 1.333 and 48.3° for n = 1.34 (seawater), giving a 97.2° or 96.5° window (consistent with [Wikipedia: Snell's window](https://en.wikipedia.org/wiki/Snell%27s_window)).

**Aerated water, foam and spray optics**
- [measured] Koepke (1984): the effective reflectance of oceanic whitecaps is about 22% in the visible, more than a factor of 2 lower than values used earlier in remote sensing. The table shown with the abstract gives about 41% for foam 1 s old, falling to about 16% at 10 s — [Applied Optics 23(11):1816, Optica abstract page](https://opg.optica.org/ao/abstract.cfm?uri=ao-23-11-1816)
- [published] Pixar (Piper): from a distance foam looks milky and diffuse, with specular highlights only under some lighting; in close-up, individual bubbles show intricate reflections and refractions. Pixar shaded foam with a thin-surface water shader, which needed millions of small bubbles and very many reflection/refraction bounces to reach the milky look in wide shots — [Lapping Water Effects in Piper, SIGGRAPH 2016 talk](https://history.siggraph.org/wp-content/uploads/2022/09/2016-Talks-Serritella_Lapping-Water-Effects-in-Piper.pdf)
- [published] The primary rainbow sits about 42° from the antisolar point and the secondary about 50–53°. A sea-spray bow has a smaller radius because seawater has a higher refractive index — [Wikipedia: Rainbow](https://en.wikipedia.org/wiki/Rainbow)
- [computed by the source] For 5 µm fog droplets at 550 nm (m = 1.33), the Mie forward-scattering lobe has a full width at half maximum of about 2.5°, and a Henyey–Greenstein phase function fits these droplets poorly — [miepython: Mie Scattering and Fog](https://miepython.readthedocs.io/en/2.5.5/05_fog.html)
- [published] In Disney's Hyperion (Moana), the blues and greens of ocean water came from volume scattering in a homogeneous medium. Part of the sun-glint look came from atmospheric (Mie) scattering around the sun — [Yining Karl Li: Moana](https://blog.yiningkarlli.com/2016/11/moana.html)

**How the lip and jet break up (texture of the lip's leading edge)**
- [published, simulation] Wang, Yang & Stern (2016, JFM) resolve spanwise 3D interface structures during plunging breaking and suggest a Görtler-type centrifugal instability as the likely cause. Their simulations capture air entrainment and spray formation in detail — [JFM abstract, Cambridge Core](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/highfidelity-simulations-of-bubble-droplet-and-spray-formation-in-breaking-waves/8B26A9EA5D63F43BDC6BA15B2AEA7AC1)
- [measured] "Plunging Breakers Part 2: Droplet Generation" (author list not checked here) identifies four droplet sources:
  1. closure of the gap between the plunging jet's upper surface and the splash it creates;
  2. bursting of large bubbles trapped under the jet at impact;
  3. splashing and bubble bursting in the turbulent zone on the front face;
  4. small bubbles bursting at the crest of the following wave.

  Droplets ≥100 µm were measured holographically at 650 holograms/s. The power-law crossover diameter rose from 820 µm to 1480 µm from weak to strong breakers — [arXiv 2210.01923](https://arxiv.org/abs/2210.01923)
- [published] Wave splashing produces some of the largest spray drops (up to about 2 mm). Ligaments along a corrugated lamella rim merge into thicker ligaments and pinch off drops by end-pinching — [arXiv 2510.02486](https://arxiv.org/html/2510.02486)
- [published, film practice] Surf's Up added lip trains: an extra roughening displacement switched on partway through the break so the lip appears to start tearing apart. The displacement peaks were shaded brighter, as if aerating, and served as the emitters for lip spray — [Surf's Up SIGGRAPH 2007 course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)

**Spit**
- [published] Spit is compressed, aerated water blasting horizontally out of the tube mouth. As the ceiling and walls collapse, a bellows effect funnels air and water out for about two to three seconds; Pipeline and Teahupo'o are classic spitting breaks — [Encyclopedia of Surfing: spit, spitter](https://www.eos.surf/encyclopedia/spit-spitter)

**What surf photographers report**
- [published] A backlit wave shot needs the wave to break across the sun's line, so that the pitching lip, the face and the back all light up. East-facing coasts get this in the morning and west-facing coasts in the evening. The lip turns turquoise/green when the sun hits it, and golden light can spill over the lip. Photographers expose either for the shadows (high-key) or for the highlights (silhouette) — [Underwater Photography Guide: The Art of Backlighting Waves](https://www.uwphotographyguide.com/art-of-backlighting-waves)
- [published] Leroy Bellet, shooting inside barrels with flash, found that clear water absorbed his flash rather than reflecting it. Only turbulent (aerated) water lit up, and surfers appear to ride into darkness or into the sunrise/sunset. He shot at ISO 800, 1/800 s and f/5.6 with a full-power speedlight at sunrise and sunset — [PetaPixel](https://petapixel.com/2015/10/29/shooting-flash-photos-of-surfers-inside-barrel-waves/)
- [published] Surf's Up based its wave style on surfing and outdoor photography plus concept art, aiming to let the viewer experience being inside the perfect tube — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)

### Inferences
Barrel cues, ranked by how much they sell "real water" [all inferred from the findings above]:
1. **The backlit glow depends on direction and thickness.** The green-cyan glow appears where the lip is thin, the sun is behind it, and the camera looks roughly toward the sun through it; it fades quickly as the view turns away. Through a lip 0.1–0.3 m thick, pure water transmits 90–97% of red and nearly all blue, so geometric thickness alone gives an almost colourless, glassy sheet. The observed emerald needs an optical path of metres, which comes from multiple scattering by bubbles and particles inside a lip that is already aerating. In coastal water, CDOM and phytoplankton also absorb the blue, putting the transmission peak at about 500–550 nm (see the 3 m computed row). Practical consequence: the absorption or scattering coefficients applied to the lip should be several times the pure-water values, or the shader should multiply the geometric path. This is likely one root cause of the thin-curtain look.
2. **A thickness gradient runs across the lip.** The glow is brightest and most saturated at the thin tip, darker toward the thicker root, and darkest where the lip joins the face (the throat), because transmittance falls exponentially with path length.
3. **The interior is dark and very high-contrast, framing a bright mouth.** The ceiling blocks most of the sky, so the inner face sees only the opening plus green light transmitted through the lip. Bellet's report that surfers ride into darkness or into the sunrise matches this. In HDR terms the opening can be several stops brighter than the throat; I found no published stop count.
4. **The glassy inner face mirrors the mouth.** From inside the tube the face is seen at grazing angles, where Fresnel reflectance is roughly 24–64% (75–85°). The smooth face therefore strongly mirrors the bright opening and the underside of the lip. It must not mirror open sky, which the lip occludes; Surf's Up rendered a separate reflection-occlusion pass (see Q3).
5. **The glassy face contrasts with a rough, aerated lip.** A smooth, stretched face with long reflections sits against a rougher lip whose leading edge whitens, frays into fingers/ligaments and sheds drops of roughly 0.1–2 mm. This matches the spanwise 3D structures and the ligament-to-drop sequence in the fluid literature, and Surf's Up's brightened lip-train peaks.
6. **Impact whitewater is brightest at birth and dims within about 10 s.** Effective reflectance falls from about 41% at 1 s to about 16% at 10 s (22% averaged). Fresh impact foam should therefore be clearly brighter than older foam, and the foam's colour should come from the light around it, since it is diffuse and milky at a distance.
7. **Spit and spray are strongly forward-scattering.** Fog-size droplets have a forward lobe of only a few degrees, so backlit spit and mist glow intensely toward the sun and are dim when front-lit. With the sun behind the camera, sea spray can show a rainbow slightly inside the usual ~42° radius. Spit is a horizontal jet from the mouth lasting 2–3 s during tube collapse.
8. **Motion reads as water.** Texture on the falling lip must move down and forward with the water, not stay fixed to the mesh (Surf's Up handled this explicitly; see Q2). Streaked droplets and advected foam reinforce it.

### Gaps
- I found no measured lip-thickness or lip-to-height ratio for real barrels in the pages opened; it is probably covered by the lip-physics or Teahupo'o research.
- I found no photographic source giving the exposure difference (in stops) between a tube's throat and its opening, and no primary source describing light patterns inside the tube (for example caustics on the inner face). The HDR contrast claim rests on the photographers' qualitative reports.
- I found no measured bubble-size distribution or scattering coefficient for the aerated lip itself, so the optical-path multiplier in inference 1 must be tuned by eye.
- The Koepke time-decay numbers (41%→16%) come from the table shown on the Optica abstract page; other secondary summaries quote different ranges. Treat them as indicative.

## Q2. Which real-time techniques render the lip, tube interior, spit/spray/mist and impact whitewater, and how do they rank for this game?

### Takeaway
The best returns come from cheap per-pixel work anchored to data the game already has:
1. Thickness-driven translucency on the lip, using the lip sheet's known thickness with an exaggerated optical path and a forward-scatter lobe toward the sun. This is the family behind Barré-Brisebois 2011, Sea of Thieves, Crest and the Atlas-style terms.
2. Lip trains and brightening where the lip starts to break, plus a continuous crash-curve whitewater emitter with a skirt, to turn the column teeth into intended breakup.
3. Flow-advected streak textures on the lip.

Next come:
4. Occlusion-aware interior lighting and reflections.
5. Disciplined spray: soft particles, a clear-to-white age ramp, forward-scatter lighting, streaked droplets and a strict opacity budget.
6. A soft sprite mist layer.

Screen-space thickness for spray clusters and local volumetric fog are optional high-end tiers.

### Cited Findings

**Translucency / subsurface-scattering approximations used for water and thin sheets**
- [published] Barré-Brisebois & Bouchard (GDC 2011, Frostbite 2 / Battlefield 3) distort the light direction by the normal, H = L + N·δ. The back-light term is scale·saturate(V·−H)^p plus an ambient term, multiplied by a per-object local thickness and an attenuation, then added to lighting. Thickness was precomputed by flipping the mesh normals, baking ambient occlusion and inverting it — [Alan Zucconi's reproduction of the technique](https://www.alanzucconi.com/2017/08/30/fast-subsurface-scattering-2/); talk page on [Colin Barré-Brisebois's blog](https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/)
- [measured] The slides list full-screen costs of about 1.0 ms on PS3 (17 instructions), 0.6 ms on Xbox 360 (13 instructions) and 0.03 ms on DX11 PC (12 instructions). They note weak handling of concave shapes and the need for precomputed thickness, which does not suit deforming objects without a runtime approximation — [slide transcript on SlideShare](https://slideshare.net/colinbb/colin-barrebrisebois-gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurfacescattering-look-7170855)
- [published] Sea of Thieves blends a deep-water colour with a sub-surface colour based on view angle, sun direction and a wave-peak mask from the FFT choppiness offsets. Wave peaks show more sub-surface colour because light travels a shorter distance through the water. They also blurred the foam buffer with feedback, used an area specular for a large low sun, and applied a Snell's-window effect when viewed from below — [The Technical Art of Sea of Thieves, SIGGRAPH 2018 talk](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf)
- [published] Crest's subsurface-scattering term is (SSS_base + SSS_sun · max(0, L·−V)^falloff) × SSS colour × light colour × shadow. Above water it is also multiplied by (1 − v²), where v is the vertical component of the view vector, and by an `sss` input factor passed into the shading function. The diffuse colour blends from a grazing colour to a base colour with v. Depth fog is alpha = 1 − exp(−density_rgb · distance) — [Crest OceanEmission.hlsl](https://raw.githubusercontent.com/crest-ocean/crest/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl)
- [published] Crest docs describe the SSS sun term as emulating light passing through waves. They also list a foam bubble layer with parallax, refraction that samples the camera colour texture (excluding anything drawn in the transparent pass), and Cull Off so the surface can be shaded from underneath — [Crest docs: Water Appearance](https://crest.readthedocs.io/en/4.18/user/water-appearance.html)
- [published code] A widely copied Atlas-style water scatter model (Acerola's FFT water shader) sums four terms:
  - k1 = peak strength × H × max(0, L·−V)⁴ × (0.5 − 0.5·L·N)³, with H the displacement height;
  - k2 = scatter strength × max(0, V·N)²;
  - k3 = shadow scatter strength × N·L;
  - k4 = bubble density.

  (k1 + k2) is multiplied by scatter colour and sun irradiance, divided by (1 + light mask); k3 × scatter colour and k4 × bubble colour are added. The result is composited as (1 − F)·scatter + specular + F·environment — [FFTWater.shader](https://raw.githubusercontent.com/GarrettGunnell/Water/main/Assets/Shaders/FFTWater.shader). The repo's [README](https://raw.githubusercontent.com/GarrettGunnell/Water/main/README.md) lists the GDC 2019 Atlas talk among its references. The [fftWater README](https://github.com/iamyoukou/fftWater/blob/master/README.md) says the Atlas talk applies BRDFs to both sun and sky light and proposes a scattering equation to fake water SSS.
- [published] Unreal's Single Layer Water treats water as a homogeneous participating medium with scattering and absorption coefficients and a PhaseG anisotropy (positive values scatter toward the sun). Downsampling scene colour and depth for refraction reads speeds up rendering, and mobile falls back to a simple translucent material with no volume integration — [Unreal docs](https://dev.epicgames.com/documentation/unreal-engine/single-layer-water-shading-model-in-unreal-engine?lang=en-US)
- [published] three.js MeshPhysicalMaterial offers:
  - transmission;
  - thickness in mesh space (0 means thin-walled, otherwise a volume boundary), with thicknessMap in the green channel;
  - attenuationColor, the colour white light becomes after travelling attenuationDistance (Beer–Lambert style);
  - ior (default 1.5; water needs 1.33) and dispersion.

  It costs more per pixel than other three.js materials, with each enabled feature adding cost — [three.js docs: MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)

**Screen-space thickness and refraction (spray clusters, parcel sheets)**
- [published, measured] Screen-space fluid rendering (van der Laan, Green & Sainz, I3D 2009):
  - thickness is built by rendering each particle's thickness kernel with additive blending into its own target, depth-tested against the scene;
  - the refracted colour is lerped toward the fluid colour by e^(−T), with a slightly different exponential falloff per colour channel;
  - the refraction offset grows linearly with thickness;
  - foam comes from a per-particle Perlin-noise octave that travels with the particles, brightened for "hot" particles;
  - depth smoothing can run at half or quarter resolution, which can even look better close up.

  Benchmarks used 64,000 SPH particles on a GeForce 8800 GTS 512 at 1024×768, and quarter-resolution curvature flow was slightly faster than a bilateral Gaussian blur — [paper PDF](https://wstahw.win.tue.nl/edu/2IV00/andrei/particle_rendering/provided/p91-van_der_laan.pdf)

**Flow-driven surface texture (streaks, lip texture, stretched face ripples)**
- [published, measured] Valve's flow maps (Left 4 Dead 2 / Portal 2):
  - the normal map is distorted along a 2D flow texture (about 4 texels/m, combed in Houdini);
  - two layers half a phase apart hide the restart;
  - distortion only looks convincing for roughly the first third of UV space;
  - a per-pixel offset removes repetition and a noise texture removes pulsing;
  - normal strength is scaled by flow speed.

  Cost versus two scrolling normal maps: 2 extra texture fetches and 21 extra ALU instructions — [Vlachos, SIGGRAPH 2010 slides](https://cdn.akamai.steamstatic.com/apps/valve/2010/siggraph2010_vlachos_waterflow.pdf)
- [published] Surf's Up mapped ocean texture through a flattened reference space that moved with the wave. Texture therefore slid over the wave as the water passed through it and stretched realistically up the deforming face, avoiding the streaking a straight world-space lookup gives. The team spent hundreds of hours hand-tailoring these spaces per wave style — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Surf's Up noted that the water on the inside face of a tube moves forward and upward, while the mesh only moves forward. Motion vectors were therefore computed as if the ocean were static and a deformation moved through it. On the forward-falling face (the lip) the vectors were reversed so the blur went forward and down, and a matching shift in texture space made the falling face appear to move downward — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)

**Particles: soft, streaked, lit, and how spray meets the lip**
- [published] NVIDIA soft particles fade sprites by the depth difference between scene and particle, D = saturate((Z_scene − Z_particle)·scale), passed through a symmetric pow-based contrast curve to avoid a visible kink. This needs scene depth readable as a texture, either the depth buffer itself or a second render target holding depth — [Lorach 2007 whitepaper](https://developer.download.nvidia.com/whitepapers/2007/SDK10/SoftParticles_hi.pdf)
- [published] Garg & Nayar (SIGGRAPH 2006): falling drops oscillate, and motion-blurred streaks show speckles, several smeared highlights and curved brightness contours that depend on light and view direction. They rendered these from a precomputed streak database — [SIGGRAPH history page](https://history.siggraph.org/learning/photorealistic-rendering-of-rain-streaks-by-garg-and-nayar/)
- [published] NVIDIA's real-time rain sample (Tariq 2007) animated particles on the GPU and expanded them into billboards. It indexed over 300 Garg–Nayar streak textures in a texture array by light and view angles, blending the four nearest, and added an analytic fog model that renders glows around lights — [NVIDIA Rain whitepaper](https://developer.download.nvidia.com/SDK/10/direct3d/Source/rain/doc/RainSDKWhitePaper.pdf)
- [published] Surf's Up lip spray was born from a high-resolution strip carved around the displaced lip, with tight, dense clusters near the lip dispersing into mist as it was carried over the wave. Spray too dense right at the surface looked pasted on; too little gave away that the water was not really breaking up. To ease the wave-to-spray transition, the amount by which the wave occluded each particle was varied over a short initial span of its life — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Surf's Up spray and splash appearance:
  - particle proximity and time (age) attributes transitioned particles from clear refractive water to a white aerated look;
  - a finer, softer mist element was rendered with a sprite renderer (Splat) for fine spray or fog;
  - clustered effects were lit with key, rim and fill lights using deep shadows, plus extra passes for specular glints, particle life and density variation;
  - the other objects' deep shadows from the camera were used for spray matting.

  [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)

**Mist and volumetrics**
- [published] Surf's Up's whitewater mist was a secondary simulation born from the whitewater to diffuse and soften its sometimes hard particulate look. It was designed to drag and hang in the air above the wave and was rendered as sprites — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [measured] Assassin's Creed IV Black Flag volumetric fog stores in-scattered light (RGB) and density (A) in a camera-aligned 160×90×64 (or ×128) 16-bit-float RGBA froxel volume and accumulates scattering front-to-back along each froxel column. On Xbox One the total was 1.1 ms:

  | step | cost |
  |---|---|
  | shadow-map downsample | 0.163 ms |
  | shadow-map blur | 0.177 ms |
  | lighting and density volume | 0.43 ms |
  | scattering solve | 0.116 ms |
  | apply | 0.247 ms |

  Listed extensions include artist-authored or particle-injected densities — [Wronski, GDC 2014 slides](https://bartwronski.com/wp-content/uploads/2014/03/ac4_gdc.pdf)

**Hiding collapse and seam artifacts**
- [published] Surf's Up emitted whitewater from a single crash curve carved along the lip. An energy-hit attribute switched on wherever the lip had hit the trough, and an energy value was largest at first impact and decayed afterwards; their product set the initial velocities. A second, lower whitewater section called the skirt helped integrate the effect with the wave and ocean. Gravity, drag and speed were exaggerated beyond physics to enhance scale — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Disney (Moana) said procedural waves forced artists to mask missing detail with secondary passes such as whitewater. They emitted whitewater from the deformer's peak area using its computed initial velocity, and used Voronoi patterns to sell the scale of very large waves. Pre-simulated crashing-wave caches were time-offset and deformed so they left no gaps. Sampling profile curves with different time offsets along the crest produced deliberately uneven crashing — [Moana: Crashing Waves, SIGGRAPH 2017 talk](https://media.disneyanimation.com/uploads/production/publication_asset/164/asset/Moana_Crashing_Waves.pdf)

**Evidence from surf games**
- [published] True Surf's founder (Luke Ryan) said the VR version had to be overhauled for viewing from anywhere, including the camera inside the barrel and duck dives. It needed a new way to render whitewater that looks acceptable from any angle without destroying performance when it covers most of the screen, and the team had considered falling back to a cartoony style if realistic whitewater failed — [Meta Quest blog](https://www.meta.com/blog/true-surf-launch/)

### Inferences
**Ranked technique set for this game** [ranking, costs and pitfalls are inferred from the findings; "cheap" means ALU-only with no extra pass]

1. **Thickness-driven lip translucency with an optical-path multiplier.**
   - *What it adds:* the emerald backlit glow, a tip-to-root gradient, and a lip that reads as a heavy water mass instead of a glass curtain. This addresses the thin-curtain complaint.
   - *How:* use the parcel sheet's own thickness per vertex (no bake, which avoids the BB 2011 limitation for deforming meshes). Set transmittance to exp(−σ_a·k·d) per channel, with k ≈ 5–20 or art-directed σ_a tuned to hit the green window. Add a forward lobe max(0, V·−L)^p (Crest/BB/Atlas style) scaled by sun visibility, plus a small view-independent term.
   - *Unifying idea:* treating the lip as a thin slab, single-scattered radiance ≈ E_sun · phase(V·−L) · (1 − e^(−σ_s·k·d)) · e^(−σ_a·k·d). This explains why all the game fakes use a pow(V·−L) lobe times a thickness or peak mask.
   - *Cost:* about 10–20 ALU on lip and crest pixels, no extra pass. Negligible on M4 Pro, fine on M1.
   - *Pitfalls:* physical coefficients alone produce no colour; glow without a sun-visibility gate looks radioactive; weight the term by (1 − F) so reflection and scattering do not double-count; clamp saturation. Crest's (1 − v²) factor keeps the glow strongest in near-horizontal views, which suits barrel cameras.
2. **Lip-breakup dressing that converts teeth into intended texture.**
   - *What it adds:* a spatially and temporally smoothed "break onset" field along the crest (for rendering only). Lip-train roughening and whitening switch on as a column starts to collapse, and the fraying leading edge is drawn as thin, white, short-lived fingers instead of solid water columns. Whitewater is emitted from one continuous crash curve with an energy value that is high on first hit and decays, plus a low skirt of foam/whitewater that covers the seam between lip impact and water surface. This addresses the teeth complaint.
   - *Cost:* trivial on the CPU/GPU.
   - *Pitfalls:* over-smoothing kills the natural unevenness that Moana added on purpose. Filter only the high-frequency, column-scale jitter and keep low-frequency variation along the crest.
3. **Flow-advected lip and face textures.**
   - *What it adds:* use the parcels' real velocities, which Surf's Up had to approximate, to advect streak/foam textures on the lip with two-phase blending, a noise offset and anisotropic stretch along velocity. On the face, use a wave-following reference space so ripples stretch up the face instead of sliding with world UVs. This gives the glassy-face versus streaked-lip contrast and makes water visibly pour down and forward.
   - *Cost:* about 2 extra fetches and 21 ALU per pixel (Valve's figure).
   - *Pitfalls:* pulsing unless noise-offset; streaking with world-space UVs; distortion beyond about a third of the UV period looks smeared.
4. **Occlusion-aware tube-interior lighting and reflections.**
   - *What it adds:* the dark throat and a bright mouth reflected on a glassy wall.
   - *How:* compute a per-vertex "sky openness" in the existing GPU tube-void pass (the fraction of upward directions not covered by the lip). Multiply it into sky irradiance and the environment-map reflection, which is the real-time equivalent of Surf's Up's reflection-occlusion pass. Add a green "transmitted sun" irradiance on the inner face from the lip's translucency term. Let Fresnel at grazing angles (24–64%) reflect a bright "mouth" colour rather than open sky, and let exposure and tonemapping handle the high contrast.
   - *Cost:* per-vertex; cheap on both targets.
   - *Pitfalls:* an unoccluded environment map shows sky inside the tube (strongly fake); exposure adaptation that brightens the throat destroys the contrast cue.
5. **Disciplined spray and spit.**
   - *What it adds:* impact whitewater that stays readable instead of being buried by spray. This addresses the spray-swamping complaint.
   - *How:*
     - soft particles against the water depth;
     - an age/proximity ramp from clear refractive to white (Surf's Up), so young spray at the impact is mostly transparent;
     - forward-scatter lighting, so front-lit spray is dim and backlit spray glows;
     - velocity-stretched streak billboards for fast drops (the rain-streak approach, even without a full database);
     - an occlusion ramp at birth where spray leaves the lip;
     - a hard opacity and overdraw budget near the impact point;
     - spit as a directed horizontal emitter from the mouth for 2–3 s during collapse.
   - *Cost:* dominated by blended overdraw. Soft particles need a readable depth texture.
   - *Pitfalls:* additive blow-out; dense spray at the surface looks pasted on while sparse spray looks fake (Surf's Up's lesson).
6. **Soft sprite mist layer.**
   - *What it adds:* a few large, low-opacity sprites that drag and hang above the whitewater and at the tube mouth (Surf's Up's whitewater mist). They soften hard particle edges and sell scale; forward-scatter lighting makes backlit mist glow.
   - *Cost:* low if kept to tens of sprites, not thousands.
   - *Pitfalls:* sprites intersecting the water need soft-particle fading.
7. **Screen-space thickness for spray clusters and parcel sheets (optional high tier).**
   - *What it adds:* additive thickness at half or quarter resolution, shaded with per-channel e^(−T) and thickness-scaled refraction. Clusters then look like water (clear to white) rather than dots.
   - *Cost:* one extra low-resolution pass plus a composite.
   - *Pitfalls:* silhouette handling when upsampling.
8. **Thin-sheet refraction through the lip tip (lower value).**
   - *What it adds:* sampling a copy of the scene colour with a normal-based offset, as in Crest, Unreal or SSFR (or three.js transmission), makes the face and throat visible through the thin tip.
   - *Cost:* the scene-colour copy is the cost.
   - *Pitfalls:* Crest-style refraction excludes other transparent layers such as spray.
9. **Local froxel mist (optional, WebGPU only).**
   - *What it adds:* a small camera-aligned volume around the barrel with spray-injected density (Wronski's listed extension), giving light shafts through spit and mist.
   - *Pitfalls:* on WebGL2 it would need fragment-shader slicing; the value is lower than items 1–6.
10. **Excluded:** path-traced or photon-mapped interiors and ray-marched bubble volumes (the film-only tools in Q3).

**Tube camera** [inferred; no primary game-design source found]
- Place the camera behind the rider, facing the mouth, so the frame holds the three key cues: the dark throat, the glowing lip ceiling and the bright mouth.
- Hold exposure fixed or adapt it slowly, keyed to the mouth.
- Give the spit event a short, directed mist burst toward the camera to exploit forward scattering.

### Gaps
- The Atlas GDC 2019 slides could not be opened (PDF over the 10 MB fetch limit). The Atlas-style formula above comes from an open-source shader whose README cites the talk; I could not verify it against the slides.
- I found no primary technical source on Assassin's Creed IV's ocean subsurface scattering; a GameDev.net thread about an AC4 ocean talk returned 403. The AC4 content used here is Wronski's volumetric fog, which is well documented. For Skull and Bones I found only a general Q&A in search results (not opened) and no shading details.
- I found no shipped surf game documenting its barrel-interior lighting or camera beyond the True Surf quote.
- I found no published real-time technique specifically for barrel-interior sky occlusion. The "sky openness" method is inferred.

## Q3. Which cues did film productions (Surf's Up, Moana, Piper, Avatar: The Way of Water) emphasise to make breaking waves read?

### Takeaway
Films layered a smooth, art-directed wave body with separately designed aerated elements: whitewater explosion, lip spray, foam ball, mist, foam and bubbles. They controlled colour by art direction rather than strict physics (Surf's Up painted colour by wave zone; Moana smoothed water walls and tweaked IOR). They also invested heavily in texture motion and stretching, and in the transition from clear water to white aeration. Physically based volume scattering (Moana, Avatar) supplied the base blues and greens, and bubbles and foam were treated as the hardest realism problem.

### Cited Findings
**Surf's Up (Sony Pictures Imageworks, 2007)**
- [published] The wave was a procedural, keyframed character rig rather than a fluid simulation, with controls such as lip up/down, lip forward/back, trough depth, tube depth and tube length. Per-vertex attributes such as energy, speed and crash were interpolated from sampled wave profiles, and a crash curve with "spill vectors" drove real-time whitewater previews for animators — [Making Waves for Surf's Up, SIGGRAPH 2007 sketch](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- [published] Shading used wave zones: seven zones set by the angle between the surface normal and vertical (front trough, front face, bottom curl, back lip, front lip, top curl, back face). Each zone was a separate material blended with the others through soft angle ranges. The curl and lip zones (3–5) appear only while the wave is breaking, without manual switching — [US8610721B2, Wave zones rendering technique](https://patents.google.com/patent/US8610721B2/en)
- [published] Imageworks considered several physically based methods but needed a more flexible, art-directed way to reach the required style and variety. Zone colours approximated the diffuse and ambient terms, lighters could almost paint the waves' colour, and more physically based reflection and refraction was layered on top. Foam above and below the surface were separate materials — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Surf's Up's tubing waves had three aerated features:
  - the whitewater, a large forward explosion where the lip hits the trough;
  - the lip spray, ripped back off the falling lip;
  - the foam ball, a backward explosion inside and around the tube, simulated in the flattened reference space and warped back to simplify collision with the deforming tube.

  [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Compositing used utility passes, including surface normals for extra speculars and bottom refraction, depth for atmosphere and depth of field, a Fresnel mask to balance reflection against refraction, a pass used to hold out (occlude) the reflection pass, separate colour-correction masks for foam above and below the water, and a render of the ocean bottom. A figure caption also lists diffuse, specular, cast-shadow and incandescence passes; this caption was decoded from the font-scrambled PDF, so its wording is less certain — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [published] Lip trains, lip-spray density, the occlusion ramp at birth, whitewater mist, the skirt, and the clear-to-white particle transition are covered under Q2 — [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)

**Moana (Walt Disney Animation Studios, 2016)**
- [published] Disney built an end-to-end water pipeline around its APIC solver, Splash, and a proprietary level-set rendering pipeline, adding surface foam, drips and bubbles as secondary effects. For the parting-water walls, the walls had to be very smooth to limit refraction so the audience could see deep into the water, and the index of refraction was modified in some scenes. For the gentle version, the team treated it as a less-is-more case — [Moana: Performing Water, SIGGRAPH 2017 talk](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Frost_Moana-Performing-Water.pdf)
- [published] Crashing waves were procedural (a profile-curve deformer) or fully simulated. Whitewater was emitted from the wave's peak area, Voronoi patterns enhanced scale, and a height-field displacement over the level-set composite gave a more organic look — [Moana: Crashing Waves](https://media.disneyanimation.com/uploads/production/publication_asset/164/asset/Moana_Crashing_Waves.pdf)
- [published] Hyperion took ocean blues and greens from homogeneous volume scattering. Lighters required real caustics in shallow-water shots (faking was ruled out), so photon mapping was added. Glints were helped by Mie scattering around the sun — [Yining Karl Li: Moana](https://blog.yiningkarlli.com/2016/11/moana.html)

**Piper (Pixar, 2016)**
- [published] Pixar shaded foam as physical bubble geometry with a thin-surface water shader (milky from afar, refractive up close), which needed millions of bubbles and many bounces. Leading-edge foam was particles placed along a curve mapped to each wave's leading edge. Wet-to-moist sand was handled by varying the meniscus layer's IOR from 1.333 to 1.0 — [Lapping Water Effects in Piper](https://history.siggraph.org/wp-content/uploads/2022/09/2016-Talks-Serritella_Lapping-Water-Effects-in-Piper.pdf)

**Avatar: The Way of Water (Wētā FX, 2022)**
- [published] Wētā's Loki framework ran coupled solvers for procedural waves, bulk water, spray, mist, hero bubbles, diffuse bubbles, foam, capillary waves, thin film and residual wetness. It modelled collective bubble effects: groups of bubbles rise faster than single bubbles because of their combined buoyancy. Bubbles reaching the surface became "wet" foam particles constrained to the surface and simulated with SPH. A Lagrangian wave post-process added dispersive high-frequency ripples — [Unity blog: The water technology behind Avatar](https://unity.com/blog/industry/technology-behind-avatar-the-way-of-water)
- [published] Joe Letteri said air bubbles were much harder than expected (cavitation, air trapped in hair and costumes), described foam up close as a big collection of bubbles, and called the bubble-making lapping edge particularly hard. Eric Saindon said particulates are needed to feel the medium, especially in stereo — [befores & afters](https://beforesandafters.com/2022/12/21/why-the-cg-water-in-the-way-of-water-looks-so-good/)

### Inferences
- [inferred] The shared lesson is to treat the lip and barrel as a layered composite: body colour and translucency, surface texture that moves and stretches with the water, and three distinct aerated elements (forward whitewater, lip spray, interior foam ball) plus mist. Each has its own look and timing.
- [inferred] Films bent physics to protect readability: Surf's Up painted colour per zone and exaggerated whitewater gravity and drag; Moana smoothed walls and changed IOR. The game can likewise exaggerate lip absorption and scattering, exaggerate the brightness of fresh impact foam, and shape spray lifetimes for readability.
- [inferred] The clear-to-white transition (young spray transparent and refractive, older spray white and diffuse) recurs from Surf's Up particles to Piper's bubble look. It is a cheap rule that directly counters the spray-swamping complaint.
- [inferred] Surf's Up's zone scheme is effectively a lookup keyed on the normal's angle from vertical, which the game can reproduce as a small gradient ramp for lip, curl and face colours. This is cheap and gives lighting-independent art control on top of physically motivated terms.

### Gaps
- I did not find primary Wētā material on how the lips of breaking waves were lit or shaded in Manuka; the opened sources cover simulation, not lip shading.
- The Surf's Up course notes show the zone images and passes only as figures; the per-zone colour values are not given in text.
- Imageworks' "Wave Displacement Effects for Surf's Up" PDF failed to download twice.

## Q4. What fits a browser game on WebGL2/WebGPU at 60 fps on an M4 Pro, and what degrades gracefully on an M1 Air?

### Takeaway
Everything in ranks 1–4 of Q2 is ALU-only or per-vertex work and fits comfortably on both machines. The real risks are blended overdraw from spray and mist covering the screen (True Surf's stated problem) and extra full-screen passes or copies, each of which costs tile-memory round-trips on Apple's tile-based GPUs. WebGPU (shipping in Safari 26 and Chromium) adds compute, which makes local froxel mist or GPU particle simulation practical. WebGL2 needs fragment-shader substitutes. On M1 Air, keep the shading terms and cut particle count, resolution and optional passes.

### Cited Findings
- [published] Apple GPUs are tile-based deferred renderers: tile memory is on-GPU with many times the bandwidth and lower latency and energy than device memory. The GPU processes all geometry of a render pass together and shades only visible primitives, discarding occluded ones per tile. A11 and later GPUs improve fragment-discard performance and simplify techniques including subsurface scattering and order-independent transparency — [Apple: Tailor your apps for Apple GPUs and TBDR](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering)
- [published] M1 has an up-to-8-core GPU at 2.6 TFLOPS, running nearly 25,000 threads at once — [Apple Newsroom, Nov 2020](https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/)
- [published] M4 Pro has an up-to-20-core GPU with twice M4's graphics performance and up to 273 GB/s of unified-memory bandwidth — [Apple Newsroom, Oct 2024](https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/)
- [published] WebGPU ships in Safari 26.0 on macOS, iOS, iPadOS and visionOS. WebKit says it supersedes WebGL there, maps better to Metal, and adds compute shaders, which WebGL could not do — [WebKit: Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- [measured] Published costs of reference techniques:
  - Barré-Brisebois translucency: 0.6–1.0 ms full-screen on PS3/360 and 0.03 ms on a DX11 PC — [SlideShare](https://slideshare.net/colinbb/colin-barrebrisebois-gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurfacescattering-look-7170855)
  - Valve flow maps: 2 extra fetches and 21 extra ALU — [Valve](https://cdn.akamai.steamstatic.com/apps/valve/2010/siggraph2010_vlachos_waterflow.pdf)
  - AC4 froxel fog: 1.1 ms on Xbox One — [Wronski](https://bartwronski.com/wp-content/uploads/2014/03/ac4_gdc.pdf)
  - Screen-space fluid: 64k particles on a 2008-era GeForce 8800 GTS 512, with quarter-resolution smoothing cheaper than Gaussian blur — [van der Laan et al.](https://wstahw.win.tue.nl/edu/2IV00/andrei/particle_rendering/provided/p91-van_der_laan.pdf)
- [published] Unreal speeds up water by downsampling scene colour and depth for refraction reads, and mobile drops volume integration for a plain translucent material — [Unreal docs](https://dev.epicgames.com/documentation/unreal-engine/single-layer-water-shading-model-in-unreal-engine?lang=en-US)
- [published] three.js MeshPhysicalMaterial (transmission/thickness/attenuation) costs more per pixel than other three.js materials, and each enabled feature adds cost — [three.js docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- [published] Soft particles need scene depth as a readable texture (depth buffer or a separate depth target) — [NVIDIA soft particles](https://developer.download.nvidia.com/whitepapers/2007/SDK10/SoftParticles_hi.pdf)
- [published] True Surf identified whitewater covering most of the screen as the performance problem when the camera goes into the barrel — [Meta Quest blog](https://www.meta.com/blog/true-surf-launch/)

### Inferences
**Budget and degrade ladder** [inferred; must be measured in the game, per the project's stance that performance is measured, never a gate]

| Technique (Q2 rank) | M4 Pro target | M1 Air fallback |
|---|---|---|
| 1 Lip translucency (ALU) | full | full (it is the key cue); drop the per-channel path multiplier to a single ramp if needed |
| 2 Lip trains, crash curve, skirt | full | full; fewer skirt particles |
| 3 Flow-advected streaks (2 fetches + ~21 ALU) | full | one layer instead of two, lower-resolution streak texture |
| 4 Interior openness and reflection occlusion (per vertex) | full | full |
| 5 Spray/spit particles | full count, streaks, soft particles | about half the count, half-resolution particle buffer or no soft fade on small drops, hard cap on overdraw near the camera inside the tube |
| 6 Mist sprites | tens of sprites | fewer, larger sprites |
| 7 SSFR thickness (half/quarter resolution) | optional | off |
| 8 Lip refraction via scene-colour copy | optional (reuse any existing copy) | off (translucency term alone) |
| 9 Local froxel mist (WebGPU compute) | optional; a small grid around the barrel should be well under AC4's full-screen 1.1 ms | off; sprites instead |

- [inferred] On a tile-based GPU, the cheapest improvements live in the shaders already running (items 1–4). Each new full-screen pass or colour/depth copy adds tile stores and loads, so reuse any depth or colour copy the Rich water path already makes rather than adding new ones.
- [inferred] Blended spray and mist are the main cost inside the barrel. Opaque surfaces benefit from the GPU shading only visible primitives, but each translucent layer must still be shaded and blended. Cap it with particle budgets, larger sprites with fewer layers, and lower-resolution particle rendering.
- [inferred] WebGL2 cannot sample the depth buffer it is currently writing, so soft particles require the opaque/water pass to render into a framebuffer with a depth texture that the particle pass then samples. The NVIDIA whitepaper's two options (depth as texture, or a separate depth target) both map to this.
- [inferred] With 2.6 TFLOPS on M1 versus a console-class GPU that ran AC4's full-screen fog in 1.1 ms, a small local froxel volume in WebGPU is plausible even on M1. It is still the last item to enable because its visual gain is smaller than items 1–6.

### Gaps
- I found no published WebGL2/WebGPU measurements of these specific techniques on M1 or M4 Pro; all timings above are from other platforms.
- Apple does not publish a TFLOPS figure for M4 Pro in the opened newsroom page, only relative claims, so no absolute comparison with M1 is sourced.
- Apple's TBDR page (as retrieved) does not state explicitly how blending interacts with hidden-surface removal; the overdraw statement above is an inference.
