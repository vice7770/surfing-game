# Underwater: a sourced per-spot water colour term (2026-09-29)

The owner funded (2026-09-29) a sourced colour term for the underwater view, Rich only. The prototype ([prototype-1-2.md](prototype-1-2.md)) read the Reef saturated blue and the Beach cyan-grey, because the game's optics hold pure water plus grey particles and no absorption by phytoplankton or coloured dissolved organic matter (CDOM).

- **Tags:**
  - [measured] field or satellite data;
  - [modelled] a published model or fit, as implemented in open model code;
  - [inferred] our own reasoning or arithmetic.
- **Code:** `path:line` refers to main at 99e64d3. The prototype's own paths refer to its diff.

## How the sources were read, and what could not be

- **Blocked hosts.** This cloud session's network allows GitHub, package registries and some S3 buckets only. Wiley/AGU, ASLO, Copernicus, IOCCG, NASA, Ocean Optics Web Book, HAL and archimer all returned 403, through both curl and web fetch. So **no journal paper was opened in this round.**
- **What stands in for them:**
  1. Open model manuals and code that implement those papers, read in full: the CNES OSOAA radiative-transfer code and manual, HYGEOS's POLYMER water model, the IOPmodel R package (Bi et al. 2023), and OceanOptics.jl.
  2. Satellite measurements sampled at each site by us: NOAA-20 VIIRS, from NOAA's open S3 bucket.
- **Every paper named below is cited through code that implements it.** A session with journal access should check the numbers against the papers (open question 1).

## 1. The spectral shapes

The game's channels are R, G and B = 650, 550 and 450 nm (`src/scene/waterOptics.ts:7`). Pure water is Pope & Fry: 0.34, 0.0565 and 0.00922 m⁻¹ (`waterOptics.ts:15`). The same values appear in OceanOptics.jl's `pope_fry_1997.csv` [measured].

**Phytoplankton (particle) absorption: a(λ) = A(λ)·Chl^E(λ)** [modelled, Bricaud et al. 1998, JGR 103:31033].

| λ, nm | A, m²/mg | E |
|---|---|---|
| 440 | 0.05202 | 0.6350 |
| 450 | 0.04793 | 0.6151 |
| 490 | 0.03412 | 0.6200 |
| 550 | 0.01183 | 0.8385 |
| 650 | 0.01030 | 0.8142 |

- **Where the table comes from:**
  - OSOAA manual v2.0, Table 12 and eq. 46, which labels it phytoplankton absorption. The same file is `fic/OSOAA_SEA_PHYT_COEFFS.txt`.
  - OceanOptics.jl's `bricaud_1998_A.csv` and `_E.csv` carry the same values. They take them from HydroLight's `AEmidUVabs.txt`.
- **The exponent convention.**
  - OSOAA (eq. 46) and IOPmodel (`R/IOP_models_func.R:652`) both apply the table as a = A·Chl^E.
  - OceanOptics.jl applies it as a = A·Chl^(1−E) (`src/materials/phytoplankton.jl:115`). That is a different curve; at Chl 0.056, a(450) comes out about 2× higher.
  - We use A·Chl^E. [inferred: two of the three implementations agree, and their form is the one the manual writes.]
- **Not checked:** whether these are Bricaud's phytoplankton-only coefficients (a_φ) or total particulate ones (a_p, with detritus), because the paper was blocked. POLYMER's data file carries both sets separately (`water.pyx:145`, header `lambda,Ap,Ep,Aphi,Ephi`), but it sits on a blocked host. For the game this is the particle term either way. [inferred]

**CDOM and detritus: a_g(λ) = a_g(440)·exp(−S(λ − 440))** [modelled].

- **Default S = 0.014 nm⁻¹ for CDOM and 0.011 nm⁻¹ for detritus:** OSOAA `inc/OSOAA.h:544,550`, and POLYMER's older Kd model `S = 0.014` (`water.pyx:913`). All follow Bricaud, Morel & Prieur 1981 [modelled].
- **How CDOM and detritus follow chlorophyll in open water:** a_CDM(443) = 0.069·Chl^1.070, with S = 0.00262·a_CDM(443)^−0.448, clamped to 0.011–0.025 nm⁻¹.
  - Source: POLYMER `polymer/water.pyx:431-437`, citing Bricaud, Ciotti & Gentili 2012 (GBC), a fit to 12 years of SeaWiFS [modelled from satellite].
  - This is the only site-independent a_g rule we could open. It is built for open-ocean water.
- **Coastal and inland prior:** S = 0.0174 ± 0.0014 nm⁻¹, with log₁₀ a_g(440) = −0.94 ± 0.43, so 0.11 m⁻¹ at the median (IOPmodel `R/IOP_models_func.R:515-518`) [modelled]. Used below only as a sanity range for the temperate sites.
- **Non-algal (mineral) particles:** S about 0.011 nm⁻¹ (OSOAA default; OceanOptics.jl `nap.jl` cites Babin et al. 2003) [modelled]. This matters only at the Beach and the Canyon (see §3).

**The factors at the game's wavelengths** [inferred arithmetic]:
- a_g(λ)/a_g(440) = e^(−210S), e^(−110S), e^(−10S) at 650, 550 and 450 nm.
- For S = 0.011: 0.099, 0.298 and 0.896.
- For S = 0.015: 0.043, 0.192 and 0.861.
- For S = 0.025: 0.005, 0.064 and 0.779.

## 2. Values per spot

**Method** [measured]:
- **Data:** NOAA-20 VIIRS near-real-time ocean colour (NOAA STAR MSL12 v1.30), from `s3://noaa-jpss/NOAA20/VIIRS/NOAA20_VIIRS_OC_GLOBAL_{CHLOR-A,KD490}_ops/`. Chlorophyll is OC3 (O'Reilly et al. 1998); Kd490 is Wang, Son & Harding 2009, per the files' metadata.
- **Sampling:**
  - four days a month through 2023, at the daytime overpass;
  - the median of valid 750 m pixels within 5 km of a point 3–5 km off each break, widening to 10, 20 or 40 km if fewer than 5 were valid;
  - most samples fell within 10 km; near-shore pixels are masked (edge mask, land and clouds).

**Caveats** [inferred]:
- This is the water mass just offshore, not the surf zone. A surf zone carries more sediment, which the game's `turbidity` already holds.
- OC3 near coasts reads CDOM and sediment partly as chlorophyll, so coastal chlorophyll values are upper bounds.

| Spot (reference) | Chl, mg/m³: median [IQR], n | Surf-season median | Kd490, m⁻¹ median [IQR] | a_CDM(443), m⁻¹ | S, nm⁻¹ |
|---|---|---|---|---|---|
| Reef (Teahupo'o, 17.90°S 149.27°W) | 0.056 [0.049–0.075], 15 | 0.068 (May–Sep) | 0.026 [0.023–0.030] | 0.0032 | 0.025 (clamp) |
| Padang Padang (8.83°S 115.06°E; branch only) | 0.77 [0.46–2.3], 27 | 0.93 (May–Sep) | 0.122 [0.087–0.211] | 0.052 | 0.011 (clamp) |
| Point (Snapper Rocks, 28.15°S 153.60°E) | 0.32 [0.21–0.64], 38 | 0.36 (Feb–May) | 0.067 [0.051–0.101] | 0.020 | 0.015 |
| Point (Jeffreys Bay, 34.06°S 24.95°E) | 2.1 [1.0–4.4], 41 | 1.6 (May–Sep) | 0.19 [0.15–0.31] | 0.15 | 0.011 (clamp) |
| Beach (Supertubos, 39.35°N 9.41°W) | 1.6 [1.1–2.5], 28 | 1.6 (Oct–Mar) | 0.16 [0.13–0.21] | 0.11 | 0.011 (clamp) |
| Canyon (Nazaré, 39.61°N 9.13°W) | 1.7 [0.57–3.7], 31 | 1.7 (Oct–Mar) | 0.17 [0.11–0.27] | 0.12 | 0.011 (clamp) |

- **Tags:** chlorophyll and Kd490 are [measured]. a_CDM and S are [modelled] from chlorophyll with the Bricaud 2012 rule; a_CDM at 443 nm stands in for a_g(440), within 3–8 %.
- **The coastal a_CDM values sit inside IOPmodel's coastal prior** (0.11 m⁻¹ median) [modelled]. At the temperate sites, both the prior's S (0.017) and the clamped 0.011 are plausible; the difference moves the hue by only a few degrees.
- **The Canyon's reference is ours** [inferred]: the repo names none (`src/wave/Bathymetry.ts:80-89`). We took Nazaré, the canyon-fed break about 35 km up the coast from Supertubos. This is the owner's call.
- **Padang Padang:**
  - Its branch sets "clear water as the Reef's (nothing measured on the Bukit's west coast)" (`origin/claude/padang-padang:src/scene/waterOptics.ts:41-42`).
  - VIIRS says otherwise: Kd490 is 0.12 there against 0.026 at Teahupo'o [measured]. Bottom reflection off the Bukit's shallow reef may inflate both numbers [inferred].
  - This goes to the Padang session.

## 3. What each spot gets

**Method** [inferred]:
- The game's own formulas: c = a + b_p; K = a + b_b; R∞ = 0.33·b_b/(a + b_b) (`waterOptics.ts:55-80`).
- The prototype's level fog radiance 7·R∞·E_d(z), with the eye 2 m under (1.3 m at the Beach) and white light.
- We checked the hue two ways:
  - with the three samples;
  - fully spectrally (400–700 nm every 5 nm, D65 light, the CIE 1931 2° observer, sRGB).
- The two agree within 2° everywhere, so the three wavelengths are not the problem.

**Two variants:**
- **(a) Additive:** keep the flat particle absorption b_p(1 − ω)/ω (`waterOptics.ts:55`, ω = 0.95 assumed at `:21`) and add the new term.
- **(b) Kd-matched:** replace that flat absorption with the new terms (floored at zero), so that the game's Kd(490) ≈ 1.1·(a + b_b) [inferred, midday sun] comes as close to VIIRS as it can. The flat term only stays where VIIRS needs it (Padang, +0.033 m⁻¹).

**The absorption added**, a_ph + a_g at 650 / 550 / 450 nm, m⁻¹ [inferred from §1–2]:

| Spot | Added a (R, G, B) | c today → (a), m⁻¹ | Kd490: game today / (a) / (b) / VIIRS |
|---|---|---|---|
| Reef | 0.0010, 0.0013, 0.0106 | 0.498, 0.214, 0.167 → 0.499, 0.216, 0.178 | 0.030 / 0.037 / 0.028 / **0.026** |
| Padang | 0.0135, 0.0251, 0.0875 | 0.498, 0.214, 0.167 → 0.511, 0.239, 0.255 | 0.030 / 0.095 / 0.122 / **0.122** |
| Point, Snapper | 0.0049, 0.0085, 0.0413 | 1.393, 1.109, 1.062 → 1.398, 1.118, 1.103 | 0.096 / 0.125 / 0.067 / **0.067** |
| Point, J-Bay | 0.0340, 0.0675, 0.2124 | → 1.427, 1.177, 1.274 | 0.096 / 0.253 / 0.195 / **0.192** |
| Beach | 0.0264, 0.0516, 0.1662 | 2.445, 2.162, 2.114 → 2.472, 2.213, 2.281 | 0.174 / 0.297 / 0.180 / **0.161** |
| Canyon (Nazaré) | 0.0279, 0.0548, 0.1755 | 1.393, 1.109, 1.062 → 1.421, 1.164, 1.237 | 0.096 / 0.226 / 0.170 / **0.170** |

- **The check** [inferred from measured Kd490]: at every site but Padang, matching VIIRS leaves no room for the flat particle absorption. That absorption was an assumption, and the sourced spectral terms take its place: at the Beach the required flat term comes out −0.018 m⁻¹, at the Reef −0.002.
- **What that means:** the Beach's existing b_p = 2 already matches the offshore Kd490 (0.174 against 0.161) before the colour term. Adding the term on top, variant (a), overshoots by 1.8×. **Recommend variant (b).**

**The resulting hue and sighting** [inferred]:

| Spot | Fog hue today → (a) / (b) | Reads as | Sighting 4.8/c_G | 7 m floor? |
|---|---|---|---|---|
| Reef | 228° → 222° / 225°; saturation 0.97 | Still blue, a shade lighter (#2680ff → #309aff) | 22.4 → 22.3 / 23.1 m | No |
| Padang | 228° → 187° / 186° | Cyan, blue-green | 22.4 → 20.0 / 18.2 m | No |
| Point, Snapper | 210° → 192° / 195° | Cyan | 4.3 → 4.3 / 4.5 m | Yes |
| Point, J-Bay | 210° → 146° / 143° | Green | 4.3 → 4.1 / 4.3 m | Yes |
| Beach | 203° → 156° / 151°; saturation 0.66–0.74 | **Sea green** (#78d9ff → #88ffd1) | 2.2 → 2.2 / 2.3 m | **Yes** |
| Canyon | 210° → 152° / 149° | Green | 4.3 → 4.1 / 4.3 m | Yes |

- **The Beach turns green.** Blue now fades faster than green along the eye path.
  - With the floor: the scaled eye c becomes 0.766, 0.686, 0.707 m⁻¹, against the prototype's 0.776, 0.686, 0.671.
  - What the player sees: distant objects and the sand dissolve into green, not grey-cyan.
- **The Beach still needs the 7 m floor.** Chlorophyll and CDOM add under 3 % to c_G; scattering by sand sets its 2.2 m.
- **The Reef does not turn blue-green**, and the sourced numbers say it shouldn't:
  - Teahupo'o's offshore water is among the clearest the satellite sees: chlorophyll 0.056, Kd490 0.026 [measured]. The term adds only 0.011 m⁻¹ in blue.
  - Blue-green at a reef comes from the bright bed. Looking down 45° from 2 m, sand at 4 m reads 184–190° (cyan), at 6 m 197–204°, and at 10.5 m 215–222° [inferred, with the prototype's bed albedo 0.5, 0.47, 0.36].
  - So the prototype's navy bed at 10 m is right in hue. It is too dark only because of exposure, which the owner's exposure gain fixes.
- **The Point depends on the reference:** Snapper Rocks is cyan, J-Bay green. The owner's call.
- **Published Secchi depths or measured underwater colour at these sites could not be opened** (hosts blocked). VIIRS Kd490 is the only measured check here.

## 4. Cost and where it plugs in

- **Per spot, three sourced numbers:** `chlorophyll` (mg/m³), `cdom440` (m⁻¹) and `cdomSlope` (nm⁻¹).
- **Suggested fields on `WaterOptics`** (`waterOptics.ts:23-29`), from the table in §2:

  | Spot | chlorophyll | cdom440 | cdomSlope |
  |---|---|---|---|
  | beach | 1.6 | 0.11 | 0.011 |
  | reef | 0.056 | 0.0032 | 0.025 |
  | point (J-Bay) | 2.1 | 0.15 | 0.011 |
  | point (Snapper) | 0.32 | 0.020 | 0.015 |
  | canyon | 1.7 | 0.12 | 0.011 |
  | padang | 0.77 | 0.052 | 0.011 |

- **CPU:**
  - A new `colourAbsorption(optics): Rgb` = A·Chl^E + cdom440·e^(−S(λ − 440)) at 650, 550 and 450 nm, with the A and E rows of §1 as constants.
  - For variant (b), a flag or per-spot value that drops `particleAbsorption` (`:55`) to zero, or to Padang's 0.033.
- **The trap:** `beamAttenuation`, `diffuseAttenuation` and `deepReflectance` (`:59-80`) feed `applyOptics` (`:246`). That drives the above-water shading of Classic and Rich alike: `WaterSurface.ts:463`, `FarFieldOcean.ts:247`, `LipSheetMesh.ts:211`, from `PhysicalMode.ts:434-436`.
  - Folding the term in there changes Classic, which the owner has ruled out.
  - Instead, compute an underwater set, `uwAttenuation` (fed through the prototype's `eyeAttenuation` floor), `uwDiffuseAttenuation` and `uwDeepReflectance`.
  - Have `underwaterPars` read those in place of `waterDiffuseAttenuation` and `waterDeepReflectance` (prototype `underwater.ts:79-95`).
- **Frame cost:**
  - Two extra vec3 uniforms and no new shader arithmetic: zero measurable GPU cost on the M4 Pro or the M1 [inferred].
  - A few pow and exp calls on the CPU when the spot changes.
- **Tests:**
  - unit-test `colourAbsorption` against the §3 table;
  - check that Classic's uniforms are unchanged;
  - check the Beach's scaled eye c (0.766, 0.686, 0.707 with variant (a)).

## Risks [inferred]

- **The offshore water is not the surf zone.** Chlorophyll and CDOM rise toward shore at the temperate sites, and Teahupo'o's lagoon drains through the Havae pass beside the break. The real surf-zone colour may be greener than this, at every site.
- **Near-shore chlorophyll is an upper bound** (OC3 reads CDOM and sediment as chlorophyll). Variant (b)'s Kd match is the safer constraint.
- **The exponent convention and the a_φ versus a_p question** (§1) are unchecked against the paper.
- **The mineral-particle spectral shape** (S ≈ 0.011, yellow-brown) was not added at the Beach; it would push the hue further toward green-yellow (about 106° in a quick test). It is left out until a surf-zone sediment absorption measurement is found.

## Open questions for the owner

1. **Sources:** accept these model-code and satellite values as sourced, or have a session with journal access check them? It would read Bricaud 1998 and 2012, Babin 2003, and any in-situ CDOM or Secchi data for Tahiti, Peniche, St Francis Bay and Bali.
2. **The Reef:** the sourced water stays blue. Accept blue water with a cyan bed in the shallows, or ask for more?
3. **The Point's reference:** J-Bay (green) or Snapper Rocks (cyan)?
4. **The Canyon's reference:** is Nazaré right?
5. **Rich above water:** should Rich's water above the surface get the same term, to keep one optics in Rich? Classic stays as it is either way.
6. **Variant (b):** drop the assumed grey particle absorption wherever VIIRS shows no room for it?

## Sources

- CNES/HYGEOS, OSOAA v2.0 code and user manual (Table 12, eq. 46; `inc/OSOAA.h`): https://github.com/CNES/RadiativeTransferCode-OSOAA (commit 8e4914f)
- HYGEOS, POLYMER water model (`polymer/water.pyx`: Bricaud 2012 CDM rule, Morel & Maritorena table, Bricaud 1998 use): https://github.com/hygeos/polymer (commit a8f4701)
- Bi et al., IOPmodel R package (coastal CDOM prior; the Bricaud 1998 convention): https://github.com/bishun945/IOPmodel (commit cfb90c1)
- OceanOptics.jl (Pope & Fry and Bricaud 1998 tables, with their provenance headers): https://github.com/RemoteSensingTools/OceanOptics.jl (commit 0de430b)
- NOAA-20 VIIRS NRT ocean colour, chlorophyll-a and Kd490, 2023: https://noaa-jpss.s3.amazonaws.com/index.html#NOAA20/VIIRS/
- CIE 1931 2° observer and D65, via colour-science 0.4.7: https://github.com/colour-science/colour
- Named but not opened (hosts blocked):
  - Bricaud et al. 1998, https://doi.org/10.1029/98JC02712
  - Bricaud, Morel & Prieur 1981, https://doi.org/10.4319/lo.1981.26.1.0043
  - Bricaud, Ciotti & Gentili 2012, GBC, https://doi.org/10.1029/2010GB003952 (DOI not verified)
  - Babin et al. 2003, https://doi.org/10.1029/2001JC000882
