# The C1 formation clock (ruling 4, rank 1) — 2026-11-11

Ruling 4 (`docs/research/pool-tube-track-2026-11-05/advisor-ruling-4.md`) ranks four fixes for riders torn off the board
as the Barrel's tube forms. This is rank 1 only: a formation clock whose rate never jumps. Ranks 2–4 are not built. The
solver, the floor and the rider are untouched.

**Result in one line: the clock is smooth as asked, but the riders fall just as often. It ships opt-in
(`?formClock=c1`); the default is today's clock, byte for byte.**

## What changed

- **The clock** (`src/wave/barrel/sliceClock.ts`, `formRate`, `FORM_CLOCK`). Each front point carries its rate τ̇
  (`FrontPoint.formRate`). Each step the clock moves by the rate committed the step before, τ += τ̇ Δt, and then sets the
  next rate: a critically damped follow of the target −D/C_p (τ̈ = ω²e + 2ω(1 − τ̇), ω = 4 s⁻¹), kept within 0.5–1.5×, its
  change limited to 1 s⁻¹ (1/60 a step). After the throw the same rate runs on, between 1 and the thrown rate (1.25), so
  it is continuous through τ = 0. ω = 4 s⁻¹ is built so (not sourced): braking from a bound then stays under the 1 s⁻¹
  limit, so the follow does not overshoot.
- **The sub-cell crest** (`crestOnset.ts`, `CrestSample.sub`; `BreakingFront.ts`, `FrontPoint.crestSub`). The crest's
  place along its column is the vertex of the parabola through its cell and its two neighbours, so D no longer steps a
  whole 1 m row at a time.
- **One rate for the shape and its water** (`crashCurve.ts`). The wall water's rate (`tauRate`) is the clock's committed
  rate, the one the shape will move by next step, in place of a finite difference of past steps.
- **The switch.** `?formClock=c1` turns it on; `?formClock=old` is today's clock. Wired like `tubeForm`:
  `PhysicalMode.ts` → `SurfZoneConfig.formClock` → `faceAnchor.ts` (`TubeFace.formClock`, `FORM_CLOCK_DEFAULT = false`)
  → `SurfZoneSimulation.ts`. Online rooms are pinned to the default (`main.ts`).
- **The probe** (`src/wave/probes/proneSeam.probe.test.ts`, opt-in with `PROBE=1`). Rebuilt; the ruling's own was not
  kept. It builds the game's Barrel water headless and places `RideSession` riders with scripted inputs only.

## The old path is main's, byte for byte (measured)

`pin-track.ts` bundled against main (b485f3fb) and against this branch prints 26 identical lines: every spot's sea, every
swept barrel's front, contact, drawing, surface, felt water, lone boards and crash ledger, the Barrel at 1.5 and 1.8 m
on both case lists (240 steps, 321 front points on the default line). Logs: `runs/pin-main.txt`, `runs/pin-branch.txt`.
`?formClock=old` takes the same code path as the default (unit test in `formClock.test.ts`).

## The bars (measured with this probe, 1.5 m, 4 waves a run)

The probe is not the ruling's, so compare builds within this table, not against the ruling's numbers. Its pop-up script
is harsher than the ruling's: the pre-tube build itself fails 8 of 22 here (2 of 16 in the ruling).

| Bar | Today, pool | C1, pool | Today, a38 | C1, a38 | Verdict |
|---|---|---|---|---|---|
| Clock on a rate bound ≤ 1 % of steps | 84.1 % | 7.1 % | 83.8 % | 6.2 % | **Miss** |
| \|Δτ̇\| p99 ≤ 0.02 a step | 1.00 | 0.0167 | 1.00 | 0.0167 | Pass |
| Felt water in the case's water, p99 ≤ 0.2 m/s a step | 3.82 | 3.30 | 10.31 | 7.32 | **Miss** |
| Failed pop-ups ≤ 2 of 16 | 18 of 22 | 16 of 20 | 16 of 22 | 14 of 22 | **Miss** |
| Passive prone falls ≤ 3 of 32 | 15 | 14 | 15 | 15 | **Miss** |
| Formation bar 7 kept (first clock within 0.1 s of τ_e) | 90.1 % | 90.4 % | 91.6 % | 91.3 % | Pass (kept) |
| Contour throw kept (crest within 1 m of its contour) | 95.6 % | 93.7 % | 96.4 % | 92.9 % | Slips about 0.1 m |
| Surf meter within ±5 % | 1.597 m | 1.604 m (+0.4 %) | 1.598 m | 1.584 m (−0.9 %) | Pass |

Four of the bars miss, so by the task's rule the new clock is **opt-in**.

Baselines with the same probe (pool cases unless noted):

| Build | Passive falls (of 32) | Pop-ups failed | Stood | Felt water p99, in the case's water |
|---|---|---|---|---|
| Pre-tube (`tubeFace=old,tubeFrom=piece`) | 2 | 8 of 22 | 14 | 0.06 m/s |
| `tubeForm=old` | 5 | 8 of 22 | 14 | 1.50 m/s |
| Today's default | 15 | 18 of 22 | 4 | 3.82 m/s |
| `formClock=c1` | 14 | 16 of 20 | 4 | 3.30 m/s |

Notes on the readings:

- **On a bound.** The 1.5× bound is nearly gone (0.6–0.8 %). What is left is the 0.5× bound, 5.6–6.3 % of steps, all in
  the last second before the throw (τ −1 to 0; none earlier). There the target asks for less than half real time for a
  stretch, so the clock rests on its slow bound. It reaches the bound smoothly; it does not switch.
- **The wall water follows the clock.** Its rate differs from the step the clock then takes on under 1 % of steps.
- **The contour throw.** The crest is a median 0.1 m further past its contour at the throw (−0.06 → −0.16 m, pool). The
  smooth clock catches up more slowly than a clock that may jump.
- **Today, pool: 18 of 22.** That run's log (`runs/pool-default.txt`) was written before the probe's failed pop-up rule
  was settled and prints 21 of 22 (it counted a fall within 1 s of standing as failed). By the final rule, from the log's
  own rider lines: 4 stood, 18 failed. The other logs print the final rule.
- **Passive falls.** One or two a run come within 0.3 s of the placement (a rider set down in a passing wave at s 70).
  They are the probe's, the same in every build.

## What this says (inferred from the table)

The clock's jerk is not what tears the board off, at least not alone. `tubeForm=old` has a far jerkier clock than
today's (\|Δτ̇\| p99 5.7 a step against 1.0), yet its riders hold (5 falls against 15). The C1 clock removes the jerk
(0.0167) and the riders still fall (14–15). What differs between `tubeForm=old` and the rest is the stage, not its
smoothness: with the distance clock the case's shape is drawn from its earliest frame, and 54–61 % of points throw before
the solver has broken them; with `tubeForm=old` none do, and the shape first shows 1.4 s into its life.

## Not measured

- No runner sessions, catch reports or autopilot rides were run, and no browser. The owner judges the riding.
- 1.8 m was not run (the ruling found it inconclusive; runs kept few).
- Rides after standing: every scripted stander falls by "balance" in every build, as in the ruling. Not a judgment.
- The force on the hold (the ruling's 620–2,460 N) was not rebuilt; only the felt water's change at the board.
- One run a build: no spread across seeds or wave phases.

## Questions for the advisor

1. The clock is now C1 and the wall water uses its rate, but the felt water in the case's water still jumps 3–7 m/s a
   step at p99. Where does the jump come from if not the clock: the seam (rank 2), or the shape's own early frames laid
   over a wave the solver has not yet broken?
2. `tubeForm=old` holds riders with a much rougher clock. Is the real cause that the formation stage exists at all
   under the rider (water moving at the case's speeds before the wave breaks), and should rank 2 or 3 be judged first?
3. The slow bound: in the last second before the throw the target asks for under 0.5× on about 6 % of steps. Is resting
   on a bound smoothly within the bar's intent (no switching), or should the lower bound drop?
4. The throw lands about 0.1 m later against its contour. Acceptable, or should the clock lead its target?

## How to run

```
PROBE=1 H=1.05 CASE=pool SWITCHES=formClock=c1 LOG=/tmp/c1.txt npx vitest run src/wave/probes/proneSeam.probe.test.ts
```

About 4 minutes a run. `CASE=a38`; `SWITCHES=tubeForm=old`; the pre-tube build needs the phase handed in:
`T0=50.70 SWITCHES=tubeFace=old,tubeFrom=piece`. Logs of the runs above are in `runs/`.
