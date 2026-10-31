# Duck-dive report

The wipeout spec's Part A checks the duck-dive under broken water against the gameplay survey's §5: a well-timed dive is pushed shoreward much less than a paddler who stays on top, a late or early one does worse, and it is weaker in shallow inside water.

Prone paddlers start 25 m inside the canyon break point on the practice swell (Hs 1.4 m, Tp 12 s), heading out to sea, side by side along the shore 4 m apart (so each meets nearly the same broken water), one per way of meeting it. A dive is a 1.5 s press of the Duck-dive action. The **setback** is how much further shoreward the board is 4 s after broken water (breaking ≥ 0.3) reached it than the same inputs leave it on still water. The paddlers are ghosts: they feel the water and the lip, and push back on neither.

1 seed(s), 3 simulated min each: 0 episodes measured, 4 abandoned (no broken water within 40 s). Run time 1144 s for 180 s of sea.

| way of meeting it | n | median setback, m | range, m | still on the board | median depth diving, m |
|---|---|---|---|---|---|
| on top | 1 | 7.4 | 7.4 to 7.4 | 100 % | — |
| dive on time (2.5 m) | 1 | 4.7 | 4.7 to 4.7 | 0 % | 0.54 |
| dive early (9 m) | 1 | 4.0 | 4.0 to 4.0 | 0 % | 0.41 |
| dive late (0.3 m) | 0 | — | — to — | 0 % | — |
| on top, 15 m inside | 3 | 5.2 | 4.8 to 5.3 | 100 % | — |
| dive on time, 15 m inside | 3 | -1.0 | -1.2 to 1.9 | 33 % | 0.60 |

## Why paddlers came off

- on top: none
- dive on time (2.5 m): 1 × lost board (after the dive); median 2.3 s after the broken water reached it
- dive early (9 m): 1 × lost board (ducking); median 1.5 s after the broken water reached it
- dive late (0.3 m): none
- on top, 15 m inside: none
- dive on time, 15 m inside: 2 × lost board (after the dive); median 2.5 s after the broken water reached it

## Against the survey (§5)

| check | expectation | measured | verdict |
|---|---|---|---|
| on time vs on top | much less (under half) | 4.7 vs 7.4 m | not met |
| early and late vs on time | both worse | early 4.0, late —, on time 4.7 m | not met |
| 15 m inside | weaker (dive/top ratio higher) | -0.20 vs 0.64 | not met |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
