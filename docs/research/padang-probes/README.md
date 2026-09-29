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

Peel lines read: time, the meter's estimate (V, α, the onset line's dz/dx, fit, columns, direction), then for every tenth column `x:onset time relative to now s@onset z`.

Rerun any of them with `PROBE=1 LOG=<file> [PADANG=key=value,...] [DIRECTION=…] [SPREADING=…] [NOFEED=1] npx vitest run src/wave/probes/<probe>`.
