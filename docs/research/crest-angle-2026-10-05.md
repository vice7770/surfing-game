# Crest angles before and after the square, narrow swells (2026-10-05)

**The question.** Do crests stay parallel over a 10-minute session on every spot? That is the owner's criterion (2026-10-05) for the "sideways waves" fix.

**The fix.** The Beach, Point, Reef and Canyon now take their swells square to the beach (0°) and narrow: the cos-2s exponent is s = 150 (`REFRACTED_SPREADING`, `src/game/PhysicalMode.ts`), as Padang Padang and the Wave Pool already had. Before 2026-10-05:

- the shared swells (Beach, Point, Canyon) came from 10° at s = 14.0, which is `spreadingFor(0.3)`;
- the Reef's came from 20° at s = 16.8, which is `spreadingFor(0.2)`.

**The owner's sharper rule (2026-10-06).** Waves must form straight to the beach. Their timing may be irregular, but waves must never come from more than one side, and never at the same time. So each spot below is read for three things:

- whether its crests stay within the straight reference's spread over the 10 minutes;
- whether they bend or swing beyond it;
- whether a crest ever runs two ways at once.

The Canyon's numbers are **the corner-canyon bed, being replaced for straight crests (owner, 2026-10-06)**.

## How it was measured

`scripts/crest-angle-report.ts` runs one surf zone on the CPU from the session's own start (the set run, as Surf builds it). Every run here uses the Medium swell, seed 1, 600 s and the GPU tier's 64 components.

**Two lines across shore are watched:**

- **the edge**, 5 m inside where the fine grid starts. This is what the tank's edge sends in, after the bed between the relaxation zone and the fine grid has refracted it;
- **the take-off line**, 30 m seaward of the take-off. This is what a rider waiting there sees coming.

**Each crest is fitted with a straight line.** A crest counts when it passes a line at the take-off's x: it peaks in time there and stands 0.2 Hs above still water. The probe then follows it along shore, column by column, within 3 m of where it was. It stops where the crest falls below 35 % of its height there, or 20 m from the window's open edges. A straight line z(x) is fitted to what was followed:

- the angle is that line's: **0° runs parallel to the beach**, and positive rises shoreward toward +x;
- a crest followed over less than half the watched width gives no angle (it is counted as "short");
- straightness is the RMS distance of the crest from its line, m;
- each crest's two halves along shore are also fitted on their own. Their difference, |right − left|, is the crest's **bend**: a crest that runs two ways at once has halves leaning opposite ways.

**Before and after.** "Before" overrides each spot's swell with the old one; "after" is each spot's default. Padang Padang and the Wave Pool were already square, so they have an "after" only. The Canyon's "before" runs on its new bed, so it isolates the swell's effect; the old bed's peel numbers are in the Canyon note (`docs/research/canyon-spilling-2026-10-05/README.md`).

```sh
npx rolldown scripts/crest-angle-report.ts -o dist/scripts/crest-angle-report.mjs --format esm --platform node
# after: each spot's own swell
node dist/scripts/crest-angle-report.mjs --spot <spot> --swell medium --seed 1 --seconds 600 --quiet --json <spot>-after.json
# before: the old shared swell (beach, point, canyon) and the Reef's
node dist/scripts/crest-angle-report.mjs --spot <spot> --swell medium --seed 1 --seconds 600 --quiet --direction 10 --spreading 14.0 --json <spot>-before.json
node dist/scripts/crest-angle-report.mjs --spot reef --swell medium --seed 1 --seconds 600 --quiet --direction 20 --spreading 16.8 --json reef-before.json
# the tables below
npx rolldown scripts/crest-angle-compare.ts -o dist/scripts/crest-angle-compare.mjs --format esm --platform node
node dist/scripts/crest-angle-compare.mjs --reference beach-after.json <every run's json>
```

Each run took 6–7 min on an 8 GB M1, two at a time. The Reef took about 20 min, and Padang Padang and the Wave Pool longer, since their tanks and windows are larger.

## The reference for straight

The Beach on the new swell is the reference: no ledge, canyon or reef turns its crests, so they show the swell's spread alone, plus its rips' bending, which stays (the owner, 2026-10-05). On its edge line, 90 % of its crests lie within these bounds:

- within 9.2° of its mean angle (+0.8°);
- with halves within 11.9° of each other, and each half within ±10.6°;
- each 100 s's mean within 3.5° of the 10 minutes' mean.

On the take-off line the bounds are 9.1°, 14.8° and ±11.6°, with each 100 s's mean within 3.2°.

Its linear sea at the zone already bends that much at times (bend p90 9.2°, at most 19.1°; `crest-angle-linear.ts`). A short-crested sea at s = 150 has crests that split and join at the groups' nodes.

A spot whose crests are as straight as the reference's has about 10 % of them past each bound. Past them in a larger share, they spread, bend or swing beyond the swell's own spread.

TABLES

## Reading: do crests stay parallel over 10 minutes?

**The new swells did what they were for.** Every spot that changed swells has a narrower spread now. On the edge line, the share of crests past the reference's 9.2° fell:

- at the Beach, from 31 % to 8 % (std 8.4° → 5.8°);
- at the Point, from 21 % to 0 % (std 7.2° → 3.8°);
- at the Reef, from 25 % to 13 % (std 10.4° → 7.6°);
- at the Canyon, from 68 % to 50 %.

The Reef's tilt from its old 20° swell is gone: its mean went from −7.7° (every 100 s between −2.8° and −10.8°) to −0.0°.

Spot by spot, after the change (edge line first, take-off line in brackets):

- **Beach (the reference): parallel.** The crests stay within the swell's own spread for the 10 minutes:
  - a mean of +0.8° (+0.8°), std 5.8° (5.8°);
  - no 100 s mean further than 3.5° (3.2°) from the mean;
  - no crest running two ways at once.

  Its opening tilt does not last (below).
- **Point: parallel, at a steady tilt.** The crests run +6.1° (+5.4°) to the beach's x axis, all session long: every 100 s's mean is +3.1° to +7.6°. About that tilt they are more parallel to each other than the reference's:
  - std 3.8° (3.6°);
  - none further than 9.2° from the mean;
  - a swing of 3.1° (3.0°);
  - 4 % (4 %) bent past the reference;
  - no crest running two ways at once.

  The tilt is the bed's. The Point's linear sea at the zone averages +0.59°. The headland's shoreline steps 120 m along shore (`POINT_HEADLAND`), so its contours cross the window at up to about 31°, and they turn every crest the same way before the watched lines. That is the point's wrap, not drift.
- **Reef: no tilt or drift, but its crests bend.**
  - The mean is −0.0° (+0.6°), and the spread is near the reference's: std 7.6° (5.4°), 13 % (15 %) past 9.2°, a swing of 4.6° (4.2°).
  - But the crests are three times less straight than the Beach's: 3.01 m (2.78 m), against 0.97 m (1.06 m).
  - 25 % (18 %) of them bend past the reference, with halves at, for example, −10°/+11°, +12°/−7°, −6°/+28° and +7°/−22°.
  - One edge crest of 32 ran two ways at once past the reference's halves: −10.9° / +11.7°, at sea time 450 s.

  The bending is made between the zone and the edge line. The Reef's linear sea there is very straight: 0.35 m, with a bend p90 of 1.5°, and 0.13 m at its take-off x. Its old 20° swell bent as much (3.51 m). Which of its features does it was not isolated: the 45° ledge, the pass at +x, or the steep forereef reflecting 16 s waves.
- **Canyon (the corner-canyon bed, being replaced for straight crests; owner, 2026-10-06): not parallel.**
  - The crests run −20.0° (−19.8°) and swing: each 100 s's mean is −13.6° to −30.3°, so the largest swing is 10.3° (7.9°) against the reference's 3.5°.
  - They have a corner. Across the edge line, the canyon's −x half averages −30.7° and the +x half −7.0°. 80 % (41 %) of crests bend past the reference, at most 46.3°, with straightness 4.31 m.
  - One edge crest ran two ways at once: −33.5° / +12.8°, at sea time 497 s.
  - The session opens square (first three |angle| 5.0°), and the bed then turns the crests within the first minute (later 21.1°).

  The linear sea at its zone is straight: +0.71° and 0.72 m. The old swell gave much the same (−16.7°, bend 17.5°). The swell is not the cause; the bed is. This is the shape the owner saw.
- **Padang Padang:** PADANG_READING
- **Wave Pool: the same wave every time.** All 60 crests on both lines fit at 0.0°, ten seconds apart. Each is the machine's A-frame: a chevron whose halves lean −6.2° / +6.2° on the edge line (−5.3° / +5.3° on the take-off line), its middle seaward of its arms. Its bend, 11.4° (9.5°), sits at the reference's 90th percentile. Its halves stay inside the reference's ±10.6°, so no crest counts as running two ways at once. It is one wave with two arms, by design (`src/wave/pool.ts`).

**Does every spot meet the criterion?**

- **Yes, within the swell's own spread:** the Beach, the Point (at its steady wrap) and the Wave Pool.
- **Mostly:** the Reef. It has no tilt and no lasting swing, but its crests bend more than the reference's, and one crest in 32 ran two ways at once.
- **No:** the Canyon's corner-canyon bed, which is being replaced.
- **Padang Padang:** PADANG_VERDICT

**Two crest directions at once,** by the halves test (opposite halves, each past the reference's 90th percentile):

- none at the Beach, the Point or the Wave Pool;
- one of 32 edge crests at the Reef;
- one of 44 at the Canyon;
- PADANG_TWO_WAYS at Padang Padang.

On the take-off line: none, except the Canyon's old-swell run (one).

**The old swell's own tilt never reached the Beach's lines.** The old 10° swell's linear sea leaned −3.15° at the Beach's zone (19 of 53 crests positive). Its crests on the Beach's edge line averaged +0.9° instead, with 31 of 52 positive. So between the zone and the edge line the tank took the old swell's mean obliquity out, or slightly past 0°. What reached the beach was its spread, ±22° both ways, not a tilt. That was not chased, since the old swell is gone.

## The Beach's opening tilt (+4.9°) does not persist

A 30 s Beach run on the new swell had shown a mean of +4.9°, with |angle| 4.9° over the three opening crests: a one-signed tilt from a 0° swell. The 600 s run starts the same, since the runs are deterministic: its first three edge crests are +8.6°, +4.4° and +1.7°. After that the tilt does not hold:

- 29 of the 50 edge crests lean positive;
- the crests swing in groups of one sign: for example −19.2°, −11.8°, −4.8°, −3.8°, then +15.4°, +7.6°, +8.6°, +6.6°;
- each 100 s's mean is +2.9°, −2.7°, +2.5°, +0.1°, +0.7° and +0.4°;
- the mean over the 10 minutes is +0.8°.

**The +0.8° that remains comes from the swell's own draw, not from the tank.** The 64 components' directions are drawn at random from the cos-2s law (`SeaState.fromSpectrum`). For seed 1 they average −0.99° (their summed wave-number vector points at −1.18°). A crest lies across its wave's travel, so components travelling at −1.18° make crests that rise +1.18° toward +x.

The tank's own linear sea shows the same crests with no solver, relaxation zone, bed or window. `scripts/crest-angle-linear.ts` evaluates `surfZoneSea(config)` and follows its crests with the probe's rules at the zone's inner edge (z = −270), over the same 620 s. It gives:

- a mean of +0.78°, with 43 of 56 crests positive;
- opening crests of +5.4°, +4.2° and +0.7°.

So the opening set's tilt and the small mean are already in what the zone is fed. Seed 3's draw leans the other way: its components' summed wave number points at +0.60°, and its linear sea's crests average −0.98°.

The tank and bed widen the spread a little: the edge line's mean |angle| is 4.3° against the linear sea's 2.85°. They do not tilt it. The window and the zone did not need checking further.

```sh
npx rolldown scripts/crest-angle-linear.ts -o dist/scripts/crest-angle-linear.mjs --format esm --platform node
node dist/scripts/crest-angle-linear.mjs --spot beach --seed 1 --probe beach-after.json
node dist/scripts/crest-angle-linear.mjs --spot beach --seed 3 --from 170
```
