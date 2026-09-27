# Duck-dive report

The wipeout spec's Part A checks the duck-dive under broken water against the gameplay survey's §5: a well-timed dive is pushed shoreward much less than a paddler who stays on top, a late or early one does worse, and it is weaker in shallow inside water.

Prone paddlers start 25 m inside the canyon break point on the practice swell (Hs 1.4 m, Tp 12 s), heading out to sea, side by side along the shore 4 m apart (so each meets nearly the same broken water), one per way of meeting it. A dive is a 1.5 s press of the Duck-dive action. The **setback** is how much further shoreward the board is 4 s after broken water (breaking ≥ 0.3) reached it than the same inputs leave it on still water. The paddlers are ghosts: they feel the water and the lip, and push back on neither.

2 seed(s), 3 simulated min each: 15 episodes measured, 3 abandoned (no broken water within 40 s). Run time 2009 s for 360 s of sea.

| way of meeting it | n | median setback, m | range, m | still on the board | median depth diving, m |
|---|---|---|---|---|---|
| on top | 18 | 12.1 | 4.4 to 19.0 | 28 % | — |
| dive on time (2.5 m) | 18 | 6.5 | 2.8 to 16.3 | 6 % | 0.64 |
| dive early (9 m) | 16 | 5.5 | -5.8 to 12.3 | 38 % | 0.69 |
| dive late (0.3 m) | 15 | 7.3 | -3.3 to 14.0 | 0 % | 0.59 |
| on top, 15 m inside | 19 | 10.9 | 3.4 to 21.2 | 79 % | — |
| dive on time, 15 m inside | 19 | 8.3 | 3.7 to 23.0 | 11 % | 0.35 |

## Why paddlers came off

- on top: 12 × lost board (on top), 1 × foot slip (on top); median 1.9 s after the broken water reached it
- dive on time (2.5 m): 12 × lost board (after the dive), 5 × lost board (ducking); median 1.6 s after the broken water reached it
- dive early (9 m): 10 × lost board (after the dive); median 1.9 s after the broken water reached it
- dive late (0.3 m): 12 × lost board (after the dive), 3 × lost board (ducking); median 1.8 s after the broken water reached it
- on top, 15 m inside: 3 × lost board (on top), 1 × foot slip (on top); median 2.0 s after the broken water reached it
- dive on time, 15 m inside: 12 × lost board (after the dive), 4 × lost board (ducking), 1 × foot slip (ducking); median 1.6 s after the broken water reached it

## Against the survey (§5)

| check | expectation | measured | verdict |
|---|---|---|---|
| on time vs on top | much less (under half) | 6.5 vs 12.1 m | not met |
| early and late vs on time | both worse | early 5.5, late 7.3, on time 6.5 m | not met |
| 15 m inside | weaker (dive/top ratio higher) | 0.76 vs 0.54 | met |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
