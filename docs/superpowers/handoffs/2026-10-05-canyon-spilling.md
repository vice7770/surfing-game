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
- [x] The Canyon's straight-crest bed (work branch `claude/canyon-straight`; results in the Canyon note's §1).
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

**2026-10-07, the straight-crest bed** (`claude/canyon-straight`):

- **The owner's decisions, 2026-10-07.**
  - The peel: the solver's peel accepted by the owner, 2026-10-07: drawn and felt at 55° by the spilling front. The solver peels at 31° on the tracker (42° by each wave's own fit); rule A and the peel meter stay as they are.
  - The upcoast haze: held back. The spilling front also withholds whitewater upcoast (−x) of each crest's first onset, beyond a margin of a few metres. It only lowers the gated whitewater: the solver is never written, and other spots don't change.
- **The upcoast gate: done.** `upcoastMargin` = 6 m (provisional: the front's join reach) in `SpillingFront.ts`.
  - Crests whose foam showed more than 12 m upcoast of the peak went from 5 of 40 to 1; none reaches past x −70 (before: 4, out to the window's edge).
  - The solver's own break is unchanged.
  - Measured with `scripts/canyon-haze-report.ts`, tested in `SpillingFront.test.ts`; the overhead sheet is retaken (Canyon note, §3).
- **The bed:** one oblique arm (62°) on a level 3.6 m shelf, no canyon, the tank's 1 m cells from its zone in (running flat without the canyon was the old tank's 4 m cells).
- **Against the bars** (Medium, 0°, s = 150):
  - crests 0.5° and 0.7° at the mean, 2.7° and 3.3° mean |angle| (the Beach: 4.3° and 4.4°);
  - 38 of 40 waves start within ±10 m of x −50;
  - 40 of 40 clean waves peel toward +x;
  - the peel at 31° (accepted);
  - stable for 600 s;
  - pictures `straight-*`.
- **Rideability: catch it, yes; the shoulder, not yet.**
  - The catch report: 41 cues, 41 stood, 25 rides of 3 s or more, longest 7.5 s.
  - The ride report: 30 stands, 3 rides of 3 s or more, best 4.4 s and 12.4 m along shore.
  - Every cue lit within 20 m of the peak. The bots down the arm wait 52–117 m outside the break, their rows running parallel to the beach.
- **What's left:**
  - where the bots wait: the owner's next ruling;
  - the beach close-out upcoast of the peak: not ruled.

**2026-10-08, S3: the roller lens** (`claude/canyon-roller`, to the plan `docs/superpowers/plans/2026-10-06-canyon-roller-s3.md`; the details, the cost and the pictures are in the Canyon note's S3 section):

- **The owner's decisions.**
  - 2026-10-07: option B for the rider's water (a one-sided froth drag and lens-scoped water entry); the free carry held under 1.2 c; four feel checks kept open as known misses against estimated targets (the pushes at 0.5 and 1.5 m, the paddler's knock-off and the hit force).
  - 2026-10-07, on the first shots of the band: fix the far-crest join at its root, with two guards; the band reads white, never darker than the foam it covers; the toe in lobes, not icicles.
  - 2026-10-08, after playing the build: the Canyon can be ridden on a diagonal. "It's ok for now, it requires more work after but for now I'm happy."
  - The owner's rule drops the riding measurements (catch, ride and duck-dive reports): the owner rides and records the videos.
- **Done:**
  - the roller model, in the simulation, the rider's water, both looks' band, and online (Tasks 1–5);
  - one crest per wave in the spilling front (an onset joins only its own crest; each wave's crest recorded on its own crest; 24 waves tracked), with the roller's two guards: on the shot frame, lenses leaning past 60° 11 → 0, the longest across shore 68.8 m → 12.0 m;
  - the band white in both looks, its toe in lobes (the noises on a fixed lattice);
  - the docs (Task 6).
- **What's left:**
  - the seam at the tank's open edges, where the seabed shows through between the tank's water and the far ocean (a tan crescent at the Canyon's +x edge): a curtain along the edges would close it, at every spot;
  - the four open feel checks;
  - the roller's step, about 0.3 ms against the plan's 0.07 ms;
  - the toe's look, provisional, for the owner on film.

## How to pick it up locally

```sh
git fetch origin
git checkout claude/canyon-spilling
npm ci
npx vitest run          # or the files named in the research notes
npm run dev             # then Surf → Canyon
```
