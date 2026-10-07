# Canyon spilling wave and the sideways drift: handover (2026-10-05)

Start here to continue this work on your own machine. Branch: `claude/canyon-spilling`, cut from `claude/wave-pool` at `1fc91b36` (the tube pause). `main` and `claude/wave-pool` are untouched.

## The owner's decisions (grilling session, 2026-10-05)

- **Padang tubes: suspended.** Resume them from `claude/wave-pool` with **Padang → Big** as the test. The pause note there, `docs/research/tube-cap-guidance-2026-10-05/pause-checkpoint-2026-10-05.md`, lists the playable build, the next experiment (a terminal-frame correction for the cap) and the three open items.
- **Foam is not part of the wave's lifecycle for now.** The order is forming → tube → spread, and foam is the same as the spread. This changes the Canyon only.
- **The Canyon becomes a spilling-wave prototype** that replaces its current wave. It has no lip and no tube at any size. Like the reference photo of a spilling wave, the crest crumbles from the top, whitewater spills down the face, and the shoulder ahead stays clean and green.
  - It peels **left to right as seen from the beach looking out to sea**, slowly, at a peel angle of about 50–60°.
  - The foam starts as a thin line at the crest and grows down the face.
  - It is rideable, and falling uses the existing wipeout.
- **Strategy S2:**
  - the bed and settings, plus a **spilling front** that follows the solver's breaking but never lets foam appear ahead of it;
  - the solver still decides the dissipation behind it.
  - **Next is S3:** a roller lens the rider can hit (see `docs/research/water-physics/roller.md` and `roller-build.md`), built standalone rather than on the barrel's loft. S4, the full roller on the loft, waits for the tubes.
- **The sideways waves:** narrow the directional spread to Padang's (s ≈ 150) and set the mean direction to 0° on the Beach, Point, Reef and Canyon. Padang and the Pool are already like that.
  - Confirm it with a crest-angle probe before and after.
  - The Beach's rips stay, so some real rip-current bending remains.
  - The side feed is not rolled out to the other spots.
- **Done for this round means:**
  - screenshots of a Canyon set peeling;
  - crest angles staying parallel over 10 minutes on every spot;
  - a surfer can catch the wave and ride the shoulder;
  - this note is up to date.

## Status

- [x] Crest-angle probe, plus the narrow, square swells (work branch `claude/drift-fix`; results in `docs/research/crest-angle-2026-10-05.md`).
- [x] Canyon spilling wave: the bed, no lip, `SpillingFront`, crest foam (work branch `claude/canyon-spilling-wip`; results in `docs/research/canyon-spilling-2026-10-05/README.md`). Its bed, the corner-canyon bed, is being replaced for straight crests (owner, 2026-10-06) on `claude/canyon-straight`.
- [ ] Merged into `claude/canyon-spilling`, tests green. Merged; the tests are not green: 28 failures, the same tests that fail on the base `1fc91b36`, so none comes from this round (the Canyon note's Tests section).

When a box is unticked, check the work branch for partial commits: `git log origin/claude/canyon-spilling..origin/<work branch>`.

**2026-10-07, the round's results** (`claude/canyon-spilling`):

- **The owner's decisions, 2026-10-06.**
  - The owner first accepted the round as it stood: the solver's median 45°, the front's 55°, the rider able to feel breaking water ahead of the visible foam (a known issue), and S3, the roller, next.
  - After seeing the screenshots, the owner ruled that the Canyon's wave forms from a corner. Waves must form straight to the beach: irregular timing is fine, but never from more than one side and never at once.
  - So the Canyon's peel is not accepted, and its bed is being replaced on `claude/canyon-straight`. The Canyon's numbers below are the corner-canyon bed's.
- **Screenshots of a Canyon set peeling: done**, on the corner-canyon bed: the beach, cliff and overhead sequences in the Canyon note.
- **Crest angles over 10 minutes: met on three spots, mostly met on two, not met at the Canyon.** The square, narrow swells narrowed every changed spot's spread; against the Beach's straight reference:
  - parallel: the Beach, the Point (at a steady +6.1°, its headland's wrap) and the Wave Pool;
  - mostly: the Reef (its old −7.7° tilt is gone, but its crests bend, and 1 edge crest in 32 ran two ways at once);
  - mostly: Padang Padang (parallel on its edge line, but over the reef's peak 3 crests of 34 bent into a chevron);
  - not: the Canyon. Its crests have a corner (halves −30.7° and −7.0°), a mean of −20.0° and a swing of 10.3°.

  The Beach's opening +4.9° tilt does not persist: it averages +0.8° over 10 minutes, which is the seed's own draw.
- **A surfer can catch the wave and ride the shoulder: not met** on the corner-canyon bed.
  - Catch report: 831 attempts, 19 cues and 16 stood, every one falling (balance) within 4.6 s.
  - Ride report: 187 attempts and 23 stands, riding 0.8 s at the median and 3.0 s at most, and at most 8.7 m along shore.
- **Tests:** 2,428 passed and 28 failed, and all 28 fail the same way on the base `1fc91b36`.
  - `SurfZoneRunner.test.ts` passed 43 of 43, `SurfZoneSimulation.test.ts` 86 of 87 (the two took 121 min), and every other `src` file 2,299, with 27 failed.
  - The 28 are the 7 known AttachedRider failures (fixed on another branch), 17 more in the rider's body and pumping, and 4 others: the take-off index's spot list and the logbook's spot list, which both now include the Wave Pool, a school card's words and a tier-parity read.
- **This note:** up to date.
- **What's left:**
  - measure the straight-crest bed (`claude/canyon-straight`) the same way: its crest angles, catch and ride reports, and screenshots;
  - then give the Canyon's description in `SurfConditions.ts`, which still says "median 58°", that bed's numbers;
  - find what bends the Reef's crests and makes Padang Padang's chevrons (not isolated);
  - find why the Canyon's riders fall (their weight sits far forward, 0.87 riding level against a trim of 0.50–0.62; not diagnosed);
  - the 21 pre-existing test failures beyond AttachedRider's: check whether the AttachedRider fix also clears the 17 in the rider's body and pumping, and give the other 4 an owner;
  - S3, the roller.

## How to pick it up locally

```sh
git fetch origin
git checkout claude/canyon-spilling
npm ci
npx vitest run          # or the files named in the research notes
npm run dev             # then Surf → Canyon
```
