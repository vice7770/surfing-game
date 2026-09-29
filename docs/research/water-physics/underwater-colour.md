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

## Your decisions

1. **Accept these as sourced, or have them checked against the journals.** Recommended: use them now as provisional, and check them when a session with journal access is free.
2. **A blue Reef.** Recommended: accept it; the green comes from the bed, which the prototype already lights.
3. **The Point's reference: Jeffreys Bay (green) or Snapper Rocks (cyan).** Your call; the README lists both.
4. **The Canyon as Nazaré.** Recommended: confirm, or name its real reference.
5. **Rich above water too.** Recommended: yes, later, so the surface colour matches what you see below.
6. **Replace the grey absorption.** Recommended: yes, as above.

Notes and every value: [notes/round5-underwater/water-colour.md](notes/round5-underwater/water-colour.md).
