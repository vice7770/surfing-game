# Teahupo'o Reef: Part A report

The [Teahupo'o Reef spec](../superpowers/specs/2026-09-27-teahupoo-reef.md), Part A:
- the Reef's new bed (sources and rulings: [teahupoo-reef-sources.md](teahupoo-reef-sources.md));
- whether the solver holds on it;
- the design sweep and its peel;
- catching.

Numbers are reported, not gated.

## Stability

### Probes

Tests in `src/wave/SurfZoneSimulation.test.ts` ("the steep Reef holds"). Each runs the Reef's Big swell (Hs 3 m, Tp 17 s, from 20°) through its set's arrival, 45 s after the hand-over, on 1 m cells:
- the Big swell;
- low tide (−0.6 m, leaving 0.9 m over the crest);
- swells from −25° and +25° across the open −x edge, in a 60 m window.

All three stay finite, with depth-averaged speeds under 20 m/s; the Big run peaked near 11 m/s in 3 s samples. The Big swell throws lips.

### What the first probe found

The Big swell drew the water off the ledge ahead of each wave: the step, as at Teahupo'o. One cell with 4 m of still depth drained to 0.07 m.
- **The runaway:** the backwash in those cells ran from 6 to 27, 45 and 835 m/s over about 6 s, then to NaN.
- **Not the time step:** the CFL step was respected throughout.
- **The cause:** the Madsen–Sørensen dispersive terms are written in still depth and assume small waves. They switched to shallow water at a crest standing 0.8 of the still depth high (Tonelli & Petti 2009), but never in a trough that deep.
- **The fix:** the mask now switches both, on the CPU and in WGSL alike. The sourced slopes are kept; the bed is not smoothed.
- **Scope:** every spot's suite still passes (920 tests).

### Breakers over a submerged crest

On the 1:2.29 ledge the breaker-point Iribarren number is about 4–5. The plane-beach bands read that as surging, and the new Reef threw no lips at all.
- **The rule:** where the local slope, carried on as a plane, would reach the still-water line, the bed is still under water there. A steep break over such a submerged crest now plunges, at the top of the plunging band.
- **Scope:** plane beach faces still surge.
- **Sources:** Yao et al. (2013), whose breaker type over fringing reefs is set by the reef-flat submergence; Blenkinsopp & Chaplin (2008), where less submergence plunges harder; Rodríguez-Burguette et al. (2025), with violent breaking on Teahupo'o's 1:2.29 forereef.
- **Status:** provisional until Part B's slab sources.
- **Result:** a 60 s run of the lip test's sea threw 52 jets and no rollers.

### GPU parity

`/gpu-check.html?spot=reef`: Hs 1.4 m, Tp 10 s, 10 s side by side, 160 × 233 = 37,280 cells.

| Run | Largest depth difference | Relative rms of η | Breaking cells that disagree |
|---|---:|---:|---:|
| New Reef, 10 s | 4.2 × 10⁻⁴ m | 3.3 × 10⁻⁴ | 0 % |
| Old Reef, 20 s (P6 record) | 5.7 × 10⁻⁴ m | 1.8 × 10⁻⁴ | 0 |

The check's gentle swell likely never drains a trough to the new switch, so the switch's WGSL line is covered by being the CPU line's literal twin, not by this run.

### Cost

Frame costs, in the browser's GPU check:
- CPU 18.3 ms;
- GPU 4.3 ms: upload, one substep, readback.

Step costs from the tube report (Wave Lab defaults, 1 seed, 4 periods), on a machine shared with other sessions:

| Reef | Step, ms | Load average during the run |
|---|---:|---:|
| Today's (main) | 51.2 | ~20 |
| New | 190.2 | ~38 |

The difference is mostly the load. The 30 m tank's stable step (about 0.025 s at the Big swell's peak) is longer than the game's 1/60 s frame, so the Reef still steps once per frame, as before, on the same 37,280 cells. The ~1.7× CFL cost the spec expected applies only to steps longer than 0.025 s: reports at 1/30 s frames, and slow-motion catch-up.

## The design sweep (Part A, Task 8)

### The runs

The Small swell: Hs 1.3 m, Tp 15 s, spread 0.2. 2 seeds × 12 periods each, measured by `npm run report:rideability` along the break line. The predictor is `ledgePeel`, phase matching over the 10 m shelf.

| Reef | Ledge angle | Swell from | Predicted peel speed | Measured median | Median α | Close-out | Mixed | Pro-makeable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Today's (A-frame) | — | 20° | — | — | 11° | 45 % | 50 % | 5 % |
| New | 40° | 20° | 12.2 m/s | 22.4 m/s | 14° | 38 % | 54 % | 8 % |
| New | 45° | 20° | 11.4 | 17.4 | 18° | 54 % | 38 % | 8 % |
| New | 50° | 20° | 10.9 | 18.5 | 17° | 42 % | 46 % | 13 % |
| New | 55° | 20° | 10.4 | 21.2 | 15° | 43 % | 39 % | 17 % |
| New | 45° | 10° | 12.3 | 14.5 | 22° | 46 % | 29 % | 25 % |
| New | 45° | 25° | 11.1 | 16.0 | 20° | 29 % | 63 % | 8 % |
| New, long-crested (spread 0) | 45° | 20° | 11.4 | 16.0 | 20° | 29 % | 58 % | 13 % |

Every new design peels better than today's Reef. None reaches the target, a 10–13 m/s peel with at most 35 % close-outs, so the plan's stop rule applies.

Catching on today's Reef, the baseline (`report:catch -- --practice --ghosts`, 2 seeds × 3 min): 1018 attempts, 62 cues, 14 stood, no ride of 3 s or more, longest 2.6 s.

### What the break actually does

Each breaking onset (column, time, cross-shore position) was recorded on a long-crested sea and grouped into connected fronts: neighbouring columns within 1 s.
- **The peel meter mixes two waves.** A peel along the whole ledge takes about one period, so the next wave starts at the peak while the last is still breaking inside. The meter fits every onset within one period, so it reads "mixed" or absurd speeds.
- **It also counts breaks that aren't on the reef.** Waves break on the beach face past the reef's end (x > 25 m, in the pass and lagoon), and the meter counts those columns too.
- **The first wave, alone, matches the prediction.** It peeled 10.7 m/s along the ledge (r² 0.96).
- **Later waves break in sections.** For example, x −80…−48 at 16 m/s, then −48…−26 at 12 m/s. A likely cause: the steep ledge reflects about 40 % of each wave's amplitude (a long-wave step from 10 m to 1.5 m), and the interference breaks the ledge in patches.

Fronts along the ledge on the 10 m shelf run a median of about 17 m/s, 1.5 times the prediction.

### A shallower shelf

With the shelf at 7 m instead of 10 m (same design, long-crested sea), the ledge fronts run 9–13.5 m/s. One front ran 127 columns at 11.5 m/s; the median is 13.5 m/s, α 26°. The prediction there is 10.0 m/s.

### The meter fixed, and the second sweep

On the user's choice after the stop, the peel meter was fixed (commit 985e007):
- it fits the recent wave's front: the longest run of neighbouring columns whose onsets follow within a tenth of a period;
- the Reef counts only the columns where its ledge is ridden (`reefLedgeAt`: out of the pass, with the crest still under water off the beach face).

A compact sweep then ran on the fixed meter: the 45° ledge, the Small swell, 2 seeds × 12 periods.

| Shelf depth | Swell from | Measured median | Median α | Close-out | Mixed | Pro | Advanced | Intermediate | Beginner |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 m | 20° | **13.6 m/s** | **23°** | 58 % | 4 % | 38 % | 33 % | 25 % | 13 % |
| 10 m | 10° | 25.7 | 12° | 65 % | 22 % | 13 % | 9 % | 4 % | 4 % |
| 8 m | 20° | 23.9 | 13° | 79 % | 13 % | 8 % | 8 % | 0 % | 0 % |
| 8 m | 10° | 16.1 | 20° | 61 % | 17 % | 22 % | 22 % | 9 % | 9 % |
| 7 m | 20° | 20.2 | 15° | 75 % | 13 % | 13 % | 13 % | 0 % | 0 % |
| 7 m | 10° | 18.5 | 17° | 58 % | 17 % | 25 % | 17 % | 8 % | 8 % |

- **The winner:** the source's own 10 m shelf from 20°. It peels at 13.6 m/s, the band's top edge (the prediction was 11.4), with almost no mixed peaks.
- **Close-outs:** about half, the fast, often through-the-tube wave the spec calls faithful.
- **Shallower shelves:** on the short-crested Small swell they did not help. The earlier ~12 m/s at 7 m came from a long-crested sea.
- **The rule's own limit:** with α's professional threshold (27°, ≈ 11.9 m/s at this swell's breaker speed), a median at the band's top edge cannot also keep close-outs under 35 %. The winner is chosen as the design closest to the band, on the user's instruction to pick the best and continue.

### Catching on the chosen design

`report:catch -- --practice --ghosts --spots reef`, 2 seeds × 3 min, each Reef on its own Practice swell.

| Reef | Attempts | Cue lit | Stood | Rides ≥ 3 s | Longest | Stood per attempt |
|---|---:|---:|---:|---:|---:|---:|
| Today's (1.4 m, 12 s from 10°) | 1018 | 62 | 14 | 0 | 2.6 s | 1.4 % |
| Teahupo'o (1.0 m, 14 s from 20°) | 756 | 24 | 13 | 2 | 5.4 s | 1.7 % |

- **Fewer cues:** the new Reef lights fewer take-off cues. Its 14 s swell also brings fewer waves, hence fewer attempts.
- **More stand:** a larger share of the riders who go stand up, and it gives the Reef's first rides of 3 s or more.
- **The rule:** it misses the plan's rule on raw cues (24 against 62) and, narrowly, on stands (13 against 14).
- **The pick:** chosen as the best design on the user's instruction ("pick the best design and continue Part A"). The Reef's values already were this design, so no code changed.

## Commands

- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef holds"`
- `http://localhost:<port>/gpu-check.html?spot=reef`, from `npx vite --port <port> --strictPort --host localhost` in the worktree
- `npm run report:tubes -- --spots reef --seeds 1 --periods 4 --out <file>`, here and in a detached `origin/main` worktree
- `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction <dir> --spread 0.2 --seeds 2 --periods 12 --reef angle=<angle>`
- `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3` (baseline, in the `origin/main` worktree)
