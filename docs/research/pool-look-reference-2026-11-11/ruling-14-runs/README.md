# Ruling 14's probe runs (2026-11-11, the M1)

The advisor's two short runs behind `../ruling-14.md`. 14 periods each, CPU solver, no rider.

- `r14-probe.ts`: step 1's probe (`../step1/ref-probe.ts`) with two additions: `--width <m>` sets the wrapped window's width, and the meter's onsets in the take-off band are logged (place, face, depth, crest).
- `ref-base.txt`: `?poolSize=ref` as built (window 280 m).
- `ref-w311.txt`: the same with the window at 311 m (ruling 14's first choice).
- `analyse.mjs`: groups the logged meter onsets into waves as the meter does, from the probe's JSON output (the JSON files are not kept: 1.5 MB each).

Re-run, from the repo root:

```
rolldown docs/research/pool-look-reference-2026-11-11/ruling-14-runs/r14-probe.ts -o dist/scripts/r14-probe.mjs --format esm --platform node
node dist/scripts/r14-probe.mjs --ref --periods 14 --out /tmp/ref-base.json
node dist/scripts/r14-probe.mjs --ref --periods 14 --width 311 --out /tmp/ref-w311.json
node docs/research/pool-look-reference-2026-11-11/ruling-14-runs/analyse.mjs /tmp/ref-base.json 10.5
```
