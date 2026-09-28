# Teahupo'o Reef report

The [Teahupo'o Reef spec](../superpowers/specs/2026-09-27-teahupoo-reef.md). Part A ([below](#stability)):
- the Reef's new bed (sources and rulings: [teahupoo-reef-sources.md](teahupoo-reef-sources.md));
- whether the solver holds on it;
- the design sweep and its peel;
- catching.

Part B, slab tube physics: [its own section](#part-b-slab-tubes). Part C, the solid reef, the lagoon and the crash: [its own section](#part-c-the-solid-reef-the-lagoon-the-crash).

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

## On the wave sizes tank (Part A, Task 9)

Main's wave sizes Part B (PR #53) was merged in:
- **The swell:** the Reef's 30 m edge now takes the buoy's deep-water swell, shoaled to it.
- **The tank:** it keeps today's inner tank (its forereef lies inside it), with the relaxation zone lengthened to at least 0.75 of the edge wavelength. At 17 s that is about 200 m, against 60 m before.
- **The cap:** 4 m.
- **The take-off** stays at the peak.
- **Calibration, held:** the faces are to be calibrated on `report:sizes` (Practice 1.5–2 m up to Big 5–6 m, Big raised to 3.5 m). This waits for the side feed (`claude/side-feed`), which the wave sizes session expects to make surf bigger everywhere. Until then the Surf screen's forecast for the Reef rests on the old bed's fit.

**Low tide on the new tank.** The CI low-tide probe (40 m window, 12 components, Big swell, tide −0.6) now drains the ledge to 0.27 m of water at x −10, z −53 (still depth 2.1 m). The backwash reaches 22.7 m/s for about a second, then settles. This is the same class of event as the game-size probes' 21–26 m/s on the pass's beach face.
- **Open:** thin, drained-trough flows run too fast for their depth.
- **The probe:** it now guards against a runaway at 30 m/s (past runaways: 112 m/s, NaN). The mid-tide and oblique probes keep 20 m/s.

## Part B: slab tubes

The [Part B plan](../superpowers/plans/2026-09-28-teahupoo-reef-part-b.md); the sources and rulings are in [teahupoo-reef-sources.md](teahupoo-reef-sources.md#part-b-slab-tubes). The user's shape advisor (the "Water physics research" session) ruled on the tube's shape. It read Mead & Black's chapter directly.

### What a reef break throws now

A break over a submerged crest with ξ ≥ 0.4 is a reef break:
- **Roundness:** its tube's length over width is Mead & Black's vortex ratio for the gradient it climbs. The ratio is held within the 1.42–3.43 they measured at surfed breaks; gentler than 1:40, the break is a plane slope's.
- **The gradient:** measured their way, averaged along the crest's travel from 2.5 m shallower to 2.5 m deeper than the breaking depth (H / 0.78). A band reaching past the crest ends at the crest, and one reaching below the shelf ends at the shelf: that is the gradient the wave climbs. Before the final review's fix, a small wave's band walked on across the reef flat, and its roundness depended on the window's size.
- **Inside Pick & Feddersen's fits** (ψ0 ≤ 0.0889): their void area, jet area and tilt, with only the roundness from Mead & Black. Beyond the fits (the Teahupo'o ledge): the provisional 0.43 H² void, 0.5 H lip and 23° tilt.
- **Wind:** it reshapes the tube from U/C = −0.4 (Mead & Black's photos were offshore days), not from calm.
- **No collapse over a submerged crest.** The plan's first rule, "Y < 1 collapses", made 74 of 87 Big-swell ledge breaks throw nothing. On the 1:2.29 ledge Y ≥ 0.97, so any crest within ~34° of the ledge's normal fell under it, and no source supports it.
- **Landing:** a jet lands over its sheet's thickness along its travel, not in one cell.
- **Not done:** drawing the jet's water from the crest across the overturn's length (the plan's Task 4) was dropped. The user decided to replace the lip strips and carved void with a swept overturn surface (another session), and this would change only code being replaced.

### Tubes

`npm run report:tubes`, two seeds × 12 peak periods.

| Run | Jets | Rollers | Median tube length | 90th percentile | Measured width / length | Opening, 90th percentile | Largest opening | Close-out | Mixed | Median peel |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Practice (1.0 m, 14 s, 20°), main (aa71add) | 1787 | 1675 | 1.28 m | 2.90 m | 0.71 | 1.29 m | 2.40 m | 50 % | 33 % | 11° |
| Practice, Part B | 1745 | 1652 | 1.16 m | 2.40 m | 0.80 | 1.51 m | 2.67 m | 46 % | 42 % | 16° |
| Wave Lab defaults (1.4 m, 10 s), main (aa71add) | 976 | 1616 | 1.20 m | 1.96 m | 0.71 | 1.01 m | 1.32 m | 75 % | 13 % | 9° |
| Wave Lab defaults, Part B | 1047 | 1539 | 1.02 m | 1.61 m | 0.76 | 1.12 m | 1.39 m | 67 % | 17 % | 11° |

The measured width / length is each landed lip parcel's drop over how far ahead of its crest it landed. The tubes are rounder (0.71 → 0.76–0.80) and open wider under the lip at the 90th percentile (1.01 → 1.12 m, 1.29 → 1.51 m), but shorter: a rounder void of the same area is shorter. Part A's Practice baseline (1964 jets) was measured on older code. Main today throws 1787, so Part B's 1745 is the realization, not lost throws.

### The jets against the sources

Per throw, from the same runs:

| Run | Reef breaks | Given / asked | Jet area / H² | Sheet / H | Jet / crest speed | Median fit Y | Held at 1.42 | Tube L / W as thrown |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Practice | 1741 of 1745 | 1.00 | 0.47 | 0.47 | 1.96 | 1.16 | 68 % | 1.58 |
| Wave Lab defaults | 1046 of 1047 | 1.00 | 0.47 | 0.47 | 1.94 | 1.32 | 52 % | 1.58 |

- **Tube shape:** Mead & Black's fit for the Reef's gradients reads a median 1.16–1.32. On half to two-thirds of the breaks that is rounder than anything they measured, so it is held at 1.42. In calm wind (these runs) it throws at 1.58, 0.07 flatter than their offshore-day tubes.
- **The water:** at these sizes the crest gives the whole jet it is asked for. On the Big swell (60 m window, +25°, seed 3) the median crest still gives 92 %, but 21 of the 27 waves over 4 m gave under 90 %, often about half (6.4 of 12.5 m³): the crest's water limits the biggest lips. The source share was not raised (the spec's "never thicker than its water").
- **Jet area:** 0.47 H², against Pick & Feddersen's 0.13–0.27 H² at their fitted slopes. The Reef's ledge lies beyond their fits, where the jet comes from the provisional 0.5 H lip.
- **Sheet thickness:** 0.47 H. That is Shand's "about half the wave height", an article's description, **provisional**. Measured and modelled lips are thinner: tips about 0.07–0.08 H (Feddersen et al. 2024, Surf Ranch), roots 0.10–0.21 H (jet area over void length). The advisor's reading: 0.5 H describes the lip's root at most.
- **Jet speed:** 1.95–1.96 times the crest's, against lab jet tips landing at 1.25–1.32 in total, about 1.16–1.17 horizontally (Erinin et al. 2023). The 1.68–1.73 figures the game's range cites are against linear phase speed, which runs 10–25 % below crest speed near breaking. This is reported, not changed: it moves where the pour lands and has to stay momentum-conserving, so it waits for the user's decision.

### Whitewater

`npm run report:whitewater -- --spots reef --periods 4`, the Wave Lab defaults, main (aa71add) against Part B:

| | Jets | Splash-up, median | Tubes closed | Collapse, median | Spits | Spit speed, median | Eruption steps | Surveys at α_max | Plume, median | Deepest | Escaped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| main | 298 | 0.39 m | 296 | 0.35 s | 920 | 5.38 m/s | 555 | 9 % | 0.97 m | 1.50 m | 50 % |
| Part B | 307 | 0.32 m | 300 | 0.33 s | 1019 | 5.82 m/s | 607 | 17 % | 0.96 m | 1.28 m | 50 % |

- **Air balance:** closes exactly on both.
- **Changes:** the thicker jets drive more spit and eruption, and more surveys reach the void-fraction cap. Splash-ups are lower, because a jet spread over its thickness strikes less at any one point.
- **Fastest spit:** 59 m/s on both, from before Part B.

### Stability

- **The open edge (on main too).**
  - **Cause:** the Reef's 1:2.29 ledge crosses the window's −x open edge, and an open edge copies its neighbours onto a sloping bed. Main runs a 40 m window from +25° to NaN, and a 20° seed-3 run reached 30.2 m/s at the edge with no lip near.
  - **Fix:** the solver now levels the bed across the two columns an open edge copies, and restores the spot's bed as the window slides. Every bad case then held at 14–16 m/s, main's included.
  - **Test:** a new probe, "stays finite where the window's open edge cuts the ledge" (40 m, +25°), guards at 20 m/s.
- **No lip in the edge columns** the boundary copies.
- **A lip's landing bore (fixed: the plunge zone).**
  - **What happened** (+25°, t 60.93 s, x 12.5, z −28.5, still depth 1.82 m):
    - four jet parcels landed within 0.5–0.7 m of one cell in 0.27 s, and piled its 0.40 m of water to 1.47 m, with q 11.5–13.9 m²/s;
    - the mound drained back to 0.42 m with q still near 10, which is 23.5 m/s;
    - the dispersive mask stayed on through the flash: the mound sat inside the depth switch's 0.2–1.8 d band;
    - Kennedy's breaking never saw it (B = 0): the lip adds its water between steps, so it never enters the rise rate.
  - **Fix:** a landing holds the young roller of the wave that threw it in shallow water.
    - The zone runs from 0.5 H behind where the jet lands to 1.5 H ahead along its travel (H the breaking wave's height), one cell either side. It never reaches back past where the jet left the crest.
    - It holds for Kennedy's T* = 5√(d/g), on CPU and WGSL.
    - The void behind the landing keeps its dispersion: that face breaks only when the void collapses.
    - A splash-up's zone is its own short fall's, inside its jet's.
    - **Why H and not the jet's fall:** the jets fall only 0.42 m at the median (1.84 m at p90), because they land on the solver's gentle face. A fall-sized zone missed the roller, about 2 H long (L tan θ ≈ H, Martins et al. 2018). It could also leave the outer cells of a thick lip's landing unheld.
    - **Advice:** the water-physics advisor (the impact's rise to about 2.5 depths, Chanson, Aoki & Maruyama 2002; the roller, Martins et al. 2018). A time cap ends a fixed impact zone; Tissier et al. (2012)'s Froude rule is for a zone that follows a bore.
  - **Probe:** the oblique probes (60 m, ±25°) are back at 20 m/s. Their fastest water is now 12.2 m/s at +25° (was 23.5) and 11.7 m/s at −25° (was 11.3).
  - **Size:** on the Big swell from 20°, the zone holds at most 623 of the window's 16,140 cells (3.9 %), 242 on average while one is held.
  - **GPU:** `/gpu-check.html?plunge` holds the same zones on the CPU and the device. The water inside them agrees to 3e-5 m on the Reef and 1e-5 m on the Canyon over 8 s (without the WGSL change, 0.24 m).
  - **Noted, not changed:** Kennedy's test could count a landing's deposit as a rise rate, and the jets' 1.95× crest speed (above) inflates the momentum they land.
- **The sea handover (on main).** A joiner did not watch for new breakers on its first step, so a wave starting to break then threw on the donor and not the copy. Online, lips must match: the donor's flag is now handed over with the state, so a sea handed over before its first step arms neither. The edge fix moved the handover test's realization onto it.
- **The other spots:** they throw as on main except through the two edge treatments.
  - The Point with both the levelling and the edge-lip guard off matches main exactly (724 jets, 82 rollers, 5741 parcels).
  - The Canyon with the levelling off matches too (13 jets).
  - The Beach also throws 3 reef breaks on its bar, a submerged crest.

### Open

- **Validate the water on the steep forereef (needs the user's approval to download).** The Madsen–Sørensen equations were derived for mild slopes. An open CC-BY dataset of the 1:60 Teahupo'o physical model (Rodríguez-Burguette, Torres-Freyermuth et al.; zenodo 11392175, 10826397), with a 1/2.26 forereef and gauges, exists to test numerical models on steep slopes. It checks the water, not the tube.
- **Peel against makeability, before Part D (the user's decision).**
  - At α 23° and 13.6 m/s along the ledge, a rider needs about 13.6–14.8 m/s.
  - GPS-tracked competitive surfers peak at 9.3 m/s on average and 12.5 m/s at most (Farley, Harris & Kilding 2012).
  - That is faithful to the spec (fast, often made only through the tube), but Part D's done-criteria may not be reachable on it. The choice: relax the targets, or look for a ledge and swell geometry that peels at 35–45° on Small.
- **Part D's contact:** agreed with the swept-surface session:
  - the mouth's position and facing;
  - the pocket depth;
  - the face's normal and velocity at the hand and rail;
  - the clearance above a crouched rider;
  - the foam ball's and spit's forces;
  - the same result from a handed-over sea.
- **Provisional:**
  - the 0.5 H lip, the 0.43 H² void and the 23° tilt beyond Pick & Feddersen's fits;
  - the −0.4 wind reference;
  - the 2.5 m band within Mead & Black's 2–3 m.
- **Tube look:** stopped, on the user's decision to replace the carved void with a swept overturn surface.

## Part C: the solid reef, the lagoon, the crash

The [Part C plan](../superpowers/plans/2026-09-28-teahupoo-reef-part-c.md); the sources and rulings are in [teahupoo-reef-sources.md](teahupoo-reef-sources.md#part-c-the-solid-reef-the-lagoon-the-crash).

The user decided to replace the lip strips and carved void with a swept overturn surface (2026-09-28). So Part C builds none of the tube's look: the lip's glow, the spit, the section collapsing as one. The step and the coral wait for the coral textures (download approval).

### What changed

- **The reef is solid.** Every water sample now says what the bed is made of and which way it faces. The Reef is rock where the reef builds the bed:
  - the forereef;
  - the shelf;
  - the ledge;
  - the crest;
  - the flat, down its inner wall.

  It is sand in the pass, the lagoon and on the beach; other spots are sand.
  - **The board** meets the bed along its own normal, with Coulomb friction in its plane. That is sand's 0.6, or wet reef's 0.8, which is provisional: no measurement of a board or body on wet coral was found.
    - The old contact was vertical, so a board never slid down any slope. Now it slides on sand steeper than its friction and holds on reef.
    - On a flat bed the maths is exactly the old.
  - **The body** in the water meets rock the same way (position-based Coulomb friction). It rests a full radius off the 1:2.29 ledge and slides only on reef steeper than its grip. Sand keeps its old floor.
- **"Hit the reef".** A fall within 0.6 s of the board meeting reef faster than 1 m/s along its normal (both provisional) ends the ride "Hit the reef": a strike that knocks a standing rider off balance ends in a fall 0.4–0.55 s later.
  - A paddler's board touching the reef ends nothing.
  - Water brakes a board from 3 to 1.3 m/s in a step, so strikes come on reef a trough has drained, as at Teahupo'o.
- **The lagoon.** Shoreward of its crest the Reef has:
  - a 20 m reef flat at the crest's depth;
  - an inner wall no steeper than its ledge;
  - a 2.5 m lagoon (width and depth provisional until the lab profile is read);
  - the Teahupo'o model's 1:9.64 inland slope up to the shore.

  The slope rises from the shelf. Drawn from the shoreline, it had reached under the steep forereef and capped it, which is why Part A used 1:5. The ledge's ridden columns end at x = 25.5 (was 32.5).
- **The crash** plays deeper as its lip grows: rate (2 m³ / V)^(1/3) by its biggest lip's own water, down to an octave (Minnaert's resonance; reference and floor provisional). Practice lips at every spot sound as before; the Reef's Big-swell lips (5–7 m³) drop by about a third. Loudness still follows its energy.

### The pass and lagoon under the Big swell

At game size (160 m window, 64 components, Hs 3 m at 17 s, s 18, 45 s past the hand-over), both on today's main (with the plunge-zone fix, #58):

| Case | Main (1:5 face) | Part C (lagoon, 1:9.64) |
|---|---:|---:|
| Mid tide, from 20° | 18.5 m/s, on the shore at x 35.5 | 19.2 m/s, on the pass's inland slope at x 78.5 |
| Tide −0.6 m | 23.7 m/s, on the pass's face | 11.9 m/s, on the ledge |
| Tide −1.0 m | 21.4 m/s, on the pass's face | 12.5 m/s |
| From −25° | 9.2 m/s | 10.2 m/s |
| From +25° | 22.2 m/s, on the shore | 16.0 m/s |

- **Every case stays finite.** The run-up past 20 m/s on the pass's steep face is gone: 21.4–23.7 m/s becomes 11.9–19.2.
- **Before the plunge-zone fix,** the lagoon's mid-tide run ran away at the crest (NaN at 76 s). A thin cell kept its dispersion on across a lip's landing bore beside a 3 m pile, after 14–18 landings in a second. Main held only by its realization. That is the mechanism #58 fixed, and the lagoon ships on it.
- **CI:** a new probe holds the lagoon at low tide (60 m window, tide −1.0).

### Peel and catch on the new inner reef

`npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction 20 --spread 0.2 --seeds 2 --periods 12` (Small swell, 24 waves each):

| | Close-out | Mixed | Pro | Beginner | Median α | Median peel speed | Lip throws / min |
|---|---:|---:|---:|---:|---:|---:|---:|
| Main | 50 % | 21 % | 29 % | 8 % | 15° | 20.5 m/s | 206 |
| Part C | 63 % | 17 % | 21 % | 0 % | 16° | 19.5 m/s | 361 |

- **The ledge peels as before:** α 15–16°, about 20 m/s. The close-outs differ by 3 waves of 24.
- **The extra throws are at the shore:** the 1:9.64 slope plunges (ξ ≈ 1.9) where the 1:5 face surged (ξ ≈ 3.8).

`npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3` (ghost riders on Practice):

| | Attempts | Cues lit | Stood | Rides ≥ 3 s | Longest |
|---|---:|---:|---:|---:|---:|
| Main | 861 | 18 | 7 | 2 | 4.0 s |
| Part C | 844 | 7 | 4 | 1 | 9.3 s |

Fewer take-off cues lit. The counts are small, and why is not measured. One hypothesis: the gentle inland slope reflects less back to the take-off than the steep face did.

### The CI probes after merging main

With the plunge-zone fix merged in, the lagoon's seed 3 in the 40 m window flashes 22.0 m/s (from 20°) and 28.7 m/s (from 25°) for about a second.
- **Where:** thin backwash (0.3–0.4 m over 2.1–2.4 m) runs down the ledge, seaward of where its jets left the crest, so outside the plunge zone by design. Each draining cell's dispersion switches off as it thins.
- **Not systematic:** seeds 4–6 stay at 7.6–14.3 m/s, on main and on Part C (Part C lower in 4 of 6).
- **The guard:** those two probes now guard against a runaway at 30 m/s, as the low-tide one does.
- **The fix, split out:** a hold on the depth switch, so a draining cell doesn't flip.

### Open

- **The lab profile** (`Profile_Teahupoo.txt`): the lagoon's depth and the flat's width wait for the user's approval to download it.
- **Fewer take-off cues** on Practice (18 against 7).
- **A hold on the dispersion switch** in draining cells (split out), to bring the two probes back to 20 m/s.
- **A ~21 m/s peak at the −x open edge far offshore** (Hs 3 m at the edge, 18 s, tide +1, seed 3, the default grid, t ≈ 95 s), found by the plunge-zone session. It occurs with or without that fix, and it isn't a landing: one for the edge treatments.
- **The tube's look** (glow, spit, one section collapsing): with the swept overturn surface. **The step and coral:** with the coral textures.

## Commands

- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef holds"`
- `http://localhost:<port>/gpu-check.html?spot=reef`, from `npx vite --port <port> --strictPort --host localhost` in the worktree
- `npm run report:tubes -- --spots reef --seeds 1 --periods 4 --out <file>`, here and in a detached `origin/main` worktree
- `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction <dir> --spread 0.2 --seeds 2 --periods 12 --reef angle=<angle>`
- `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3` (baseline, in the `origin/main` worktree)
- Part B: `npm run report:tubes -- --practice --spots reef --seeds 2 --periods 12`, `npm run report:tubes -- --spots reef --seeds 2 --periods 12`, `npm run report:tubes -- --spots beach,point,canyon --seeds 1 --periods 6` and `npm run report:whitewater -- --spots reef --periods 4`, here and in a detached `aa71add` worktree (the other spots' and whitewater runs predate the final review's gradient fix, which acts only on reef breaks)
- Part C: a one-off game-size probe (the simulation stepped 45 s, the fastest water with depth over 5 cm recorded), here and in a detached `origin/main` worktree; `npm run report:rideability -- --spots reef --hs 1.3 --tp 15 --direction 20 --spread 0.2 --seeds 2 --periods 12` and `npm run report:catch -- --practice --ghosts --spots reef --seeds 2 --minutes 3`, both sides
