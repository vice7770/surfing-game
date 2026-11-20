# C2's pool library: the nine level-12 runs (2026-11-13)

Copied from the run folder `scratchpad/c2runs/docs/research/pool-c2-library/` when the set finished (08:06), as
`../wave-strategy-alternatives/c2-step1.md` §5 asks. `report.md` is the pipeline's own report.

- **Kept:** `report.md`, `summary.json`, `barrel-cases.md`, `barrel-index.json`, the PNGs, and per case in `data/` the
  C2 file (`_c2.json.gz`, the source of the game files in `public/library/`) and the small analysis files.
- **Left out** (derived, 23 MB): `data/*_library.json` (the 128-point profiles of the older swept-barrel path; rebuild
  with `tools/basilisk/periodic_library.py`) and `barrels/` (today's `.bin` format, for comparison only). The report
  still lists them.
- `pool_c2_b1_a1` throws no tube (a spill on the gentlest bed at the smallest A0), so it has no profile library.
- The game files: `npm run barrels -- --format brl3 --game` (`scripts/barrel-library.ts`) from these `_c2.json.gz`
  (see `../wave-strategy-alternatives/c2-step3.md` §1).
- Ruling 31's ten more runs write to `docs/research/pool-c2-library-r31/` in `scratchpad/c2runs2`.
