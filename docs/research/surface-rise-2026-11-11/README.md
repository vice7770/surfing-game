# The surface's rise against the water's — 2026-11-11

Ruling 6 guessed that the falls left before the throw come from the Barrel's surface rising under the board faster
than the water there is said to move. This measures it. It is a probe only: nothing in the game changes.

**Result in one line: the guess holds. In the last half second before the throw, inside the case, the surface moves
through the water the board feels at 1.1 m/s (median) and 3.9 m/s (95th percentile). On the open sea the same
reading is 0.17 and 0.42. Nearly all of it is the case's surface moving in the wave's own frame while the water under
it is told nothing of that. The streamline switch (`?wallBody=stream`) does not touch it, which is why it saved no
fall.**

## What is measured

At a free surface a water particle on the surface stays on it (the kinematic condition, *sourced*: any free-surface
text, e.g. Dean & Dalrymple 1991 §3.2):

∂η/∂t + u ∂η/∂x + w ∂η/∂z = v

η is the surface's height, (u, w) the water's horizontal flow, v its upward flow. The probe reads both sides at the
point the board was at one step ago: the surface's rise there over the step, its slope (0.1 m each way), and the felt
water 0.05 m under it. **The miss** is |left − right|: how fast the surface moves through the water.

It then splits the miss in the frame that travels with the wave (speed c along the ray, from the nearest front point):

- **the surface's own rise**: how fast the surface moves up at a point carried with the wave. Zero for a wave of
  steady shape.
- **off the surface's line**: (u − c)·∇η − v, how far the felt water is from running along the surface in that frame.
  Zero on a streamline.

The miss is their sum. Code: `src/wave/probes/proneSeam.probe.test.ts` ("The surface's rise against the water's").

## Results (*measured*; m/s; attached boards, 4 waves, "1.5 m" Barrel unless said)

In the case's water, **τ −0.5 to 0 s** (the half second before the throw, where the blend brings the case in):

| Build | The miss, p50 / p95 / max | The surface's own rise, size p50 / p95 / max | The sea's own rise there, p5 to p95 | Off the surface's line, size p50 / p95 |
|---|---|---|---|---|
| blend + stream (`k1`) | 1.14 / 3.90 / 8.86 | 1.10 / 3.50 / 4.72 | −0.09 to 0.13 | 0.39 / 1.03 |
| blend + stream + `formClock=c1` (`k5`) | 1.61 / 7.00 / 12.5 | 1.38 / 7.17 / 12.5 | −0.07 to 0.19 | 0.39 / 1.53 |
| blend + stream, 1.8 m (`k4`) | 1.45 / 7.43 / 19.0 | 1.15 / 5.97 / 23.1 | −0.55 to 0.11 | 0.32 / 1.03 |
| blend (`k2`) | 1.20 / 3.76 / 4.89 | 0.91 / 3.51 / 4.87 | −0.66 to −0.10 | 0.90 / 2.01 |
| pre-tube, `tubeForm=old` (`k3`) | 0.48 / 3.68 / 16.8 | 0.78 / 4.64 / 15.0 | −0.58 to 0.76 | 0.67 / 1.54 |

For scale, the same readings elsewhere (blend + stream):

| Where | The miss, p50 / p95 | The surface's own rise, size p50 / p95 | Off the surface's line, size p50 / p95 |
|---|---|---|---|
| The solver's sea, τ under −1 s (the control) | 0.16 / 0.41 | 0.08 / 0.27 | 0.28 / 0.54 |
| The solver's sea, τ −0.5 to 0 s | 0.17 / 0.42 | 0.08 / 0.30 | 0.21 / 0.53 |
| In the case, τ 0 to 0.5 s (after the throw) | 0.30 / 1.40 | 0.26 / 1.00 | 0.18 / 0.52 |

## What it says

1. **The gap is the surface's own rise.** Before the throw the case's surface moves at about 1 m/s in the wave's
   frame (up at the median, +0.65; down at the low end, −3.0), and at 3.5 m/s one step in twenty. The solver's sea
   under it is steady in that frame (±0.1). The felt water carries none of that motion.
2. **The size of the median is the blend's own.** The blend brings about half a metre of case in over half a second:
   1 m/s on average, 1.5 at the middle of its course (*inferred* from the blend's formula; it matches the 1.1 read).
   The tail (3.5 to 4.7 m/s, and the falls of 3 m/s) is more than the course gives: *not isolated*; the height band
   and the case's own change from frame to frame are the candidates.
3. **The streamline rule did its part and no more.** It halves "off the surface's line" (0.90 → 0.39, to about the
   open sea's 0.28) and leaves the surface's own rise as it was. So the water now runs along the surface, but the
   surface moves through it.
4. **After the throw the gap closes** (0.26 / 1.00): the case is fully in and steady in the wave's frame.
5. **The smooth clock makes the tail worse** (p95 3.5 → 7.2), and the 1.8 m wave's is worse (6.0, max 23).
6. **The solver's own convention**, for the record: on the sea the felt up-flow equals the surface's rise at a fixed
   point (∂η/∂t), without the slope term. That is the control's miss of 0.16.

## What it does not say

- That closing the gap saves the falls. It is the largest measured difference between the case and the sea in the
  window where riders fall, and nothing more is proven.
- Which fix. Two were named by ruling 6: let the water carry the surface's rise (add it to the up-flow), or bring
  the case in over a longer course. Both change the wave's water, so both go to the advisor first.

## Runs

`runs/k1`–`k5`. Command: `PROBE=1 H=1.05 CASE=pool SWITCHES=tubeSeam=blend,wallBody=stream LOG=<file> npx vitest run
src/wave/probes/proneSeam.probe.test.ts` (`H=1.32` for 1.8 m).

## What came next

The advisor's ruling 7 answers the two open points above: [ruling-7/README.md](ruling-7/README.md). In short: the water
should carry the rise, but the surface's hand-over must be made smooth at its source first.
