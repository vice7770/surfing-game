# The Wave Pool Barrel's hole: why riders fall through the tube (2026-11-03)

Step 2 of the surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`): find the hole. A
measurement and diagnosis only. Nothing in the game changes on this branch. Branch `claude/pool-tube-hole` from main
4eee1e5f. No rider sessions, catch reports, ride reports or autopilot checks were run.

## Where it stands

- **Built:** the probe `src/wave/probes/poolTubeHole.probe.test.ts` (opt-in, `PROBE=1`). It is a test file only, with no
  hooks in game code.
- **Running:** the four full runs (1.5 and 1.8 m; the default cases and `a38`; 12 periods after 50 s) into `runs/`.
- **Measured so far (short runs, 1.5 m, default cases):** the support under the face drops 0.4–0.8 m under the solver's
  surface from the throw to the collapse. See the findings below once the runs land.

## Next steps

1. Fill in the tables from `runs/hole-*.txt`.
2. Hand the advisor's list (the end of this file) to step 3.

## How to verify

- **Types:** `npx tsc --noEmit -p .`
- **The probe** (CPU, about 15–25 min a run on the M1):
  `PROBE=1 H=1.05 CASE=pool LOG=runs/hole-pool-1.05.txt npx vitest run src/wave/probes/poolTubeHole.probe.test.ts --maxWorkers=2`
  - `H=1.32` for 1.8 m; `CASE=a38` for the stand-in; `PERIODS`, `SETTLE`;
  - `BODIES=0` skips the bodies; `CRASH=off` turns the barrel's crash off (`?poolCrash=off`);
  - `DUMP=file` writes one section (the solver's surface, the support and the drawn profile) at the placement column.
