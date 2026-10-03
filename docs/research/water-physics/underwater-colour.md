# Water colour per spot

Adding dissolved organic matter and plankton turns the Beach and the Point sea green, but the Reef stays blue. That is right: Teahupo'o's open water is among the clearest the satellite sees, and its blue-green comes from the shallow sand bed, not the water.

| Spot (reference) | Chlorophyll, mg/m³ | Dissolved organics a_g(440), m⁻¹ | Hue today → new | Sighting |
| --- | --- | --- | --- | --- |
| Reef (Teahupo'o) | 0.056 | 0.0032 | 228° → 222–225°, still blue | 22 m |
| Padang (Bali) | 0.77 | 0.052 | 228° → 186°, cyan | 18–20 m |
| Point (Snapper Rocks) | 0.32 | 0.020 | 210° → 192–195°, cyan | 4.3–4.5 m, floor applies |
| Point (Jeffreys Bay) | 2.1 | 0.15 | 210° → 143–146°, green | 4.1–4.3 m, floor applies |
| Canyon (Nazaré, assumed) | 1.7 | 0.12 | 210° → 149–152°, green | 4.1–4.3 m, floor applies |
| Beach (Supertubos) | 1.6 | 0.11 | 203° → 151–156°, sea green | 2.2 m, floor applies |

*Chlorophyll: NOAA-20 VIIRS, 2023, about 3–5 km off each break, not in the surf zone. Dissolved organics are estimated from that chlorophyll (Bricaud 2012), not measured. Absorption shapes: from open-source ocean-optics model code that implements the published papers ([OSOAA](https://github.com/CNES/RadiativeTransferCode-OSOAA), [POLYMER](https://github.com/hygeos/polymer), [IOPmodel](https://github.com/bishun945/IOPmodel)). The cloud session couldn't open the papers; the Mac session checked them against the journals on 2026-09-30 (below).*

## What to build

- **Replace the game's assumed grey particle absorption with these terms, rather than adding them on top.** Replaced, the game's attenuation lands within about 12 % of the satellite's everywhere but Padang. Added, it overshoots up to 1.8× at the Beach.
- **Cost:** three numbers per spot and two extra colour uniforms, with no new shader maths.
- **Where it goes:** its own underwater uniforms, not the shared optics call, which drives Classic's above-water look (`src/scene/waterOptics.ts:246`).
- **Padang:** the satellite sees its water as much murkier than the Reef's (Kd490 0.12 against 0.026 m⁻¹), though reflection off its shallow reef may inflate that. The Padang session should know.

## Checked against the journals (2026-09-30)

From the Mac session, which can open the papers the cloud couldn't:

- **The detrital-colour rule is confirmed.** a_cdm(443) = 0.069·Chl^1.070 and S = 0.00262·a^−0.448 are the November 2007 fits in Table 1 of [Bricaud, Ciotti & Gentili 2012](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2010GB003952). They are fits to values retrieved from SeaWiFS satellite data, not measured in the water. Other months give 0.068–0.075·Chl^1.07–1.11. The authors warn the fits are "not designed for use in predictive applications or models", so they stay provisional.
- **The particle term counted detritus twice. Use the phytoplankton-only coefficients.**
  - The table used is total particle absorption, detritus included. The Ocean Optics Web Book defines it that way ([Mobley](https://www.oceanopticsbook.info/view/optical-constituents-of-the-ocean/level-2/new-iop-model-case-1-water), Eq. 1) and pairs it with dissolved matter only; OceanOptics.jl mislabels it as phytoplankton. Non-algal particles make up 25–30 % of it ([Bricaud et al. 1998](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/98JC02712), abstract). Bricaud 2012's term already includes detritus.
  - The same study's phytoplankton-only columns (Aphi, Ephi) are what POLYMER and NASA's l2gen read; [ocpy](https://github.com/ocean-colour/ocpy/blob/main/ocpy/data/phytoplankton/aph_bricaud_1998.txt) has a public copy. At 650, 550 and 450 nm: A = 0.00778, 0.00703 and 0.0350 m²/mg, with E = 0.815, 0.931 and 0.599. At 443 nm they match the 2012 paper's quote of the law, 0.0375·Chl^0.620, within 1 %.
  - A flat ×0.72 won't do: the phytoplankton share is 0.72–0.77 in blue and red, but 0.46–0.64 in green.
  - The exponent convention is settled too: a = A·Chl^E (Mobley's Eq. 1, ocpy's header, NASA's code). OceanOptics.jl's A·Chl^(1−E) is wrong.
- **What it changes** [inferred: a rerun of the cloud session's model, which reproduces its table within 1–3°]:
  - Every hue moves 2–4° bluer, and no spot changes its look: the Beach 152° → 155° (sea green), Snapper 196° → 198° (cyan), the Reef 224° → 226° (blue), all with variant (b).
  - Sighting distances move less than 1 %.
  - Variant (b) now matches the satellite better: the Beach's Kd490 drops from 0.179 to 0.165 m⁻¹ (VIIRS 0.161), and the Reef's from 0.029 to 0.027 (0.026). Elsewhere the fit keeps a small flat term, 0.004–0.015 m⁻¹ (Padang 0.040).

## Your decisions (settled 2026-09-29, as recommended)

1. **Accept these as sourced, or have them checked against the journals.** Decided: use them now as provisional, and check them when a session with journal access is free.
2. **A blue Reef.** Decided: accept it; the green comes from the bed, which the prototype already lights.
3. **The Point's reference: Jeffreys Bay (green) or Snapper Rocks (cyan).** Decided: Snapper Rocks (cyan).
4. **The Canyon as Nazaré.** Decided: Nazaré.
5. **Rich above water too.** Decided: yes, later, so the surface colour matches what you see below.
6. **Replace the grey absorption.** Decided: yes, as above.

Notes and every value: [notes/round5-underwater/water-colour.md](notes/round5-underwater/water-colour.md).
