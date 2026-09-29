# Along-crest barrel structure and lip thickness (for a swept-profile barrel)

*Tags: **[meas-pool]** measured at a wave pool, **[meas-field]** measured in the ocean, **[meas-lab]** measured in a flume, **[model-FNPF]** potential-flow simulation, **[model-DNS/LES]** Navier–Stokes simulation, **[patent]**, **[expert]** named expert's commentary, **[anecdotal]**, **[inference]** my own reasoning, **[not opened]** seen only in search results or behind a 403. Symbols: H is the breaking height and c is the wave speed normal to the crest. α is the peel angle between the crest and the break-point trail (≈ the depth contour). The along-crest peel rate is v_crest = c/tan α, and the speed along the trail (what the rider must hold) is v_line = c/sin α. τ is a slice's age since its face went vertical. T_open is the τ at lip touchdown. Checked 2026-09-28.*

## Q1. Are there 3D measurements or simulations of breaking crests along their length (wave pools, field lidar, stereo, drones, 3D simulations)?

### Takeaway
There is exactly one measured along-crest barrel sequence. Surf Ranch lidar (Feddersen et al. 2023) turns a single 3D snapshot into the stage-by-stage evolution along the crest: 0.9 m of crest equals 0.28 s of breaking. The field lidar at Duck (O'Dea et al. 2021) covers only 3–4 m windows at the leading edge of finite-crested plungers. The 3D simulations are potential flow over a ridge (Grilli et al. 2001; Guyenne & Grilli 2006) and LES/DNS of spanwise-uniform plungers (Lubin & Glockner 2015; Watanabe et al. 2005). I found no lidar, stereo or drone data from Wavegarden, URBNSURF, American Wave Machines or any named reef, and no 3D simulation of a peeling barrel. A new stereo system (STOKECAM, 2026) exists, but I could not read it.

### Cited Findings
**Surf Ranch lidar [meas-pool, field scale, 22 waves]**
- **Basin.** About 600 m × 60 m, with a fixed bed and a submerged hydrofoil towed along the basin. Waves are generated over a flat bed at h ≈ 2.5 m. A "relatively steep sloping section" from x ≈ 13 m to x ≈ 3 m leads onto a flat bar about 6 m wide at h ≈ 0.95 m. The bathymetry is along-basin uniform over the central −35 < y < 35 m. It is "designed so that wave overturning occurs on the bar", letting surfers get "tubed" — [Feddersen et al. 2023, JFM 958 A4](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **Wave.** An approximate soliton with H ≈ 2 m that "propagates at an angle of 25.5° to the hydrofoil" and is ≈65° oblique to the shoreline — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **Crest distance as time.** Along-basin speed C_y = 7.4 m/s and the 25.5° angle give a wave speed C = 6.68 m/s and an along-wave speed C_ỹ = 3.19 m/s. So "moving an along-wave (ỹ) distance 3.19 m is equivalent to 1 s …". This works because of the "quasi-uniformity of the wave overturn across lidar snapshots together with the lack …" — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **One snapshot along the crest** (2 m bins, centres 0.9 m apart):

  | ỹc (m) | Stage |
  |---|---|
  | −1.7 (nearest the tram) | face "has not yet become vertical" |
  | −2.6 | face vertical |
  | −3.5 | "the wave jet (lip) forms, ejecting forwards" |
  | −4.4 | "overturning with jet falling forwards" |
  | −5.3 | jet "has fallen about 1.5 m in z and nearly makes contact", "about +2 m (in x̃) from where the wave became vertical" |
  | −6.2 (nearest the shore) | "the jet has impacted and the overturn surface is obscured" |

  The 4.5 m span covers 1.4 s, and each 2 m bin holds 0.63 s of evolution — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **Only one bin can be fitted.** Only the bin just before impact is a "complete overturn". Earlier bins have no jet yet or a jet not near impact, and in the later bin the back of the overturn is hidden — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **The touchdown line is straight.** Lip-impact breakpoints "vary weakly along-basin with variance 0.11 m²" (22 waves, 20 m of basin). UAV frames came at 5 Hz, and the along-basin speed is 7.4 m/s — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **Fitted voids at touchdown.** Offshore wind: A = 1.74 m² with W/L = 0.49–0.51. Onshore wind: A = 1.46–1.47 m² with W/L = 0.35–0.36. The tilt θ was within ±2° of 40° in all four examples — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)

**Duck field lidar [meas-field, 30 plunging waves]**
- They reconstructed voids of "finite-crested plunging waves" "by combining information from multiple beams surrounding the leading edge of the breaking crest". They used "an along-crest window centered on the leading edge of the breaking crest …". Scans reached up to 15 m alongshore — [O'Dea, Brodie & Elgar 2021, GRL](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- Voids were "rounder … and steeper … as the plunging lip first intersected the front face", then became "more elongated and less steep". These changes "occurred rapidly over 1–3 m and within half a second". Aspect ratios L/W ran 1.7–5.0 and void angles 32–72° — [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)

**3D potential flow over a ridge [model-FNPF]**
- **Setup.** A solitary wave with H0/h0 = 0.6 runs over a 1:15 ridge tapered sideways by sech²(ky) (k = 0.5) in a tank 4h0 wide. The depth is 0.093 h0 over the ridge centre and 0.619 h0 at the sides (1:36 minimum slope) — [Grilli, Guyenne & Dias 2001, IJNMF 35](https://maths.ucd.ie/~dias/GrilliGuyenneDias.pdf)
- **Sequence.** The face first goes vertical at the centre at t̃ = 8.485 (H̃ = 0.701). The sidewalls (y = ±2 h0) follow at t̃ = 9.005 (H̃ = 0.706), by which time the centre "now has a well-defined breaker jet". The "non-dimensional lateral mean speed of propagation of the breaking front" is c̃_b = 3.847 in units of √(g h0) — [Grilli et al. 2001](https://maths.ucd.ie/~dias/GrilliGuyenneDias.pdf)
- **3D versus 2D.** The ridge's transverse modulation "induces three-dimensional effects on the time evolution, shape and kinematics of breaking waves". But "comparisons of two- and three-dimensional results in the middle cross-section of the …" (abstract only) — [Guyenne & Grilli 2006, JFM 547](https://www.cambridge.org/core/product/identifier/S0022112005007317/type/journal_article)

**3D Navier–Stokes / LES [model-DNS/LES]**
- **Vortex filaments.** Lubin & Glockner (2015) found "three-dimensional streamwise vortical tubes, like vortex filaments, connecting the splash-up and the …". They add that "no experimental observations have been made in laboratories"; the filaments have only been seen in documentary footage — [Lubin & Glockner 2015, JFM 767 (abstract)](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/numerical-simulations-of-threedimensional-plunging-breaking-waves-generation-and-evolution-of-aerated-vortex-filaments/22C0044C01131CEE2EE5968C9EFF2736)
- **Ribs.** Watanabe et al. (2005) describe the sequence:
  1. The overturning jet rebounds from the water ahead.
  2. Vorticity in the saddle region "becomes unstable … resulting in spanwise undulations".
  3. The undulations grow into counter-rotating vortex loops and a "rib structure".
  4. The ribs appear to be the known "obliquely descending eddy".

  — [Watanabe, Saeki & Hosking 2005, JFM 545 (abstract)](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/threedimensional-vortex-structures-under-breaking-waves/8563F6B2E5B06EA3781FB0BD43939F78)
- **3D Surf Ranch simulations are still missing.** The 2D DNS of Surf Ranch is "an overturn with infinitely long crest, the entirety of which is simultaneously overturning". The real wave "overturns progressively … such that wave overturning is 3D, with significant along-crest variation". Along the crest it passes from single-valued η "through the process of overturning, ending in a region where the overturn …". The authors add that "Progressively overturning waves are the norm in the ocean", that "Most depth-limited wave breaking in the ocean is 3D", and that 3D would "necessitate 3D simulations at far greater computational cost" — [Feddersen, Hanson, Mostert & Fincham 2024, JFM (revised ms.)](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**Stereo and other leads**
- "A STereo imaging system for Overturning wave KinEmatiCs and dynAMics (STOKECAM)", Davey, Feddersen & Tsampras, *Coastal Engineering Journal*, revised 2026. It is listed on the group's paper index. The PDF is over the 10 MB fetch limit and was not read — [Feddersen paper index](https://falk.ucsd.edu/papers.html)
- [not opened] A 2023 *Coastal Engineering* paper used a 3D scanning lidar and trinocular stereo on short-crested breaking waves in a directional lab basin (search abstract only; 403) — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0378383923000510)

### Inferences
- **The Surf Ranch snapshot is a measured slice clock.** In time since the face went vertical:

  | τ (s) | Stage |
  |---|---|
  | ≈ −0.28 | face still sub-vertical |
  | 0 | face vertical |
  | ≈ 0.28 | lip launches |
  | ≈ 0.56 | lip falling (open curl) |
  | ≈ 0.85 | lip about to touch |
  | ≈ 1.1 | impacted |

  Each 2 m bin smears 0.63 s, so treat every τ as ±0.3 s. Converted with 3.19 m/s, the open curl (vertical face → touchdown) spans about **2.7–3.6 m of crest**. Converted with 7.4 m/s along the bar (the surfer's line), it spans about **6.3–8.4 m**. This is for H ≈ 2 m and α ≈ 64.5°.
- **The Surf Ranch DNS runs faster than the lidar.**
  - With onshore wind (Re* = 2400), the jet "has just formed" at t̃ = 18.30 and impacts at t̃ = 19.13 — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf).
  - At field scale (h0 = 2.5 m, √(h0/g) = 0.50 s) that is Δt ≈ 0.42 s, about 1.3 m of crest.
  - Impact comes later with no wind (t̃ = 19.96) and with offshore wind (t̃ = 20.22).
  - I use **T_open ≈ 0.4–1.1 s at H ≈ 2 m** as the working range.
- **Free fall supports the lidar end.** A lip dropping about 1.5 m needs √(2·1.5/9.81) ≈ 0.55 s. Adding the ≈0.28 s from vertical face to launch gives ≈0.83 s. Scaled by Froude, **T_open ≈ 0.6√H s (range 0.3–0.8√H, H in m)**.
- **A peak breaks outward like a short closeout.** On Grilli's ridge the breaking front spread sideways at about 3× the wave speed (C̃ ≈ √1.6 ≈ 1.26). That equals a peel angle of about atan(1.26/3.85) ≈ 18°. The apex section was about 0.5 t̃ older than the flanks 2 h0 away.
- **Sweeping 2D profiles is defensible.** Guyenne & Grilli's "mid-ridge 3D cross-section ≈ 2D jet" is the best physics support for it, provided the along-crest gradients stay moderate.
- **Large-scale 3D structure comes after impact.** Ribs, oblique eddies and vortex filaments come from the rebounding jet and splash-up, not from the open curl.

### Gaps
- **No other pools or reefs.** I found no 3D measurement (lidar, stereo, drone photogrammetry) at Wavegarden Cove, URBNSURF, American Wave Machines PerfectSwell, Surf Lakes or any named reef break.
- **STOKECAM** could not be fetched (PDF over 10 MB).
- **Guyenne & Grilli 2006** was read as the abstract only. The full paper should hold the ridge-width effects and the jet shape along the crest.
- **No simulation of a peeling barrel.** I found no 3D DNS or LES of an obliquely incident, progressively peeling plunger. Leads not opened:
  - Javanmardi, Binns, Renilson & Thomas: RANS/VOF of a moving pressure source (Webber-type pool). A search snippet says peel angle is set by source speed (30–70°, "optimal 45–55°").
  - "Numerical simulations of breaking waves generated by a 3-D submerged hydrofoil" (*J. Hydrodynamics* 2025; Springer login).
  - "Simulation of Depth-Limited Breaking Waves in a 3D Fully Nonlinear Potential Flow Model" (*JWPCOE* 150(4), 2024).

## Q2. How does the cross-section evolve along a peeling crest (shoulder, mouth/"eye", throat, pit, closing section, spit)?

### Takeaway
Along a steady peel each along-crest station holds the same 2D overturn at a different age:

1. shoulder (face not yet vertical)
2. vertical face
3. lip launch
4. open curl, the throat
5. touchdown, the pit: the roundest and steepest void
6. a closed void that elongates and flattens within about 0.5 s
7. foam

At Surf Ranch (H ≈ 2 m, α ≈ 64.5°) that sequence fills about 4.5 m of crest (1.4 s). A closing section is a low-α stretch where many slices share one age. A progressive 3D overturn always stays open at its downline end, so trapped air vents along the tube and out through the mouth; that is the physical basis of spit.

### Cited Findings
- **Stage order** is the same as the Surf Ranch table in Q1: not-vertical → vertical → lip forms → jet falling → about to touch (fallen ≈1.5 m, ≈2 m ahead of where it went vertical) → impacted, void hidden — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **Roundest at closure.** The void is roundest and steepest when the lip first meets the face. It elongates (L/W up to 5.0) and flattens (angles down to 32°) within 1–3 m and 0.5 s — [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- **The lip tip is round.** The rounded jet tip matches 2D DNS, FNPF, lab solitary waves and experiments. "A rounded jet tip is also evident in the image in Figure 11b", a photo "looking into the progressively overturning solitary wave" at Surf Ranch — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **Air: 2D versus 3D.** In a 2D overturn "the moment of impact leads to a dramatic increase in air pressure …". That is "20× to 40× larger than that during shoaling". "In contrast, a progressive 3D overturn … always has an overturn volume …", which "would lead to a pressure drop within the overturn". This "may explain" the aspect-ratio differences between the field (3D) and the DNS (2D) — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **Spit** [surf reference; opened in the earlier research round]. It is compressed, aerated water blasting horizontally out of the tube mouth as the ceiling and walls collapse (a bellows effect lasting about 2–3 s). Pipeline and Teahupo'o are classic spitting breaks — [Encyclopedia of Surfing: spit](https://www.eos.surf/encyclopedia/spit-spitter)
- **Closing section at The Ledge, Raglan** [meas-field video + model]. "To ride a wave at 'The Ledge', surfers essentially take off at …" — [Scarfe et al. 2009, JCR 25(3), BioOne PDF](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)
- **Rides are made of sections.** "A surfing ride is actually made up of a variety of sections, …". "Small sections that break at once, with a peel angle near 0°, …". "If the section has a high enough breaker intensity there is a …" — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)
- **Patents: the tube travels at the peel speed.**
  - "The hollow region 450 has the effect of propagating along the wave …" — [US20110209280A1 (Enjo)](https://patents.google.com/patent/US20110209280)
  - A tube T forms in the "space … between the wave face 26 and the breaking hook 23", and the surfer rides "at the leading edge of that tube as the wave peels progressively …" — [US5342145A (Cohen)](https://patents.google.com/patent/US5342145A/en)

### Inferences
- **Surf words mapped to slice age.** The terms are surfer vocabulary; the mapping is mine.
  - **Shoulder:** τ < 0, the deeper-water end of the crest, face steepening. At Surf Ranch it was still sub-vertical at τ ≈ −0.3 s.
  - **Mouth / "eye":** the stations where τ ≈ 0 to 0.3 T_open, where the lip is just launching.
  - **Throat (open curl):** about 0.3 T_open < τ < T_open. The lip is in flight and the void is open at the bottom front.
  - **Pit:** τ ≈ T_open, at touchdown. This is the roundest ring, with the highest W/L and a void angle up to about 70°. Surf Ranch at H ≈ 2 m gives L ≈ 2.2–2.4 m, W ≈ 0.9–1.1 m and θ ≈ 40°, from A = (2√3/5)·L·W with the fitted A and W/L.
  - **Collapsing tube / "foam ball":** T_open < τ < T_open + 0.5 s. The ring stretches (L/W → 5), tilts flatter (→ 32°) and fills with splash-up.
  - **Whitewater:** beyond that.
- **The eye's outline is the jet-tip trajectory.** Each station's lip tip sits at its 2D ballistic position (x_tip(τ), z_tip(τ)). Seen from inside, looking downline, the boundary of the opening is that trajectory, stretched along the crest at v_crest. At Surf Ranch the tip drops ≈1.5 m and advances ≈2 m over ≈2.7 m of crest, so the mouth is a slanted opening about as wide (in x̃) as it is tall. A swept-profile renderer produces this automatically if τ(s) is right.
- **The roundest point along the crest is the pit.** Ahead of it the air space is not a closed ring. Behind it the ring elongates within about 0.5 s × v_crest (≈1.6 m at Surf Ranch).
- **Closing section:** a stretch where α drops toward 0, or the break front jumps.
  - The slice clock goes flat, and the lip lands along a long line nearly at once.
  - Air cannot escape sideways, as in the 2D DNS with its trapped-pressure spike, so it vents along the tube toward the open end. The result is a spit burst out of the mouth, directed along the tube axis.
  - A smooth peel is always open at the mouth, so it vents continuously and gently.
- **Local α also changes the profile family.** The bed slope a slice feels along its ray is s_ray = s_normal·cos α. Surf Ranch confirms this:
  - The bar face drops 1.55 m over about 10 m cross-shore (≈0.155, about 1:6.5).
  - × cos 64.5° ≈ 0.067, against the DNS "slope in the direction of wave travel" β = 0.0693 — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf).
  - So lower-α (faster) sections feel a steeper effective slope. That makes them rounder and heavier, following Mead & Black's steeper-gradient → lower-vortex-ratio trend (see Q3/Q6).

### Gaps
- **Not measured:**
  - the cross-section of a closing section;
  - the "eye" seen from inside;
  - spit velocity, volume or duration beyond surf-reference descriptions.
- **Scarfe's peel rates don't follow c/tan α** (Table 3, Q4). For example, α = 0° is listed at 14.4 m/s and α = 30° at 6.7 m/s. They come from 1 s video frames combined with modelled wave orthogonals, so treat them as indicative.
- **α-varying peels are unmeasured.** No study measures how the cross-section changes as α varies along one wave. Surf Ranch is uniform.

## Q3. What is measured about lip (plunging-jet) thickness?

### Takeaway
Direct thickness data are still thin. The only numeric jet thickness in an opened primary source is the Surf Ranch DNS: "cross-jet width ≈ 0.05" in units of the offshore depth h0. That is about 0.07–0.08 H_b, or about 0.12 m at Surf Ranch scale. The jet is thicker with no wind and thickest with offshore wind. A photographic re-analysis (Chanson & Cummings 1992, reported in Chanson & Lee 1997) reportedly gives 0.01–0.1 H_b, but I could not open it. Jet areas of 0.13–0.23 H_b² (DNS) and 0.012–0.27 H_I² (FNPF) imply a much thicker lip root, so a game should define the lip by **root thickness and tip thickness** separately. "Half the wave height" at Teahupo'o is expert commentary, not a measurement. I found no wave-pool lip-thickness data.

### Cited Findings
- **DNS jet width.** "The plunging jet is almost entirely resolved at the smallest AMR nondimensional …". Lengths are scaled by the offshore depth h0 [model-DNS, 2D Basilisk, Surf Ranch bathymetry] — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **Wind changes the jet** [model-DNS]:
  - Onshore wind (Re* = 2400): the jet is "relatively thin" and the overturn "relatively inclined".
  - No wind: the jet is "thicker", and the overturn "longer and oriented more horizontal".
  - Offshore wind (Re* = −1800): "an even thicker overturn jet and a longer overturn … oriented even more horizontally".

  — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **DNS breaking heights and jet areas.** H_b/h0 = 0.64 (no wind), 0.674 (onshore) and 0.627 (offshore). Jet area A_J/H_b² = 0.219 with no wind and 0.132 with onshore wind; with offshore wind it is "largely constant … varying from 0.229 to 0.219". "Overturn jet area has not been previously examined experimentally or numerically" — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **The DNS runs at lab scale.** Wave Reynolds number 4 × 10⁴ implies h0 = 0.055 m, with a minimum mesh of 0.2 mm — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **FNPF definition and range.** The jet is "the upper region of water where the free surface is multi-valued". A_J is normalised by H_I². The earlier round extracted the range A_J/H_I² = 0.012–0.266 from the same paper [model-FNPF] — [Pick & Feddersen 2026, JFM 1040 A8](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- **Slope changes the lip** [model-FNPF], for solitary waves at impact:
  - On s = 1/30, "the overturning jet is thinner and inclined at a steeper angle as …".
  - On s = 1/15 with H0/h0 = 0.6, the overturn is larger and "the s = 1/15 overturning jet is thicker and the jet impacts …".
  - The steepest, smallest cases (s = 1/15, H0/h0 = 0.2) are asymmetric, "akin to the cross-section of a foil", with a thicker, more horizontal jet, because flat still water bounds them.

  — [Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)
- **Impact speed and scale** [meas-lab]. Jet impact velocity is "basically proportional to the square root of the wave height (e.g., Chanson …". A 2–3 m field breaker corresponds to about 6–7 m/s impact, and their near-full-scale pseudo-plunging jet impacted at 5.6–6.4 m/s — [Chanson, Aoki & Maruyama 2002, Coastal Eng. 46](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [not opened] **Photographic estimate.** Chanson & Cummings (1992) "estimated a plunging jet thickness of about 0.01 to 0.1 H_b", from a re-analysis of photographs (Coles 1967; Melville & Rapp 1985; Longuet-Higgins 1988). This is reported in Chanson & Lee (1997), *Coastal Eng.* 31, 125–141. I saw it only in search-engine extracts; the ScienceDirect, UQ eSpace, academia.edu and ResearchGate copies all returned 403 — [ScienceDirect abstract page](https://www.sciencedirect.com/science/article/abs/pii/S0378383996000567)
- [not opened, 403] **Jet disintegration.** Longuet-Higgins (1995) proposes that the thin plunging jet breaks up because stretching amplifies streamwise perturbations. This comes from the search abstract only — [JPO 25, 2458–2462](https://journals.ametsoc.org/view/journals/phoc/25/10/1520-0485_1995_025_2458_otdotj_2_0_co_2.xml)
- [expert] **Teahupo'o.** Shand describes "the characteristic below-sea-level break at Teahupo'o, with the overturning lip being half …". The lower part of the wave "appears to drop away below sea level". Waves are 2–5 m with 14–20 s periods, and a ~10 m shelf lets the wave "stand up". The author is Tom Shand, University of Auckland and Tonkin + Taylor — [The Conversation, 2024](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301)
- **Pool patents are silent on lip thickness.** The Surf Loch staggered-generator patent does not address it, and none of the other pool patents I read mention it — [US9777494B2](https://patents.google.com/patent/US9777494B2/en)

### Inferences
- **Tip thickness.**
  - 0.05 h0 / H_b(0.63–0.67 h0) ≈ **0.07–0.08 H_b**. The onshore-wind case is thinnest; no wind and offshore are thicker.
  - Under Froude scaling that is ≈ 0.12 m at Surf Ranch (h0 = 2.5 m), ≈ 0.15 m at H = 2 m and ≈ 0.3 m at H = 4 m.
  - Lab-scale surface tension may keep the DNS tip thicker than a real field jet, which also frays more.
- **Root / mean thickness.**
  - A_J (0.13–0.23 H_b²) divided by the overturn length L_O (≈1.1–1.3 H_b at Surf Ranch, from L ≈ 2.2–2.4 m at H ≈ 2 m) gives ≈ **0.10–0.21 H_b**.
  - So the lip tapers roughly 2–3:1 from root to rounded tip.
  - This fits the 0.01–0.1 H_b photographic range at the tip end.
- **"Half the wave height" is probably the root.** It likely describes the whole thrown curl of a slab measured off the face, not the tip. Even so, it is about 2× the thickest root the solitary-wave fits give (≈0.27 H). The earlier round likewise found that these fits under-predict slab lips.
- **Working ranges for the game** (provisional):
  - root ≈ 0.15–0.3 H (0.3–0.5 H in a slab mode, marked unsourced/expert);
  - tip ≈ 0.05–0.1 H, with a round cap;
  - onshore wind thins the lip, following the DNS jet area −40% from no wind to Re* = 2400; offshore wind thickens it slightly.

### Gaps
- **Unread primaries:** Chanson & Lee 1997 and their 1995 report CE150 (UQ eSpace 403), Kiger & Duncan 2012 (*Annu. Rev. Fluid Mech.* 44; the ifremer copy returned 403), Blenkinsopp & Chaplin 2008, Grilli et al. 1997. No lab PIV measurement of jet thickness appeared in any opened source.
- **No field or pool thickness measurement.** Lidar sees the outside of the lip, not its underside. O'Dea and Feddersen 2023 report area and aspect ratio only.
- **STOKECAM (2026)** may carry jet kinematics; not read.

## Q4. What are the peel angles and speeds at famous barrelling breaks, and what do they imply for the barrel's along-crest length?

### Takeaway
I found no measured peel angle for Pipeline, Teahupo'o, Padang Padang, G-Land, Kirra or Supertubos. Measured cases:
- **Surf Ranch:** ≈64.5°, from the lidar geometry.
- **The Ledge at Raglan:** 0–69° second by second during one barrel ride, with peel rates of 6.7–16.2 m/s.
- **Design ranges:** 30–70°, typically ~45°.
- **GPS rider speeds in competition:** a mean peak of 9.3 m/s and a top of 12.5 m/s.

Combining c ≈ 4.4√H with T_open ≈ 0.6√H s gives an open tube about **2.6·H/tan α** long along the crest (range 1.3–3.5·H/tan α). That is ≈3–14 m for 2–3 m waves at α = 30–60°. A closed, collapsing void trails behind it for another ≈0.5 s × c/tan α.

### Cited Findings
- **Definition.** "At position A the wave has a velocity of propagation, Vw, which …". A closeout "is said to have a peel angle of 0°", and the example figure's ≈52° is "considered fast but surfable" — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)
- **The Ledge, Raglan: one barrelling ride** (Scarfe 2002a, Table 3) [meas-field video + modelled orthogonals] — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)

  | t (s) | α (°) | peel rate (m/s) |
  |---|---|---|
  | 1 | 0 | 14.4 |
  | 2 | 48 | 11.2 |
  | 3 | 50 | 15.2 |
  | 4 | 69 | 10.5 |
  | 5 | 22 | 16.2 |
  | 6 | 69 | 9.7 |
  | 7 | 45 | 9.8 |
  | 8 | 30 | 6.7 |
- **Section design values** (Moores 2002, Table 2), by surfer ability — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)

  | Ability | H (m) | Section length (m) | Duration (s)* | Section speed (m/s) |
  |---|---|---|---|---|
  | 1–2 | — | none | — | — |
  | 3 | 2.5 | 25 | 1 | 10 |
  | 4 | 2.5 | 40 | 1.5 | 20 |
  | 5 | 3 | 40 | 2.2 | 20 |
  | 6 | 3 | 60 | 2.3 | 20 |
  | 7 | 3 | 60 | 3 | 20 |

  \*The table heads this column "(m)". Levels 1–2 "cannot surf waves with sections because it requires the ability to generate speed". Moores found "the higher the surfer skill level, the longer the section that can be negotiated".
- **Mead & Black reefs.** Mead & Black (2001b, c) discuss reefs including "Padang Padang (Indonesia), and Pipeline (Hawaii)". Their vortex ratio is Y = 0.065X + 0.821, with X the orthogonal seabed gradient. The review text gives no peel angles for these breaks — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)
- **Surf Ranch speeds.** Along-basin speed 7.4 m/s, wave speed 6.68 m/s, soliton at 25.5° to the foil path — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **KSWC formula.** "sin α = Fr⁻¹ … larger speeds corresponding to smaller peel angles", where Fr = V_foil/V_wave [patent] — [US8262316B2 (Slater & Fincham)](https://patents.google.com/patent/US8262316B2/en)
- **GPS rider speeds** [meas-field, 12 nationally ranked surfers in sanctioned competitions]. Average peak wave-riding speed was 20.75 mph and the top recorded speed 27.96 mph. Riding waves took 8% of the time — [ScienceDaily on Farley, Harris & Kilding 2012, JSCR 26(7)](https://www.sciencedaily.com/releases/2012/07/120723094818.htm)
- **Practical limits.**
  - 30° is the practical minimum, 45–66° is typical, and about 70° is the maximum [secondary; opened in the earlier round] — [Science of Surfing: peel angle](https://www.scienceofsurfing.com/p/peel-angle)
  - The Surf Loch patent echoes the ~70° practical maximum — [US9777494B2](https://patents.google.com/patent/US9777494B2/en)
- **Teahupo'o conditions.** Waves of 2–5 m at 14–20 s periods [expert] — [Shand 2024](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301)

### Inferences
- **Surf Ranch peel angle.** The crest runs at 90° − 25.5° = 64.5° to the along-basin break line. Then c/sin α = 6.68/0.903 = 7.4 m/s and c/tan α = 3.19 m/s, both matching the paper. The KSWC formula gives the same α from Fr = 7.4/6.68 = 1.108.
- **Speed check.** c ≈ 4.4√H m/s is within 10% of Surf Ranch's 6.68 m/s at H ≈ 2 m (it gives 6.2).
- **Barrel lengths along the crest.** Central values, with the T_open-range in brackets. L_closed is the collapsing void behind the pit, ≈0.5 s × c/tan α (O'Dea).

  | H (m) | c (m/s) | T_open (s) | α | v_crest (m/s) | v_line = rider (m/s) | L_open along crest (m) | L_closed along crest (m) |
  |---|---|---|---|---|---|---|---|
  | 1.5 | 5.4 | 0.73 | 30° | 9.3 | 10.8 | 6.9 (3.4–9.1) | 4.7 |
  | 1.5 | 5.4 | 0.73 | 45° | 5.4 | 7.6 | 4.0 (2.0–5.3) | 2.7 |
  | 1.5 | 5.4 | 0.73 | 60° | 3.1 | 6.2 | 2.3 (1.1–3.0) | 1.6 |
  | 2 | 6.2 | 0.85 | 30° | 10.8 | 12.4 | 9.1 (4.6–12.2) | 5.4 |
  | 2 | 6.2 | 0.85 | 45° | 6.2 | 8.8 | 5.3 (2.6–7.0) | 3.1 |
  | 2 | 6.2 | 0.85 | 60° | 3.6 | 7.2 | 3.0 (1.5–4.1) | 1.8 |
  | 3 | 7.6 | 1.04 | 30° | 13.2 | 15.2 | 13.7 (6.9–18.3) | 6.6 |
  | 3 | 7.6 | 1.04 | 45° | 7.6 | 10.8 | 7.9 (4.0–10.6) | 3.8 |
  | 3 | 7.6 | 1.04 | 60° | 4.4 | 8.8 | 4.6 (2.3–6.1) | 2.2 |
  | 4 | 8.8 | 1.2 | 30° | 15.2 | 17.6 | 18.3 (9.1–24.4) | 7.6 |
  | 4 | 8.8 | 1.2 | 45° | 8.8 | 12.4 | 10.6 (5.3–14.1) | 4.4 |
  | 4 | 8.8 | 1.2 | 60° | 5.1 | 10.2 | 6.1 (3.0–8.1) | 2.5 |

  Surf Ranch check (c = 6.68, α = 64.5°, T_open 0.85–1.13 s): 2.7–3.6 m open curl, matching the lidar, plus ≈1.6 m of collapsing void. Along the rider's line the open tube is longer by 1/cos α: 1.4× at 45° and 2× at 60°.
- **Makeable peel angles.**
  - The needed rider speed c/sin α at H = 2–3 m is 8.8–10.8 m/s at α = 45°. That is close to the GPS mean peak (20.75 mph = 9.3 m/s).
  - At α = 30° the need is 12.4–15.2 m/s, at or above the top recorded speed (27.96 mph = 12.5 m/s).
  - So sustained, makeable barrels at 2–3 m most likely peel at α ≳ 35–45°. The 20–30° stretches are the sections made "only through the tube" or the closeouts (The Ledge's 22° section).
  - Caveat: Farley's data are from national-level competitions, probably in modest surf.
- **For named breaks** I can offer only the general bracket: fast, barrelling reefs are commonly described as "fast", which fits α ≈ 30–50°. Any specific number for Pipeline, Teahupo'o, Padang Padang, G-Land, Kirra or Supertubos would be a guess.
- **[project context] The game's current Teahupo'o Reef** (median α 23°, "13.6 m/s median", 58% close-outs; project memory note: teahupoo-reef-requirements) sits at the measured closeout-section end (The Ledge: 22° at 16.2 m/s).
  - If 13.6 m/s is the speed along the break line, then c ≈ 5.3 m/s and v_crest ≈ 12.5 m/s. With T_open = 0.36–0.97 s (H ≈ 1.5 m), that gives an open tube of ≈4.5–12 m along the crest and a collapsing void of ≈6 m.
  - The rider needs ≈13.6–14.8 m/s, above the 12.5 m/s top GPS speed. That fits "often made only through the tube".

### Gaps
- **Unread skill and peel tables.** I could not get the peel-angle and wave-height tables from:
  - Hutt, Black & Mead 2001 (the "Rating of Surfer Skill Level" table on ResearchGate returned 403);
  - Mead & Black 2001a/b (JCR SI 29) on world-class breaks;
  - Walker 1974.
- **No peel angle or peel speed** was found for Pipeline, Teahupo'o, Padang Padang, G-Land, Kirra or Supertubos.
- **Dally 2001** ("The maximum speed of surfers", JCR SI 29: 33–40, photogrammetric) and **Moores 2001** (thesis) were not accessible.
- **Skeleton Bay** "27-second" and "45-second" barrels are surf-media anecdotes; I did not open or use them.
- **Big-wave rider speeds** (Pipeline, Teahupo'o) are not in the GPS data I found.

## Q5. What do wave-pool engineering documents (patents, papers) say about the barrel's along-crest geometry?

### Takeaway
The patents give the ingredients: peel angle 30–70°, typically ~45°; plunging slopes from about 1:4 to 1:30, preferably about 1:5–1:15; and KSWC's sin α = 1/Fr. They also state that the tube travels along the crest at the peel speed. None quantifies the barrel's along-crest geometry or lip thickness. The only pool with published 3D barrel data is Surf Ranch (Q1). Long barrels in pools come from uniform bathymetry along the break line, which keeps the clock gradient constant and the touchdown line straight.

### Cited Findings
- **Kelly Slater Wave Co.** (US8262316B2; Kelly Slater and Adam Fincham, assignee Kelly Slater Wave Company, LLC):
  - peel angle from "sin α=Fr−1";
  - breaking "when the amplitude is approximately 80% of the water depth";
  - bed slope "1 to 16 degrees, and preferably from 5 to 10 degrees";
  - an early circular pool of "diameter of 450 to 500 feet" giving "30-70 feet of rideable wave length". These quotes come from the fetch tool's summary, so the exact context is unverified.

  — [US8262316B2](https://patents.google.com/patent/US8262316B2/en)
- **Cohen** (US5342145A, "System for producing surfing waves for tube riding"):
  - slope "preferably in the range of about 1/4 to 1/25", "most preferably … about 1/6 to 1/10"; the example gradient is 9.5°;
  - the "acute angle between the wave front and the wave-breaking surface is preferably …", with 45° in the example;
  - "a relatively long tube ride can be executed by a surfer as …";
  - H/L0 of about 0.0023–0.0035.

  — [US5342145A](https://patents.google.com/patent/US5342145A/en)
- **Enjo** (US20110209280A1): "For plunging, or crest overturning, to occur, the wave must shoal over …". A wave of about "two meters is desirable". The tube propagates at the speed of sequential overturning (Q2) — [US20110209280A1](https://patents.google.com/patent/US20110209280)
- **Mladick & Carnahan** (US20090151064A1, double V reef):
  - the reef nose "may have a gentle slope (13:1-28:1) … to allow for a slower take-off";
  - "Section I could have a slope as steep as 7:1";
  - the pool code "typically limits a slope … to a maximum steepness of 10:1";
  - the goal is to "ride within the wave form tube substantially the entire length of the reef".

  — [US20090151064A1](https://patents.google.com/patent/US20090151064A1/en)
- **Lochtefeld & Bastenhof** (US9777494B2, staggered wave generators; original assignee Stagger Reef Pte Ltd, now Surf Loch LLC):
  - peel angle "about 45 degrees, although it can be within a range of about …";
  - "practical maximum … about 70 degrees";
  - the break-zone floor slope is "mostly between 2% and 12%".

  — [US9777494B2](https://patents.google.com/patent/US9777494B2/en)
- [not opened] **Judson** (US10207168B2, contiguous reef): "the gradient pitch of the reef adjusts between 1:5 to 1:15 to …" (search snippet only) — [US10207168B2](https://patents.google.com/patent/US10207168B2/en)
- **Surf Ranch as built.** A 2.5 m-deep generation zone, a steep face onto a 0.95 m-deep, 6 m-wide bar, bathymetry uniform along the basin in the study region, and a straight lip-impact line (variance 0.11 m²) — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)

### Inferences
- **The patents converge.** They agree on α ≈ 45° and plunging slopes of about 1:6–1:10:
  - Cohen prefers 1/6–1/10, Mladick's steep section is 7:1, and Judson gives 1:5–1:15.
  - KSWC's 5–10° is about 1:11–1:5.7.
  - Surf Ranch instead runs a slow peel (α ≈ 64.5°) over a steep bar face (≈1:6.5 cross-shore). That is only ≈1:14 along the ray, which still plunges.
- **How pools make a long barrel.**
  1. Keep bathymetry and wave height uniform along the break line, so v_crest is constant, the tube length along the crest is constant, and the touchdown line stays straight.
  2. Choose α so v_line matches rider speed (≈7.4 m/s at Surf Ranch).
  3. Use a steep break-zone face to keep the lip thick and round, even at a slow peel.

### Gaps
- **Missing pool makers.** I opened no Wavegarden (Cove), American Wave Machines (PerfectSwell/McFarland), Surf Lakes or Webber document with barrel geometry.
- **Unread patents.** US10557277 ("dynamically-shaped surfing waves") returned 403 and 404; Judson's patent page was not opened.
- **No published lip thickness, tube diameter or barrel length** for any commercial pool.

## Q6. What should a swept-profile game do along the crest?

### Takeaway
1. Drive every crest slice from one smooth clock τ(s). Its gradient along the crest is dτ/ds = tan α/c (seconds per metre), for example 0.31 s/m at Surf Ranch.
2. Pick each slice's 2D profile from the library by τ, and by the slice's own ray-wise slope, height and wind.
3. Let the mouth, throat, pit and collapsing tube emerge from that.
4. Calibrate to four checks:
   - the open curl spans ≈(1.3–3.5)·H/tan α of crest;
   - the closed void lasts ≈0.5 s behind the pit;
   - the touchdown line is straight over uniform reef;
   - closing sections are low-α stretches where the clock goes flat and air vents out of the mouth as spit.

### Cited Findings
- **Crest distance can stand in for time** in a steady, non-refracting peel (measured): 3.19 m of crest = 1 s — [Feddersen et al. 2023](https://falk.ucsd.edu/pdf/Feddersen2023JFM_WindEffectsWaveShape.pdf)
- **The mid-section jet of a 3D overturn ≈ the 2D jet** [model-FNPF] — [Guyenne & Grilli 2006](https://www.cambridge.org/core/product/identifier/S0022112005007317/type/journal_article)
- **Voids are roundest at closure** and elongate within 0.5 s / 1–3 m [meas-field] — [O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)
- **A 2D overturn traps air at 20–40× the shoaling pressure**, while a progressive 3D overturn vents sideways [model-DNS] — [Feddersen et al. 2024](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- **3D spanwise structure (ribs, filaments) comes from the rebounding jet and splash-up** [model-LES] — [Watanabe et al. 2005](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/threedimensional-vortex-structures-under-breaking-waves/8563F6B2E5B06EA3781FB0BD43939F78); [Lubin & Glockner 2015](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/numerical-simulations-of-threedimensional-plunging-breaking-waves-generation-and-evolution-of-aerated-vortex-filaments/22C0044C01131CEE2EE5968C9EFF2736)
- **Real rides are sequences of sections** with varying H, α and intensity; closeout sections can still barrel [meas-field] — [Scarfe et al. 2009](https://bioone.org/journalArticle/Download?urlId=10.2112%2F07-0958.1)
- **A focused peak spreads its break sideways at ≈3.8√(g h0)** [model-FNPF] — [Grilli et al. 2001](https://maths.ucd.ie/~dias/GrilliGuyenneDias.pdf)

### Inferences (recommended recipe)
1. **Clock.** Set τ(s, t) = t − t_b(s), where t_b(s) = ∫ ds / v_crest(s) and v_crest = c/tan α(s). Smooth α(s) over at least one wave height of crest.
   - Gradient in s per metre: Surf Ranch 0.31; α = 45° at H = 2 m ≈ 0.16; α = 30° ≈ 0.09.
   - At an A-frame peak the clock is V-shaped with a flat apex. Grilli's ridge spreads at ≈18° equivalent, so the apex behaves as a short closeout.
2. **Stage bands** for the profile library. Scale by T_open ≈ 0.6√H s (range 0.3–0.8√H); Surf Ranch is ≈0.85–1.1 s.

   | τ | What the slice shows |
   |---|---|
   | < −0.3 s | shoulder: steepening, single-valued |
   | 0 | vertical face |
   | ≈ 0.25–0.35 T_open | lip launch (mouth/eye) |
   | up to T_open | throat: lip in ballistic flight, open curl |
   | T_open | pit: touchdown, roundest ring, W/L highest, tilt up to ~70° |
   | T_open to T_open + 0.5 s | collapsing void: L/W → 5, angle → ~30°, filling with splash-up |
   | later | foam and whitewater |

   The 0.5 s is a field value at H ≈ 1–2 m. Scale it by √(H/2 m) if it should grow with size (untested).
3. **Profile family per slice.**
   - Use the bed slope along the slice's ray, s_ray = s_normal·cos α. Surf Ranch validates this: 0.155·cos 64.5° ≈ 0.067 against the DNS β = 0.0693.
   - Lower-α slices get steeper effective slopes, which means rounder voids and bigger lips.
   - Offshore wind raises W/L (≈0.35 → 0.5 at Surf Ranch) and thickens the jet (DNS). Onshore wind thins it.
4. **Lip.**
   - Carry root thickness ≈0.10–0.21 H_b (from jet area) and tip thickness ≈0.07–0.08 H_b (DNS) with a round cap.
   - A slab mode (Teahupo'o's "half the wave height", expert only) should raise the root, not the tip. Mark it provisional.
   - The tip follows a ballistic path: at Surf Ranch it drops ≈1.5 m and advances ≈2 m at H ≈ 2 m. That path, swept along the crest, is the mouth's outline.
5. **Closing sections.**
   - Model them as intervals where α(s) drops (22° against 69° at The Ledge; Moores' sections of 25–60 m breaking in 1–3 s).
   - Inside one, τ is nearly constant, so lips land together.
   - Emit spit from the open end of the tube, along the tube axis. Make it a strong, short burst when a section closes; with a smooth peel, keep only a weak, continuous outflow.
   - A true closeout (α → 0) behaves like the 2D DNS case: trapped air and a loud, high-pressure impact.
6. **3D detail.** Keep the open curl's surface nearly 2D at large scale (fine fraying of the lip aside). Add along-crest ribs, filaments and scarring only behind the pit: the splash-up and the collapsing tube.
7. **Checks the game can report.**
   - The along-crest length of the open curl should be ≈(1.3–3.5)·H/tan α (Surf Ranch: 2.7–3.6 m).
   - The void should persist ≈0.5 s × v_crest behind the pit.
   - The touchdown line on a uniform reef should vary by about ±0.3 m or less (Surf Ranch standard deviation ≈0.33 m).
   - The rider speed needed, c/sin α, can be compared with GPS speeds (mean peak 9.3 m/s, top 12.5 m/s).

### Gaps
- **T_open is poorly pinned.** The range spans ×2.5 (0.3–0.8√H), because it rests on one lidar snapshot (0.63 s bins) and one DNS case. STOKECAM stereo or a 3D DNS of a peeling wave would narrow it.
- **The void's 0.5 s lifetime** is known only at H ≈ 1–2 m (Duck); its scaling with H is unknown.
- **No measurement** of how a barrel's cross-section varies with α along one wave, and none of a closing section's collapse or of spit velocity.
