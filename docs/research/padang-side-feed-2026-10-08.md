# Padang Padang's side feed over a 20-minute session (2026-10-08)

**The question.** The owner's ruling of 2026-10-07 was to check over a longer run, then switch Padang Padang's side feed off. Then, after playing the build on 2026-10-08: "The waves in Padang become inconsistent after a while and confusing." This note covers:

- whether the sides drain with the feed off (the failure the feed was added for);
- whether the water level drifts;
- what changes over a session, with the feed on (the build the owner played) and off.

Nothing in the game was changed.

**The runs.** Wave-only, with no rider (the owner's rule). Each run is one surf zone on the CPU from the session's own start (sea time 330 s): Medium (Hs 2.2 m, Tp 17 s, 0°, s = 150), seed 1, 64 components, 1200 s, once with the side feed on and once off. The probe is `scripts/side-feed-height-report.ts`:

```sh
npx rolldown scripts/side-feed-height-report.ts -o dist/scripts/side-feed-height-report.mjs --format esm --platform node
node dist/scripts/side-feed-height-report.mjs --spot padang --swell medium --seconds 1200 --json on.json
node dist/scripts/side-feed-height-report.mjs --spot padang --swell medium --seconds 1200 --no-side-feed --json off.json
```

Each run took 2 h 10 min on an 8 GB M1, one at a time. Big was not run (the coordinator's call, until a ruling).

**The regions** (the window is 320 m wide):

- the strips: each side's outer 30 m, where the feed acts;
- the middle: the central 60 m (x −30…30).

**The lines across shore**, from the offshore zone's inner edge to the take-off:

- z −1004, −884, −733 and −581, in 25 m down to 10 m of water, level along shore;
- z −360, the fine grid's edge;
- z −248, the take-off line;
- z −218, the take-off.

## Summary

- **No drain.** With the feed off, the sides stay as high as the middle or higher, throughout: 0.92–1.38 of it per 100 s bin, on every line.
  - Offshore of the reef, the sides are 0.92–1.07 of the feed-on sides.
  - Near the reef they are 0.79–1.00 of them, because the feed's linear target holds its strips high there: with the feed on, the take-off line's sides stand 1.03–1.43 of the middle.
- **No level drift, with the feed on or off.** The volume column is cumulative (each bin against the start), not per bin. It swings with the wave groups and ends near where it started:
  - feed on: bin means +37 to +48 mm over the window, ending at +44 mm;
  - feed off: bin means +11 to +55 mm, ending at −8 mm.

  The trend is under 1.5 mm per 100 s either way, with r ≤ 0.39. No band's mean level grows.
- **What changes with time, with the feed on:**
  - **two-way crests**: 7 on the take-off line (8 measured at the crest's centroid), three of them within 36 s about 17–18 minutes in. There are none with the feed off, by either measure.
  - **a mean current that grows on the shelf**: from 0.07 to 0.13–0.15 m/s (r 0.91), with a 2.1–3.4 m/s along-shore current toward −x at the +x beach face. With the feed off, the shelf's current stays at 0.05–0.11 m/s without building, and the strongest current is the reef's own, at x ≈ −50.
- **What changes in both runs: the sea's own sets.** The middle's Hm0 at the take-off line runs 1.4–3.7 m per 100 s, and the break line, the onsets and the peel follow it. The biggest sets come about 17–20 minutes in.

## The heights

Feed-off sides against feed-on sides (Hm0, same sea), per 100 s bin:

| From s | z −1004 | z −884 | z −733 | z −581 | z −360 | z −248 | z −218 |
|---|---|---|---|---|---|---|---|
| 0 | 0.99 | 1.00 | 1.01 | 1.01 | 0.91 | 0.85 | 0.87 |
| 100 | 1.00 | 1.04 | 1.04 | 1.04 | 0.95 | 0.93 | 0.86 |
| 200 | 1.03 | 1.04 | 0.99 | 1.07 | 0.98 | 0.89 | 0.92 |
| 300 | 0.99 | 0.99 | 1.02 | 0.96 | 0.93 | 0.98 | 0.90 |
| 400 | 1.01 | 1.00 | 1.00 | 1.00 | 0.97 | 0.87 | 0.94 |
| 500 | 1.00 | 0.97 | 0.96 | 0.93 | 0.96 | 0.93 | 0.91 |
| 600 | 1.00 | 1.03 | 1.05 | 1.07 | 0.90 | 0.88 | 0.82 |
| 700 | 1.02 | 1.02 | 1.00 | 1.03 | 1.00 | 0.95 | 0.92 |
| 800 | 0.97 | 0.95 | 0.92 | 0.95 | 0.87 | 0.91 | 0.79 |
| 900 | 0.99 | 0.96 | 1.00 | 1.00 | 0.88 | 0.88 | 0.85 |
| 1000 | 0.98 | 0.99 | 0.97 | 0.95 | 0.86 | 0.85 | 0.79 |
| 1100 | 1.00 | 0.99 | 0.99 | 0.99 | 0.95 | 0.98 | 0.95 |

Sides over the middle, per 100 s bin, across the 12 bins:

| Line | Feed off | Feed on |
|---|---|---|
| z −1004 (zone edge) | 0.92–1.18 | 0.94–1.18 |
| z −581 | 0.97–1.35 | 0.93–1.20 |
| z −248 (take-off line) | 1.01–1.30 | 1.03–1.43 |
| z −218 (take-off) | 0.96–1.33 | 0.97–1.42 |

Even at the zone's edge, where the tank imposes the incoming sea itself, the sides and the middle differ by up to 18 % in a bin. That is the sea's own groups over a few waves, so "within 10 % of the middle in every bin" cannot hold for any sea, fed or not. Over the session, the feed-off sides are at or above the middle on every line.

**The drain the feed was added for** (the wave-sizes spec, 2026-09-27) came from the game's sea then: spread s ≈ 12 from 10°, on a 160 m window, which lost up to a third of its height within about 150 m. Padang Padang's sea is square at s = 150, and its window is 320 m, so little energy crosses the sides. In 1200 s nothing drained.

## The water level

Volume against the start, m³ (cumulative). Mean level over the window, mm (400,200 m²):

| | Feed on | Feed off |
|---|---|---|
| Bin means | +14,954 to +19,408 (+37 to +48 mm) | +4,315 to +21,837 (+11 to +55 mm) |
| At the end (1200 s) | +17,686 (+44 mm) | −3,028 (−8 mm) |
| Trend of the bin means | +85 per 100 s (r 0.18) | +568 per 100 s (r 0.39) |
| Surf band's mean level (set-up), per bin | 64–163 mm | 54–214 mm |
| Zone, approach and shelf, per bin | −27 to +14 mm | −68 to +41 mm |

The first bin's +23,367 m³ (feed off, read at its end) and the swings after it are the waves and groups in the window at that moment. They don't add up. Nothing fills: no band's level grows (the surf's trends are +3.3–3.4 mm per 100 s at r 0.24–0.30, following the bigger sets late in the run).

## What changes over the session

Per 100 s bin, from the session's start:

| Bin from s | Hm0 middle, take-off line, on / off, m | Onsets, on / off | Peel median °, on / off | Shelf mean current, on / off, m/s | Strongest mean current, on (x, z) | Two-way crests, on / off |
|---|---|---|---|---|---|---|
| 0 | 2.73 / 2.62 | 1621 / 1594 | 21 / 20 | 0.09 / 0.11 | 2.23 (110, 1) | 1 / 0 |
| 100 | 2.43 / 2.37 | 1366 / 1110 | 24 / 27 | 0.07 / 0.11 | 3.33 (69, −1) | 1 / 0 |
| 200 | 1.44 / 1.41 | 1158 / 729 | 41 / 32 | 0.07 / 0.10 | 2.24 (154, −12) | 0 / 0 |
| 300 | 1.93 / 1.95 | 1156 / 918 | 38 / 29 | 0.07 / 0.08 | 2.13 (−63, −52) | 0 / 0 |
| 400 | 2.39 / 2.33 | 1281 / 1005 | 32 / 30 | 0.08 / 0.07 | 2.62 (123, −13) | 1 / 0 |
| 500 | 1.93 / 2.06 | 1128 / 1095 | 33 / 36 | 0.09 / 0.09 | 2.52 (157, −10) | 0 / 0 |
| 600 | 2.85 / 2.68 | 1548 / 1380 | 28 / 22 | 0.10 / 0.06 | 2.62 (71, −2) | 0 / 0 |
| 700 | 1.85 / 1.96 | 1104 / 1017 | 34 / 33 | 0.10 / 0.05 | 2.14 (−63, −26) | 0 / 0 |
| 800 | 1.89 / 1.63 | 845 / 706 | 36 / 26 | 0.10 / 0.06 | 2.34 (62, −2) | 1 / 0 |
| 900 | 2.30 / 2.03 | 1168 / 911 | 33 / 28 | 0.11 / 0.06 | 2.13 (−63, −66) | 0 / 0 |
| 1000 | 3.67 / 3.39 | 1741 / 1506 | 26 / 23 | 0.15 / 0.07 | 2.93 (56, −1) | 3 / 0 |
| 1100 | 2.86 / 2.48 | 1638 / 1570 | 33 / 29 | 0.13 / 0.09 | 3.37 (157, −12) | 0 / 0 |

The shelf column is its mean over the whole width (z −364 to −247). Its middle 60 m, with the feed on, runs 0.08 to 0.17 m/s.

1. **The chevrons, feed on only.** The two-way crests come at sea times 424, 459, 755, 1145, 1369, 1387 and 1405 s, i.e. 1.6, 2.2, 7.1, 13.6, 17.3, 17.6 and 17.9 minutes into the session. With the centroid there is also one at 915 s.

   Each trails a big set wave. This is the side feed's wake (`docs/research/crest-bends-2026-10-07/`), so they bunch when the biggest sets come, as at 17–18 minutes. With the feed off there are none in 1200 s (64 crests at the highest row, 65 at the centroid).
2. **A current that builds up, feed on only.**
   - On the shelf, the whole-width mean rises from 0.07 to 0.13–0.15 m/s over the session (r 0.91), and the middle's from 0.08 to 0.17 m/s.
   - In the surf band it rises from about 0.41–0.54 to 0.60–0.63 m/s.
   - The strongest mean current is mostly at the +x beach face (x 56–157, z −1 to −13): 2.1–3.4 m/s, running along shore toward −x. That is where the feed's +x strip meets the beach.

   With the feed off, the shelf's current does not build (0.05–0.11 m/s, mean 0.078, trend −0.0035 per 100 s). The surf's runs 0.32–0.53 m/s, and the strongest current is the reef's own, on its flat at x ≈ −50 (1.9–2.8 m/s).

   The strips relax the water toward the linear sea and its linear flux, which carries none of the breaking waves' mean mass flux and set-up. So they push the mean flow, and a circulation spins up over minutes. Where its momentum goes was not traced.
3. **The sea's own sets, in both runs.**
   - The middle's Hm0 at the take-off line runs 1.4–3.7 m per 100 s (feed on 1.44–3.67 m, off 1.41–3.39 m). The incoming sea shows the same swings at the zone's edge.
   - The break line, the onsets and the peel follow it. In both runs the break line moves seaward later (−1.4 and −1.7 m per 100 s, r ≈ −0.5), as the biggest sets come about 17–20 minutes in.
   - The peel's median per bin runs 21–41° with the feed on and 20–36° with it off.

   A session opens on a set (`planSetRun`: 25 s after the hand-over), and the random sea's groups follow.

**The stability** is the same with the feed on and off:

- the fastest water reaches 6.4–9.9 m/s (on) and 7.0–9.3 m/s (off);
- the Froude caps are 0–1,292 per 100 s, none in water over 5 cm deep;
- both runs stay finite throughout.

## What this means for the ruling

- **The feed was not keeping the sides from draining.** That failure belonged to a spread, oblique sea on a narrow window, not Padang Padang's.
- **There is no level drift to rule on.**
- **What the feed does over time** is:
  - shed the chevron wakes behind every big set (7–8 two-way crests in 20 minutes);
  - spin up a shelf current, with a 2–3 m/s along-shore flow at the +x beach face.

  Both go with the feed off. The sea's own set-to-set swings (Hm0 1.4–3.7 m per 100 s) stay either way.

**Not measured:**

- the GPU path the game uses on most machines (these runs are the CPU solver, which the device mirrors);
- Big;
- other seeds.
