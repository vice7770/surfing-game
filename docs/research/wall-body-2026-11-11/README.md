# The streamline wall water (ruling 6, rank 3) — 2026-11-11

Ruling 6 (`advisor-ruling-6.md`, this folder) looked at what still jolts a board inside the Barrel's forming wave once
the seam blend (`?tubeSeam=blend`, ruling 5) is on. It found two noisy inputs to the water's flow there, and gave a rule
that needs neither. This is that rule, built behind `?wallBody=stream`.

**Result in one line: the water a board feels inside the forming wave is four times calmer (largest 1 % of changes
2.12 → 0.55 m/s a step at 1.5 m, 11.2 → 2.47 at 1.8 m), the throw and the surf meter do not move at all, and no fall
changes: the same boards fall, the same pop-ups fail. It ships opt-in. The default and `?tubeSeam=blend` alone are
unchanged, byte for byte.**

So this is a cleaner water, not yet a ride that holds. The falls left have other causes (below).

## What was built

Inside the case (the tube's shape standing on the sea), the game must say how fast the water moves at the surface.
Until now it built that from two readings:

1. how fast the case's own surface moves, found by comparing the profile's points from one frame to the next. Single
   values swing between +25 and −20 m/s (*measured*, ruling 6 §2: 51 % of the jumps, 65 % of their size);
2. the wave's speed, read as the drawn crest's rate. It ran at 7.5–8.8 m/s on a wave doing about 5 (*measured*).

The new rule uses neither. Seen from a frame that travels with the wave, a forming face is nearly steady, so its
surface is a streamline and the water's speed along it depends only on how far under the crest it is (Bernoulli on a
free surface, *sourced* in the ruling):

- q = √( ((1 − B) c)² + 2 g (y_top − y_surface) ), the speed along the surface in the wave's frame;
- flow along the wave's ray = c − q n_y, and upward = q n_a, with (n_a, n_y) the surface's normal in the ray's plane;
- flow along the crest: the solver's, kept;
- weight = the slices' weight × the seam's share (ruling 5's α), so it still fades into the sea as the blend does.

c is the wave's own advance (`celerity`), B is the seam's crest share (0.85 before the throw, → 1 over 0.2 s after it),
y_top is the slice's crest height, y_surface is the surface the board touches.

What that gives, at c = 5 m/s: at the crest the water moves forward at 0.85 c; on a 45° face half a metre under the
crest it moves forward at 2.7 m/s and up at 2.3 m/s; at a flat foot it flows back toward the wave; under an overturned
roof it moves forward faster than the wave and down. Those are the unit tests.

Files:

| File | Why |
|---|---|
| `src/physics/PhysicalSurfWater.ts` | `streamWallFlow` (the rule, a pure function) and the `sweptStream` option that puts it in place of the old target. |
| `src/wave/barrel/crashCurve.ts` | With the rule on, the wall water's c is the wave's own advance, not the drawn crest's rate. |
| `src/wave/barrel/faceAnchor.ts` | `TubeFace.stream` (absent when off); needs the blend and the wall water. |
| `src/game/PhysicalMode.ts`, `src/wave/SurfZoneSimulation.ts` | The switch `?wallBody=stream`, at the Barrel alone, with `?tubeSeam=blend` alone. |
| `src/main.ts` | Online rooms are pinned to the default. |
| `src/wave/barrel/wallBody.test.ts` (new), `src/game/PhysicalMode.test.ts` | Unit tests of the rule and of the switch. |

No hidden forces: nothing acts on the rider or the board. The change is how fast the water moves, by a named law.
Nothing is low-passed.

## One difference from the ruling: no fade with depth

The ruling said to keep the old wall water's fade with depth (the case's flow gives way to the sea's between 0.3 and
0.6 m under the surface, along the normal), and that no board reaches it. Built that way, the result was not the
prototype's. *Measured* (the `f` runs against the `s` runs, same code but for that one line):

| | Felt p99 in the case (max), m/s | Jumps > 0.2 m/s | Passive falls /32 (before / after the throw) | Pop-ups failed, stood |
|---|---|---|---|---|
| 1.5 m, no fade (`s1`) | 0.55 (0.76) | 0.33 % | 5 (1 / 4) | 8 of 22, 14 |
| 1.5 m, fade (`f1`) | 2.71 (2.83) | 0.53 % | 4 (0 / 4) | 8 of 22, 14 |
| 1.8 m, no fade (`s2`) | 2.47 (6.25) | 0.73 % | 11 (2 / 9) | 4 of 24, 20 |
| 1.8 m, fade (`f2`) | 2.48 (4.41) | 1.03 % | 9 (0 / 9) | 4 of 24, 20 |
| 1.5 m + `formClock=c1`, no fade (`s3`) | 1.04 (1.17) | 0.39 % | 5 (1 / 4) | 6 of 20, 14 |
| 1.5 m + `formClock=c1`, fade (`f3`) | 2.67 (2.78) | 0.57 % | 3 (0 / 3) | 6 of 20, 14 |
| 1.5 m, case a38, no fade (`s4`) | 0.81 (0.96) | 0.32 % | 4 (0 / 4) | 8 of 22, 14 |
| 1.5 m, case a38, fade (`f4`) | 0.96 (3.44) | 0.37 % | 4 (0 / 4) | 8 of 22, 14 |

So the fade is reached, and it does two things: it puts a few 2.7 m/s jolts back (at 1.5 m; at 1.8 m the p99 is the
same and the jumps are more), and the passive boards that fell before the throw no longer do (they fall after it
instead, or not at all). The pop-ups do not change either way.

It is left out, for two reasons. Without it the build is the measured prototype, which passes the ruling's bar on the
felt water (0.6 m/s) while the fade misses it. And a 0.3 m fade is not physics for this rule: under a wave the water
a few decimetres down moves almost as the surface over it does. The Basilisk velocity data, once run, gives the real
decay with depth (ruling 6 §8) and settles it.

**A lead, not a result:** that a fade with depth alone removes every passive fall before the throw (the 3 runs that
had any; the a38 case has none either way) says
those falls involve a board, or part of it, sitting a few decimetres under the case's surface. That fits the ruling's
own guess about what is left (the surface rises 0.4–0.7 m under the board in the last half second). It is the next
thing to measure.

## Off is main's, byte for byte

- **Measured.** `pin-track.ts` on this branch prints the same 26 lines as on main (`runs/pin-branch.txt` against
  `../tube-seam-2026-11-11/runs/pin-branch.txt`): every spot's sea, every swept barrel, the Barrel at 1.5 and 1.8 m.
- **Measured.** `?tubeSeam=blend` alone on this branch (`runs/s0-blend-pool.txt`) is the seam README's run to the last
  digit (felt p99 2.121, 184 jumps, 5 falls, 8 of 22, stood 14).
- **Built.** `?wallBody=stream` without `?tubeSeam=blend`, or at any spot but the Barrel, is ignored (unit test).

## Results against ruling 6's bars

Probe: `proneSeam.probe.test.ts`, 4 waves, 32 passive prone boards and 24 scripted pop-ups a run. "Felt" is the change
in one step (1/60 s) of the water's velocity at the board.

| Run | Wave | Build | Felt p99 in case (max), m/s | Jumps > 0.2 | Jumps at a source switch | Felt p99, τ < −0.5 s | Passive falls /32 (before / after) | Pop-ups failed, stood | Throw p50, within 1 m | Meter |
|---|---|---|---|---|---|---|---|---|---|---|
| s0 | 1.5 m | blend | 2.12 (3.66) | 0.71 % | 1 of 35 | 0.058 | 5 (1 / 4) | 8 of 22, 14 | −0.06 m, 95.6 % | 1.597 |
| **s1** | 1.5 m | **blend + stream** | **0.55 (0.76)** | **0.33 %** | 0 of 35 | 0.054 | 5 (1 / 4) | 8 of 22, 14 | −0.06 m, 95.6 % | 1.597 |
| a5 | 1.8 m | blend | 11.24 (17.3) | 1.38 % | 5 of 47 | 0.066 | 11 (2 / 9) | 4 of 24, 20 | −0.12 m, 89.0 % | 1.935 |
| **s2** | 1.8 m | **blend + stream** | 2.47 (6.25) | 0.73 % | 0 of 48 | 0.061 | 11 (2 / 9) | 4 of 24, 20 | −0.12 m, 89.0 % | 1.935 |
| b4 | 1.5 m | blend + `formClock=c1` | 2.97 (3.87) | 0.72 % | 0 of 27 | 0.061 | 5 (1 / 4) | 6 of 20, 14 | −0.16 m, 93.7 % | 1.604 |
| **s3** | 1.5 m | **blend + stream + c1** | 1.04 (1.17) | 0.39 % | 0 of 30 | 0.055 | 5 (1 / 4) | 6 of 20, 14 | −0.16 m, 93.7 % | 1.604 |
| b3 | 1.5 m, a38 | blend | 1.41 (1.49) | 0.47 % | 1 of 25 | 0.058 | 4 (0 / 4) | 8 of 22, 14 | −0.05 m, 96.4 % | 1.598 |
| **s4** | 1.5 m, a38 | **blend + stream** | 0.81 (0.96) | 0.32 % | 1 of 25 | 0.057 | 4 (0 / 4) | 8 of 22, 14 | −0.05 m, 96.4 % | 1.598 |

(b3, b4: the seam README's runs, `../tube-seam-2026-11-11/runs/`. a5: the advisor's run on main.)

The bars (ruling 6 §5), at 1.5 m:

| # | Bar | Blend | Blend + stream | Verdict |
|---|---|---|---|---|
| 1 | The wall water's c changes ≤ 0.2 m/s a step (p99), within ±20 % of the wave's advance | p95 0.80; 7.9 against 5 | 0.20; 5.0–5.3 (a3) | Pass |
| 2 | Jumps over 0.2 m/s ≤ 0.6 % of steps | 0.71 % | 0.33 % | Pass |
| 3 | No jump at a source switch | 1 of 35 | 0 of 35 | Pass |
| 4 | Field part in the wave's frame, after the throw, p99 ≤ 0.2 m/s | 2.18 | 0.15 (a3) | Pass |
| 5 | Field part, before the throw, p99 ≤ 0.33 m/s | 2.18 | 0.50 (a3) | **Miss** |
| 6 | Total felt p99 in the case ≤ 0.6 m/s | 2.12 | 0.55 | Pass |
| 7 | Felt p99 ≤ 0.1 m/s for τ < −0.5 s | 0.058 | 0.054 | Pass |
| 8 | Seam flow across 0.25 m, τ −1 to −0.5 s, no more than τ < −1 s plus 0.1 | max 0.69 against 0.25 | p90 0.28, max 0.30 against 0.23, 0.25 | Pass |
| 9 | Passive falls before the throw ≤ 3; pop-ups failed ≤ 8 of 22; stood ≥ 14 | 1; 8; 14 | 1; 8; 14 | Pass, unchanged |
| 10 | Throw's place and time, and the meter, identical | — | identical | Pass |
| 11 | Board's acceleration in the case p99 ≤ 10 m/s² | not logged | 36 (a3) | **Miss** |

Rows marked (a3) are the advisor's prototype readings; they need its own attribution probe (kept as
`runs/ruling6.probe.test.ts.txt`, it reads a debug hook that is not in the build). The build equals a3 on every number
the committed probe prints, to the last digit, so those readings stand for it.

Two bars miss, and all 11 are needed for default-on, so it is **opt-in**. (On the a38 case bar 3 misses too: 1 jump
at a source switch of 25, as with the blend alone.) Neither miss is this rule's to fix (ruling 6
§4): bar 5 is the surface's normal turning from step to step; bar 11 is the surface rising under the board.

At 1.8 m the felt water is still rough (p99 2.47, max 6.25 m/s): the ruling puts that on height steps of the case after the throw.

## What it does not fix

Every fall is the same fall as before. Ruling 6 sorts them:

- **After the throw:** boards on the break line going over the falls. By the owner's rule that is correct for a
  passive body. (Four of the 1.8 m falls are the probe's own: the "s 70, 3 m out" board starts where the wave lands.)
- **Before the throw, and the failed pop-ups:** the surface rises 0.4–0.7 m under the board in the last half second
  before the throw, faster than a board can follow (acceleration p99 36 m/s² against 8 on the open sea). *Inferred*,
  not isolated.

Next, in order (none built): (1) measure the surface's rise speed at the board against the up part of the water's
flow there, in the last 0.5 s before the throw; if they disagree, the water must carry the rise, or the blend's course
must be longer; (2) the normal's turning (mesh facets against the clock's stepping); (3) the 1.8 m case's height steps
after the throw.

## For the owner: what to ride

Wave Pool, Barrel, default start. Paddle a little forward, catch, pop up, ride the face toward the tube.

1. `?tubeSeam=blend` — the seam blend alone (from the last list).
2. `?tubeSeam=blend&wallBody=stream` — this build. Expect the same ride, with less shudder as the wave stands up under
   you. If it feels the same, that agrees with the numbers: the falls left are not from the water's flow.
3. `?tubeSeam=blend&wallBody=stream&formClock=c1` — with the smooth formation clock.
4. Any of the above with the wave at 1.8 m.

What to tell me: where you fall (as the wave lifts you, at the pop-up, or once standing), and whether 2 is any
different from 1.

## Runs

`runs/s0`–`s4`: this build. `runs/f1`–`f4`: the same with the fade with depth. `runs/a1`–`a6`, `prototype.diff`,
`ruling6.probe.test.ts.txt`: the advisor's prototype (ruling 6). `runs/pin-branch.txt`: the identity check.

Commands: `PROBE=1 H=1.05 CASE=pool SWITCHES=tubeSeam=blend,wallBody=stream LOG=<file> npx vitest run
src/wave/probes/proneSeam.probe.test.ts` (`H=1.32` for 1.8 m, `CASE=a38`, add `formClock=c1`).
