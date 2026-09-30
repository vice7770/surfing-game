# Padang Padang probe logs (2026-09-29)

Raw output of the probes in `src/wave/probes/`, run in a cloud session on the branch `claude/padang-padang-k4vm1b` after merging main. They back "The peel investigation" in [padang-padang-report.md](../padang-padang-report.md). Every run is Hs 1.6 m at the edge, Tp 16 s, s = 150, tide 0, no wind, seed 1, on the current bed unless the overrides say otherwise:

| File | Probe | Overrides | What it shows |
|---|---|---|---|
| `b45.txt` | `padangBlowup` | swell 45° (Big: Hs 3 m, 18 s) | finite for 60 s, fastest water 8.8 m/s (ran to NaN before the merge) |
| `peel30.txt` | `padangPeel` | swell 30° (the current design) | predicted 11.9 m/s (α 29°); measured 30–57 m/s (α 6–11°) every period; onsets on z ≈ −115 |
| `crest.txt` | `padangCrest` | swell 30° | each column's crests every 0.5 s, t 60–100 s: position, η, still depth, `*` breaking |
| `phase-s1.txt` | `padangPhase` | swell 30°, contours 9 / 6 / 4 m | Hm0, crest tops and steepest rise along the oblique contours |
| `phase-angle0.txt` | `padangPhase` | crest line 0° (uniform along shore), swell 30° | crests grow down the reef on a uniform bed |
| `phase-d0a0.txt` | `padangPhase` | crest line 0°, swell 0° | the peak's crests are still lowest (side feed on) |
| `phase-d0a0-nofeed.txt` | `padangPhase` | crest line 0°, swell 0°, side feed off | crests nearly even along shore |
| `crest-d0a55.txt` | `padangCrest` | crest line 55°, peak z −150, swell 0° | the rotated frame's crests, t 60–130 s |
| `peel-d0a55.txt` | `padangPeel` | crest line 55°, peak z −150, swell 0° | predicted 11.8 m/s; measured 19–49 m/s, with 9.9–11.5 m/s (α 30–35°) at t 176–192 s |
| `peel-d0a55-nofeed.txt` | `padangPeel` | as above, side feed off | 15–27 m/s over the first periods; stopped at 112 s |
| `wedge-b45.txt` | `padangPeel` (local, M1) | ramp-and-wedge bed (952ec39), β 45°, peak z −170, swell 0° | onsets all on the wedge; break depth 1.7–2.5 m at the peak rising to 3.7–4.4 m by x 20 then level; 15–72 m/s after 144 s (predicted 10.6), one period on target (11.2 m/s, 31°); crest tops at the base within about ±30 %, the peak lowest |
| `wedge-b35.txt` | `padangPeel` (local, M1) | as above, β 35°, peak z −140 | the same pattern: 21–65 m/s after 144 s (predicted 13.4) |
| `wedge-b40.txt` | `padangPeel` (local) | the default β 40°, peak z −170, no focus | 18–68 m/s after 144 s (predicted 11.8) |
| `wedge-b40-end60.txt` | `padangPeel` (local) | as above, the wedge fading out over 60 m | 10.5–67 m/s: no better |
| `wedge-b40-focus.txt` | `padangPeel` (local) | as above with the focus spur (2 m) | 11–51 m/s: no better (its base columns for x −60…1 are wrong: the helper stopped inside the spur, fixed since) |
| `onsets-b40-focus.txt` | `padangFuse` (local) | the focus bed | only 1–3 % of the reef cells that start breaking would on their own (rise ≥ 0.65 √(g h)); about 90 % start because a breaking neighbour's inherited age lowered their threshold, and most columns' first break of a wave is inherited along the crest (±x): breaking runs along the crest as a fuse |

Peel lines read: time, the meter's estimate (V, α, the onset line's dz/dx, fit, columns, direction), then for every tenth column `x:onset time relative to now s@onset z`; the wedge runs add the still depth at onset, W on the wedge or R on the ramp ahead of it, and each reef column's highest crest over the period at the wedge's base.

Rerun any of them with `PROBE=1 LOG=<file> [PADANG=key=value,...] [DIRECTION=…] [SPREADING=…] [HS=…] [NOFEED=1] npx vitest run src/wave/probes/<probe>`.
