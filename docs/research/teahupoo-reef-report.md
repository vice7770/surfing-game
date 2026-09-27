# Teahupo'o Reef: Part A report

The [Teahupo'o Reef spec](../superpowers/specs/2026-09-27-teahupoo-reef.md), Part A:
- the Reef's new bed (sources and rulings: [teahupoo-reef-sources.md](teahupoo-reef-sources.md));
- whether the solver holds on it;
- the design sweep and its peel;
- catching.

Numbers are reported, not gated.

## Stability

### Probes

Tests in `src/wave/SurfZoneSimulation.test.ts` ("the steep Reef holds"). These are CI-sized: a 40 m window (60 m for the oblique cases), 12 swell components, 1 m cells. Each runs the Reef's Big swell (Hs 3 m, Tp 17 s, from 20°) through its set's arrival, 45 s after the hand-over:
- the Big swell;
- low tide (−0.6 m, leaving 0.9 m over the crest);
- swells from −25° and +25° across the open −x edge, in a 60 m window.

All three stay finite, with depth-averaged speeds under 20 m/s; the Big run peaked near 11 m/s in 3 s samples. The Big swell throws lips.

### At game size

A one-off probe, recorded here rather than in CI. The game's own sea: the 160 m window, 64 components (the GPU tier), the Big swell (Hs 3 m, Tp 17 s, spreading s ≈ 18), 45 s past the hand-over, through the set:

| Case | Finite | Fastest, m/s | Smallest stable step, s | Lip throws | Wall time |
|---|---|---:|---:|---:|---:|
| Mid tide, from 20° | yes | 21.2 | 3.3 × 10⁻³ | 346 | 257 s |
| Tide −0.6 m | yes | 26.3 | 2.9 × 10⁻³ | 262 | 269 s |
| Tide −1.0 m (0.5 m over the crest) | yes | 22.9 | 3.1 × 10⁻³ | 260 | 271 s |
| From −25° | yes | 9.3 | 1.9 × 10⁻² | 150 | 178 s |
| From +25° | yes | 22.5 | 3.2 × 10⁻³ | 338 | 278 s |

Every case stays finite. The fast water is one transient burst as the Big set runs up the pass's 1:5 beach face, not on the ledge where the wave is ridden:
- at mid tide, 61–63 s in, the fastest is 21.2 m/s at x 57.5, z −8.5 (still depth 1.7 m, 0.29 m of water);
- at tide −0.6, 26.3 m/s at x 69.5, z −11.5;
- none follows.

That is about twice a real run-up's speed, and above the plan's 20 m/s bar. It is **open**: the pass ends on a steep beach where Teahupo'o's pass leads into a lagoon. A pass that stays deep to the window's shore (or a gentler end) is Part C's, with the solid reef.

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
- **Scope:** plane beach faces still surge. The rule never changes the Beach or the Point. On the Canyon's walls it turns some surging cells into jets, but only at 18 s with Hs of 2 m or more, a swell only the Wave Lab allows.
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

### Catching and riding on the chosen design

`report:catch -- --practice --ghosts --spots reef`, 2 seeds × 3 min, each Reef on its own Practice swell. The final review found the Reef's take-off (x = −50) left 6 of the 30 bots outside the window, on flat sea. The row now slides 25.5 m along shore to keep every bot 10 m inside, as players spawn, and the new Reef was rerun:

| Reef | Attempts | Cue lit | Stood | Rides ≥ 3 s | Longest | Stood per attempt |
|---|---:|---:|---:|---:|---:|---:|
| Today's (1.4 m, 12 s from 10°) | 1018 | 62 | 14 | 0 | 2.6 s | 1.4 % |
| Teahupo'o, bots partly outside (first run) | 756 | 24 | 13 | 2 | 5.4 s | 1.7 % |
| Teahupo'o, every bot inside | 871 | 23 | 14 | 2 | 6.1 s | 1.6 % |

- **Catching:** as many riders stand as on today's Reef, more of them per attempt, and the Reef gets its first rides of 3 s or more.
- **Cues:** it lights about a third as many take-off cues, and it misses the plan's rule on them.
- **The pick:** chosen as the best design on the user's instruction ("pick the best design and continue Part A"). The Reef's values already were this design.

The ride report (`report:ride -- --practice --ghosts --spots reef`, the autopilot and 6 ghosts, 2 seeds × 3 min): 193 attempts, 4 stands, no ride of 3 s or more (best 1.4 s). The autopilot is tuned on the Canyon's 1–1.5 m reference wave. Riding this fast slab is Part D's work: take-offs on steeper faces and tube riding.

### The fixed meter on every spot: what moved

The shared [rideability report](rideability-report.md) was regenerated with the fixed meter: Wave Lab defaults, 2 seeds × 12 periods. The same settings were run on today's code (be07c4c) to separate the meter from the physics:

| Spot | Lip throws / min, before → after | Breaking, before → after | Median α, before → after | Close-out, before → after | Mixed, before → after |
|---|---|---|---|---|---|
| Beach | 91 → 91 | 2 % → 2 % | 9° → 13° | 29 % → 63 % | 71 % → 25 % |
| Point | 726 → 726 | 3 % → 3 % | 15° → 11° | 54 % → 88 % | 42 % → 0 % |
| Canyon | 12 → 12 | 1 % → 1 % | 9° → 10° | 47 % → 50 % | 53 % → 43 % |
| Reef | 734 → 374 | 2 % → 1 % | 13° → 11° | 48 % → 83 % | 52 % → 13 % |

- **The Beach, Point and Canyon throw exactly the same lips** with the same breaking share. The trough switch and the submerged-crest rule do not change their water at these conditions.
- **The Canyon's reference wave is untouched.** Its catch report on Practice (`report:catch -- --practice --ghosts --spots canyon`, 2 seeds × 3 min) is identical on both codes: 883 attempts, 181 cues, 158 stood, 85 rides of 3 s or more, longest 9.5 s.
- **What moved is the meter.** It now reads one wave's front, where the old fit mixed waves: "mixed" readings become clean ones, mostly close-outs, since these spots close out at the lab's default swell.
- **The Canyon's 58°** in the old report came from an older run (3 seeds × 20 periods, 2026-09-26, 7 samples of 60) on older code. Today's code at these settings already reads 9°. Recorded Canyon onsets agree: its clean fronts (r² 0.94–1.00) run 22–29 m/s (α 9–12°), as the reference-wave study's in-ride 5–6° already did.
- **The Reef** is a new bed at its own swells. At the lab's default swell (10 s from 10°) it closes out.
- **Known limitation:** a peak that breaks both ways (V-shaped onsets) is still fitted as one front, as by the old meter, and reads as a close-out or mixed peaks.

## Tubes and whitewater on the new Reef (Part B's baseline)

### Tubes

`npm run report:tubes -- --practice --spots reef --seeds 2 --periods 12`, on the Reef's Practice swell (1.0 m, 14 s, from 20°):

| Jets | Rollers | Median tube length | 90th percentile | Median width / length | Within 0.25–1 | Opening, 90th percentile | Largest opening |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1964 | 1582 | 1.25 m | 2.80 m | 0.71 | 97 % | 1.25 m | 3.09 m |

The old Reef at the Wave Lab defaults ran 1.14 m median, 1.85 m at the 90th percentile and 1.64 m largest opening (tube report, 2026-09-26). The new Reef's biggest tubes are much larger.

### Tube shape against Mead & Black

- The wave crosses the ledge at φ ≈ 57° to its normal, so the gradient along its path is 0.437 × cos 57° ≈ 0.236 (1:4.2).
- Mead & Black's fit gives a vortex length over width of 0.065 × 4.2 + 0.821 ≈ **1.10**, a nearly round tube (X read as 1:X, provisional).
- The tube report's median width over length is 0.71, a length over width of **1.41**.
- The overturn fits (Pick & Feddersen, clamped at their steepest ψ) make the Reef's tubes less round than a slab this steep should be. Part B's slab sources close that gap.

### The lip's thickness

No report measures the lip's thickness yet. Shand (2024) gives about half the wave height at Teahupo'o. Part B adds the measure; its baseline is the clamped Pick & Feddersen jet this report's tubes come from.

### Whitewater

`npm run report:whitewater -- --spots reef --periods 4`, at the Wave Lab defaults:
- 501 jets;
- splash-up 0.41 m median (0.91 m at the 90th percentile);
- 494 tubes closed, collapsing in 0.35 s median;
- 1665 spits, 6.1 m/s median;
- peak void fraction 0.20;
- plume 1.02 m median depth.

The air balance closes exactly.

### Peel by swell, predicted and measured

| Swell | Predicted peel speed, α | Measured |
|---|---:|---:|
| Practice (1.0 m, 14 s) | 11.4 m/s, 25° | not run: Task 9 recalibrates the swells first |
| Small (1.3 m, 15 s) | 11.4 m/s, 28° | 13.6 m/s, 23° |
| Medium (1.9 m, 16 s) | 11.5 m/s, 33° | not run: Task 9 |
| Big (3.0 m, 17 s) | 11.5 m/s, 41° | not run: Task 9 |

## Commands

- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef holds"`
- `http://localhost:<port>/gpu-check.html?spot=reef`, from `npx vite --port <port> --strictPort --host localhost` in the worktree
- `npm run report:tubes -- --spots reef --seeds 1 --periods 4 --out <file>`, here and in a detached `origin/main` worktree
- `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction <dir> --spread 0.2 --seeds 2 --periods 12 --reef angle=<angle>`
- `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3` (baseline, in the `origin/main` worktree)
