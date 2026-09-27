# Duck-dive report

The wipeout spec's Part A checks the duck-dive under broken water against the gameplay survey's §5: a well-timed dive is pushed shoreward much less than a paddler who stays on top, a late or early one does worse, and it is weaker in shallow inside water.

Prone paddlers start 25 m inside the canyon break point on the practice swell (Hs 1.4 m, Tp 12 s), heading out to sea, side by side along the shore 4 m apart (so each meets nearly the same broken water), one per way of meeting it. A dive is a 1.5 s press of the Duck-dive action. The **setback** is how much further shoreward the board is 4 s after broken water (breaking ≥ 0.3) reached it than the same inputs leave it on still water. The paddlers are ghosts: they feel the water and the lip, and push back on neither.

2 seed(s), 3 simulated min each: 15 episodes measured, 3 abandoned (no broken water within 40 s). Run time 1694 s for 360 s of sea.

| way of meeting it | n | median setback, m | range, m | still on the board | median depth diving, m |
|---|---|---|---|---|---|
| on top | 18 | 10.8 | 4.2 to 17.7 | 33 % | — |
| dive on time (2.5 m) | 18 | 6.5 | -1.6 to 13.8 | 0 % | 0.77 |
| dive early (9 m) | 16 | 6.9 | -4.4 to 12.6 | 13 % | 0.63 |
| dive late (0.3 m) | 15 | 5.3 | -6.7 to 13.2 | 0 % | 0.65 |
| on top, 15 m inside | 19 | 10.7 | 3.5 to 17.5 | 68 % | — |
| dive on time, 15 m inside | 19 | 8.3 | 1.6 to 18.6 | 5 % | 0.67 |

## Why paddlers came off

- on top: 10 × lost board (on top), 2 × foot slip (on top); median 2.0 s after the broken water reached it
- dive on time (2.5 m): 16 × lost board (ducking), 1 × foot slip (ducking), 1 × lost board (after the dive); median 0.2 s after the broken water reached it
- dive early (9 m): 7 × lost board (ducking), 5 × lost board (after the dive), 1 × foot slip (after the dive), 1 × foot slip (ducking); median 0.4 s after the broken water reached it
- dive late (0.3 m): 14 × lost board (ducking), 1 × foot slip (ducking); median 0.5 s after the broken water reached it
- on top, 15 m inside: 6 × lost board (on top); median 2.3 s after the broken water reached it
- dive on time, 15 m inside: 3 × lost board (after the dive), 15 × lost board (ducking); median 0.4 s after the broken water reached it

## Against the survey (§5)

| check | expectation | measured | verdict |
|---|---|---|---|
| on time vs on top | much less (under half) | 6.5 vs 10.8 m | not met |
| early and late vs on time | both worse | early 6.9, late 5.3, on time 6.5 m | not met |
| 15 m inside | weaker (dive/top ratio higher) | 0.78 vs 0.60 | met |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
