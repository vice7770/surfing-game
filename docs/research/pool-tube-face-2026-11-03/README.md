# The Wave Pool Barrel's surfable tube: steps 4–6, the face anchor (2026-11-03)

Steps 4–6 of the surfable-tube plan (`docs/superpowers/plans/2026-11-03-pool-surfable-tube.md`): build the water-physics
advisor's step 3 ruling (`advisor-ruling.md`, also the consult log's top row) and measure its 13 bars. Branch
`claude/pool-tube-face` from `claude/pool-tube-hole` (33e6a371, on main 4eee1e5f). No rider sessions, catch reports or
autopilot checks were run.

## Where it stands

- **Built (pool only, behind `BarrelSpot.faceAnchor`; every other spot unchanged):**
  - the face anchor;
  - the support's union;
  - the lagged join, with its retire guard and the fallback's formation ramp;
  - the capped thrown clock;
  - thrown ends blended over their height;
  - the four switches.
- **Being measured:** short runs at 1.5 m while the build settled; the full runs next.
- **Found on the way:**
  - The pool's throw depth was clamped to the runs' foot crests (2.19 m), deeper than where the drawn case goes vertical
    (1.51 / 1.94 m). The lagged join keys on it, so in lag mode it is scaled by Froude.
  - Step 2's "the drawn clock runs at 2×" was a measurement of a fixed reef column, not of the clock: each point's clock
    runs at 1.00× (p95 1.01–1.25). Points travel along the reef as they come shoreward, so a column sees the tube pass
    faster.

## Next steps

1. The full runs: 1.5 and 1.8 m, the pool's cases and a38, 12 periods; the old-switch runs for the ledger.
2. The pin check against main; the tests; ride-camera strips.

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **The bars:** `PROBE=1 H=1.05 CASE=pool LOG=runs/face-pool-1.05.txt npx vitest run src/wave/probes/poolTubeFace.probe.test.ts --maxWorkers=2`
  (`H=1.32`; `CASE=a38`; `SWITCHES=tubeFace=old,tubeFrom=piece` for the build before; `BODIES=0`; `PERIODS`).
- **The pin check:** `pin-face.ts` (its header has the command); bundle against main and the branch and compare.
