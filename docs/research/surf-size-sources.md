# Surf size: sources

The references behind the wave-sizes work (spec `docs/superpowers/specs/2026-09-27-wave-sizes.md`): how surf is measured, what height a swell should break at, and how the game names it.

## How heights are counted

- **Significant height Hs = H1/3**, the mean of the highest third of the waves; for a narrow spectrum Hs ≈ 4√m0. Buoys report it, with the peak period Tp, in deep water.
- **In a Rayleigh sea** (narrow-banded, the usual model of individual wave heights), H1/10 ≈ 1.27 H1/3 and the largest of N waves is about H1/3 √(ln N / 2) (Longuet-Higgins 1952, "On the statistical distribution of the heights of sea waves", *J. Marine Research* 11:245–266; Holthuijsen 2007, *Waves in Oceanic and Coastal Waters*, Cambridge, §4.2).
- **The game's readout** is a forecast's range: the typical breaking face (H1/3 of the measured breakers) to the sets (their H1/10), each face measured from the crest to the trough ahead as the wave starts to break.

## Breaker height from the buoy

- **Komar & Gaughan (1972/1973)** ("Airy wave theory and breaker height prediction", *Proc. 13th Coastal Engineering Conference*, 405–418): from energy-flux conservation and field and laboratory data,

  H_b = 0.39 g^(1/5) (T H0²)^(2/5),

  H0 the deep-water height, T the period. With Hs and Tp it gives the significant breaker height: **Hs 3 m at 12 s breaks at ≈ 4.0 m**. This is the size report's H1/3 reference at the Beach and Point.
- **Caldwell & Aucan (2007)** ("An empirical method for estimating surf heights from deepwater significant wave heights and peak periods in coastal zones with narrow shelves, steep bottom slopes, and high refraction", *J. Coastal Research* 23(5):1237–1244, doi:10.2112/04-0397R.1). Waimea buoy measurements against daily North Shore, Oahu surf observations, which nominally represent the H1/10 of the places with the highest surf:
  - their eq. 1 writes the shoaling-only breaker height as H_b = H0^(4/5) [(1/√g)(gP / 4π)]^(2/5), the same energy-flux form 7 % below the 0.39 coefficient;
  - their eq. 2 fits a refraction coefficient to the observed-over-predicted ratio, K_r(H_b) = −0.0003 H_b³ + 0.0099 H_b² − 0.025 H_b + 1.0747 with H_b in feet, fixed at 2.145 above 21 ft where the polynomial turns;
  - their eq. 3, H_surf = H_b K_r(H_b), estimates the H1/10 trough-to-crest surf of the highest-refraction outer reefs.
  - At Hs 3 m / 12 s it gives ≈ 6.3 m sets; at Hs 4 m / 14 s ≈ 10 m. The report shows it beside every spot as the high-refraction bound, not as a gate: the game's spots are not Hawaii's focusing outer reefs, and 10 m surf is the Backlog's big-wave work.

## The Hawaiian scale

- Caldwell & Aucan (2007) translate Hawaii-scale observations to trough-to-crest heights with photographs of surfers of known height: **trough-to-crest is about twice the Hawaii-scale height** (within their 10–20 % margin). The game's Hawaiian option reads half the face, in feet.

## Names against the body

- Surf reports name small and medium surf against the body: ankle, knee, thigh, waist, chest, shoulder, head high, then overhead, well overhead, double and triple overhead (multiples of the surfer's height). The game names the typical face (H1/3) by its ratio to the chosen surfer's height (1.65–1.73 m for the committed surfers, 1.75 m when none is chosen), with the bounds in the spec: ankle < 0.2, knee < 0.35, thigh < 0.5, waist < 0.65, chest < 0.78, shoulder < 0.9, head high < 1.15, overhead < 1.5, well overhead < 1.85, double overhead < 2.5, triple overhead < 3.5. These bounds are the game's choice, set at the body's landmarks as a fraction of standing height.

## Why Komar–Gaughan is the gate

- It is the standard empirical breaker height for open coasts, from the same deep-water inputs the game takes, and it needs no site coefficient. The Beach and Point are gated against it at ±20 % on big days (Hs ≥ 2 m); the Reef is reported without a gate, its bed belonging to the Teahupo'o Reef rework.
