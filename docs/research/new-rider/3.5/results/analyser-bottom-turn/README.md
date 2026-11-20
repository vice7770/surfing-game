# The analyser's own named bottom turns — the raw population

The first measurement of `RideAnalyzer`'s bottom-turn columns taken **through the shipped
feed** rather than through `scripts/ride-report.ts`'s private copy of it. Gathered
2026-11-20 on branch `claude/analyser-names-bottom-turn` (`bb8f5131`) with `?rideReports=N`
and `?seed=N`, in three real browser sessions against a vite dev server.

| file | spot | style | attempts | analysed rides |
| --- | --- | --- | --- | --- |
| `c1.json` | canyon (bed B) | turns | 83 | 4 |
| `c2.json` | canyon (bed B) | turns | 38 | 8 |
| `flow.json` | canyon (bed B) | flow | 30 | 8 |
| `point.json` | point — **control, kept separate** | turns | 42 | 8 |

**Canyon total: 151 attempts → 20 analysed rides → 13 measured → 3 named a bottom turn.**
Names over the 13: top turn ×7, bottom turn ×3, unjudged ×3. Ride duration n=20: median
1.94 s, range 0.00–8.40. Ends: fell ×18, kicked out ×2.

The three named bottom turns, recomputed from these files by the coordinator independently
of the builder's report and **agreeing with it to three decimals**:

| column | n | median | range |
| --- | --- | --- | --- |
| `roll` (peak **board** roll) | 3 | 49.314° | 40.537–54.102° |
| `pathYaw` (course) | 3 | −22.199° (signed) | −51.211 to +13.992 |
| `carry` (**mean** rise, 0.3 s window) | 3 | 0.050 m | 0.041–0.050 |

`stats.mjs` is the builder's own script over these files.

## Read these three warnings before quoting any number above

1. **n = 3.** A population, not a distribution. Nothing here should move a constant.
2. ⛔ **`roll` is the BOARD's roll, not the rider's bank.** `RideSample.roll` is documented
   *"The board's roll, rad"* (`src/game/rideAnalysis.ts:23`). The rider's own bank exists
   live on `status.ride.bank` and the analyser never stores it, so **no bottom-turn number
   the game records today is a rider bank.**
3. ⛔ **`carry` is a mean rise over a 0.3 s window.** It is not the probe's peak rise over
   1.5 s and the two cannot be differenced. `pathYaw` signs differ across the three turns —
   they turned different ways — so an absolute range (14.0–51.2°) is a magnitude, not a span.

**The result that matters more than the columns:** the named bottom turns are **0.47 s** long
and spend **7%** of ground speed, against a target describing a turn three times longer, with
the median ride lasting 1.94 s and 18 of 20 ending in a fall. **The blocker is the ride, not
the classifier.**
