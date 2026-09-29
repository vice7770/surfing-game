# Barrel profile library: published 2D overturn data, tools to simulate our own, parametrisation and validation

Researcher notes, current as of 2026-09-28. Labels: **[measured]** = lab/field observation; **[modelled]** = numerical simulation; **[theory]** = analytical; anything under "Inferences" is my own reasoning from the cited facts. Dimensionless conventions used below follow the sources: h0 = offshore (toe) depth, H0 = initial solitary height, s = bed slope, t̃ = t·sqrt(g/h0), H_I = height at jet impact, A_O = overturn (tube) area, A_J = jet area, W_O/L_O = overturn width/length (aspect), θ_O = overturn angle from horizontal, L/W = void length/width (inverse aspect).

## Q1. Published profile data: which papers publish overturning free-surface sequences on slopes or reefs that we could download or digitise?

### Takeaway
No published source provides what the game needs: a downloadable set of full profile sequences from vertical face through jet impact, splash-up and roller, spanning 1:100 to reef ledges with periodic swell. The best material is Pick & Feddersen (2026), whose FNPF code (GPL-3.0) and Zenodo package are public but whose runs stop at jet impact and cover only 1:100–1:10 solitary waves. The public Basilisk setups of Mostert & Deike (2020) and Feddersen et al. (2024) are templates for running our own, not libraries. Measured data on overturn shape are mostly scalar metrics (area, aspect, angle) or single snapshots. The only open 3D measured dataset is the Duck lidar of O'Dea et al. (2021). The Teahupo'o lab data (Rodríguez-Burguette et al.) are wave-gauge time series, not profiles.

### Cited Findings

**Fully nonlinear potential flow (FNPF) on slopes. [modelled]**
- Pick & Feddersen (2026), "Scaling the shape of shoaling and overturning solitary waves", J. Fluid Mech. 1040, A8, doi:10.1017/jfm.2026.11869. Open access under CC-BY 4.0. — [JFM article page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/scaling-the-shape-of-shoaling-and-overturning-solitary-waves/D43EDB6346C8975E77258A291CFCB4EF)
- 30 runs: s = 1/100, 1/50, 1/30, 1/20, 1/15, 1/10 × H0/h0 = 0.2, 0.3, 0.4, 0.5, 0.6. The model is the 2D MATLAB FNPF/BEM "surftank" (Hanson 2023), based on Grilli & Subramanya (1996). — [Pick & Feddersen 2026 PDF, §2](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- The domain is "inspired by fringing coral reef systems": a deep flat of depth h0, a planar slope s, then a shallow flat at hs/h0 = 0.05 and 10 h0 long, so that "an overturning wave will always impact on water". The initial condition is the essentially exact solitary wave of Dutykh & Clamond (2014). — [Pick & Feddersen 2026 PDF, §2.2](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Resolution: Δx/h0 = 0.064, coarsened to 0.102 on the 1/50 and 1/100 slopes. This is about 252 nodes per solitary-wave width; Varing et al. (2021) found convergence at 170. The Courant number is 0.25, reduced to 0.175 for gentle slopes. Output is every t̃ = 0.31, then every 0.031 once the wave height exceeds the local depth. — [Pick & Feddersen 2026 PDF, §2.3–2.4](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- **The runs end at jet impact.** Because the FNPF model cannot continue once the jet touches the surface below, "the output time just prior to impact defines the time of the …". There is no splash-up and no roller. — [Pick & Feddersen 2026 PDF, §3.2](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Figures with digitisable profiles:
  - Fig. 2: two full time sequences, six curves each, from shoaling to the last step before impact. Case (a) is s = 1/30, H0/h0 = 0.6, where the jet lands on the front face over the slope. Case (b) is s = 1/10, H0/h0 = 0.2, where a thick jet lands at still-water level over the shallow "reef flat".
  - Fig. 3: s = 1/15, H0/h0 = 0.6 at three times: toe, vertical face, impact.
  - Fig. 5: the moment of impact for four waves (s = 1/15 and 1/30 × H0/h0 = 0.2 and 0.6).
  - Figs. 6 and 10: single snapshots.
  - Source: [Pick & Feddersen 2026 PDF, figure captions](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- The paper's data statement says the FNPF run code is at github.com/KelvinHamster/surftank and the MATLAB analysis code is at doi:10.5281/zenodo.17716653. (A fetch of the JFM landing page did not show this statement; the PDF does.) — [Pick & Feddersen 2026 PDF, data availability](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Zenodo v2 of that package was published 2026-06-17 under CC-BY 4.0. Contents:
  - mat.zip, 89.3 MB: "example model output files"
  - src.zip: the FNPF MATLAB model code
  - run_functions.zip, tests.zip and run_surftank_kp.m
  - The latest version adds the Dutykh & Clamond (2014) solitary wave.
  - Source: [Zenodo record 20725076](https://zenodo.org/records/20725076)
- The surftank repository is MATLAB, licensed GPL-3.0, and uses a BEM with a Lagrangian surface mesh. "The domain must be simply connected with no self-intersections", which is why runs stop at impact. The README does not cover run times, Octave compatibility or supported initial conditions. — [GitHub KelvinHamster/surftank](https://github.com/KelvinHamster/surftank)
- A second, simpler BEM from the same group was used in Feddersen et al. (2023, §5.3). — [Feddersen et al. 2023 PDF, data statement](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf) (code at github.com/KelvinHamster/simple_domain_irrotational_model)
- Grilli, Svendsen & Subramanya (1997), J. Waterway Port Coastal Ocean Eng. 123(3):102–112. They computed solitary-wave shoaling and breaking on slopes from 1:100 to 1:8 with an FNPF model validated against experiments. "No wave breaks for slopes steeper than 12°." Their slope parameter S0 predicts spilling, plunging or surging. — [URI Digital Commons abstract](https://digitalcommons.uri.edu/oce_facpubs/207/); full text paywalled at [ASCE](https://ascelibrary.org/doi/10.1061/(ASCE)0733-950X(1997)123:3(102))
- Yasuda et al. (1997) ran FNPF solitons incident on a *step reef* (no slope): "the wave overturn area increased for shallower reefs (larger steps)". — as summarised in [Pick & Feddersen 2026 PDF, §1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf); original: [Coastal Eng. 29, ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0378383996000324)

**Two-phase Navier–Stokes (DNS) on slopes. [modelled]**
- Feddersen, Hanson, Mostert & Fincham (2024), "Modelling wind-induced changes to overturning wave shape", J. Fluid Mech. 1000, doi:10.1017/jfm.2024.1012. — [Falk Feddersen paper index](https://falk.ucsd.edu/papers.html)
- Setup:
  - Basilisk in 2D on a 60 h0 square domain.
  - Surf Ranch analogue slope β = 0.0693 from depth h0 up to a flat at hs/h0 = 0.371.
  - a0/h0 = 0.6; Re_w = 4×10⁴, which implies a lab scale of h0 = 0.055 m.
  - Bo = 4000; at field scale Surf Ranch has Bo = 3.6×10⁵ and Re_w = 1.4×10⁷.
  - Density ratio 0.001, viscosity ratio 0.018.
  - 14 levels of refinement give Δx/h0 = 3.7×10⁻³ (0.2 mm).
  - Source: [Feddersen et al. 2024 revised PDF, §2.1](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- They "are only interested in the model solutions up until the point that …". The jet, with a cross-jet width of about 0.05 h0, "is well resolved". Output is every Δt̃ = 0.05, then 0.01 for t̃ ≥ 18. They ran 8 wind cases, Re* from −1800 to 2400. — [Feddersen et al. 2024 revised PDF, §2.1.5–3.3](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- The data statement says the Basilisk code is at basilisk.fr/sandbox/ffeddersen/ and the MATLAB analysis is at Zenodo 13351600. — [Feddersen et al. 2024 revised PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- The sandbox holds shoal_RE0_BO4000.c:
  - A0 = 0.6 with the bathymetry string "y+max(0.37109375,1-max(0,0.0693*(x-30)))".
  - LEVEL_WIND 11, then LEVEL_SHOAL 14.
  - A Green–Naghdi soliton initial condition.
  - TMAX = 1030, with dumps every 0.01 from t = 1019 to 1024.
  - No run time or hardware is stated.
  - Source: [Basilisk sandbox ffeddersen](http://basilisk.fr/sandbox/ffeddersen/), [shoal_RE0_BO4000.c](http://basilisk.fr/sandbox/ffeddersen/shoal_RE0_BO4000.c)
- The Zenodo 13351600 record (2024-08-20, CC-BY 4.0) contains MATLAB scripts only, with no model output. — [Zenodo 13351600](https://zenodo.org/doi/10.5281/zenodo.13351600)
- Mostert & Deike (2020), "Inertial energy dissipation in shallow-water breaking waves", J. Fluid Mech. 890, A12, doi:10.1017/jfm.2020.83. They ran 2D Basilisk solitary waves breaking on slopes of 2°–7° (about 1:29 to 1:8), amplitudes 0.15–0.5, at Δx = L0/2¹³ to L0/2¹⁴. — [JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/inertial-energy-dissipation-in-shallowwater-breaking-waves/8B818C95BBB1C8BF2723DB611AFB9DCD)
- Their setup is public as sandbox/wmostert/shallow.c:
  - 3° slope, a0/h0 = 0.3, Re 40 000, Bo 1000, density ratio 1/850.
  - LEVEL 14 in a domain 40 units wide.
  - Green–Naghdi soliton initial condition.
  - MAXTIME 70, so it runs through breaking.
  - Interface files "results%4.2f_%d.dat" every 0.05 time units.
  - No run time or MPI settings are stated.
  - Source: [Basilisk sandbox/wmostert/shallow.c](https://basilisk.fr/sandbox/wmostert/shallow.c)
- Previous Basilisk studies (Mostert & Deike 2020; Boswell et al. 2023) found grid convergence both before and after breaking at Δx/h0 = 6×10⁻³. — [Feddersen et al. 2024 revised PDF, §2.1.5](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**Periodic and deep-water overturning computations. [modelled]**
- Longuet-Higgins & Cokelet (1976), Proc. R. Soc. Lond. A 350:1–26. This was the first time-stepping method for space-periodic steep irrotational waves using marked surface particles. It is deep water, flat, with no bed. — [Royal Society page](https://royalsocietypublishing.org/doi/10.1098/rspa.1976.0092). I saw only the abstract via search; the full-text mirror returned 403.
- New, McIver & Peregrine (1985), J. Fluid Mech. 150. They extended Longuet-Higgins & Cokelet (1976) to a horizontal bottom, giving periodic waves in finite constant depth. Their results range "from the projection of a small-scale jet at the wave crest (of …", with "a remarkable similarity" in the overturning regions. — [Cambridge PDF link (search result)](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/1C114232AF35590F75E52775F7B41044/S0022112085000118a.pdf/computations-of-overturning-waves.pdf). Abstract via search only; the ifremer mirror returned 403.
- Chen, Kharif, Zaleski & Li (arXiv 1996; Phys. Fluids 1999) ran 2D two-phase VOF Navier–Stokes on a periodic plunging breaker. It shows "an initial steep wave undergoes breaking and successive splash-up cycles". — [arXiv comp-gas/9605002](https://arxiv.org/abs/comp-gas/9605002)
- Deike, Popinet & Melville (2015), J. Fluid Mech. 769:541–569, used 2D Gerris periodic waves at h/λ = 1/2 and Re = 4×10⁴, with steepness ak as the control. LMAX = 9 (512 cells per wavelength) was converged; LMAX = 10 showed no significant change. — [Deike et al. 2015 PDF, §2](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2015_Deike_Melville_Popinet-Journal_of_Fluid_Mechanics_vol_769.pdf)
- Basilisk's sandbox/popinet/wave.c is a 2D/3D two-phase breaking Stokes wave: ak = 0.55, Bo = 1000, Re = 40 000, LEVEL 9 in 2D, periodic box. No run times are stated. — [basilisk.fr/sandbox/popinet/wave.c](https://basilisk.fr/sandbox/popinet/wave.c)
- Mihalef, Metaxas & Sussman (2004) is the graphics precedent for the owner's approach.
  - Library ingredients: 2D level-set/VOF Navier–Stokes runs from initial conditions "derived from linear wave theory". The varied parameters were amplitude A, depth d and a "kinematic parameter ω" (2–4: low = spilling, high = plunging). The domain was periodic in x at 128×128.
  - Timing: "a run similar to the 'standard' one takes 3-4 minutes for a …". 3D frames took 10–12 min/frame at 128×128×64 on a "Pentium 3, 2.6 GHz machine with 2 Gb" (2004 hardware).
  - Source: [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- A UNSW dataset (Boettger, Keating, Banner, Morison, Barthelemy; 2024) holds 2D Gerris two-phase numerical wave tank runs of breaking and non-breaking wave packets. It is deep-water scaled to a 1 m wavelength, with 6 experiments, **licensed CC BY-NC-ND 4.0**. — [Zenodo 12797829](https://zenodo.org/records/12797829)

**Laboratory. [measured]**
- Erinin, Liu, Wang & Duncan (2023), "Plunging breakers. Part 1", J. Fluid Mech. 967, A35, CC-BY.
  - Waves: three dispersively focused plunging breakers, each repeated 10 times. λ0 ≈ 1.18 m, T0 = 0.87 s, depth 0.91 m (deep water).
  - Measurement: cinematic LIF at 650 Hz and about 180 µm/px, over a 1.30 × 0.30 m field of view for 3.08 s.
  - Data: the published data are only "water surface height vs time" at x = 4 m (supplementary). The profile ensemble is not deposited.
  - Source: [JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35); preprint [arXiv 2210.01925](https://arxiv.org/abs/2210.01925)
- Blenkinsopp & Chaplin (2008), Coastal Eng. 55(12):967–974. They ran a flume reef with a 1:10 offshore gradient. "The relative water depth over the reef crest (hc/Ho) is a dominant factor"; breaking intensity rises as submergence falls, quantified by the air cavity under the jet. — [ScienceDirect abstract (via search)](https://www.sciencedirect.com/science/article/abs/pii/S0378383908000604)
- Their reef was a fixed 1:10 wedge "with variable crest submergence hc, which immediately fell off to deeper water …". That makes it a submerged-breakwater geometry, unlike a crest that leads onto a reef flat. The waves were periodic, "with varying heights and frequencies". — [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Their cavity metrics, from later restatements:
  - A_O/H_I² of 0.05–0.35, increasing with H0/hc over 0.625–1.25. The waves were periodic. — [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
  - W_O/L_O of 0.43–0.67. — [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
  - L/W of 1.46–2.28. — [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Rodríguez-Burguette, Rendón Valdez, Appendini & Torres-Freyermuth, Teahupo'o reef dataset. v1.2 was published 2024-05-29 under CC-BY 4.0, about 80 MB.
  - Model: 1:60 scale, forereef 1/2.26, lagoon 1/9.64.
  - Instruments: resistive wave gauges at 50 Hz, a 2 m runup sensor, and an electromagnetic current meter at 16 Hz near the breakpoint.
  - Also included: bathymetry, test sheets and ERA-5 data. Tests used regular, irregular and solitary waves.
  - **There are no free-surface profile images.**
  - Source: [Zenodo 11392175](https://zenodo.org/records/11392175) (an earlier version is [Zenodo 10826397](https://zenodo.org/records/10826397))
- The companion paper, "Extreme wave transformation and runup on a beach fronted by a very …" (Applied Ocean Research, 2025), gives the forereef as 1/2.29. SWASH reproduces wave heights and runup for return periods under 100 years, but has an "inability to simulate plunging breakers". — [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0141118725002354). The page returned 403; this content comes from the search snippet. Note the 1/2.26 vs 1/2.29 discrepancy between dataset and paper.

**Field. [measured]**
- O'Dea, Brodie & Elgar (2021), GRL 48, e2021GL093664, CC-BY.
  - Setup: a Velodyne HDL-32E lidar on the CRAB vehicle at Duck (FRF), 10 Hz, accuracy up to 0.02 m. Eight 30-min collections on 3 days in September and October 2017.
  - Results: internal void shapes were fitted for 30 plunging waves; the fit failed at closure for 3 of them.
  - Data: "The environmental and lidar data can be downloaded from chlthredds.erdc.dren.mil/thredds/catalog/frf/projects/WaveShape/lidarWaveScans/catalog.html".
  - Source: [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf), [Wiley](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2021GL093664)
- Feddersen et al. (2023), J. Fluid Mech. 958, A4, at Surf Ranch.
  - Waves: about 2.25 m solitons at C = 6.7 m/s.
  - Instruments: a Velodyne HDL-32 lidar on a pole 4.05 m above still water, 10 Hz, ±0.02 m, plus a UAV and a wave staff.
  - Results: 22 waves analysed for break-point location, A and W/L.
  - Data: "currently being prepared for archive at the UCSD Library Digital Collections".
  - Source: [Feddersen et al. 2023 PDF](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf); [JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/crossshore-windinduced-changes-to-fieldscale-overturning-wave-shape/4236FD21F9A9EA5AFCF6ED8966B93596)
- Lipari (2025) posted 390 PNG frames at 25 fps (1240×670) of a plunging breaker on a steep beach at Fuerteventura, from a 2013 video, under CC BY-SA 4.0. There is no scale or calibration ("the precise geolocation of the images is unknown"). — [Zenodo 8070591](https://zenodo.org/records/8070591)

### Inferences
- Only Pick & Feddersen's package can be *downloaded* rather than digitised. Even that is pre-impact only, and whether mat.zip holds all 30 runs or only "example" runs is unknown. Everything else would have to be digitised from figures:
  - Pick Figs. 2, 3 and 5 give about 20 curves in total.
  - Grilli 1997, New et al. 1985 and Longuet-Higgins & Cokelet 1976 give a handful of curves each.
  - That is far too sparse in time for a smooth slice clock (tens to hundreds of frames per breaker).
- Post-impact sequences (splash-up, roller) exist only in deep-water periodic DNS papers (Chen 1999; Deike 2015/2016) as figure snapshots. None of them are on slopes or reefs. The one NC-ND dataset (UNSW) forbids derivatives, so it cannot feed a game library.
- Nothing published covers the Reef's 1:2.3 forereef with a submerged crest as overturn *shapes*. The Teahupo'o lab model gives only gauge time series, and its authors' own wave model cannot plunge. For that spot the choice is between our own simulations and no physics source.
- Pick, Erinin and O'Dea are CC-BY, so figure-derived curves can be reused with attribution. The legal status of digitised data from paywalled figures (Grilli 1997) is less clear. This is not legal advice.

### Gaps
- mat.zip (89.3 MB) was not downloaded, because downloads need the owner's approval. So it is unconfirmed which of the 30 cases it holds and whether they are full node time series.
- The Surf Ranch data archive (UCSD Library Digital Collections) could not be located. Its 2026 status is unknown.
- New, McIver & Peregrine (1985) and Longuet-Higgins & Cokelet (1976): the full texts returned 403 from the mirror. Figure content was not checked.
- I did not open the full text of Blenkinsopp & Chaplin (2008), Grilli et al. (1997) or Yasuda et al. (1997). They are paywalled; only abstracts and restatements were seen.
- Leads not opened: Zenodo 15491681 (breaker-type flume videos) and Carini et al. (2021, JGR Oceans, lidar and infrared fusion at breaking onset).

## Q2. Tools to run our own: licence, macOS setup, resolution, cost, physics captured, contour extraction

### Takeaway
Basilisk (reportedly GPL; C; runs natively on Apple silicon) is the strongest fit. It is the solver behind every recent published 2D breaking-on-slope DNS. Public templates exist (Mostert's shallow.c, Feddersen's shoal file). It captures overturn, jet impact, splash-up and the air cavity, and writes interface files directly.

Its limits on the M4 Pro:
- CPU only: the GPU backend excludes Apple graphics, needs OpenGL ≥ 4.3 and does not yet support surface tension.
- Apple clang has no OpenMP.
- No published wall-clock time exists for a 2D breaker, so a benchmark is needed.

surftank (MATLAB) is the cheap pre-impact complement. OpenFOAM interFoam runs natively via OpenFOAM.app but has documented wave-propagation errors. DualSPHysics has no macOS support and lacks the air phase by default. REEF3D is possible but less proven for this use. No WebGPU two-phase solver was found.

### Cited Findings

**Basilisk.**
- Licence: a web-search summary described Basilisk as "an in-house, GPL-licensed code developed by Popinet". **Unverified:** I did not open a basilisk.fr page that states the licence, and a final fetch of basilisk.fr failed on a session limit. See Gaps. The solver itself is two-phase incompressible Navier–Stokes with surface tension and momentum-conserving VOF. — [basilisk.fr/src/two-phase.h](https://basilisk.fr/src/two-phase.h) (search listing)
- Install: C99 compiler, darcs clone or tarball, `make`. "There is a specific installation guide contributed by Mac OSX users." — [Basilisk INSTALL](http://basilisk.fr/src/INSTALL)
- The macOS guide uses Xcode clang, is "tested on Apple M1, M2, and older Apple machines with Intel processors", and says "Macs do not support OpenMP", so `-fopenmp` must be removed from Makefiles. It notes gnuplot build issues and refers to Ventura 13.2 and Big Sur. — [Basilisk sandbox/INSTALL_MACOS](http://basilisk.fr/sandbox/INSTALL_MACOS)
- GPU backend:
  - "Only 2D and 3D Cartesian and Multigrid grids for now: quadtrees and …"
  - It needs GLFW and "OpenGL (version >= 4.3)".
  - OpenGL is "widely supported … (with the notable exception of Apple graphics cards …)".
  - "surface tension will not work yet".
  - Source: [basilisk.fr/src/grid/gpu/grid.h](http://basilisk.fr/src/grid/gpu/grid.h)
- Apple's archived support page lists OpenGL 4.1 as the highest version on the Macs it covers (Intel/AMD models through 2019; it does not mention Apple silicon). Basilisk's own statement that Apple graphics are an exception is the decisive source. — [Apple support 101525](https://support.apple.com/en-us/101525)
- GPU benchmarks list Intel i7, Intel UHD, RTX 3050 Ti, RTX 6000 and RTX 4090, with no Apple results. — [Basilisk GPU Benchmarks](https://basilisk.fr/src/grid/gpu/Benchmarks.md)
- The only Basilisk timing found is for src/examples/breaking.c, a *multilayer* (non-overturning) 3D breaking Stokes wave (ak 0.33, 256², 30 layers). It took 44 min on 64 cores (Occigen, 4,159 steps) and 13 min on a GPU the page lists as "RTX490", presumably an RTX 4090. The year is not stated. **This is not a two-phase overturning run and is not comparable.** — [basilisk.fr/src/examples/breaking.c](http://basilisk.fr/src/examples/breaking.c)
- Resolution used in published 2D slope DNS:
  - Level 14 over 60 h0 gives Δx/h0 = 3.7×10⁻³, with a 0.05 h0 jet "well resolved". — [Feddersen et al. 2024 PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
  - Converged at 6×10⁻³. — [same](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
  - Mostert & Deike used L0/2¹³ to L0/2¹⁴ with a 40-wide domain. — [JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/inertial-energy-dissipation-in-shallowwater-breaking-waves/8B818C95BBB1C8BF2723DB611AFB9DCD), [shallow.c](https://basilisk.fr/sandbox/wmostert/shallow.c)
  - Deep-water periodic: 512 cells per wavelength converged. — [Deike et al. 2015 PDF](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2015_Deike_Melville_Popinet-Journal_of_Fluid_Mechanics_vol_769.pdf)
- Contour output: shallow.c writes interface files every 0.05 time units. The Feddersen run writes the interface η and interface velocities "at the AMR resolution", every 0.05 then 0.01. — [shallow.c](https://basilisk.fr/sandbox/wmostert/shallow.c); [Feddersen et al. 2024 PDF, §2.1.6](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- 3D DNS (Mostert, Popinet & Deike 2022, J. Fluid Mech., doi:10.1017/jfm.2022.330) shows the post-impact transition "from laminar to three-dimensional turbulent flow" and droplets moving at up to "four times the phase speed". — [arXiv 2103.05851](https://arxiv.org/abs/2103.05851). Feddersen et al. (2024) say new questions "will necessitate 3D simulations at far greater computational cost". — [PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**Gerris.** It is the quadtree/octree adaptive predecessor, used by Deike et al. (2015) and by the UNSW 2024 dataset. — [Deike et al. 2015 PDF](https://airsea.ucsd.edu/wp-content/uploads/sites/10/2019/06/2015_Deike_Melville_Popinet-Journal_of_Fluid_Mechanics_vol_769.pdf); [Zenodo 12797829](https://zenodo.org/records/12797829)

**FNPF BEM (surftank).**
- MATLAB, GPL-3.0; the surface must not self-intersect. — [GitHub](https://github.com/KelvinHamster/surftank)
- Stops at jet impact; runs Δx/h0 = 0.064 at Co = 0.25 and outputs free-surface and boundary node positions plus kinetic energy, potential energy and volume. — [Pick & Feddersen 2026 PDF, §2.3–2.4](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Periodic FNPF numerical wave tanks can run past breaking only by damping the overturn. Grilli, Horrillo & Guignard (2020) apply "an absorbing surface pressure … over the crest of impending breaking waves". — [Water Waves 2020](https://link.springer.com/article/10.1007/s42286-019-00017-6) (search abstract)

**OpenFOAM (interFoam).**
- Native macOS app (gerlero/openfoam-app): GPL-3.0, Apple silicon builds, macOS 14 Sonoma or later. Covers ESI versions v2206–v2606 and installs with `brew install gerlero/openfoam/openfoam`. — [GitHub gerlero/openfoam-app](https://github.com/gerlero/openfoam-app)
- The Foundation's v12 runs on macOS through Multipass Ubuntu with arm64 packages. — [openfoam.org macOS](https://openfoam.org/download/12-macos/) (search snippet)
- Larsen, Fuhrman & Roenby (2019), Coastal Eng. J. 61(3):380–400: over time "surface elevations … increase, wiggles … appear in the free surface, and …". Mitigation needs a small Courant number and fine grids. — [arXiv 1804.01158](https://arxiv.org/abs/1804.01158) (search abstract)

**DualSPHysics.**
- LGPL-2.1, C++/CUDA/OpenMP, for Linux and Windows; macOS is not listed. — [GitHub DualSPHysics](https://github.com/DualSPHysics/DualSPHysics)
- The project "is not planning to release makefiles and libraries for Mac OS"; the CPU version can be compiled in a Linux VM. — [DualSPHysics forum (search snippet)](https://forums.dual.sphysics.org/discussion/216/installation-on-mac-os-x)
- A multiphase variant exists in a separate folder (src_mphase). — [GitHub](https://github.com/DualSPHysics/DualSPHysics)

**REEF3D.** GPL-3.0-or-later. Modules are CFD, NHFLOW, FNPF and SFLOW, parallelised with MPI; the repository ships a Dockerfile and Makefile. — [GitHub REEF3D](https://github.com/REEF3D/REEF3D)

**FluidX3D (GPU lattice Boltzmann).**
- Licence: "Free for non-commercial use".
- Physics: free-surface LBM with VOF and PLIC; 2D (D2Q9) supported.
- Platform: "limited support also for macOS" via OpenCL.
- Apple benchmarks: M1 Max 4,496 MLUPs/s, M2 Max 4,641, M3 Ultra 8,174. No M4 figures.
- Source: [GitHub FluidX3D](https://github.com/ProjectPhysX/FluidX3D)

### Inferences
**Comparison for this job** (my synthesis; "captures" refers to the physics):

| Tool | Licence | M4 Pro setup | Jet / impact / splash / cavity | Contours | Fit |
|---|---|---|---|---|---|
| Basilisk 2D two-phase | GPL (unverified) | native clang; CPU only (no OpenMP; MPI untested on Mac); GPU backend unusable on Apple | yes / yes / yes (2D) / yes (incompressible air) | interface files per step (published) | **best**: public slope templates, published validation |
| surftank FNPF BEM | GPL-3.0 (needs MATLAB) | MATLAB on macOS; Octave unverified | yes / stops at impact / no / no | node positions (published) | pre-impact sweeps and cross-check |
| OpenFOAM interFoam | GPL | native app or Multipass | yes, with documented interface smearing and crest errors | alpha = 0.5 isosurface (standard practice; not sourced) | fallback |
| REEF3D::CFD | GPL-3.0+ | build from source or Docker (unverified on Mac) | two-phase level set (unverified for plunging here) | level-set zero contour | untested |
| DualSPHysics | LGPL-2.1 | not supported on Mac (VM only, CPU only) | overturn and splash yes; no air by default | particle post-processing | poor fit |
| FluidX3D FSLBM | non-commercial | OpenCL on Mac ("limited") | single-phase free surface; no air cavity pressure | would need custom export | licence blocks a commercial game |

- **Cells per wave height** needed for a resolved jet (inference from the numbers above):
  - Feddersen (2024): about 160 cells per initial amplitude (0.6/3.7e-3) and about 13 cells across the jet.
  - Mostert: about 120 cells per amplitude at level 14, about 60 at level 13.
  - Deike (2015): 512 cells/λ, about 60–90 cells per wave height for ak ≈ 0.35–0.55.
  - Rule of thumb: ≥ 50–100 cells per wave height and ≥ 10 across the jet, meaning level 13–14 on a 40–60 h0 domain.
  - Mihalef's 128×64 runs are far below this. They are fast (minutes in 2004) but cannot resolve a thin spilling jet.
- **Run time on the M4 Pro (unsourced order-of-magnitude guess; must be benchmarked):**
  - Adaptive 2D level-14 runs likely hold ~10⁵–10⁶ leaf cells in the interface band.
  - Pre-impact through roller (t̃ ≈ 25–70) is ~10⁴–10⁵ time steps.
  - At an assumed 10⁵–10⁶ cell-updates/s per core, that is about 2–70 core-hours per breaker.
  - So a single run takes hours on one core, and a library sweep is days to a few weeks of unattended compute.
  - Because the library is embarrassingly parallel, run one case per core; per-case parallelism (MPI) is not needed.
- **Physical scaling:** All the pre-impact tools are inviscid or nearly so at the macro scale, so shapes scale by Froude: x = x̃·h0, t = t̃·sqrt(h0/g).
  - The lab-scale DNS (Re 4×10⁴, Bo 10³–4×10³ against field 10⁷ and 10⁵) can differ in fine post-impact detail: droplets, bubble breakup, the length of the splash-up cascade.
  - The 2D constraint also removes 3D roller breakdown. Treat the 2D roller as physically based but approximate.
- A two-tool pipeline is sensible:
  - Basilisk for the full sequence.
  - surftank, or Pick's published fits, as an independent pre-impact check. It exercises a different numerical method on the same physics.

### Gaps
- No primary source gives the wall-clock time of a 2D two-phase plunging breaker at level 12–14, in Basilisk or any other tool. A benchmark on the M4 Pro is needed. Installing Basilisk means downloading source from basilisk.fr, which needs the owner's approval.
- MPI on macOS for Basilisk was not verified; the macOS guide only shows how to disable it.
- Whether surftank runs in GNU Octave, and its run time per case, are unknown.
- DualSPHysics isosurface tools on Apple silicon, and REEF3D's macOS build and plunging-breaker validation, were not verified.
- I found no mature open-source WebGPU (or Metal) two-phase solver that captures overturning.
- The Basilisk licence (GPL) is stated here only from a search-result summary. The basilisk.fr home page could not be fetched: the session hit its web-fetch limit. Check the licence at basilisk.fr before relying on it.

## Q3. How to parametrise the library: collapsing inputs, run counts, solitary → periodic

### Takeaway
On beaches, overturn shape at impact collapses on ψ0 = s/(H0/h0)^(1/4) for spilling-to-plunging solitary waves with s ≤ ~1/15 (ψ0 < 0.1). Padang Padang at 1:18–1:20 sits inside that range. The Reef's 1:2.3 ledge is 5–6× outside it, and there the controlling input is the relative crest submergence hc/H, not slope. The absolute wave height (1–6 m) does not need its own axis under Froude scaling; H0/h0 and slope (or submergence) do.

Periodic waves may reverse at least one trend seen in solitary waves (overturn area vs nonlinearity), so a periodic subset is needed. About 60–120 two-phase runs (plus cheap FNPF runs) would span the game. That count is an inference, not a published figure.

### Cited Findings
- ψ0 = s/(H0/h0)^(1/4) collapses:
  - breaker depth index γb = 0.871·e^(11.874 ψ0) (r² = 0.990);
  - overturn area A_O/H_I² = 5.319 ψ0 − 0.043;
  - jet area A_J/H_I² = 37.072 ψ0² − 0.587 ψ0 + 0.020;
  - aspect W_O/L_O = 1.661 ψ0 + 0.298;
  - angle θ_O = −5746.4 ψ0² + 225.2 ψ0 + 48.4 (r² = 0.982, RMSE 1.2°).
  - Ranges: A_O/H_I² 0.04–0.43, A_J/H_I² 0.012–0.266, W_O/L_O 0.30–0.44, θ_O 52.7°→22.4°.
  - Source: [Pick & Feddersen 2026 PDF, §3.6–3.7](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- The overturn fits use only cases where the jet lands on the slope, "cases with S0 < 0.2 and ψ0 < 0.1". The γb fit applies to spilling and plunging, not to surging (S0 > 0.3). Grilli's parameter S0 = 1.521 s/(H0/h0)^(1/2) gives γb = 0.841·e^(6.421 S0). — [Pick & Feddersen 2026 PDF, §3.6–3.7](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Steepening rate before breaking scales with ψ1 = s/(H0/h0)^(3/2): ∂t̃|min ∂η/∂x| = 2.476 ψ1² + 0.684 ψ1 + 0.047 (r² = 0.986). This links shoaling rate to overturn size and could anchor the timing of the slice clock. — [Pick & Feddersen 2026 PDF, §3.8](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- In an example, the time from a face slope of 0.5 to a vertical face was t̃ 23.0 → 23.9 (s = 1/15, H0/h0 = 0.2). — [same, §3.8](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- On continuous slopes, "no wave breaks for slopes steeper than 12°" (solitary waves); S0 classifies breaker type. — [Grilli et al. 1997 abstract](https://digitalcommons.uri.edu/oce_facpubs/207/)
- For periodic waves on planar beaches (Battjes 1974), with ξ0 = tanβ/sqrt(H0/L0): spilling ξ0 < 0.5, plunging 0.5–3.3, surging > 3.3. — [Battjes 1974, ICCE (search result)](https://icce-ojs-tamu.tdl.org/icce/article/view/2921); thresholds as restated in the [Coastal Wiki summary (search snippet)](https://www.coastalwiki.org/wiki/Surf_similarity_parameter)
- Reefs:
  - "The relative water depth over the reef crest (hc/Ho) is a dominant factor"; breaking intensity rises as submergence falls. — [Blenkinsopp & Chaplin 2008 abstract (search)](https://www.sciencedirect.com/science/article/abs/pii/S0378383908000604)
  - For solitons on a step reef, overturn area grows for shallower reefs. — [Pick & Feddersen 2026 PDF, §1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Solitary vs periodic:
  - Blenkinsopp & Chaplin's periodic waves had A_O/H_I² *increasing* with H0/hc. Pick's solitary results have it proportional to (H0/h0)^(−1/4), which *decreases*. "This difference may be due to the nature of periodic versus solitary wave overturning."
  - "Future work should examine the differences … Solitary waves have no preceding …"
  - Source: [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Wind:
  - Non-dimensional overturn area and aspect ratio fall with onshore wind (Uw/C from −1.2 to 0.7). — [Feddersen et al. 2023 PDF](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
  - DNS reproduces wind-dependent overturn shape, with the wind Reynolds number Re* as the control. — [Feddersen et al. 2024 PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- Void shape measured in the field depends on the local slope along the wave ray:
  - Normalised void area grows with steeper local bottom slope and shallower breaking depth; the void is rounder on steeper slopes. — [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
  - At surf breaks, the "orthogonal seabed gradient" (along the wave's travel) predicted vortex ratio as Y = 0.065X + 0.821. — [Mead & Black 2001 (search abstract)](https://www.researchgate.net/publication/228605528_Predicting_the_breaking_intensity_of_surfing_waves)
  - This is contested: vortex ratio and angle "cannot be accurately predicted using standard breaking wave characteristics". — [Robertson et al. 2014, ICCE](https://icce-ojs-tamu.tdl.org/icce/article/view/7290)
- Mihalef's library varied (A, d, ω) with linear-theory initial conditions and a periodic box. There was no bed or shoaling. — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)
- Periodic FNPF numerical wave tanks exist, but continuing past breaking needs an absorbing-pressure "spilling breaker model". — [Grilli, Horrillo & Guignard 2020](https://link.springer.com/article/10.1007/s42286-019-00017-6)

### Inferences
- **ψ0 for the game's spots** (my arithmetic). (H0/h0)^(1/4) is 0.669, 0.795 and 0.880 for H0/h0 = 0.2, 0.4 and 0.6.

  | Slope | ψ0 (H0/h0 = 0.2 / 0.4 / 0.6) | Within Pick's overturn fits (ψ0 < 0.1)? |
  |---|---|---|
  | 1:100 | 0.015 / 0.013 / 0.011 | yes |
  | 1:19 (Padang) | 0.079 / 0.066 / 0.060 | yes |
  | 1:10 | 0.149 / 0.126 / 0.114 | no |
  | 1:2.3 (Reef) | 0.65 / 0.55 / 0.49 | no, ×5–6 out of range |

  Example from the fits at Padang, ψ0 ≈ 0.066: A_O/H_I² ≈ 0.31, W_O/L_O ≈ 0.41, θ_O ≈ 38°.
- **Iribarren for T = 14 s** (L0 = 1.561 T² ≈ 306 m), H0 = 1, 3 and 6 m:

  | Slope | ξ0 (H0 = 1 / 3 / 6 m) | Battjes class |
  |---|---|---|
  | 1:100 | 0.18 / 0.10 / 0.07 | spilling |
  | 1:20 | 0.87 / 0.51 / 0.36 | plunging for small waves, spilling for 6 m |
  | 1:2.3 | 7.6 / 4.4 / 3.1 | "surging" for most sizes |

  Planar-slope classifiers therefore mislabel both reef spots. Teahupo'o plunges because the wave trips over the crest onto a shallow flat. The Reef slices should be keyed on hc/H, with slope as a secondary input. Pick's slope-plus-flat domain is the right template, but his fits exclude exactly the jet-lands-on-flat regime (ψ0 ≥ 0.1).
- **Suggested axes:**
  - (a) Local slope along the wave's travel direction, per Mead & Black's orthogonal gradient. This matters for peeling slices crossing the bed obliquely.
  - (b) H0/h0 (or local H/h at the toe).
  - (c) hc/H for reef-crest geometries.
  - (d) Wave type: solitary vs periodic, with kh or L/h at the toe as a periodic parameter.
  - (e) Optional wind sign: onshore, none, offshore.
  - Absolute size drops out by Froude scaling: one dimensionless run serves 1–6 m waves. A 6 m face on a 10 m-deep toe is the same run as a 1 m face on a 1.67 m toe.
- **Run-count sketch (inference):**
  - Beach/ramp set, 6 slopes (1/100…1/10) × 3 H0/h0: 18.
  - Reef-ledge set, forereef {1/2.3, 1/5} × hc/H {0.3, 0.5, 0.8, 1.2} × H0/h0 {0.3, 0.6}: 16.
  - Periodic duplicates of about 8 key cases at 2 periods: 16.
  - Wind variants: about 6.
  - Direct runs on the game's own bed transects (Padang, Reef, point, beach): 10–20.
  - Total: about 60–80 two-phase runs, up to about 120 with resolution checks. FNPF can densely fill the pre-impact part of the beach set (the full 30-case Pick grid or more) at low cost.
- **Solitary → periodic:**
  - Do not assume the solitary library transfers. Run a periodic subset: a wave train from a relaxation or generation zone, or a cnoidal/stream-function initial condition, over the same bed. Compare impact metrics with the solitary twins.
  - If the differences stay within the scatter of measurements (e.g. O'Dea's L/W 1.7–3.15), keep solitary runs for density and periodic runs for checks. If not, make the periodic runs primary.
  - Periodic domains must hold several wavelengths, so expect several times the cost of a solitary run (inference).
- **Library frames:** store resampled arc-length contours per output step (every Δt̃ = 0.01–0.05, as in the published setups), keyed by time relative to the vertical-face time t_b and the impact time t_I. Those two events give the slice clock natural anchors. After impact the surface splits into an outer surface plus an enclosed cavity and droplets. The swept single surface needs a rule for which contour it follows, for example the outer envelope with the cavity as a separate attribute. This is a design inference.

### Gaps
- Whether *full profiles* (not just scalar metrics) collapse on ψ0 is untested. If they do, a 1D family in ψ0 could replace the 2D beach grid.
- No source maps periodic swell (H, T) at a real break to a solitary-equivalent H0/h0.
- There is no published overturn-shape scaling for slopes steeper than 1:8, or for hc/H combined with a steep forereef, beyond Blenkinsopp & Chaplin's 1:10 reef.
- The definition of X in Mead & Black's formula (1:X cotangent vs gradient) was not verified. Its data range (about 1:9 to 1:40 implied by L/W 1.42–3.43) should not be extrapolated to 1:2.3.
- Basilisk two-phase wave-generation or absorption utilities for periodic trains on slopes were not verified.

## Q4. Validation targets: which measured (and trusted modelled) profiles to check the library against

### Takeaway
The checks come from four sources, in this order:
1. Reproduce Pick & Feddersen's published FNPF scalings inside their range, since the code and fits are public.
2. Match Feddersen's Surf Ranch field and DNS overturn metrics at s = 0.0693.
3. Compare void shapes against the public Duck lidar (O'Dea 2021) and Blenkinsopp & Chaplin's reef flume.
4. Use Erinin's ensemble for splash-up timing and repeatability, and Rodríguez-Burguette's Teahupo'o gauges for the Reef's wave transformation.

The last two are not profile libraries.

### Cited Findings
- Cross-model and field consistency at s = 0.0693, H0/h0 = 0.6 [measured + modelled]:
  - A_O/H_I²: FNPF-scaled 0.38, lab 0.31, DNS 0.35.
  - W_O/L_O: 0.41, 0.38 and 0.30 respectively.
  - A_J/H_I²: FNPF 0.19, DNS 0.22.
  - θ_O: FNPF 29°, DNS 33°.
  - Differences are attributed to air effects, scale and surface tension, and DNS numerical error.
  - Source: [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Surf Ranch field [measured]: 22 waves of about 2.25 m. Four example overturns had W/L 0.35–0.51; two had A = 1.47 and 1.74 m²; θ was within ±2° of 40°. Area and aspect were inversely related to Uw/C. — [Feddersen et al. 2023 PDF](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- Duck lidar [measured, public]:
  - Void L/W at closure was 1.70–3.15 (mean 2.55), against the theoretical 2.76 (Longuet-Higgins 1982).
  - Voids became "more elongated and less steep" as breaking progressed.
  - Normalised void area rose with steeper local slope and shallower breaking depth.
  - Data are on the FRF THREDDS server.
  - Source: [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Theory: the parametric overturn solution is a potential-flow solution only when W/L = 0.36, i.e. L/W ≈ 2.76. — [Feddersen et al. 2023 PDF, §3](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf); [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Reef flume [measured]: on a 1:10 reef, cavity L/W was 1.46–2.28, A_O/H_I² 0.05–0.35 and W_O/L_O 0.43–0.67, all dependent on hc/H0. — [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf); [Pick & Feddersen 2026 PDF, §4.1](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- Surf breaks [measured]:
  - Field vortex L/W was 1.42–3.43. — [O'Dea et al. 2021 PDF](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf), citing Mead & Black 2001
  - Mead & Black related it to the orthogonal gradient. — [search abstract](https://www.researchgate.net/publication/228605528_Predicting_the_breaking_intensity_of_surfing_waves)
  - Robertson et al. found vortex parameters not reliably predictable. — [ICCE 2014](https://icce-ojs-tamu.tdl.org/icce/article/view/7290)
- Erinin et al. (2023) [measured]: ten-run ensembles show "the transition from laminar to turbulent flow is a highly repeatable process". Profiles appear in CC-BY figures; only gauge data are released. — [JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/plunging-breakers-part-1-analysis-of-an-ensemble-of-wave-profiles/9DA630A5718361A3579618BB022B8F35); [ADS abstract](https://ui.adsabs.harvard.edu/abs/2023JFM...967A..35E/abstract)
- Teahupo'o 1:60 model [measured]: gauges at 50 Hz, runup and ECM, on a 1/2.26 forereef; regular, irregular and solitary tests; CC-BY. — [Zenodo 11392175](https://zenodo.org/records/11392175)
- Energy dissipation in 2D breaking on slopes follows an inertial scaling with local height, depth and slope [modelled]. This is a check on roller energy loss. — [Mostert & Deike 2020 JFM page](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/inertial-energy-dissipation-in-shallowwater-breaking-waves/8B818C95BBB1C8BF2723DB611AFB9DCD)
- Breaker depth index and breaker type on slopes [modelled + lab]. — [Grilli et al. 1997 abstract](https://digitalcommons.uri.edu/oce_facpubs/207/)
- Upcoming measured data: Davey, Feddersen & Tsampras (2026, revised), "A stereo imaging system for overturning wave kinematics and dynamics (STOKECAM)", Coastal Eng. J. — [Feddersen paper index](https://falk.ucsd.edu/papers.html)

### Inferences
- **Acceptance tests (inference):**
  - T1: rerun 2–3 of Pick's cases (e.g. s = 1/30 and 1/15 at H0/h0 = 0.6, the Fig. 2a, 3 and 5 cases) in Basilisk. Hit A_O/H_I², A_J/H_I², W_O/L_O and θ_O within the spread of the FNPF/DNS/lab trio above (about ±0.05 on area, ±0.1 on aspect, ±5° on angle).
  - T2: reproduce Feddersen (2024) at zero wind with their own sandbox file.
  - T3: on each game bed transect, the impact-time void L/W should fall inside the measured 1.4–3.4 band, and trend rounder on steeper slopes and shallower crests.
  - T4: for the Reef, the pre-breaking wave heights along the 1:60 flume transect should match the gauges. Run the 2D model at flume scale with the published bathymetry.
  - T5: post-impact splash-up timing and repeatability, compared qualitatively with Erinin's figures, deep water only.
- The Duck lidar is the only open 3D field dataset of voids. Pulling a few of O'Dea's waves (with local slope and depth) as ground-truth snapshots would give a direct measured-vs-library comparison at field scale. Downloading them needs the owner's approval.

### Gaps
- The Surf Ranch lidar archive was not found, so only the published metrics can be used.
- There is no measured overturn *profile* for slopes steeper than 1:10 or for Teahupo'o-like ledges. Validation of the Reef slices would rest on the 1:10 reef flume trends, the gauges and physics consistency.
- The format and size of the FRF THREDDS WaveShape lidar files were not inspected.

## Q5. Route comparison, recommendation, effort and risks (digitise published vs run our own)

### Takeaway
Run our own offline 2D simulations on the game's bed shapes with Basilisk, seeded from the published setups of Mostert & Deike and Feddersen et al. Use surftank or Pick's fits as a cheap pre-impact cross-check. Use the published and measured data for *validation*, not as library content.

Digitising can make a quick prototype of the sweep, but it cannot meet the coverage rule. It has no post-impact slopes or reefs, nothing near 1:2.3, no periodic cases, and too few frames per breaker. Filling those gaps would push toward hand-authoring.

### Cited Findings
- Published slope data stop at jet impact (FNPF) or cover a few lab-scale DNS cases, with public setups but no public outputs. — [Pick & Feddersen 2026 PDF](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf); [Feddersen et al. 2024 PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf); [Zenodo 13351600](https://zenodo.org/doi/10.5281/zenodo.13351600)
- Public Basilisk slope setups exist that run through breaking with interface output. — [shallow.c](https://basilisk.fr/sandbox/wmostert/shallow.c); [shoal_RE0_BO4000.c](http://basilisk.fr/sandbox/ffeddersen/shoal_RE0_BO4000.c)
- Basilisk installs natively on Apple silicon, CPU only. — [INSTALL_MACOS](http://basilisk.fr/sandbox/INSTALL_MACOS); [GPU grid.h](http://basilisk.fr/src/grid/gpu/grid.h)
- Nothing covers the Reef's steep forereef as shapes, and the reef wave model used on it cannot plunge. — [Zenodo 11392175](https://zenodo.org/records/11392175); [Applied Ocean Research 2025 (search snippet)](https://www.sciencedirect.com/science/article/pii/S0141118725002354)
- The graphics precedent built its 2D library by simulation, not digitisation, from non-bed initial conditions. — [Mihalef et al. 2004 PDF](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf)

### Inferences

**Routes compared (inference):**

| Route | Coverage vs need | Rule compliance | Effort | Main risks |
|---|---|---|---|---|
| A. Digitise published figures (Pick, Grilli 1997, NMP85, LHC76, Chen/Deike) | ~20–40 curves; slopes 1:100–1:10 pre-impact; deep-water post-impact only; no reef ledge, no periodic slope | yes for curves; gaps would need interpolation or hand-filling | ~1 week | temporal sparsity; hand-filled gaps; paywalled figures |
| B. Reuse Pick's public code and outputs (surftank + Zenodo) | 1:100–1:10 × H0/h0 0.2–0.6, dense in time, pre-impact only | yes | days, if MATLAB is available | stops at impact; solitary only; MATLAB dependency; mat.zip contents unknown |
| C. Own Basilisk 2D runs on game beds (recommended) | full sequence through splash-up and roller; any slope, reef crest or period; game-specific transects | yes, physics from the game's own beds | 1–2 weeks setup and validation, then days to weeks of unattended compute (to be benchmarked) | unknown run time; 2D post-impact realism; lab-scale Re and Bo; periodic generation; Reef validation data thin |
| D. Hybrid: B for dense pre-impact beach sweep + C for post-impact and reefs | best coverage per compute | yes | C + a few days | two pipelines to stitch at impact (different methods) |

**Recommendation:** C, optionally extended to D.
- Start by reproducing Mostert's shallow.c and Feddersen's shoal file on the M4 Pro, to benchmark wall time and prove contour export. That needs owner approval to download Basilisk.
- Then parametrise the bed as a polyline taken from the game's transects: Padang 1:18–1:20 plus reef crest; Reef 1:2.3 plus crest and flat; beaches.
- Sweep the axes in Q3.
- Validate with T1–T5 (Q4).
- Keep Pick's ψ0 fits as the analytic sanity layer for any slice with ψ0 < 0.1.

**Effort estimate** (inference, agent working autonomously):
- Basilisk install and benchmark: 0.5–1 day.
- Bed-polyline input and interface export to arc-length contours: 2–3 days.
- Validation T1–T2: 2–4 days, including runs.
- Reef ledge and periodic-train setup: 3–5 days.
- Sweep of 60–120 runs: compute-bound; very roughly 1 day to 3 weeks on one M4 Pro, running one case per core.
- Packaging (resampling, keying by t_b and t_I, compression): 2–3 days.

**Risks** (inference, grounded in the cited facts):
1. **Run time unknown.** No published 2D wall times exist. Mitigation: benchmark first; drop to level 12–13 for gentle spilling cases if they converge (convergence was reported at Δx/h0 = 6e-3).
2. **2D post-impact realism.** 3D DNS shows rapid transition to 3D turbulence after impact. The 2D roller and splash-up cascade are physical but idealised; 3D would cost "far greater" compute.
3. **Scale.** Re and Bo are lab-scale (4×10⁴; 10³–4×10³) against field values of 10⁷ and 10⁵. Macro shapes should hold, while spray and bubble detail will not.
4. **Solitary vs periodic.** A trend reverses between the two, so a periodic subset is mandatory. Periodic domains are longer and costlier.
5. **Reef validation.** There are no measured steep-ledge overturn profiles, only 1:10 reef metrics and the Teahupo'o gauges.
6. **Tooling on Mac.** There is no OpenMP, the GPU backend is unusable, and MPI is unverified. surftank needs MATLAB.
7. **Interpolation between library entries.** ψ0 collapse is proven only for scalar metrics. Interpolating full profiles across entries may need denser sampling than the scalar fits suggest, and the topology changes after impact (cavity, droplets).
8. **Licences.** The UNSW dataset is NC-ND and FluidX3D is non-commercial; both are unusable. Pick, Erinin and O'Dea are CC-BY, usable with attribution. surftank is GPL-3.0 and Basilisk is reportedly GPL (unverified). Simulation outputs are data the game generates, not code, though this is not legal advice.

### Gaps
- There is no benchmark of any 2D two-phase breaker on Apple silicon; this is the single biggest unknown in the effort estimate.
- It was not checked whether Kanoa Pick or the Feddersen group would share the full 30-case surftank outputs or the DNS interface files on request.
- The owner's approval is needed for every download: the Basilisk source, Pick's mat.zip, the FRF lidar scans and the Teahupo'o dataset.
