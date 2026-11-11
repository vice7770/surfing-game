# The level-14 reruns of the two knee cases (2026-11-05 to 11-06)

`pool_knee_big` and `pool_kneeface_big` rerun at level 14 (`LEVEL2=14`, phase 1 reused), because their lips were 2.4 and 3.9 cells across at level 13, under the 4-cell rule. Run on the M4 Pro: started 2026-11-05 17:16, finished 2026-11-06 15:50 (about 22 hours).

- `report-l14.md`, `summary-l14.json`, `barrel-cases-l14.md`, `barrel-index-l14.json`: the rerun's own outputs, kept apart so the level-13 batch's `report.md`, `summary.json` and the rest stay as they were (the rerun's run overwrote them with two rows).
- `data/*_L14_*` and `periodic_*_L14_*.png`: the profiles, metrics, plunge, tracks and figures.
- `barrels/*-l14.bin`: candidate cases, not in `public/barrels`.

| Case | Lip cells L13 -> L14 | Tube A_O/H² L13 -> L14 | Jet A_J/H² L13 -> L14 | Open (s) |
|---|---|---|---|---|
| `pool_knee_big` | 2.4 -> 7.2 | 0.018 -> 0.031 | 0.008 -> 0.020 | 1.81 -> 1.66 |
| `pool_kneeface_big` | 3.9 -> 21.1 | 0.001 -> 0.024 | 0.009 -> 0.087 | 1.61 -> 1.54 |

Both lips are now resolved (7.2 and 21.1 cells). `decision.md`'s caveat (the knee's cavity would more likely grow than shrink with a finer lip) held: the knee's tube area grew. The ledge's decision numbers (`decision.md`) use level 13 for the knee; re-applying the rule on these L14 knee profiles is not done.
