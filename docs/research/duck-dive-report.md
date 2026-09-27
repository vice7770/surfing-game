# Duck-dive report

The wipeout spec's Part A checks the duck-dive under broken water against the gameplay survey's §5: a well-timed dive is pushed shoreward much less than a paddler who stays on top, a late or early one does worse, and it is weaker in shallow inside water.

Prone paddlers start 25 m inside the canyon break point on the practice swell (Hs 1.4 m, Tp 12 s), heading out to sea, side by side along the shore 4 m apart (so each meets nearly the same broken water), one per way of meeting it. A dive is a 1.5 s press of the Duck-dive action. The **setback** is how much further shoreward the board is 4 s after broken water (breaking ≥ 0.3) reached it than the same inputs leave it on still water. The paddlers are ghosts: they feel the water and the lip, and push back on neither.

2 seed(s), 3 simulated min each: 15 episodes measured, 3 abandoned (no broken water within 40 s). Run time 1783 s for 360 s of sea.

| way of meeting it | n | median setback, m | range, m | still on the board | median depth diving, m |
|---|---|---|---|---|---|
| on top | 18 | 12.0 | 4.4 to 19.0 | 28 % | — |
| dive on time (2.5 m) | 18 | 7.9 | -2.1 to 15.7 | 0 % | 0.75 |
| dive early (9 m) | 16 | 4.3 | -5.2 to 13.1 | 13 % | 0.61 |
| dive late (0.3 m) | 15 | 6.4 | -4.4 to 13.5 | 0 % | 0.65 |
| on top, 15 m inside | 19 | 10.9 | 3.4 to 21.2 | 79 % | — |
| dive on time, 15 m inside | 19 | 8.2 | 1.5 to 22.2 | 0 % | 0.70 |

## Why paddlers came off

- on top: 12 × lost board (on top), 1 × foot slip (on top); median 1.9 s after the broken water reached it
- dive on time (2.5 m): 15 × lost board (ducking), 2 × lost board (after the dive), 1 × foot slip (ducking); median 0.2 s after the broken water reached it
- dive early (9 m): 8 × lost board (ducking), 5 × lost board (after the dive), 1 × foot slip (after the dive); median 0.4 s after the broken water reached it
- dive late (0.3 m): 14 × lost board (ducking), 1 × foot slip (ducking); median 0.5 s after the broken water reached it
- on top, 15 m inside: 3 × lost board (on top), 1 × foot slip (on top); median 2.0 s after the broken water reached it
- dive on time, 15 m inside: 4 × lost board (after the dive), 15 × lost board (ducking); median 0.4 s after the broken water reached it

## Against the survey (§5)

| check | expectation | measured | verdict |
|---|---|---|---|
| on time vs on top | much less (under half) | 7.9 vs 12.0 m | not met |
| early and late vs on time | both worse | early 4.3, late 6.4, on time 7.9 m | not met |
| 15 m inside | weaker (dive/top ratio higher) | 0.75 vs 0.66 | met |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
