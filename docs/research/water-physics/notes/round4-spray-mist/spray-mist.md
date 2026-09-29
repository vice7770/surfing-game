# Spray, mist and spit: where they come from, how they look, how to render them (research round 4)

Written 2026-09-29 for Breakline's water-physics knowledge base. Code cited as `path:line` on `origin/main` at `d36cdca`. This round builds on, and does not repeat:
- round 1, `../Breaking waves foam and tubes/whitewater_foam.md` §5, §6, §10, §11 (Erinin 2019 abstract, Chanson 2002, Porter lidar, diffuse-particle methods) and `lip_tube_rendering.md` Q1–Q2 (lip trains, occlusion ramp, spit as a bellows, forward scattering);
- round 2, `../Barrel profile library and Padang reef/along_crest_barrel.md` (spit vents out of the open end) and `roller_geometry.md` (bore droplets);
- round 3, `../Whitewater build research/roller_build.md` §4 (spray from the toe and crest lines).

Round 1 listed as gaps: Veron 2015 full text, Erinin's droplet speeds, spit speed, the offshore veil, and Mie numbers taken from snippets. This round opens those sources, computes the Mie optics itself, and measures render costs on the M1 Air.

**Tags.** [meas-lab] laboratory measurement; [meas-field] field measurement; [model] DNS, theory or published computation; [computed] my own calculation from sourced inputs (script paths given); [measured-here] my own timing on this machine; [prod] film or game practice; [code] the game's code; [anecdote] surf reference or photos; [inferred] my reasoning, provisional.

---

## 0. The answer in brief

- **Why spray reads wrong today.** The Rich spray is round, flat-lit discs 6–14 cm wide at a fixed 0.8 opacity. Real spray is a veil of 0.05–3 mm drops. You never see a single drop: you see optical depth. Dense spray is white because light scatters many times inside it. Sparse spray is nearly clear from the front and glows when the sun is behind it. The game's drops get no phase function at all, and its mist gets g = 0.6 where water drops have g ≈ 0.86–0.88. Mist dies in 4 s and never rises, yet fine spray hangs for minutes and makes 25–35 m plumes over reefs. There is no haze above water at all (`scene.fog` is null above the surface). And the 4,096-particle pool clips the biggest Reef impacts.
- **Where spray comes from (sourced).**
  - (a) Jet impact and splash-up: a burst under 0.4 s, then drops from the splash's rim and from bursting bubbles.
  - (b) Spit: air squeezed out of a closing tube for 2–3 s. No measured speed exists; a 2D DNS gives an upper bound near 45–65 m/s.
  - (c) Offshore veil: spume drops (radius 10–500 µm) torn off once the relative wind passes about 7–11 m/s.
  - (d) The bore front: millimetre drops thrown forward at 1.5 × the bore speed, at 30–45°.
  - (e) Bubble bursts: film and jet drops of 0.01–100 µm. They are invisible one by one, but they make the haze.
- **The single most useful rule.** Opacity comes from optical depth, τ = 1.5 · w / r (w is the water per unit area, r the drops' mean radius). Whiteness then follows τ(1 − g) through Bohren's two-stream formula. A 1 cm sheet torn into 0.5 mm drops has τ ≈ 30, so it is white. Spread over 30 times the area it has τ ≈ 1 and is translucent. This one rule gives Surf's Up's "clear when young, white when old" and "dense near the lip, dispersing into mist" from physics.
- **Costs measured here (M1 Air, 2240 × 1260, WebGL2 on ANGLE/Metal).**
  - Blended sprite fill: 0.04–0.09 ns per pixel, so one full-screen layer costs 0.12–0.25 ms.
  - Each sprite adds 12–38 ns as a point, or 20–47 ns as an instanced quad. 262k tiny points cost about 3.3 ms; 262k quads about 10 ms.
  - A GPU (transform-feedback) spray update costs 1.0–1.6 ns per particle: 262k particles in 0.36 ms.
  - The CPU `SprayCloud` costs 0.18–0.2 µs per particle per step, so 16k particles take 3.2 ms per step.
  - The M4 Pro should be about 3× faster [inferred from 20 against 7 GPU cores]. Today's spray costs nothing measurable there (+0.15 ms, within noise, `docs/research/fps-report.md:169`).

---

## 1. The game today

### Code facts [code]
- **Pools.** 4,096 spray and mist particles plus 1,024 for tube whitewater (`src/wave/SprayCloud.ts:121-122`). CPU simulation runs in the worker; the snapshot is copied into point attributes every frame (`src/scene/SprayPoints.ts:127-149`).
- **Sizes and lives.** Drops are 0.06–0.14 m sprites and mist 0.35–0.8 m (`SprayCloud.ts:471`). Mist grows to 2× over its life (`:503`) and is drawn 1.6× larger again (`src/scene/water/richSpray.ts:31`), so up to about 2.6 m wide. Lives are 3 s (drops) and 4 s (mist), × 0.6–1.0 (`SprayCloud.ts:73-74, 470`). Opacity is 0.8 (drops) or 0.25 (mist) × (1 − t²) (`:505-507`).
- **Fall speeds.** Drops 3–7 m/s and mist 0.3–0.6 m/s (`:71-72`), through quadratic drag relative to the wind (`:226-236`). By terminal speed these are about 0.7–2.3 mm drops and 0.11–0.17 mm "mist" [computed, §2f]. That is fine for drops; the "mist" is really spume-sized, not haze.
- **Emitters.**
  - Lip landings: 0.05 particles per joule. Launched up at 0.6 × the downward impact speed ± 20 %, and on at 0.64–0.96 × the parcel's forward speed (`:80, :108-111, :247-268`).
  - Bore faces: 0.6 particles per unit of foam made per m², at an upward 0.16–0.4 √(gh) (`:81, :390-413`).
  - Offshore feathering: only above 4 m/s of absolute offshore wind, as mist launched 0.5–1.5 m/s up (`:94-96, :420-447`).
  - Tube spit and eruptions: 40 particles per m³ of escaping air, half of them mist for spit (`:84-87, :329-341`).
- **Drawing.**
  - Classic: plain white soft discs (`SprayPoints.ts:26-35`).
  - Rich (`richSpray.ts:52-73`): mist is lit with a Henyey–Greenstein lobe of g = 0.6 (`src/scene/water/mist.ts:4`). Drops get `phase = 1.0`: no forward scattering. Light is `0.35 + sun·phase·0.5`. Foam-ball sprites are lit `0.45 + sun·0.6·max(0, n·sun)` (`richSpray.ts:61`), so they take the sun's colour: salmon at sunset.
  - Blending is `NormalBlending` with no depth write (`SprayPoints.ts:81-84`); tube kinds 2–4 draw in Rich only (`:136`).
- **The spit's air** (`src/wave/PlungingLip.ts:26-50, :903-988`).
  - Half of a closing void's air escapes as spit (`TUBE_AIR.escape`) along the tube axis.
  - Its speed is the air rate over the mouth area, capped at √(ρw/ρa)·√(gW/2): about 50 m/s for W = 0.6 m.
  - Air the mouth can't pass erupts up through the lip.
- **Wind.** The offshore preset is −5 m/s (`src/game/SurfConditions.ts:81`), which gives the veil 1 m/s of "excess". The Wave Lab allows ±12 m/s.
- **No haze above water.** Fog is only set underwater (`src/main.ts:1063`).

### Measurements [measured by others; code reports]
- **Pool saturation and spit speeds.** The spray pool was full on 17 % of Reef steps (9 % Point, 1 % Beach) at Hs 1.4 m, Tp 10 s. Spit speeds ran 3.7–10.5 m/s median, 27–35 m/s at the 90th percentile and 42–59 m/s fastest (`docs/research/whitewater-report.md:19-21`; Reef Part B: 59 m/s fastest, `docs/research/teahupoo-reef-report.md:289`).
- **CPU cost.** The spray update took 0.74–0.95 ms per step (same report).
- **GPU cost.** On the M4 Pro at High, turning spray and mist off changed GPU time by +0.15 ms at the Beach, which is noise (`docs/research/fps-report.md:169`).

### Screenshots [measured-here]
Water sheet at the Reef (`?inpage&waterSheet&spot=reef&whitewater`, CPU sea, 31 s settled, wind 0) on this M1, rendered through my own receiver port. Copies are in `img/`.
- `img/reef-foamball-rich-midday.jpg` and `img/reef-foamball-rich-sunset.jpg`: the collapsing tube's whitewater draws as clusters of round sprites. They read as cotton balls at midday and salmon blobs at sunset. There is no fine spray, veil, plume or haze.
- `img/reef-tube-shoulder-rich-sunset.jpg`: looking into the sun past the lip. No backlit spray glow; the lip alone carries the sunset.
- `img/reef-tube-inside-rich-sunset.jpg`: from inside the tube, the sprites above the lip read as orange discs against the sky.

### Why it reads wrong, by mechanism [inferred from the above and §2–3]
1. **Discs, not a veil.** A 6–14 cm opaque disc stands for a cluster of drops, but the optics of a cluster are set by its optical depth (§3), not by a constant 0.8. Real sparse spray is nearly clear; only the dense core of an impact is opaque white.
2. **No drop optics.**
   - Drops are lit isotropically. Real drops scatter about half their light within 5° of forward, and 77–79 % within 30° [computed, §3].
   - Mist's g = 0.6 gives a forward-to-side contrast of 21 at 10° against 90°. Mie for water drops gives 180–510.
   - So the backlit glow, the dark front-lit veil and rainbows are all missing.
3. **Launch physics.**
   - Spray starts at the water surface at impact points. Real spray comes off the rims of flying sheets (the lip's edge, the splash-up crown).
   - Small drops cannot be thrown high: a 0.2 mm drop launched at 10 m/s rises 14 cm [computed, §2f].
   - Height comes from the sheets' ballistic flight, and from the air for fine spray.
4. **Lifetimes.** Mist dies within 2.4–4 s and falls at 0.3–0.6 m/s. Fine spray (under 50 µm) takes 14 s to over 5 minutes to fall 1 m, and rides the wind [computed, §2f]. The lingering, rising plume can't appear.
5. **The budget clips the violence.** The pool is first-come, so when it is full the latest (often biggest) impact spawns nothing.
6. **The veil barely exists.** The onset uses absolute wind, 4 m/s, not wind plus wave speed. Particles launched at 0.5–1.5 m/s with a 0.3–0.6 m/s terminal speed rise about 3 cm, so the veil hugs the crest. And no air rises up the face to lift it.
7. **No haze.** The break never softens distant land or glows toward a low sun.

---

## 2. Where spray comes from, with numbers (Q1)

### 2a. Jet impact and splash-up

**Takeaway.** The spray comes in stages:
1. A short, near-vertical burst at jet impact and as the "indentation" between jet and splash closes.
2. A longer, forward-leaning burst from the splash-up and from large trapped bubbles bursting on the back face.
3. Fizz from small bubbles, which barely rises.

Counts scale with the jet's cross-section. Sizes follow two power laws that cross near 1 mm. Lab drops fly at about half to twice the jet speed, and the DNS gives up to 3–4 × the phase speed. Near full scale the impact splash lasts under 0.4 s and throws drops 2.5 m out and over 0.4 m up.

**Cited findings**
- [meas-lab] **Erinin, Liu, Wang, Liu & Duncan 2023, JFM 967 A36 ("Plunging breakers Part 2").** Three focused-packet plungers in fresh, clean water: f₀ = 1.15 Hz, λ₀ = 1.18 m, crests 108–112 mm, jet impact 1.90–2.01 m/s, crest speed 1.31 m/s (Part 1, table 2). Holography at 650 holograms/s, 1.2 cm above the crest, d ≥ 100 µm, 140 breaks per wave. — [arXiv 2210.01923](https://arxiv.org/pdf/2210.01923), [Part 1 arXiv 2210.01925](https://arxiv.org/pdf/2210.01925)
  - **Number:** 657, 839 and 1,122 drops per break per metre of crest (weak, moderate, strong). N grows "nearly linearly" with Qᵢ, the area under the jet at impact: 2,222, 3,457 and 4,134 mm². That is about 2.4–3.0 × 10⁵ drops per m² of jet area [computed from their tables].
  - **Timing:**
    - Region I-A (jet impact, first splash, indentation closure; 0 to 0.29–0.40 T₀): 28–35 % of drops.
    - Region I-B (splash-ups and large bubbles on the back face; to 1.15 T₀): 43–50 %.
    - Region II (small bubbles over the following crest; 1.15–2.3 T₀): 15–28 %.
  - **Sizes:** N(d) ∝ d^α below dᵢ and ∝ d^β above. α = −2.4, −2.1, −1.9; β = −5.4, −6.1, −5.8; dᵢ = 820, 1,140, 1,480 µm; largest drops 1.2 mm (weak) to 3 mm (strong). (The conclusion's sentence swaps "large" and "small"; the table is unambiguous.)
    - From these fits [computed]: Sauter diameter D₃₂ ≈ 0.5–1.1 mm. Spray water only 0.01–0.14 cm³ per metre of crest, or 6 × 10⁻⁶ to 3.5 × 10⁻⁵ of the jet's cross-section. Projected drop area 0.4–1.9 cm² per metre of crest.
    - So lab spray is optically negligible: glints, not a white cloud.
  - **Speeds and angles (2D, lab frame):**
    - Region I-A: mean 1.02 m/s at 8.9° from vertical.
    - Region I-B: 1.21 m/s at 33.9° downstream of vertical.
    - Region II: 0.74 m/s at 15.9°.
    - A few drops reach nearly 4 m/s (about 2 × the jet impact speed; the instrument's ceiling was about 4 m/s).
    - Region II drops "do not travel vertically more than a few centimeters".
    - A back-tracking model without air motion put 40 % of drops on smooth water. The authors read this as a "strong influence of the breaker-induced air motion".
- [model] **Mostert, Popinet & Deike 2022, JFM (3D DNS of deep-water plungers).**
  - Two droplet peaks, at (t − t_im)/T ≈ 0.2 (a secondary splash-up "projects directly upwards") and 0.5–0.6 (sustained splashing plus bubble bursting).
  - Size distribution close to r⁻².
  - Typical speeds ~c; the fastest ejections are 3–4 c, mostly for drops of radius 0.15–0.5 l_c (about 0.4–1.4 mm).
  - Many more drops at higher Bond number: under 100 at Bo = 200, up to about 800 at Bo = 1,000. Field Bo is about 10⁵.
  - "No clear correlation" between dissipation rate and droplet production.
  - — [arXiv 2103.05851](https://arxiv.org/pdf/2103.05851)
- [meas-lab, near full scale] **Chanson, Aoki & Maruyama 2002, Coastal Eng. 46.** A pseudo-plunging jet hitting at about 5.8–6.1 m/s gave a splash of "short duration (i.e., less than 0.4 s)" with "very small liquid fractions (i.e., less than 2%)". Some drops travelled up to 2.5 m and rose over 0.4 m. — [PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [model] **Tang, Adcock & Mostert 2025 (arXiv).** Splash drops come from ligaments on the rim of the expanding lamella where splash-up and wave collide. Drops pinch off ligament ends and grow as ligaments merge, up to about 2 mm; gravity ends the process. Splashing is argued to be an efficient, not a minor, source. — [arXiv 2510.02486](https://arxiv.org/pdf/2510.02486)
- [meas-lab, analogue] **Watanabe & Ingram 2016, Proc. R. Soc. A 472, 20160423.** Wave impacts on a wall in a flume with a 1:20 beach.
  - Up-rushing sheets grow cusps, "finger jets and ligaments", then drops, with size slopes −5/2 and −2.
  - The most spray came in the post-breaking case, where jets are "blown out by the collapse of an air pocket".
  - Spray rises faster than the parent jet.
  - This is the closest measured analogue for a tube's trapped air blowing spray out. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5095444/)

**Inferences**
- **Counts at field scale are unknown and much higher than in the lab.**
  - Drop size is set by surface tension, so Froude scaling fails. Mostert's counts climb steeply with Bond number, and Chanson warns Froude-scaled labs underestimate air entrainment.
  - The impact Weber number is also about 160× the lab's: about 9 × 10⁴ for an 8 m/s, 10 cm sheet, against about 570 for 2 m/s and 1 cm [computed].
  - Treat the lab 2.7 × 10⁵ per m² of jet area as a floor. The visible field fact is that a reef splash core is white, i.e. τ ≳ 15 (§3).
- **Timeline at field scale.**
  - Froude-scaling the lab (H ~ 0.1 m) to H ~ 2 m multiplies times by about 4.5. Region I-A becomes about 0–1.5 s, and Region I-B about 1.3–4.5 s [inferred].
  - Chanson's near-full-scale splash lasted under 0.4 s at 6 m/s.
  - Use a burst of about 0.4–1 s at impact, a second pulse from the splash-up and from any cavity collapse, then fizz as haze.
- **Spray is born on sheet rims, then slows to terminal speed within its drag length.**
  - Sheets (the lip, the splash-up crown, fingers) fly almost without drag and set the height.
  - Their rims shed drops, which lose their excess speed over v_t²/g: 5 cm for 0.2 mm drops, 1.6 m for 1 mm, 4.7 m for 2 mm [computed, §2f].
  - That is why impact spray reaches about the splash-up's height and no more, while fine spray needs moving air to go higher.

**Gaps**
- No field measurement of drop number, flux or liquid fraction in a surf-zone or reef splash.
- No field droplet speeds. Wang, Yang & Stern 2016 (JFM 792) remains paywalled; abstract only.

### 2b. Spit from a collapsing tube

**Takeaway.** Spit is air driven out of the tube's open end as the roof comes down, carrying aerated water and spray. It lasts 2–3 s (a surf reference). No one has measured its speed, volume or drop sizes. The mechanism gives the speed: air volume rate over mouth area. A 2D DNS gives an upper bound near 45–65 m/s. The game's model matches both.

**Cited findings**
- [anecdote] **Encyclopedia of Surfing.** "Compressed aerated water that blasts out horizontally from the mouth". A "bellows effect" as the ceiling collapses; "for two or three seconds a mixture of air and water are funneled out". Pipeline and Teahupo'o are classic spitters. — [eos.surf](https://www.eos.surf/encyclopedia/spit-spitter)
- [model] **Feddersen, Hanson, Mostert & Fincham 2024, JFM ("Modeling wind-induced changes to overturning wave shape", 2D Basilisk).**
  - At a 2D jet impact the trapped air pressure jumps to p̃ = 0.08, "20× to 40× larger" than during shoaling.
  - A progressive 3D overturn "always has an overturn volume open to one spanwise side", inducing airflow out of it and a pressure drop that 2D can't capture.
  - Scale: Re_w = 4 × 10⁴ and Bo = 4,000, against the field's 1.4 × 10⁷ and 3.6 × 10⁵.
  - — [PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- [meas-lab, analogue] Watanabe & Ingram 2016 (§2a): an air pocket collapsing between an overturning jet and a wall blows out jets of spray, and gives the largest spray population they measured.
- [code] The game's spit uses the escaping air rate over the mouth's void area, capped at √(ρw/ρa)·√(gW/2) (`PlungingLip.ts:41-50, :968-972`). Measured spits: 3.7–10.5 m/s median, 42–59 m/s fastest (§1).

**Computed bound [computed, inferred scaling].** If p̃ is scaled by ρw g h₀ (the paper scales lengths by h₀ and speeds by √(g h₀)), then Δp = 0.08 ρw g h₀. That is 1.2–2.4 kPa for h₀ = 1.5–3 m, and Bernoulli gives air at √(2Δp/ρa) ≈ 45–63 m/s. The game's own cap gives 35–79 m/s for voids of 0.3–1.5 m. Both are ceilings: in 3D the air leaves as the pressure builds, so real spits should sit well below them except in a closing section.

**Inferences**
- **Speed and duration.**
  - Spit speed ≈ (void area / mouth area) × (closing length / collapse time). A 5–10 m section collapsing in about 0.35 s through a mouth of similar area gives about 15–30 m/s [inferred].
  - The collapse runs section by section for about 2–3 s (the surf reference), so spit is a train of pulses, not one puff.
- **The spray it carries.**
  - Mostly fine, torn from foam and splash inside the tube. Drops under about 0.2 mm follow the air within 0.07 s (§2f); larger drops fly on ballistically.
  - It leaves along the tube axis and spreads and slows like a turbulent jet [inferred].
  - Fine and dense, it glows hard when backlit: the classic sunset spit.
- **Eruptions** (air bursting up through the lip where a section closes all at once) are the "blown out by the collapse of an air pocket" case of Watanabe & Ingram [analogue].

**Gaps.** No measurement of spit speed, volume, duration or drops, at any scale. A 3D Basilisk run of a closing section could size it, but it would be expensive, and 2D cannot vent.

### 2c. Wind-driven spray off the crest and lip (the offshore "veil")

**Takeaway.** Spume drops are torn off crests once the wind shear is large enough; the usual onset is U₁₀ ≈ 7–11 m/s. At a surf break the air that matters is relative to the crest: offshore wind plus the wave's own speed. Veron notes the phase speed alone "may be sufficient" near the coast. Spume radii are 10–500 µm (peak about 100 µm), up to millimetres. These drops follow the air within a few centimetres. They rise with the flow up the face, separate at the crest and stream back seaward, falling at about 0.7 m/s. How much spray, as a function of wind, is not measured for surf zones: open-ocean estimates span six orders of magnitude.

**Cited findings**
- [review] **Veron 2015, Annu. Rev. Fluid Mech. 47.**
  - Spume needs a wind above about "7–11 m s⁻¹" (citing Andreas et al. 1995; Andreas 2002).
  - "In coastal areas, the phase speed of the wave may be sufficient …".
  - Spume radii are usually taken as r₀ = 10–500 µm, peaking near 100 µm; 2 mm seen in the lab (Veron et al. 2012), 6 mm (Anguelova et al. 1999).
  - Mechanisms: turbulent fragmentation of crest globules, and "bag breakup".
  - Initial speeds are thought to scale with wind at the crest, but "no available data" confirm it.
  - Splash drops come from the plunging jet's splash-up and fall back fast without wind.
  - — [PDF](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Veron-2015-spray-annurev.pdf)
- [meas-lab] **Troitskaya et al. 2017, Sci. Rep. 7:1614.** Bag breakup (sail-like films about 1 cm across, living about 10 ms, about 100 drops each: film drops about 100 µm radius and rim drops about 1 mm) becomes dominant above u* ≈ 0.9–1 m/s, i.e. U₁₀ ≈ 20 m/s, Beaufort 8, "spindrift". Their fitted event rate is N = N₀ (U₀²/u*²) e^(−U₀²/u*²), with U₀ = 2 m/s and N₀ = 3.73 × 10³ m⁻² s⁻¹. — [Nature](https://www.nature.com/articles/s41598-017-01673-9)
- [meas-lab] **Erinin, Néel, Ruth, Mazzatenta, Jaquette, Veron & Deike 2022, GRL 49.** Wind-forced breaking with free-stream wind 9.0–11.4 m/s (U/c ≈ 6–11).
  - Size distribution: d⁻¹ from 30 to 600 µm, d⁻⁴ above.
  - Horizontal drop speeds about 4–15 m/s (the paper writes "u = 15–4 m/s"), many small drops faster than the mean wind; the mean falls about 0.2 m/s per 100 µm of diameter. Vertical −3 to +6 m/s.
  - — [PDF](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2023/01/JGR_Erinin.pdf)
- [meas-lab, method only] Erinin 2023 Part 2 intro: droplet production estimates "can vary over six orders of magnitude" (citing Andreas 1998).
- [model] **Feddersen et al. 2024 (2D DNS).** Offshore wind: laminar flow up the front face, which then "separates with a trail of quasi-regular vortices ejected off of the back face"; near overturning the separation near the crest is "more intense". — [PDF](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)

**Inferences**
- **Onset.** Use the relative speed |U_offshore| + c at the crest, and start the veil where it passes about 9 m/s (the middle of 7–11). With c ≈ 5–6 m/s at H ≈ 1.5–2 m, the veil appears from about 3–4 m/s of offshore wind on big faces, and needs more on small ones [inferred]. The game's 4 m/s absolute onset ignores c, and its −5 m/s preset gives almost nothing.
- **Lift.** Wind blowing up a steep face rises with it. Near the crest the vertical air speed is of order |U| × the face slope, then the flow separates [inferred from the DNS flow pattern]. The veil therefore rises 1–3 m above the lip, then streams back and falls behind the wave. Without that updraft the particles cannot rise.
- **Hang time and drift [computed, §2f].** From 2 m above the crest:
  - 200 µm drops stay up 2.8 s and drift 14 m at 5 m/s;
  - 100 µm drops stay up about 8 s and drift about 40 m;
  - 50 µm drops stay up about 27 s and become haze.
- **Amount.** Unconstrained. Keep today's square-law rate on the excess, marked provisional, and tune it visually against the optical-depth rule (§3).

**Gaps.** No surf-zone or reef measurement of veil rate, height or drop sizes under offshore wind. No measured updraft over a breaking face.

### 2d. Spray from the bore or roller front

**Takeaway.** The broken wave's front throws millimetre drops forward, faster than the front, at 30–45°, from fingers and crowns at the toe. At field bore speeds of 4–6 m/s they reach about 0.3–1.5 m. Behind the front, bubble bursting adds fizz. Beach-break haze decays from the surface over 1.5–3 m and never reaches 19 m.

**Cited findings**
- [meas-lab] **Wüthrich, Shi & Chanson 2021, JFM 924 A20** (breaking bores, Fr₁ 2.1–2.4).
  - Drops are "constantly ejected", mostly in the first part of the roller, from fingers and helices pinching off.
  - Ejection angles 16.8–83.1° (Fr 2.4), with modes near 30° and 45°.
  - Speeds peak at about 1.5 × the bore celerity, i.e. ahead of the front.
  - Diameters peak at 2.5–3 mm (means 2.8 and 3.3 mm).
  - Trajectories match drag-free ballistics.
  - — [PDF](https://staff.civil.uq.edu.au/h.chanson/reprints/Wuthrich_Shi_Chanson_jfm_2021.pdf)
- [meas-field] **Porter et al. (SEAS, Bellows Beach, Oahu).** Beach waves with 0.5–1 m faces, wind 4.7 m/s: extinction about 5.7 × 10⁻⁴ m⁻¹ at 0.5 m, 4.2 × 10⁻⁴ at 1.5 m and 2 × 10⁻⁴ at 2.5 m, background (about 5 × 10⁻⁵) by about 5 m (their Fig. 16). Beach spray does "not reach up to 19 m". — [PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)

**Computed [computed]:** drops at v₀ = 1.5c with quadratic drag (v_t 9 m/s for 3 mm drops, 3.9 m/s for 1 mm):

| c | Angle | 3 mm drop: height, range | 1 mm drop: height, range |
|---|---|---|---|
| 4 m/s | 30° | 0.40 m, 2.5 m | 0.29 m, 1.4 m |
| 4 m/s | 45° | 0.78 m, 2.8 m | 0.51 m, 1.5 m |
| 6 m/s | 30° | 0.80 m, 4.6 m | 0.47 m, 2.1 m |
| 6 m/s | 45° | 1.51 m, 4.9 m | 0.81 m, 2.0 m |

**Inference.** The game's bore spray leaves with the water's velocity (below c) and an upward 0.16–0.4 √(gh) (`SprayCloud.ts:404-409`). That is too slow and too low by about 2×, and it is not thrown ahead of the front. Emit from the toe line (round 3's roller build) at 1.5c, at 30–45°.

### 2e. Mist and haze from bubble bursts (film and jet drops)

**Takeaway.** Bursting bubbles make film drops (mostly under 1 µm; up to hundreds of µm from big bubbles) and jet drops (2–100 µm, peak about 10 µm). Film drops leave at 20–30 m/s but stop within millimetres. Jet drops rise 10–20 cm at most. None is visible alone. Together, lifted by turbulence and wind, they are the salt haze and the plumes over breaks. In a game they belong in a haze field, not in particles.

**Cited findings**
- [review] **Veron 2015.**
  - Film drops r₈₀ 0.01 to 1–2 µm; their number grows with bubble size, to hundreds for bubbles of 3–5 mm radius; "ejection velocity … can reach 20 to 30 m s⁻¹". Bubbles under 0.5–1 mm radius probably make no film drops.
  - Jet drops r₀ 2–100 µm (peak about 10 µm); up to 5–6 per bubble; none from bubbles above about 1.5 mm radius. Speeds from 8 m/s (top drop) to 0.3 m/s. "Ejection heights on the order of 10–20 cm" for large jet drops.
  - Timescales: an r₀ = 100 µm drop barely evaporates by 2 s and reaches its equilibrium radius (47 µm in his example) after about 200 s. Timescales grow as r², so an r₀ = 1 µm drop equilibrates in under about 1 s.
  - — [PDF](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Veron-2015-spray-annurev.pdf)
- [meas-lab] Erinin 2023 Part 2: small-bubble drops of at least 100 µm (Region II, 15–28 % of the total) rise only "a few centimeters".
- [meas-lab] Troitskaya 2017: under strong wind, only about 5 % of large underwater bubbles reached the surface to burst.
- [meas-field] Round 1: surf aerosol flux scales with wave dissipation (van Eijk et al. 2011, abstract), and is undiminished 16 km downwind.

**Inference.** Feed a haze source from the foam and aeration fields (degassing plus dissipation). Spend no sprites on film or jet drops.

### 2f. Heights, lifetimes and drift (drop physics)

[computed] Terminal speeds of spherical water drops in air, from the Clift–Gauvin drag correlation quoted by Veron (2015, eq. 8). They match Gunn & Kinzer's measurements to 0.5 mm, and drops over 1 mm flatten and fall a little slower (Gunn & Kinzer: about 6.5 m/s at 2 mm). Script: `scratchpad/spray/mie/terminal.py`.

| Diameter | v_t (m/s) | Drag length v_t²/g | Time to fall 1 m | 10 m | Rise if thrown up at 10 m/s |
|---|---|---|---|---|---|
| 10 µm | 0.003 | 1 µm | 5 min | 54 min | 8 µm |
| 20 µm | 0.012 | 15 µm | 82 s | 14 min | 0.1 mm |
| 50 µm | 0.073 | 0.5 mm | 14 s | 137 s | 3 mm |
| 100 µm | 0.25 | 7 mm | 3.9 s | 39 s | 2.4 cm |
| 200 µm | 0.72 | 5 cm | 1.4 s | 14 s | 14 cm |
| 500 µm | 2.06 | 0.43 m | 0.5 s | 4.9 s | 0.69 m |
| 1 mm | 3.9 | 1.6 m | 0.26 s | 2.6 s | 1.6 m |
| 2 mm | 6.8 | 4.7 m | 0.15 s | 1.5 s | 2.7 m |
| 3 mm | 9.0 | 8.3 m | 0.11 s | 1.1 s | 3.3 m |

**What follows [inferred from the table]:**
- A drop's own launch sets height only for millimetre drops. Anything under about 0.3 mm goes where the air takes it within a few centimetres.
- Visible spray (0.1–3 mm) falls back in seconds.
- Mist (10–100 µm) lingers for tens of seconds to minutes, drifting with the wind.
- Evaporation doesn't make visible spray vanish (Veron's 100 µm drop keeps its size for 2 s).

### 2g. Plumes and haze over the break (field)

**Cited findings** [meas-field] Porter, Lienert, Sharma & Lau, SEAS lidar, Bellows Beach, Oahu, April 2000. Trade winds averaged 7 m/s; the reef is 1.5–2 km offshore. — [PDF](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)
- **Heights.** Reef plumes reached 35 m; mean spray scattering reached 25–30 m, matching earlier kite data; spray from breaking waves "confined to below 40 m".
- **Episodic.** About half the time there were no reef plumes.
- **Drift.** In onshore wind, plumes stayed "fairly concentrated" for 1 km downwind.
- **Mean extinction about 150 m downwind of the reef:** 7.9 × 10⁻⁴ m⁻¹ at 0–10 m, 5.2 × 10⁻⁵ at 10–20 m, 4.7 × 10⁻⁵ above 20 m (background). Averaged over time, so active sets are "much larger".
- **Beach break:** 2.8 × 10⁻⁴ m⁻¹ averaged over 0–5 m (profile in §2d).
- **Reef plumes look larger-particled** than the air around them (lidar 1064/532 nm ratios).

**Computed.** The Meteorological Optical Range, where a beam falls to 5 % (IALA definition; Beer–Lambert), is 3/σ ([IALA](https://www.iala.int/wiki/dictionary/index.php/Meteorological_Optical_Range)):

| Extinction σ | MOR |
|---|---|
| 5 × 10⁻⁵ m⁻¹ (background) | 60 km |
| 5.7–7.9 × 10⁻⁴ m⁻¹ (near breaks, mean) | 3.8–5.3 km |
| 10⁻² m⁻¹ (a plausible dense set plume) | 300 m [inferred] |

**Inferences**
- Surf haze is subtle up close and strong over kilometres. It softens headlands and the far shore, and brightens toward a low sun.
- Reef plumes are tall (tens of metres), episodic with sets, and drift downwind for about a kilometre.
- Beach breaks keep a low haze band 1.5–3 m thick.
- An unverified earlier search summary claims 120 m plumes in 5 m/s winds and 600 m under light winds (Sharma et al.); not opened, not used.

---

## 3. How spray looks, and why (Q2)

### Mie optics of water drops [computed with miepython 3.3.0, 550 nm, m = 1.333 (fresh) and 1.339 (sea); script `scratchpad/spray/mie/mie_drops.py`]

| Radius | Q_ext (fresh) | g (fresh) | g (sea) |
|---|---|---|---|
| 2 µm | 2.13 | 0.79 | 0.82 |
| 5 µm | 2.11 | 0.84 | 0.84 |
| 10 µm | 2.03 | 0.86 | 0.87 |
| 25 µm | 2.02 | 0.87 | 0.88 |
| 50–500 µm | 2.01–2.03 | 0.88 | 0.88 |

- **Extinction is twice the geometric cross-section at every size that matters.** Bohren states it: extinction by "any large particle is twice its geometrical cross section". It does not depend on wavelength, which is why spray is colourless.
- **The scattering is strongly forward** (monodisperse, one wavelength):
  - 46–51 % of scattered light falls within 5° of forward and 77–79 % within 30°. The diffraction spike's half-width is 0.8° (r = 10 µm) and 0.08° (r = 100 µm).
  - The phase function at 10° over its value at 90° is 178 (r = 10 µm) and about 510 (r = 100 µm). Henyey–Greenstein gives 242 with g = 0.86, but 21 with the game's g = 0.6.
  - Backscatter shows the rainbow near 138–142° and a glory at 180° for small drops; HG has neither.
- **Absorption is negligible inside a drop.** Water absorbs about 0.057 m⁻¹ at 550 nm (Pope & Fry 1997, via the graphics page), so a 1 mm path absorbs about 6 × 10⁻⁵. The single-scattering albedo is about 0.9999: spray is white, not blue, unless light travels metres through it.
- **Practical phase functions:**
  - For fog and mist of 5–50 µm diameter, the Jendersie & d'Eon HG + Draine blend matches Mie over the forward half ("95% of the total scattered signal"). Its fitted parameters: g_HG = exp(−0.0990567/(d − 1.67154)), g_D = exp(−2.20679/(d + 3.91029) − 0.428934), α = exp(3.62489 − 8.29288/(d + 5.52825)), w_D = exp(−0.599085/(d − 0.641583) − 0.665888), with d in µm ([PDF](https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf)). It "fails to produce" the fogbow and glory.
  - For drops of 0.1–3 mm, HG with g ≈ 0.87–0.88 plus a separate rainbow term.

### Why dense spray is white and sparse spray clear [model: Bohren 1987; computed]
- **Optical depth from water content.** Bohren's eq. 17 gives τ = N C_ext h = f (C_ext/v) h. With C_ext = 2πr² and v = 4/3 πr³ this becomes τ = 1.5 · f · h / r = 1.5 · w / r, where w = f h is the water per unit area (a depth). — [Bohren 1987, Am. J. Phys. 55, 524](https://patarnott.com/atms749/pdf/BohrenMultipleScattOpus.pdf)
- **Whiteness (two-stream, non-absorbing):** R = τ*/(2 + τ*) and T = 2/(2 + τ*), with τ* = (1 − g)τ. Bohren uses g = 0.85 for cloud drops. With g = 0.87 [computed]:

| τ | Front-lit reflectance R | Total transmission T | Direct (see-through) e^−τ |
|---|---|---|---|
| 0.3 | 0.02 | 0.98 | 0.74 |
| 1 | 0.06 | 0.94 | 0.37 |
| 3 | 0.16 | 0.84 | 0.05 |
| 10 | 0.39 | 0.61 | 5 × 10⁻⁵ |
| 15 | 0.49 | 0.51 | ~0 |
| 30 | 0.66 | 0.34 | 0 |
| 100 | 0.87 | 0.13 | 0 |

**What follows [inferred from the table]:**
- **Sparse spray (τ ≲ 1)** hides little of what's behind it and reflects almost nothing toward a front-lit viewer. It shows as a faint grey veil with sparkles.
- **Backlit, it glows,** because nearly all its scattered light goes forward.
- **Opaque white needs τ ≳ 15** (R ≈ 0.5 or more).
- **Thick splash cores are dark when backlit** (T falls to 0.13 at τ = 100), with bright thin edges: the "silver lining" of clouds.
- **Worked numbers:**
  - Near impact, liquid fraction 0.5–2 % (Chanson's ceiling) with r₃₂ ≈ 0.25–0.55 mm gives τ ≈ 15–120 per metre: white.
  - A 1 cm sheet torn into 0.5 mm drops gives τ ≈ 30: white.
  - The same water spread over 30× the area gives τ ≈ 1: translucent.
  - This is the physics behind Surf's Up's clear-to-white attribute and its "dense near the lip, dispersing into mist" rule.

### Backlit glow, rainbows and haze
- **Backlit glow** [computed]: with half the light inside 5° and a steep lobe, sparse spray and mist seen within 10–30° of the sun are orders of magnitude brighter than at 90°. With the sun behind the viewer, sparse spray is dark except where rainbow or glory angles fall.
- **Rainbows** [computed with geometric optics; Atmospheric Optics]:
  - Primary bow at 42.4° (red, m = 1.331) to 40.5° (violet, m = 1.344) from the antisolar point; secondary at 50.4–53.7°, with a darker band between.
  - Sea water refracts more, so its bow is "slightly smaller (by ~0.8°)" ([atoptics](https://atoptics.co.uk/blog/sea-water-rainbow/)).
  - Needs single scattering (τ ≲ 1) and round drops over about 0.1 mm.
  - Mist near 10 µm radius gives a broad, whitish fogbow: my monodisperse Mie peak sits at 37.5° against 41.1° for 100 µm drops.
  - The low suns at dawn and sunset (2.1° and 6.1°, `SurfConditions.ts:83-91`) put the bow's top about 36–40° above the horizon. At midday (47.9°) a bow shows only in spray below eye level, seen from above.
- **Haze colour** [meas-field and inferred]: sea-salt particles of 1–25 µm scatter almost neutrally, and the plumes are larger-particled (Porter's wavelength ratios). Surf haze is grey-white, brightest toward the sun (g ≈ 0.8–0.87 at 2–10 µm, computed), and blue only in the far background air.

---

## 4. How films and games render spray, and at what cost (Q3)

### Film practice [prod]
- **Surf's Up (Sony Pictures Imageworks, SIGGRAPH 2007 course notes, pp. 80–85, 96–97)** — [PDF](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
  - **Three elements:** whitewater (the forward explosion where the lip hits the trough), lip spray (spray "ripping back off the lip as it falls") and the foam ball.
  - **Crash curve.** Whitewater is born on the "crash curve", a line carved along the lip where it hits the trough.
    - Its vertices carry `energyMult` (on where the lip has crashed) and `energy` ("greatest when it first crashed"). Their product sets launch speed.
    - Direction, dispersion, pulsing and the lower "skirt" were artistically directed. Gravity, drag and speed were changed "in non-real world ways".
    - The rig previewed it in real time by casting rays along the lip in the direction of interpolated "spill vectors" ([Making Waves](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)).
  - **Lip spray.** A roughening displacement ("lip trains") switched on partway through the break. Its peaks were shaded brighter and were the lip spray's source.
    - Spray was born from an up-rezzed strip of the displaced lip, "tight, densely clustered" near the lip and "dispersing into mist".
    - Too dense looked "pasted on"; too sparse gave away that the water wasn't breaking up. Occlusion was varied over the particles' first moments.
  - **Mist.** "Whitewater mist" was a secondary simulation born from the whitewater to "drag and hang in the air". It and fine spray were drawn with the Splat sprite renderer.
  - **Clear to white.** Particles went from "clear refractive water to a white aerated appearance" by proximity and time attributes.
  - **Lighting.** Deep shadows from key, rim and fill lights, plus glint and density passes.
  - **Counts.** Clustered RiPoints: about 45 million motion-blurred points per render. A big Mavericks shot "could easily reach 500 million". Each beach stored about 200 GB of pre-simulated whitewater ([beach-break PDF](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)).
- **Moana (Disney 2017, "Crashing Waves").** Whitewater was emitted from the wave deformer's stored peak area, with launch velocity from the deformer. Huge wave trains instanced 10 pre-simulated crashing-wave particle caches, "deformed to match the shape", with time offsets. — [PDF](https://media.disneyanimation.com/uploads/production/publication_asset/164/asset/Moana_Crashing_Waves.pdf)
- **Avatar (Wētā, Loki):** coupled spray and mist solvers (round 1).

### Games [prod]
- **True Surf (Meta blog).** Their main rendering problem was "all the white water, looking okay from any angle, and not killing …", with the camera going "in the barrel". The wave came from blended "2D animations of vertical slices" and later "a custom 2D water simulation". No counts given. — [meta.com](https://www.meta.com/blog/true-surf-launch/)
- **Crest Ocean System**'s docs describe foam only: whitecaps where waves are "pinched", and shoreline foam in shallow water. I found no spray, splash or mist system in them. — [docs](https://crest.readthedocs.io/en/latest/user/water-appearance.html)
- **AMD, Thomas (GDC 2014), compute GPU particles.** On an R9 290X at 1080p, rasterised particles took 4.86 ms against 3.15 ms for tiled compute rendering, and 25.0 against 5.1 ms under heavy overdraw. Breakdown: simulation 0.39 ms, culling 0.49 ms, render 1.60 ms. — [PDF](https://media.gdcvault.com/GDC2014/Presentations/Gareth_Thomas_Compute-based_GPU_Particle.pdf)
- **GPU Gems 3, ch. 23 (Cantlay), off-screen particles.** Particles drawn at 1/16 of the pixels, with a full-resolution pass only at edges. Result: 51 against 25 fps; 3.5 against 46.9 million particle pixels, on an 8800 GTX at 1600 × 1200. — [NVIDIA](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles)
- **Weighted blended OIT (McGuire & Bavoil 2013).** Two render targets plus a composite pass. Avoids "sorting artifacts and popping for particle systems", but its weights "must be tuned". — [blog](https://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html)
- **Chentanez & Müller 2010.** Spray drawn "as an elongated ellipse along the direction of their velocity to emulate …"; about 220k particles on a 2010 GPU (round 1).
- **Apple's tile-based GPUs.** The GPU shades "only the visible primitives" and blends in fast tile memory, "in draw call order" ([Apple](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering)). Hidden-surface removal cannot skip blended layers, so every translucent layer is shaded [inferred]. Blending itself is cheap; fragment work and sprite count are the cost.

### Measured here on the M1 Air [measured-here]
MacBook Air M1 (7-core GPU, 8 GB), Chrome, WebGL2 through ANGLE Metal. Canvas 2240 × 1260, matching the M4 survey's High canvas. Each figure is the slope between 5 draws and 1 draw inside one timer query, 30 frames each, medians. The machine was shared (load average 8–53 from other sessions), and ANGLE Metal timers can include overlapping GPU work, so read these as ±50 %. Maximum point size is 511 px (`ALIASED_POINT_SIZE_RANGE`). Scripts: `scratchpad/spray/bench/bench.html`, `run2.mjs`, `run3.mjs`, `tf.html`, `runtf.mjs` (the scratchpad may be deleted).

| What | Result |
|---|---|
| Large blended sprites (256–16,384 sprites covering 16.8 Mpx, about 6 screens) | 0.6–1.2 ms: **0.04–0.09 ns per pixel**, or 0.12–0.25 ms per full-screen layer |
| Many tiny points (2 px): 16k / 65k / 262k | 0.62 / 1.0–1.7 / 3.2–3.5 ms: **12–38 ns per sprite** |
| Many tiny instanced quads (2 × 2 px): 16k / 65k / 262k | 0.77 / 1.1–1.3 / 9.7–10.3 ms: **20–47 ns per sprite** |
| Velocity streaks as instanced quads (16k × 64 × 4 px; 65k × 16 × 4 px) | 1.1–1.6 ms for 4.2 Mpx (about 0.25 ns per pixel: thin quads waste shading) |
| Fixed cost of a half-resolution spray buffer (clear plus full-screen composite) / quarter | 0.43–0.51 / 0.31–0.34 ms |
| GPU spray update (transform feedback: drag toward wind, gravity, landing test against a height texture): 16k / 65k / 262k / 1M | 0.03 / 0.10 / 0.36 / 1.06 ms: **1.0–1.6 ns per particle** |
| CPU `SprayCloud.update` (Node 22, pool kept full): 4k / 16k / 65k | 0.75 / 3.2 / 11.2 ms per step: **0.18–0.2 µs per particle** (matches the report's 0.74–0.95 ms) |

**Inferences**
- Sprite count, not fill, limits the M1: 262k sprites cost 3–10 ms before any pixels are shaded.
- Simulation on the GPU is almost free: 262k particles in 0.36 ms.
- The CPU pool can grow to about 16k (+2.5 ms per worker step on the M1) and no further.
- On the M4 Pro expect about 3× faster [inferred from 20 against 7 GPU cores; not measured]: about 1 ms for 262k points, about 0.05 ms per full-screen layer.
- The M4 Pro frame has about 3.7 ms of GPU headroom at High and 120 Hz (4.57 ms of 8.3 ms, `fps-report.md`).

---

## 5. What to change, ranked by payoff against cost (Q4)

Everything below is Rich-only and cosmetic. Online, spray, mist and haze may differ between players; the lip, the tube and anything collided stay as they are. Classic stays byte-identical. The Rich spray is a separate path (its own shader, its own emitters and its own pool), so Classic's `SprayCloud` path, its random stream and its 4,096 pool are untouched. Shared constants such as `SPRAY_CAPACITY`, `SPRAY_PER_FOAM` and `FEATHER_*` must not change for Classic.

### 1. Spray drawn by optical depth
The idea: each sprite carries water, drop size and velocity, and its opacity and colour come from the optics. This fixes the "discs" read.
- **Numbers to hit:**
  - Opacity 1 − e^−τ with τ = 1.5 w / r₃₂.
  - r₃₂ by source: splash 0.25–0.55 mm (Erinin fits); veil and spit about 0.05–0.1 mm (spume peak r₀ ≈ 100 µm); bore drops about 1.5 mm (Wüthrich).
  - Front-lit reflectance R = τ*/(2 + τ*) with g = 0.86–0.88.
  - Forward lobe: HG with g ≈ 0.87 for drops; the HG + Draine fit for mist, d = 5–50 µm.
  - Direct see-through e^−τ.
  - Clear when young: sheets and ligaments take the lip's refractive look until they fragment (Surf's Up).
  - Stretch along screen velocity by the frame's travel (8 m/s at 10 m is about 15 px at 1080p per 1/60 s, inferred).
  - Rainbow band at about 39.8–41.6° from the antisolar point for sea water, secondary about 50–53°, only where τ ≲ 1 and r ≥ 0.1 mm.
  - Fade sprites larger than about 10–15 % of the screen height (True Surf's overdraw lesson; ANGLE caps points at 511 px).
- **The player sees:** spray that looks like water. A white core at impact thins into a translucent veil. Backlit spray and spit glow gold at sunset. Front-lit spray goes faint and sparkles. A rainbow sometimes hangs in the spray with the sun behind the camera. Streaks show speed.
- **Cost:** shader-only plus 3–4 floats per particle.
  - At today's ≤ 5k sprites: < 0.3 ms on the M1 Air, < 0.1 ms on the M4 Pro (estimate from the fill and sprite costs above).
  - Streak quads cost about 1.5× points per pixel on the M1 (measured). Use points or short quads for small drops.
- **Risk:** sparse spray becomes much less visible front-lit. That is physical, but a look change (owner decision 1).

### 2. Staged emission from the right places, with a budget that never clips impacts
Fixes "no explosion" at the Reef and spit that doesn't read.
- **Numbers to hit:**
  - **Impact burst** 0.4–1 s (Chanson < 0.4 s at 6 m/s; about 1 s by Froude scaling, inferred). Near-vertical (mean 81° above horizontal), speeds about 0.5–2 × the jet impact speed (Erinin) up to 3–4 c (Mostert).
  - **Splash-up rim shedding** during the sheet's flight (Tang et al.; Watanabe & Ingram), about 45–50 % of drops over the following 1–4 s.
  - **Spit** as 2–3 s of pulses along the tube axis. Keep today's speed model, with a 2D-DNS ceiling of about 45–65 m/s; mostly fine, forward-scattering spray.
  - **Bore spray** from the toe line at 1.5c and 30–45° (Wüthrich), reaching 0.3–1.5 m.
  - **Bubble fizz** goes to haze, not particles.
  - **Budget:** reserve room for impact bursts and evict the oldest, farthest or faintest first. Scale emission with jet cross-section (Erinin: N ∝ Qᵢ) × V² (energy, as today).
  - When the swept surface lands, emit along its lip (lip trains) and its crash curve, energy greatest at first crash (Surf's Up), from the profile library's jet and splash-up kinematics.
- **The player sees:** a reef slab that explodes, then hangs; spit shooting out of the mouth in pulses; the bore throwing spray ahead of itself; no more "the spray ran out".
- **Cost:**
  - Logic in the worker is about the same as today.
  - Raising the Rich pool to about 16k costs +2.5 ms per step on the M1 (measured) and about +1–1.5 ms on the M4 Pro (inferred ~2× CPU). Keep 4k on the M1 Air by benchmark (the existing "CPU fallback by benchmark" rule).
  - Rendering 16k sprites: about 0.6 ms on the M1 (measured), about 0.2 ms on the M4 Pro (inferred).
- **Depends on:** spray height follows the splash-up. `SPLASH_UP` (0.6 vertical) is provisional water physics. Its sourced replacement comes from the Basilisk profiles, not from this round.

### 3. Salt haze and a lingering plume
- **Numbers to hit:**
  - Background σ ≈ 5 × 10⁻⁵ m⁻¹.
  - Near breaks, a mean of about 3–8 × 10⁻⁴ m⁻¹ at 0–10 m, several times higher during sets.
  - Height scale about 1.5–2 m at beach breaks; reef plumes to 25–35 m (under 40 m).
  - About half the time no reef plume.
  - Drift downwind about 1 km.
  - Forward-scattering (g ≈ 0.8–0.87), near-neutral grey-white (Porter; computed).
  - Source: dissipation plus bubble degassing (the foam and aeration fields).
- **The player sees:** distance and scale. Headlands soften, the sun side glows, and a reef set leaves a plume drifting off.
- **Cost:**
  - Inline height fog in Rich materials: a few ALU per pixel, estimated < 0.1 ms on both machines.
  - A full-screen haze pass: about 0.3–0.5 ms on the M1 (by analogy with the measured composite pass), about 0.1 ms on the M4 Pro (inferred).
  - A coarse haze grid advected in the worker is negligible (estimate).
- **Risk:** it changes every Rich shot, including the sky's blend (owner decision 2).

### 4. The offshore veil off the lip
- **Numbers to hit:**
  - Onset where |U| + c exceeds 7–11 m/s (Veron; coastal note).
  - Lift from air rising up the face, then separation at the crest (Feddersen 2024 flow pattern; the updraft itself is inferred).
  - Drops r₀ 10–500 µm (peak ~100 µm): falling at about 0.7 m/s for 200 µm diameter, airborne about 3 s per 2 m of lift, drifting |U| × t downwind (computed).
  - Amount provisional (square law on the excess, as today).
  - Drawn as soft sprites or a ribbon along the lip (lip trains), strongly forward-scattering: this is where rainbows show.
- **The player sees:** the iconic offshore look at Padang and the Reef. A veil blowing back off every lip, glowing into a low sun.
- **Cost:** low (hundreds of sprites or one ribbon, about 0.1 ms).
- **Risk:** no measured veil rate, so it is provisional (owner decision 4).

### 5. A tube camera that survives spray
- **Numbers to hit:** fade sprites by projected size; cap near-camera overdraw. Turn a half-resolution spray buffer on only when spray fills the view: it costs 0.43–0.51 ms on the M1 (measured) and saves fill once there are more than about 3–4 full-screen layers at 0.12–0.25 ms each.
- **The player sees:** a steady frame rate inside the barrel while spit and spray blow past; no sprites popping at 511 px.
- **Cost:** low. **Risk:** half-resolution edges (Cantlay's edge pass fixes them).

### 6. GPU spray (WebGL2 transform feedback in the renderer's own context, reading the water-height texture it already binds)
- **Numbers to hit:** the same physics as change 2, with 50–250k particles.
- **The player sees:** denser, finer explosions and plumes at the Reef.
- **Cost:**
  - Simulation 0.1–0.36 ms for 65–262k on the M1 (measured).
  - Drawing 1–3.5 ms (points) or up to 10 ms (quads) for 65–262k on the M1 (measured); about a third of that on the M4 Pro (inferred).
  - Development: medium to high. Emitters stream in from the worker; there is no WebGPU renderer, since the game renders with three.js `WebGLRenderer` (`src/main.ts:214`).
  - Budget by benchmark: about 30–60k sprites on the M1 Air, 100–250k on the M4 Pro.
- **Why later:** changes 1–2 fix most of the look at today's counts.

### 7. Rainbows and the silver lining
Part of change 1; nearly free. Listed separately because it is optional.

---

## 6. Decisions only the owner can make

1. **Physical spray optics in Rich.** Sparse spray goes nearly invisible front-lit and bright backlit. This is physically right but changes many shots. Or keep a readability floor, as Surf's Up bent physics for readability.
2. **Haze above water in Rich.** Scene-wide, dynamic with sets or static per spot. Classic stays haze-free.
3. **Budget route.** Grow the CPU pool now on the M4 Pro only, by benchmark (+1–2.5 ms per worker step), or build GPU spray now or later. How much the M1 Air may drop.
4. **Accept provisional models where nothing is measured:** spit speed and volume, veil rate and lift, and field-scale drop counts. Or commission a 3D Basilisk closing-section run for the spit (expensive; 2D can't vent).
5. **Rainbows:** in or out.
6. **Sequencing.** Shading and haze now, and emission after the swept surface's lip and crash curve exist (my recommendation). Or emission now on today's per-column parcels, which will show their teeth.
7. **Tube camera:** whether to thin spray near the camera on purpose, for readability and frame rate.

---

## 7. Gaps

- **Field measurements.** None of drop number, flux, speed or liquid fraction in surf or reef splashes, of spit, or of an offshore veil.
- **Scaling.** Lab-to-field spray scaling is unknown; the dependence on Bond number says labs undercount.
- **Unopened sources.**
  - Deike 2022, Annu. Rev. Fluid Mech. 54, would not download (NOAA repository access denied; NSF PAR timed out).
  - Wang, Yang & Stern 2016 is paywalled.
  - Clarke et al. (SEAS; plume-height conflict from round 1) was not opened.
- **Costs.** The M4 Pro costs are inferred, not measured. The M1 numbers came from a busy shared machine: ±50 %.

## 8. Sources opened this round

Physics:
- [Erinin et al. 2023, JFM 967 A36 (Part 2)](https://arxiv.org/pdf/2210.01923) and [Part 1, A35](https://arxiv.org/pdf/2210.01925)
- [Mostert, Popinet & Deike 2022, JFM](https://arxiv.org/pdf/2103.05851)
- [Veron 2015, Annu. Rev. Fluid Mech. 47](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Veron-2015-spray-annurev.pdf)
- [Chanson, Aoki & Maruyama 2002, Coastal Eng. 46](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)
- [Wüthrich, Shi & Chanson 2021, JFM 924 A20](https://staff.civil.uq.edu.au/h.chanson/reprints/Wuthrich_Shi_Chanson_jfm_2021.pdf)
- [Troitskaya et al. 2017, Sci. Rep. 7:1614](https://www.nature.com/articles/s41598-017-01673-9)
- [Erinin et al. 2022, GRL 49](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2023/01/JGR_Erinin.pdf)
- [Feddersen, Hanson, Mostert & Fincham 2024, JFM](https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf)
- [Tang, Adcock & Mostert 2025](https://arxiv.org/pdf/2510.02486)
- [Watanabe & Ingram 2016, Proc. R. Soc. A 472](https://pmc.ncbi.nlm.nih.gov/articles/PMC5095444/)
- [Porter et al., SEAS lidar](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)
- [Encyclopedia of Surfing: spit](https://www.eos.surf/encyclopedia/spit-spitter)

Optics:
- [Bohren 1987, Am. J. Phys. 55](https://patarnott.com/atms749/pdf/BohrenMultipleScattOpus.pdf)
- [Jendersie & d'Eon 2023](https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf)
- [Atmospheric Optics: sea-water bow](https://atoptics.co.uk/blog/sea-water-rainbow/) and [sea-spray bows](https://atoptics.co.uk/blog/sea-spray-bows/)
- [IALA: Meteorological Optical Range](https://www.iala.int/wiki/dictionary/index.php/Meteorological_Optical_Range)
- miepython 3.3.0 (computation)

Rendering:
- [Surf's Up course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)
- [Surf's Up beach break](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)
- [Making Waves for Surf's Up](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)
- [Byun & Stomakhin 2017, Moana: Crashing Waves](https://media.disneyanimation.com/uploads/production/publication_asset/164/asset/Moana_Crashing_Waves.pdf)
- [True Surf, Meta](https://www.meta.com/blog/true-surf-launch/)
- [Crest docs](https://crest.readthedocs.io/en/latest/user/water-appearance.html)
- [Thomas, GDC 2014](https://media.gdcvault.com/GDC2014/Presentations/Gareth_Thomas_Compute-based_GPU_Particle.pdf)
- [Cantlay, GPU Gems 3 ch. 23](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles)
- [McGuire, WBOIT](https://casual-effects.blogspot.com/2014/03/weighted-blended-order-independent.html)
- [Apple: TBDR](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering)
