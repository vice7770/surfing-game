# Sources

The pages below were opened, not just searched; the full notes tag every finding as measured, modelled or anecdotal. The notes are in [notes/](notes/), with long quotations shortened. As of Sep 28, 2026.

## Breaking and barrel physics

- [Pick & Feddersen 2026, J. Fluid Mech. 1040 A8](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf): overturn size, jet area, aspect and tilt against bed slope
- [Feddersen et al. 2023, J. Fluid Mech. 958 A4](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf): Surf Ranch lidar tube shapes and wind effects
- [O'Dea, Brodie & Elgar 2021, GRL](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf): field lidar of voids at closure
- [Mead & Black 2001, J. Coastal Res. SI 29](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf): vortex ratio against seabed gradient, intensity classes, Padang Padang and Pipeline
- [Derakhti et al. 2020, JGR Oceans](https://arxiv.org/pdf/1911.06896): onset at crest speed ratio 0.85
- [Bjørkavåg & Kalisch 2016, arXiv](https://arxiv.org/pdf/1601.06822): Table 8 quotes Grilli et al. 1997's solitary-wave breaking index on 1:35, H_b/h_b 1.38–1.40
- [Erinin et al. 2023, J. Fluid Mech. 967 A35](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35): plunging jet speeds and impact
- [Drazen, Melville & Lenain 2008, J. Fluid Mech. 611](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2008_Drazen_Melville_Lenain-Journal_of_Fluid_Mechanics_vol_611.pdf): the jet's toe in free fall
- [Chanson, Aoki & Maruyama 2002, Coastal Eng. 46](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf): jet impact, air entrainment, plume
- [Martins et al. 2018, JGR Oceans](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf): roller angles and lengths by LiDAR
- [Robertson et al. 2014, ICCE](https://pdfs.semanticscholar.org/5b55/f488369a29862dd720e5b2079159ecb940cb.pdf): a field test of vortex-ratio prediction

## Depth-averaged breaking

- [Papoutsellis et al. 2019](https://arxiv.org/pdf/1910.08982): eddy viscosity suppresses overturning
- [Kazolea & Ricchiuto 2018, Ocean Modelling 123](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf): hybrid breaking criteria and their instabilities
- [Bacigaluppi, Ricchiuto & Bonneton 2019](https://arxiv.org/pdf/1902.03021): onset criteria in the Madsen–Sørensen equations
- [Tissier et al. 2012, Coastal Eng. 67](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf): start and stop rules, bore regimes
- [FUNWAVE-TVD documentation](https://fengyanshi.github.io/build/html/wavebreaking.html): Kennedy constants and roller model

## Graphics, film and games

- [Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf): breaking fronts and sheets on shallow water
- [Mihalef, Metaxas & Sussman 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf): 2D breaker library swept into 3D tubes
- [Bredow et al. 2007, Making Waves for Surf's Up](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf) and the [SIGGRAPH course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf): profile-swept waves, crash curve, lip trains
- [Surf's Up beach break](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf): a baked foam life cycle
- [True Surf launch blog, Meta 2025](https://www.meta.com/blog/true-surf-launch/): 2D slice blending in a shipped surf game
- [Chentanez, Müller & Kim 2014](https://matthias-research.github.io/pages/publications/hybridsim_preprinted.pdf) and [Chentanez & Müller 2010](https://matthias-research.github.io/pages/publications/hfFluid.pdf): real-time 3D coupling and GPU spray
- [Vlachos 2010](https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf): flow-mapped textures
- [Barré-Brisebois 2011](https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/): fast translucency

## Foam and optics

- [Koepke 1984](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf): foam reflectance and how it fades
- [Dierssen 2019, Frontiers in Earth Science](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2019.00014/full): foam and bubble-water colour
- [Pope & Fry 1997 absorption data](https://omlc.org/spectra/water/data/pope97.txt): light through the lip
- [Porter et al., University of Hawaii lidar](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf): reef spray plume heights

## Profile library, along the crest, and the roller

- [Pick & Feddersen's code (surftank)](https://github.com/KelvinHamster/surftank) and [output package on Zenodo](https://zenodo.org/records/20725076): public potential-flow runs up to jet impact
- [Mostert & Deike's Basilisk setup](https://basilisk.fr/sandbox/wmostert/shallow.c) and [Feddersen et al.'s Surf Ranch setup](http://basilisk.fr/sandbox/ffeddersen/shoal_RE0_BO4000.c): templates for our own 2D runs
- [Feddersen et al. 2024, Surf Ranch simulation](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf): jet thickness and area, wind effects
- [Farley, Harris & Kilding 2012, via ScienceDaily](https://www.sciencedaily.com/releases/2012/07/120723094818.htm): GPS speeds of competitive surfers
- [Yeh et al. 2014, ICCE](https://icce-ojs-tamu.tdl.org/icce/article/view/7955): bore impact forces, used as a proxy for whitewater hits
- [Box2D on determinism](https://box2d.org/posts/2024/08/determinism/): keeping physics identical across machines
- Mead & Black 2001, chapter 6, read in full: [open PDF](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf)
- [Benoa tide gauge ranges, IOP Conf. Ser. 1350 (2024)](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016): Bali's tide

## Padang Padang

- [Padang Padang Lefts guide](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts) and [Mondo Surf](https://www.mondo.surf/surf-spot/padang-padang/guide/11668): surf-guide descriptions of the break

* [Mead 2000, PhD thesis, University of Waikato](https://hdl.handle.net/10289/13967): Padang Padang's reef components, survey method, vortex fits, and the reef-component gradient ranges
* [Allen Coral Atlas geomorphic map](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326): the reef edge's bearing and the channel
* [GMRT (GEBCO 2026)](https://www.gmrt.org/about/): offshore depths
* [ERA5 wave reanalysis via Open-Meteo](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2005-01-01&end_date=2024-12-31&timezone=Asia%2FSingapore): Bali swell climate, 2005–2024
* [Denpasar airport wind records (Iowa Environmental Mesonet)](https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=WADD&data=drct&data=sknt&year1=2015&month1=1&day1=1&year2=2025&month2=1&day2=1&tz=Asia%2FMakassar&format=onlycomma&latlon=no&elev=no&missing=M&trace=T&direct=no&report_type=3&report_type=4): dry-season wind

## Whitewater build and open edges

- [Larkin et al. 2009, Phys. Rev. E](https://arxiv.org/pdf/0911.1784): floating particles gather into lines on churning water; surface compressibility 0.49 ± 0.02
- [Neyret 2003, SCA](http://www-evasion.imag.fr/Publications/2003/Ney03/neyret161.pdf) and [Heitz & Neyret 2018](https://eheitzresearch.wordpress.com/722-2/): blending moving textures without ghosting or contrast loss
- [Callaghan et al. 2012, JGR](https://doi.org/10.1029/2012JC008147) and [2013, JPO](https://doi.org/10.1175/JPO-D-12-0148.1): bigger breaks' foam lasts longer
- [Svendsen 1984, ICCE](https://icce-ojs-tamu.tdl.org/icce/index.php/icce/article/download/3785/3468): the roller's area and how it develops
- [Misra et al. 2008, Phys. Fluids](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Misra-et-al-2008-POF-weak-hydraulic-jump.pdf): a weak jump that still breaks
- [Shi et al. 2023b, Int. J. Multiphase Flow](https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023b.pdf): air in breaking bores
- [Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf): the roller's surface roughness and its scales
- [ECMA-262, Number and Math](https://tc39.es/ecma262/multipage/numbers-and-dates.html): which functions engines may approximate
- [XBeach manual](https://xbeach.readthedocs.io/en/latest/xbeach_manual.html): zero-gradient side edges need a bed uniform along the shore
- [Lannes & Rigal 2024](https://arxiv.org/abs/2402.03859): boundary conditions for Boussinesq models over a varying bed (abstract read)
- [Shi et al., FUNWAVE-TVD report CACR-11-04 v2.1](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.1.pdf): fully nonlinear equations on total depth, velocity recovered by the tridiagonal solve, the 0.8 switch, Froude cap 5–10
- [DHI, MIKE 21 BW Scientific Documentation](https://manuals.mikepoweredbydhi.help/2017/Coast_and_Sea/MIKE21BW_Sci_Doc.pdf): the Madsen–Sørensen flux equations with roller breaking and a slot shoreline, with no switch
- [Delestre et al. 2012](https://arxiv.org/abs/1206.4986): the hydrostatic reconstruction's thin-layer error slows flow on steep steps
- [Tissier et al. 2013, Coastal Dynamics (GLOBEX)](https://hydralab.eu/uploads/TAdocuments/213_tissier_marion.pdf): individual surf-zone wave celerity; linear theory underestimates it; the bore model does best
- [Scarfe et al. 2009, J. Coastal Res. review](https://bioone.org/journals/journal-of-coastal-research/volume-2009/issue-253/07-0958.1/Research-Based-Surfing-Literature-for-Coastal-Management-and-the-Science/10.2112/07-0958.1.full): the peel angle defined as a geometric angle (Walker & Palmer 1971)
- Mead 2000, ch. 5 (Mead & Black 1999, Bingin): the ray-model experiments with and without platform, focus and rotated wedge

## Spray and mist

- [Erinin et al. 2023, Part 1](https://arxiv.org/pdf/2210.01925) and [Part 2](https://arxiv.org/pdf/2210.01923): plunging-breaker drops, their sizes, speeds and timing
- [Mostert, Popinet & Deike 2022](https://arxiv.org/pdf/2103.05851): drop production in simulated breaking waves
- [Veron 2015, Annual Review of Fluid Mechanics](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Veron-2015-spray-annurev.pdf): ocean spray
- [Troitskaya et al. 2017, Scientific Reports](https://www.nature.com/articles/s41598-017-01673-9): wind-torn spray (bag breakup)
- [Wüthrich, Shi & Chanson 2021, JFM](https://staff.civil.uq.edu.au/h.chanson/reprints/Wuthrich_Shi_Chanson_jfm_2021.pdf): drops thrown by a bore front
- [Bohren 1987](https://patarnott.com/atms749/pdf/BohrenMultipleScattOpus.pdf) and [Jendersie & d'Eon 2023](https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf): multiple scattering and fast Mie phase functions
- [Atmospheric Optics: the sea-water rainbow](https://atoptics.co.uk/blog/sea-water-rainbow/) and [IALA: meteorological optical range](https://www.iala.int/wiki/dictionary/index.php/Meteorological_Optical_Range)
- [Moana: Crashing Waves](https://media.disneyanimation.com/uploads/production/publication_asset/164/asset/Moana_Crashing_Waves.pdf), [Thomas, GDC 2014](https://media.gdcvault.com/GDC2014/Presentations/Gareth_Thomas_Compute-based_GPU_Particle.pdf), [GPU Gems 3, ch. 23](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles) and [McGuire's weighted blended transparency](https://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html): how films and games draw spray

## Underwater

- [Tyler 1960, Scripps Visibility Lab](https://misclab.umeoce.maine.edu/education/VisibilityLab/reports/SIO_60-9.pdf): how light is spread over directions underwater
- [Lynch 2014, Applied Optics](https://doi.org/10.1364/ao.54.0000b8): Snell's window on wavy water
- [Dera & Stramski 1986](http://www.iopan.gda.pl/oceanologia/OC_23/OC_23_15-42.pdf) and [Darecki et al. 2011, JGR](https://doi.org/10.1029/2011JC007338): light flashes near the surface
- [Deane & Stokes 2002, Nature](https://pdodds.w3.uvm.edu/files/papers/others/2002/deane2002.pdf): bubble creation in breaking waves
- [Watanabe et al. 2005, JFM](https://eprints.lib.hokudai.ac.jp/dspace/bitstream/2115/1425/1/JFM545.pdf): vortices and splash-up cycles under plunging breakers
- [Leifer et al. 2006](https://publications.tno.nl/publication/34610132/xa5thE/leifer-2006-bubbles2.pdf): bubble rise speeds by size
- [Aagaard et al. 2021, JMSE](https://doi.org/10.3390/jmse9111300): near-bed flow and sand suspension under breakers
- [Garcez Faria 1997](https://calhoun.nps.edu/server/api/core/bitstreams/7a30faa6-893a-4ede-af9a-5f711de8fe8c/content), [van der Zanden et al. 2018](https://ris.utwente.nl/ws/files/29784531/Zanden_et_al_2018_Journal_of_Geophysical_Research_Oceans.pdf) and [MacMahan et al. 2005](https://calhoun.nps.edu/server/api/core/bitstreams/b2de88ce-653b-4133-9d3e-bf1d78390d59/content): undertow and rip currents
- [Crest's underwater docs](https://crest.readthedocs.io/en/stable/user/underwater.html), [Unity HDRP underwater](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-underwater-view.html) and [Finding Nemo's water, AWN](https://www.awn.com/animationworld/finding-right-cg-water-and-fish-nemo): how games and film draw it

## Water colour

- [Bricaud, Ciotti & Gentili 2012, Global Biogeochemical Cycles](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2010GB003952), full text: the dissolved-and-detrital absorption rules (Table 1), fitted to SeaWiFS retrievals
- [Bricaud et al. 1998, JGR Oceans](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/98JC02712), abstract only: its particle absorption laws cover all particles, 25–30 % of it non-algal
- [Mobley, "A New IOP Model for Case 1 Water", Ocean Optics Web Book](https://www.oceanopticsbook.info/view/optical-constituents-of-the-ocean/level-2/new-iop-model-case-1-water): the Bricaud table as particle absorption, a = A·Chl^E
- [ocpy's copy of the Bricaud 1998 table](https://github.com/ocean-colour/ocpy/blob/main/ocpy/data/phytoplankton/aph_bricaud_1998.txt) (BSD-3, commit 18f8ee2): particle and phytoplankton-only columns, the layout POLYMER and NASA's l2gen read
- The ocean-optics model code that implements the published absorption shapes: [OSOAA](https://github.com/CNES/RadiativeTransferCode-OSOAA), [POLYMER](https://github.com/hygeos/polymer) and [IOPmodel](https://github.com/bishun945/IOPmodel)
- [NOAA-20 VIIRS ocean colour, 2023](https://noaa-jpss.s3.amazonaws.com/index.html#NOAA20/VIIRS/): chlorophyll and Kd490 off each spot
- [colour-science](https://github.com/colour-science/colour): the CIE 1931 observer and D65, for hue and sighting

## Basilisk runs (round 6)

- [Basilisk source and wiki mirror](https://github.com/comphy-lab/basilisk-C), synced 2026-09-28: the solver (GPL-3.0, from its `src/COPYING`), and both published setups, Mostert & Deike's `sandbox/wmostert/shallow.c` and Feddersen et al.'s `sandbox/ffeddersen/shoal_RE0_BO4000.c`. basilisk.fr itself is blocked in the cloud session.
- Pick & Feddersen's fits and domain, Mead & Black's roundness fit and the Surf Ranch open-curl lengths, as recorded in rounds 1–2; their PDFs could not be reopened from the cloud session.
- Padang Padang's bed: `PADANG` in `src/wave/Bathymetry.ts` on branch `claude/padang-padang` (f132989).
- [Grilli, Svendsen & Subramanya 1997, abstract](https://digitalcommons.uri.edu/oce_facpubs/207/): solitary waves don't break on plane slopes steeper than 12°
- [O'Dea, Brodie & Elgar 2021, GRL](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2021GL093664): field void shapes at closure (length over width 1.70–3.15), and Blenkinsopp & Chaplin's lab-reef 1.46–2.28

## Wave pools and surfing skill (the Wave Pool consult, 2026-10-01)

- [Scarfe et al. 2009, J. Coastal Res. 25(3), review; its figure adapted from Scarfe 2002](https://www.researchgate.net/figure/Range-of-peel-angles-suitable-for-different-surfing-maneuvers-adapted-from-Scarfe-2002_fig4_232294869): peel angles per manoeuvre. 46–55° lets intermediates do standard manoeuvres; 20–45° is for experts; 56–70° for beginners.
- [Hutt, Black & Mead 2001, J. Coastal Res. SI 29, 66–81](https://www.semanticscholar.org/paper/Classification-of-Surf-Breaks-in-Relation-to-Skillt-Huttf-Blackt/48c92e986ea02085bb4ccf0c77ea0877c2b4e3e3): peel angle and wave height against a 1–10 skill scale; 30–70° suits most surfers.
- [Wavegarden Cove, Raised Water Research](https://raisedwaterresearch.com/wavegarden-cove/):
  - one wave per side every 8 s;
  - Reef faces to 2.4 m, the Peak about half that with open faces for turns;
  - rides 10–15 s (Bay 80 m / 16 s).
- [Surf Ranch facts, Surfertoday](https://www.surfertoday.com/surfing/the-facts-and-figures-behind-kelly-slater-surf-ranch): a 700 m pool, rides about 45 s, and 3–4 minutes for the water to calm between waves.
- Surf-pool current control, US patents [10,449,433](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10449433) (wave energy and rip-current control) and [11,966,239](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11966239) (current control): pools manage set-up and return flow.
- Battjes 1974 (ICCE): the Iribarren breaker classes. Weggel 1972: the breaker index on slopes. Beji & Battjes 1993: free harmonics released by a regular train over a bar.

## The Reef's cavity against submergence (round 7, 2026-10-03)

- [Blenkinsopp 2007, PhD thesis, University of Southampton (ePrints Soton 466054)](https://eprints.soton.ac.uk/466054/): *Air entrainment, splash and energy dissipation in breaking waves*, the work behind Blenkinsopp & Chaplin's papers. On a 1:10 lab reef with a zero-width crest, the cavity under the jet at the plunge point: length over width 1.46–2.28 (mean 1.76) at every submergence; area 0.04–0.41 H_b², rising as h_c/H_b falls from 1.28 to 0.67 (chapter 4). Also the plume's void fractions, the splash and scale (chapters 5–7). Opened with the owner's OK; the PDF isn't kept in the repo. Notes: [notes/round7-blenkinsopp/blenkinsopp-thesis.md](notes/round7-blenkinsopp/blenkinsopp-thesis.md).
- [Blenkinsopp & Chaplin 2008, Coastal Eng. 55, 967–974, abstract](https://www.sciencedirect.com/science/article/abs/pii/S0378383908000604): the same reef, published; its full text still not opened.
