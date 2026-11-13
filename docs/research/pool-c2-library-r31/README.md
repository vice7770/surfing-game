# C2's pool library: ruling 31's ten more runs (2026-11-13)

Copied from `scratchpad/c2runs2/docs/research/pool-c2-library-r31/` when the set finished. Same rule as the first
nine (`../pool-c2-library/README.md`): the C2 files and the small analysis files are kept, the derived
`data/*_library.json` profiles (18 MB) and `barrels/` are left out and can be rebuilt.

Ruling 31 asked for these to fill the gaps the first nine were being clamped against:

- **the A0 0.12 row** on the three beds: `b1_a0`, `b2_a0`, `b3_a0`;
- **two slopes between the beds**, 0.055 and 0.085, at the A0 0.25 and 0.355 rows: `b15_a2`, `b15_a3`, `b25_a2`,
  `b25_a3`;
- **slope 0.105 at HS/h0 0.20**, the three rows: `b3s_a1`, `b3s_a2`, `b3s_a3`. These make HS/h0 a real key for the
  first time, instead of one value per slope.

**Eight threw a tube. Two did not**, and they are worth a look rather than a shrug:

- `pool_c2_b1_a0` (the gentlest slope, the smallest wave, A0 0.126): a spiller. Expected — it is the same corner as
  the first set's `b1_a1`.
- `pool_c2_b3s_a3` (**the steepest slope with the biggest wave**, A0 0.361): not expected. A steep bed under a big
  wave is the most likely to plunge, not the least. The candidate reading is that it **surges** — on a steep enough
  bed a wave runs up the face without the lip ever throwing clear — which would mean the library now holds all three
  breaker types. That is a guess until someone reads the run.
