# The analyser's own named bottom turns — two arms

`RideAnalyzer` is the shipped classifier, and it lives inside `SurfZoneRunner`, not in the page.
These are its bottom-turn columns measured **through the shipped feed** (`SurfZoneStatus.ride.report`)
on autopilot rides, rather than through `scripts/ride-report.ts`'s private copy of the analyser.

Read **[`whole-input/`](whole-input/README.md)** — that is the arm to quote.

| arm | the rider | status |
| --- | --- | --- |
| [`whole-input/`](whole-input/README.md) | gets the autopilot's whole input: stick, `trim`, `crouch`, `compress`, `rotate` | **current** |
| [`steer-only/`](steer-only/README.md) | got the stick alone — four of the pilot's fields were discarded | superseded, kept for the record |

The steer-only arm is kept rather than deleted because it is a real measurement of a real (if
hobbled) rider and its figures were quoted before the defect was found. The defect was found by
the project's peer reviewer, not by the builder.

**The headline survives both arms:** the bottom turns the game names are about half a second
long and spend a few per cent of the board's speed, against a target describing a turn three
times longer, with the great majority of rides ending in a fall. Feeding the rider its whole
input made the rides longer, not the turns bigger. **The blocker is the ride, not the classifier.**
