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

*Chlorophyll: NOAA-20 VIIRS, 2023, about 3–5 km off each break, not in the surf zone. Dissolved organics are estimated from that chlorophyll (Bricaud 2012), not measured. Absorption shapes: from open-source ocean-optics model code that implements the published papers ([OSOAA](https://github.com/CNES/RadiativeTransferCode-OSOAA), [POLYMER](https://github.com/hygeos/polymer), [IOPmodel](https://github.com/bishun945/IOPmodel)). The papers themselves are blocked from the cloud session, so these values are provisional until someone checks them against the journals.*

## What to build

- **Replace the game's assumed grey particle absorption with these terms, rather than adding them on top.** Replaced, the game's attenuation lands within about 12 % of the satellite's everywhere but Padang. Added, it overshoots up to 1.8× at the Beach.
- **Cost:** three numbers per spot and two extra colour uniforms, with no new shader maths.
- **Where it goes:** its own underwater uniforms, not the shared optics call, which drives Classic's above-water look (`src/scene/waterOptics.ts:246`).
- **Padang:** the satellite sees its water as much murkier than the Reef's (Kd490 0.12 against 0.026 m⁻¹), though reflection off its shallow reef may inflate that. The Padang session should know.

## Checked against the journals (2026-09-30)

From the Mac session, which can open the papers the cloud couldn't:

- **The detrital-colour rule is confirmed.** a_cdm(443) = 0.069·Chl^1.070 and S = 0.00262·a^−0.448 are the November 2007 fits in Table 1 of [Bricaud, Ciotti & Gentili 2012](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2010GB003952). Other months give 0.068–0.075·Chl^1.07–1.11. The authors warn the fits are "not designed for use in predictive applications or models", so they stay provisional.
- **The particle term counts detritus twice.**
  - The coefficients used (0.052·Chl^0.635 at 440 nm) are for total particulate absorption, which already includes non-algal particles, 25–30 % of it on average ([Bricaud et al. 1998](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/98JC02712), abstract).
  - The 2012 table gives the phytoplankton-only law as 0.0375·Chl^0.620 at 443 nm, about 0.72× at 1 mg/m³.
  - Since the detrital term already includes detritus, the fix is to scale the particle term by about 0.72, or to use phytoplankton-only coefficients.
  - At the Beach that trims about a tenth of the added blue absorption, a degree or two of hue; the fit to the satellite's Kd490 absorbs the rest [inferred].

## Your decisions (settled 2026-09-29, as recommended)

1. **Accept these as sourced, or have them checked against the journals.** Decided: use them now as provisional, and check them when a session with journal access is free.
2. **A blue Reef.** Decided: accept it; the green comes from the bed, which the prototype already lights.
3. **The Point's reference: Jeffreys Bay (green) or Snapper Rocks (cyan).** Decided: Snapper Rocks (cyan).
4. **The Canyon as Nazaré.** Decided: Nazaré.
5. **Rich above water too.** Decided: yes, later, so the surface colour matches what you see below.
6. **Replace the grey absorption.** Decided: yes, as above.

Notes and every value: [notes/round5-underwater/water-colour.md](notes/round5-underwater/water-colour.md).
