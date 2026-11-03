# The Canyon's version C: one straight bank peeling from +x into the reef bowl (2026-11-03)

Branch `claude/canyon-c` from main at 4eee1e5f. The design is the water-physics advisor's ruling with the owner's decisions
(`advisor-ruling.md`, logged in `docs/research/water-physics/consult-log.md`). Wave work only: no rider sessions in tests,
no tube work at the Canyon.

## Where it stands

- Started: the ruling and its consult-log row are committed. Nothing is built yet.

## Next steps

1. The bed (`Bathymetry.ts`): the bank, the flipped bowl, the channel; `CANYON_B` frozen; `CanyonBed` 'b'.
2. The spot's settings (`SurfZoneSimulation.ts`): the front's direction, one beach-look group, the start at x +75, the
   tank, the readout.
3. The pins: `?canyonBed=b` is B byte for byte, `?canyonBed=old` A (110c2d83), the other spots unchanged.
4. Measure the bars (frame probe, 3 sizes), the current, the cost and the catch; stills.

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Cc]anyon"`.
