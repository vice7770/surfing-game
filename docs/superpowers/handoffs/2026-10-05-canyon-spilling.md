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

- [ ] Crest-angle probe, plus the narrow, square swells (work branch `claude/drift-fix`; results in `docs/research/crest-angle-2026-10-05.md`).
- [ ] Canyon spilling wave: the bed, no lip, `SpillingFront`, crest foam (work branch `claude/canyon-spilling-wip`; results in `docs/research/canyon-spilling-2026-10-05/README.md`).
- [ ] Merged into `claude/canyon-spilling`, tests green.

When a box is unticked, check the work branch for partial commits: `git log origin/claude/canyon-spilling..origin/<work branch>`.

## How to pick it up locally

```sh
git fetch origin
git checkout claude/canyon-spilling
npm ci
npx vitest run          # or the files named in the research notes
npm run dev             # then Surf → Canyon
```
