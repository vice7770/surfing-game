# The straight Barrel's ledge floor (2026-11-08)

The owner adopted the steeper reef ledge on the M4 level-13 batch (`docs/research/pool-tube-runs-2/decision.md`: it passes
at 1.8 m and misses only the lip-landing bar at 1.5 m, 0.54 H against 0.6 H). This branch builds the advisor's step-7
geometry (`docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md` §2.2) behind an opt-in switch and probes it
passively. No default changed.

## What changed

- `POOL_LEDGE` (`src/wave/pool.ts`): `gradient` 1/2.0 square to the reef (was 1/9.5), `kneeRounding` 1 m (was 3). The
  crest profile, `flatWidth` 6 and `backSlope` 1/10 stay `POOL_STRAIGHT`'s. `poolStraightDepth` is unchanged; it and the
  new `poolStraightLedgeDepth` both call `poolStraightDepthWith(x, z, face)`.
- `?poolFloor=ledge` → `SurfZoneConfig.poolFloor` 'ledge' (`poolFloorSwitch`, `src/game/PhysicalMode.ts`), only with the
  Barrel's waves. `createSpot`/`poolSpot` pick the ledge depth function, so the solver's bed (which the GPU uploads from
  the same grid), the terrain mesh, the take-off search and the tube's bed reads all see one bed. Online rooms pin it to
  undefined (`src/main.ts`).
- Tests: `PhysicalMode.test.ts` (the switch, Barrel only, online pin); `pool.test.ts` (the default floor's constants and
  depth function untouched; the ledge's face, toe, top and back).
- Not changed: `POOL_STRAIGHT_BREAK_DEPTH`, `startOut`, `POOL_JOIN`, `POOL_RUNS`, `BARREL_SPOTS.pool` (its 1:18.7 slope and
  `POOL_FOOT_DEPTH`), the tube cases. With `?poolFloor=ledge` these are still today's face's.

## Probe (passive, CPU, no riders)

`frame-probe.ts` here is pool-barrel-straight's frame probe with `--floor ledge|knee` and the crest at the face's toe
(8.2 m seaward of the crest line on the ledge) and 10 m beyond. 50 s settle + 12 periods, as the original's runs.
Outputs: `runs/frame-ledge-small.txt`, `runs/frame-ledge-big.txt`. Today's face, for comparison:
`docs/research/pool-barrel-straight-2026-11-01/runs/frame-small.txt`, `frame-big.txt`.

| Check | Small (1.5 m, H 1.05) | Big (1.8 m, H 1.32) | Bar | Today (small / big) |
|---|---|---|---|---|
| (a) X along the ray in the barrel's start (u 60–80) | 4.5 | 4.3, 3.9 | 4–5 | 20.2 / 21.8 |
| (b) health: finite, fastest water, volume | yes, 6.28 m/s, +0.26 % | yes, 7.27 m/s, +0.21 % | no blow-up | yes / yes, 6.97 m/s |
| (c) onset still depth over the barrel section (u 60–140) | 0.90–1.23 m | 0.90–1.18 m | 0.9–1.2 m | big: 1.5–2.0 m before u 100, 0.9–1.2 m after |
| (d) least water on the reef top | 0.16 m | **0.07 m** | ≥ 0.1 m | 0.17 / 0.13 m |
| (e) crest at the toe, s 65 / 120 / 175 (A0 = crest / 4.5 m) | 0.88 / 0.85 / 0.93 m (0.194 / 0.188 / 0.207) | 1.27 / 1.01 / 1.16 m (0.283 / 0.223 / 0.258) | 0.24 / 0.29 (1.08 / 1.31 m) | — |
| (e) crest 10 m seaward of the toe | 0.85 / 1.13 / 0.91 m (0.189 / 0.250 / 0.203) | 1.31 / 1.32 / 1.20 m (0.291 / 0.293 / 0.266) | | — |
| surf meter typical | 1.70 m | 1.88 m | | 1.5 / 1.79 m |

- (a) passes at `gradient` 1/2.0, so it was not iterated. Most of the barrel section's jets carry no X (no gradient
  read), so the X comes from u 50–80 only.
- (b) passes.
- (c) passes: the waves break at the crest edge, as the ruling expected.
- (d) **fails at 1.8 m** (0.07 m; today's 0.13 m). Not tuned.
- (e) **more than 10 % off**: at the toe the small size is 14–22 % under 0.24 (all three sections), the big 3–23 % under
  0.29 (s 120 is 23 % under, s 175 11 % under). 10 m seaward the big size is within 10 % (0.27–0.29), the small not
  (0.19–0.25). The ledge's tube cases would need rerunning at the game's crest (the advisor's level-10 scouts were already
  at 0.211 / 0.250). Reported, not fixed.

**Unexpected, beyond the checklist:** the barrel section no longer plunges. On today's face, every 10 m bin from u 30 to
100 throws jets on more than half its onsets. On the ledge, jets fall to 5–48 % of onsets across u 60–140 at both sizes,
and lip rollers rise (237 / 148 against 81 / 11). Only the start (u −20–50) and the reef's end still count as plunging. The
travelling line also ends sooner: 1 / 4 waves reach u 150 against 8 / 8, so the 65–175 peel can't be measured. One unchecked reading:
the waves now break at the crest edge in 0.9 m of water, where the solver's jets (keyed to the bed's gradient) find no
gradient on the flat top. Which reading is right is a question for the advisor before the ledge goes further.

## What is next

1. The advisor: the barrel section's lost plunge on the ledge, the 0.07 m top at 1.8 m, and whether the toe's A0 means the
   ledge tube cases need rerunning at the game's sizes (0.19–0.21 / 0.22–0.28).
2. The ruling's other re-probes (out of scope here): peel, catch, treadmill current, `POOL_JOIN`, `POOL_RUNS`,
   `POOL_STRAIGHT_BREAK_DEPTH`; then the ledge's tube cases in the game.
3. The owner rides `?poolWaves=barrel&poolFloor=ledge` once the advisor has answered.
