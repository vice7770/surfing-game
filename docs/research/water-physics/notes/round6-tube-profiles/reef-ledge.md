# The Reef's ledge in Basilisk (2026-09-30)

The owner asked for the Reef's own transect to be run on their M1 ("run the Basilisk Reef transect here on the M1", 2026-09-30). The aim was to source the Reef's provisional lip and tube: a 0.5 H lip giving a 0.44–0.47 H² jet, a 0.43 H² void, a 23° tilt, and length over width held at 1.42 (`REEF_OVERTURN` in `src/wave/Overturn.ts`). One-page summary: [../../reef-ledge-runs.md](../../reef-ledge-runs.md).

- **Tags:** [measured] = read from these runs; [inferred] = our reasoning.
- **Code:** paths refer to main at 87286ad.

## 1. Setup

- **Solver:** round 6's `tools/basilisk/slope.c` (Mostert & Deike's setup; two-phase Navier–Stokes, lab-scale Re 40 000 and Bond number 1000; Green–Naghdi solitary wave). It was built from the GitHub mirror comphy-lab/basilisk-C (commit 082dd5c9) in `~/basilisk-C`.
- **Bed:** the Reef's peak transect along the wave's path (`REEF` in `src/wave/Bathymetry.ts`), nondimensionalised by h0 = 10 m, the shelf:
  - a flat at depth 1 (10 m) to the ledge's toe;
  - one slope up to depth 0.15 (the 1.5 m reef crest);
  - a flat at 0.15 to the domain's end (HMID = HS = 0.15).
  - The game's flat is 20 m across the crest line, about 37 m along a 57° path, then a 2.5 m lagoon. The runs' flat is longer; it doesn't matter before touchdown.
- **Gradient along the path:**
  - The ledge climbs 1:2.29 across its crest line (0.437).
  - The Teahupo'o report measured waves crossing it at φ ≈ 57° to its normal, 0.437 × cos 57° ≈ 1:4.2. Its median Mead & Black fits (Y 1.16–1.32) imply 1:5.2–1:7.7 [inferred from Y = 0.065 X + 0.821].
  - So two cases: 1:4.2 (S1 = 0.238095) and 1:6 (S1 = 0.166667).
- **Wave:** A0 = 0.3, a 3 m solitary wave on the shelf; H at touchdown 2.99–3.07 m, about the Big swell's height.
- **Grid:** level 11 on a 28 h0 domain, Δx = 0.0137 h0 = 14 cm.
- **Output:** facets every 0.025 √(h0/g) from t = 10.5 (1:4.2) or 11.5 (1:6).
- **Flags:** `-DLEVEL=11 -DS1=… -DHMID=0.15 -DHS=0.15 -DA0=0.3 -DXW=8|7 -DXTOE=16|15 -DDOMAIN=28 -DTMAX=16|18 -DTOUT0=10.5|11.5 -DDTOUT=0.025`, as in `tools/basilisk/run_reef.sh`.
- **Cost:** about 1.5 hours per case to touchdown on the M1, one core each. The Mac's load average ran 23–63 alongside other sessions' work, so each case got about half a core.
- **A level-9 test** of 1:4.2 (6 minutes) set the output window.

## 2. Results at touchdown [measured]

Metrics from `tools/basilisk/analysis/metrics.py`, at the last frame before the lip touches. The lip thickness is the jet's area over the void's length, as round 6 inferred it (§4 of tube-profiles.md).

| | 1:4.2, level 11 | 1:6, level 11 | 1:4.2, level 9 |
|---|---|---|---|
| ψ0 = s / (H0/h0)^¼ | 0.32 | 0.23 | 0.32 |
| Face vertical → touchdown, √(h0/g) | 11.39 → 12.18 (0.79, 0.80 s) | 12.49 → 13.40 (0.91, 0.92 s) | 11.93 → 12.80 |
| H at touchdown | 2.99 m | 3.07 m | 2.74 m |
| Jet A_J / H² | 0.195 | 0.172 | 0.286 |
| Void A_O / H² | 0.085 | 0.089 | 0.150 |
| Void length / H, width / length | 0.48, 0.575 | 0.61, 0.471 | 0.87, 0.58 |
| Length / width | 1.74 | 2.12 | 1.72 |
| Tilt of the void | 48° | 49° | 27° |
| Lip thickness A_J / L_O | 0.41 H (9.0 cells) | 0.28 H (6.3 cells) | 1.6 cells |
| Where the face goes vertical | 21 m past the ledge top | 18 m past it | past it |

- The files are `data/reef42_L11_metrics.json`, `data/reef60_L11_metrics.json` and `data/reef42_L9_metrics.json`. Pick & Feddersen's fits in them are evaluated far outside their range (ψ0 ≤ 0.0889), so ignore those.
- **Resolution:** round 6 found about 6 cells across the jet enough. Both level-11 cases meet that. At level 9 the jet was overstated by half and the void by 80 %.

## 3. Where it breaks, and why that limits the result

- [measured] **Neither case breaks on the ledge.** The solitary hump climbs the ledge whole. Its front steepens over the reef flat and goes vertical 18–21 m past the ledge top, over still water 1.5 m deep. The lip lands on the face about 1 m above still water.
- **Why [inferred, sourced part]:** Grilli, Svendsen & Subramanya (1997) found that solitary waves don't break on plane slopes steeper than 12° (their abstract, [URI repository](https://digitalcommons.uri.edu/oce_facpubs/207/)). 1:4.2 is 13.4°. At 1:6 (9.5°) the slope still ends before the wave's breaking depth.
- **The Reef is different:**
  - The game's Reef throws at the ledge, with its crest standing at or below still level at the throw in 29–46 % of cases (the predictor session's measurements).
  - Teahupo'o is described as a wave whose base drops below sea level (Shand 2024, in the Reef sources).
  - That drained trough, the step, is the previous wave's trough and backwash. A solitary wave can't have it.
- **So:**
  - The void (0.085–0.089 H²) and tilt (48°) describe a lip landing high on a face over still water. They are probably too small and too steep for the Reef, where the lip falls into the trough.
  - The jet volume at the ledge is also unsourced, since the break happens elsewhere.
  - [inferred] The lip's thickness (0.28–0.41 H) should depend less on where the lip lands. It supports a thick Reef lip, thicker on steeper crossings, as Chanson & Lee (1997) describe qualitatively.

## 4. The jet against its crest's water (for the lip-jet source) [measured]

`tools/basilisk/analysis/source_share.py`, at the face-vertical frame; H is taken to the lowest surface within 3 h0 ahead.

| | 1:4.2 | 1:6 |
|---|---|---|
| Jet / H² (H at the vertical frame) | 0.211 | 0.181 |
| Water above the trough, whole upper-half run (39–42 m wide) | 12.3 H² (share 1.7 %) | 10.9 H² (1.7 %) |
| Above still level within ±2.1 m of the crest | 1.47 H² (14 %) | 1.40 H² (13 %) |
| Above the trough within ±2H, tapered by 1 − (d/2H)² | 2.65 H² (8.0 %) | 2.05 H² (8.8 %) |

A solitary hump is much fuller than a periodic crest, so the whole-run share is only a floor. The tapered ±2H window, which the predictor session now uses, holds 2.0–2.7 H² here, about what the game's windows hold (2.6 H² at their f of 0.18 for a 0.47 H² ask).

## 5. Checks against measurements

- **Length over width:** 1.74 and 2.12, against:
  - 1.46–2.28 on Blenkinsopp & Chaplin's 2008 lab reef;
  - 1.70–3.15 (mean 2.55) at closure in the field at Duck;
  - both as quoted by [O'Dea et al. 2021](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2021GL093664);
  - Mead & Black's surfed breaks, 1.42–3.43.
- The game holds the Reef at 1.42, the roundest Mead & Black measured.
- Blenkinsopp & Chaplin's cavity areas against crest submergence would test the void directly. Their paper (ScienceDirect) returned an error page, and Blenkinsopp's 2007 thesis (Southampton ePrints 466054, 9 MB) needs a browser download: awaiting the owner.

## 6. What would source the Reef

- **Periodic waves on the same transect** [inferred]: a wavemaker or relaxation zone, or a periodic initial wave, running a train of 2–3 waves so the one studied breaks into its predecessor's trough.
  - At the Reef's 14–17 s periods a wavelength is about 14–17 h0 on the 10 m shelf, so the domain needs about 40–60 h0.
  - At level 12 that is 10–15 cm cells. My estimate is about a day of setup, then a few hours per case on the M4 Pro.
  - This is the owner's "periodic swell later" (round 6's decisions), which the Reef now needs.
- **Until then:** the provisional values stay. These runs don't break where the Reef does. The lip thickness is the one value they support.
