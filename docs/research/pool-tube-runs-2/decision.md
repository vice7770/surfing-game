# The ledge decision (2026-11-08)

The advisor's step-7 rule (§2.2, `docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md`) applied to the owner's M4
level-13 batch (branch `claude/pool-tube-runs-2`, 7e327af3, `data/`).

## Method

- **Frames:** every library frame with an enclosed tube (`cavity32`), from touchdown (`t_touchdown`, `_plunge.json`) to
  the last tube frame. Life is the time between them, 0 to 1. Only life 0.5–0.9 counts.
- **Usable clearance:** the cavity polygon at game scale (h0 4.5 m). At 300 points along the ray, the vertical gap from its
  floor to its roof. In each frame, the best 0.3 m window's smallest gap. The table gives the median over the frames (p50)
  and the best frame.
- **Lip landing:** the cavity's length along the ray at touchdown (face to the jet's landing point), over H at vertical.
- Script: a throwaway in the session scratchpad; no game code changed.

## Results

| Case | H at vertical | Usable p50 (best) | Ratio to knee | Landing | Lip cells |
|---|---|---|---|---|---|
| `pool_ledge_big` | 2.09 m | 0.56 m (0.85) | 2.3× | 1.37 m, 0.66 H | 19.4 |
| `pool_kneeface_big` | 1.76 m | 0.24 m (0.30) | — | 1.00 m, 0.57 H | 3.9 |
| `pool_ledge_small` | 1.86 m | 0.56 m (0.90) | 2.0× | 1.01 m, 0.54 H | 25.0 |
| `pool_kneeface_small` | 1.67 m | 0.29 m (0.33) | — | 0.38 m, 0.23 H | 9.0 |

## Verdict

- **Big pair (1.8 m faces): passes.** The ledge holds 2.3× the knee's usable clearance (bar 1.3×), and its lip lands at
  0.66 H (bar 0.6–1.6 H).
- **Small pair (1.5 m faces): fails on the landing only.** The clearance is 2.0×, but the lip lands at 0.54 H, just under
  0.6 H.
- **Overall: the rule is met at 1.8 m and missed narrowly at 1.5 m.** Clearance clearly favours the ledge at both sizes.
  Whether a 0.06 H landing shortfall at the small size blocks the floor change is the owner's call, with the advisor.

## Caveats

- `pool_kneeface_big` has 3.9 cells across its lip, under the 4 the profiles rule wants. Its level-14 rerun never
  happened, so the rule is applied on level 13. A finer knee lip would more likely grow the knee's cavity than shrink it,
  but at 2.3× the margin is large.
- The landing measure (the cavity's length at touchdown) is a proxy from the profiles, not a tracked jet tip. At 0.54 H
  the small ledge is within its uncertainty of the bar.
