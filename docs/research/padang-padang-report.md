# Padang Padang: Part A report

The [Padang Padang spec](../superpowers/specs/2026-09-28-padang-padang.md), Part A. It covers the new spot's bed (sources and rulings: [padang-padang-sources.md](padang-padang-sources.md)), whether the solver holds on it, the design sweep and its peel, catching, and the sizes.

Numbers are reported, not gated.

## Stability

### GPU parity

`/gpu-check.html?spot=padang`: the check's own sea (Hs 1.4 m, Tp 10 s, from 10°), 10 s side by side, 160 × 259 = 41,440 cells.

| Run | Largest depth difference | Relative rms of η | Breaking cells that disagree |
|---|---:|---:|---:|
| Padang Padang, 10 s | 1.3 × 10⁻⁴ m | 6.7 × 10⁻⁵ | 0 % |
| The Reef's Part A, 10 s | 4.2 × 10⁻⁴ m | 3.3 × 10⁻⁴ | 0 % |

Frame costs in the browser's GPU check, on the loaded M1:
- CPU 25.8 ms, against the Reef's 18.3 ms on 37,280 cells;
- GPU 4.2 ms (upload, one substep, readback), against the Reef's 4.3 ms.

### Probes

Tests in `src/wave/SurfZoneSimulation.test.ts` ("Padang Padang holds"). Unlike the Reef's CI probes they run the game's whole 320 m window, with 1 m cells and 12 swell components, so the −x edge's side-feed strip and the channel at the +x edge are both inside. Each runs the calibrated Big swell (Hs 3.8 m, Tp 18 s, square to the tank) through its set's arrival, 45 s after the hand-over (rerun 2026-09-30 on the merged branch):

| Case | Result | Wall time |
|---|---|---:|
| Big swell | finite, under 20 m/s; throws lips; most well-fitted peel estimates run toward +x, the channel: a left | 39 min |
| The lowest spring tide, −1.2 m (5 cm over the reef flat) | finite, under 30 m/s | 42 min |
| High tide, +0.9 m | finite, under 20 m/s | 37 min |
| Swells from −10° and +20° (the advisor's robustness range) across the open side edges | finite, under 20 m/s | 62 min for both |
| The menu's Padang Padang: its Practice on the GPU tier's 64 components, seeds 1–3 | spins up finite, no column's water over 10 m deeper than the edge's | part of the suite |

Wall times on the M1 Air with the four runs and the rest of the suite side by side (load about 25): performance is measured, never a gate, so the tests' limits are generous (2 h a run).

### Cost

The rideability report's wall time for one seed and four peak periods, the two spots run side by side on the loaded M1:

| Spot | Sea | Wall time |
|---|---|---:|
| Padang Padang | Small swell, Hs 1.6 m, Tp 16 s (64 s of sea) | 158 s |
| The Reef | Small swell, Hs 1.3 m, Tp 15 s (60 s of sea) | 153 s |

Padang Padang's longer tank (its 1:19 ramp is wide) is paid for by its shallower edge: 10 m of water allows a longer stable step than the Reef's 30 m.

## The peel investigation (2026-09-29)

After merging main (the Reef's Parts B and C, the plunge-zone hold of #58), the Big swell from 45° runs finite with its fastest water at 8.8 m/s (it ran to NaN before). The peel is the open problem: on the current design (edge 25 m, platform 10 m, 1:19 ramp, crest line 35°, swell 30° at the edge, s = 150, Hs 1.6 m, Tp 16 s) `ledgePeel` predicts 11.9 m/s (α 29°), and the peel meter reads 30–57 m/s (α 6–11°): a close-out. The onsets fall on a line almost parallel to the shore (z ≈ −110 to −120 for x −50 to 11), so the waves break at depths from about 2.4 m at the peak to 4.8 m down the reef.

The probes are in `src/wave/probes/` (opt-in: `PROBE=1 LOG=<file> npx vitest run <file>`; shape overrides by `PADANG=key=value,...`, the swell by `DIRECTION`, `SPREADING`, and `NOFEED=1` to switch the side feed off).

**What the probes show.** The break line is set by crest heights that grow down the reef, not by the bed:

- *Crest-following* (`padangCrest`): crests cross the ramp nearly shore-parallel (about 11° from shore-normal; Snell's law gives about −3° at 4 m), as phase matching expects, but the crests at the peak (x −50) stand 0.6–1.0 m against 1.3–2.3 m at x −10 to 30. The wave breaks across x −10 to 30 within about a second.
- *A bed uniform along shore* (crest line 0°), crest tops (highest third) on the 4 m contour, x −50 / −30 / −10 / 10 / 30:

  | Swell at the edge | Side feed | Crest tops, m | Steepest rise, m/s |
  |---|---|---|---|
  | 30° | on | 1.00 / 1.28 / 1.54 / 2.16 / 1.97 | 1.3 / 2.1 / 2.2 / 3.3 / 2.6 |
  | 0° | on | 1.16 / 1.58 / 1.77 / 1.92 / 1.67 | 1.3 / 2.2 / 2.0 / 2.3 / 1.9 |
  | 0° | off | 1.52 / 1.54 / 1.65 / 1.80 / 1.84 | 1.8 / 1.8 / 1.8 / 2.0 / 2.1 |

  Hm0 is near uniform along shore in every case (within about 10 %); the crests' peaking is not.

**Two causes in the tank, not the reef:**

1. *The oblique swell crosses the window.* At 30° a ray drifts about 250 m along shore over the 550 m from the tank's offshore zone to the ramp, so every wave on the reef entered through the −x side feed, which injects the linear sea. Waves further down the reef have had longer to steepen nonlinearly since, so they break deeper and first.
2. *The side feed flattens the peak.* Its −x strip (30 m wide, x −80 to −50) relaxes toward the linear sea up the ramp until Hs reaches γ·depth (the 1:19 ramp is under its 0.06 slope cut-off), so the crests near the peak (x −50, the take-off at −40) are kept linear and lower. With the feed off the uniform bed's crests are nearly even along shore.

**A rotated frame, first look.** Swell at 0° at the edge and the crest line at 55° (peak at z −150), the same predicted peel (11.8 m/s, α 29°): some sets peel on target (9.9–11.5 m/s, α 30–35°, t 176–192 s), but most still read 19–49 m/s, their breaks on a line well seaward of the crest line (z ≈ −210). With the feed off it still reads 15–27 m/s over the first periods (the run was stopped at 112 s). So removing the drift is not enough on its own.

**The advisor's answers (2026-09-29), and the redesign.**

- *Q1, the bed:* Mead's ramp and wedge, with no platform. Mead & Black ran exactly this experiment on idealised Bingin beds (1999; Mead 2000, ch. 5, pp. 91–100):
  - with a platform the wedge holds about 35° for all heights and directions;
  - without one, a wedge whose base shoals to breaking lets the ramp break the waves first (a close-out);
  - Padang Padang is their deeper, more rotated wedge plus a focus and pinnacles.
  A plane bed oblique all the way from the edge cannot peel slowly: Snell conserves the along-contour phase speed, so V ≥ c(25 m) ≈ 15 m/s at 16 s whatever the angle. The crests must meet the wedge at a larger angle than Snell from deep water allows, which a shore-parallel ramp does.
- *Q2, the side feed:* with the swell square to the tank nothing drifts in, but the strip's linear sea still spreads sideways (about 0.12 D over the approach at s = 150). So the peak stands at least strip + fade + 0.12 D (about 95 m) from the −x edge, and the window widens to 320 m. Stopping the feed by an Ursell or Schäffer limit is left to the wave-sizes session (it changes every spot).
- *Q3, the swell:* square to the tank. The reef's angle carries the obliquity; side edges are clean only when conditions are uniform along shore. Robustness is checked from −10° to +20°.
- *Q4, the down-reef steepening:* mostly not real. At a Mead-type reef the focus peak is the biggest and breaks first; shoaling adds a few per cent down the line. The target is crest heights within about ±15 % along the wedge, the peak largest.
- *The base's depth:* two planes this alike in slope meet where the base moves fast. Moving the crest line Δz shoreward moves the base by Δz / (1/(m_w cos β) − 1/m_r): Δz/27 at 1:50, Δz/55 at 1:80. The ramp is 1:80, so the base runs from 7 m at the peak to about 5 m at the ride's end, deeper than the Small swell breaks.
- *The peel angle:* the skill ladder's angles are geometric (measured on aerial photos). The peel meter's √(g h_b) is slower than surf-zone crests (Tissier et al. 2013; about 1.2–1.27 × at H/h 0.6–0.8), so the meter reads α about 5–7° low at every spot. The design is sized on the geometric α; the meter's fix is a separate change, put to the user.

The new bed (952ec39):
- a 1:20 forereef from 25 m to a 12 m knee, then Mead's ramp at 1:80;
- the 1:19 wedge rising from the ramp, its base 7 m deep at the peak (x −60, z −170);
- the crest line at β = 40° to the ramp's contours, to the channel at x 70;
- the wedge fading out over 20 m upcoast of the peak;
- a 12 m channel at the +x edge;
- a 320 m window, and the swells square to it.
Phase matching gives V ≈ 12.7 m/s at the peak: α 33–35° geometric, 26.9° on today's meter.


**The breaking age's fuse (PR #76).** On the new bed about 90 % of the reef's onsets inherited a neighbour's breaking age, and only 1–3 % broke on their own. Kennedy's age ran along the crests at about 60 m/s, so a wave's whole length broke within a second. The solver now carries the age only from behind the front face: the cell up the surface's slope and its two diagonals (FUNWAVE-TVD's direction, Celeris's stencil). Every spot's close-outs fell, and every spot's median peel speed roughly halved (`docs/research/breaking-age.md`). At Padang Padang one set then broke along its wedge at 10.6 m/s (design 11.6), the focus making the peak its biggest crest.

**Measuring wave by wave** (`padangWaves`). The peel meter fits one line through every onset in its period window. On a slow peel along 130 m of reef, that window holds two waves' onsets, and the fit reads a close-out. The probe groups onsets into waves by t − x/8 m/s, fits each wave's line, and fits each half (x < 0, the peak; x ≥ 0, down the reef). A wave counts as clean when its fit's r² exceeds 0.8 and it peels toward +x. Geometric α takes the crest at breaking as 1.2 × √(g h_b) (Tissier et al. 2013, the advisor's lower bound).

**The wedge at 1:19 along the path** (the owner, 2026-09-29; `docs/research/water-physics/basilisk-profiles.md`). `wedgeSlope` was applied across the crest line, so the swell climbed 1:24.8. It is now 1:15 across the line (1:14.6 as the swell arrives square, about 1:15.8 once refraction turns it). In Basilisk (level 11), 1:19 along the path breaks 3.6 m before the reef flat and lands the lip on it, with a tube 1.7 × larger relative to its height.

**The channel.** On the 1:15 wedge, the down-reef half ran about half as fast again as the peak's. The +x channel, held at the knee's 12 m to the shore, runs its crests ahead and tilts the down-reef crests about 11° before they reach the wedge (the crest probe; the advisor's diagnosis). The Small swell (Hs 1.6 m, Tp 16 s, s = 150), 544 s of sea, one seed:

| Bed | Clean waves | Median peel | Geometric α (median) | Clean waves at 30–40° | Peak half | Down-reef half |
|---|---:|---:|---:|---:|---:|---:|
| β 40°, the channel 12 m to the shore | 10 | 15.9 m/s | 26° | 2 | 15.2 m/s | 23.7 m/s |
| β 40°, no channel (the bare ramp) | 21 | 10.7 m/s | 40° | 11 | 10.1 m/s | 10.9 m/s |
| β 35°, no channel | 21 | 10.8 m/s | 40° | 12 | 10.6 m/s | 11.8 m/s |
| β 35°, the channel deepened only inshore of z −138 | 22 | 11.3 m/s | 38° | 13 | 10.9 m/s | 12.1 m/s |
| **β 40°, the channel deepened only inshore of z −138: the bed chosen** (rounded over 10 m here; the committed bed over 20 m, for no cliff) | 22 | 11.5 m/s | 37° | 14 | 10.5 m/s | 12.4 m/s |

- The channel, not the wedge's angle, sets the peel. With it gone or kept inshore, the two halves run at the same speed, which is what phase matching predicts.
- β barely matters here: at 35° and at 40° the median wave is 40° geometric. Refraction over the 1:80 ramp turns the crests before they reach the wedge, so the crest line's angle is not the angle they meet it at.
- The inshore channel keeps a deep lane beside the reef for paddling back out without tilting the crests offshore of it. The bed keeps β at 40° (the advisor's 37–40°) with it (de23435).
- The Big swell (Hs 3 m, Tp 18 s) peels left on the 1:15 wedge even with the full channel: 13 clean waves, all toward +x, median 12.5 m/s (geometric α 46°), onsets in 3.1–5.7 m of water. The stability tests pass on the 1:15 wedge, all finite. The Big swell's direction test now takes most of the well-fitted estimates, not the last one.

## The side feed: Padang Padang only (the owner, 2026-09-30)

Part A carries the wave-sizes work's side feed (the incoming sea relaxed into the window's open sides), which has no PR of its own. Merged for every spot it ran the Reef's Big swell to 64 m/s on the test's 40 m window (9.8 m/s with it off, as on main) and moved every spot's take-off. The owner's call: it feeds Padang Padang's sides only (`SIDE_FEED_SPOTS`), whose 320 m window and peak are laid out around it; every other spot keeps main's open sides, take-offs and handover. The feed's own rollout comes later.

## Sizes (Task 8, 2026-09-30)

`npm run report:sizes` on the chosen bed, two rounds of calibration (heights only, the periods kept), faces at the take-off as H1/3 / H1/10:

| Swell | Hs | Tp | Take-off faces | Target | Take-off z against the sets' break |
|---|---:|---:|---|---|---|
| Practice (at the edge) | 0.6 m | 16 s | 2.22 / 2.35 m | 2–2.5 m | −167 against −176 m |
| Small | 1.2 m | 16 s | 3.0 / 3.4 m | 2.5–3.5 m | −190 against −194 m |
| Medium | 2.2 m | 17 s | 3.6 / 3.9 m | 3.5–4.5 m | −217 against −216 m |
| Big | 3.8 m | 18 s | 4.45 / 4.6 m | 4.5–6 m | −265 against −270 m |

- The faces grow only as about Hs^0.2–0.4: only a small swell's biggest waves break at the take-off. The surf forecast (Komar–Gaughan's Hs^0.8) spans the three swells within 30 % (`SURF_FORECAST.padang` a 0.6318, sets 1.080, refitted after the re-measure).
- **The take-off follows each swell's break** (`PADANG_TAKE_OFF_INDEX`). BREAKER_INDEX seated Practice's and Small's take-offs within 9 m of their sets' break, but Medium's 23 m and Big's 89 m seaward of theirs; at low tide Big's stood 6.9 m deep, past the wedge's foot. On this wedge a bigger set breaks shallower for its height: the index at the measured breaks, at mid tide, is 0.57, 0.70, 0.90 and 1.20 from Practice to Big. A line in the edge height (γ = 0.47 + 0.19 Hs) seats every size within 1 m of its sets at mid tide, and Big's at low tide 4.8 m deep, on the wedge. A test pins each size within 15 m.
- Medium and Big were then re-measured at their new take-offs (their faces had been read ±10 m around the old ones). Medium stays at 3.6 / 3.9 m, inside its band. Big reads 4.45 / 4.6 m (13 waves) against 4.64 / 4.75 m out at the old take-off: 1 % under its band's 4.5 m floor, inside the scatter of 13 waves. About 3.95 m would centre it, since faces grow as Hs^0.2–0.4; that is left for the playtest.
- At high tide Practice's 0.6 m swell reaches its breaker depth only past the 2.15 m-deep flat, so its take-off falls on the inner beach: small swell at high tide barely breaks on the reef, as at the real spot. **Open** for the lineup (P11).

## Rideability, catch, ride and tubes (Task 9)

Rideability, `npm run report:rideability` (2 seeds × 12 periods, spreading s 150, 0°). The meter samples once per period, so on a slow peel along 130 m of reef it mixes two waves' onsets and reads more close-outs than the wave-by-wave probe; its angles use √(g h_b), 5–7° low against the ladder's photo angles:

| Swell | Close-out | Pro | Advanced | Intermediate | Beginner | Median α (meter) | Median peel | Faster than 12.5 m/s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Small (1.2 m, 16 s) | 54 % | 42 % | 29 % | 25 % | 13 % | 26° | 11.7 m/s | 48 % |
| Medium (2.2 m, 17 s) | 38 % | 58 % | 54 % | 13 % | 4 % | 32° | 12.5 m/s | 52 % |
| Big (3.8 m, 18 s) | 38 % | 63 % | 58 % | 33 % | 4 % | 33° | 15.1 m/s | 67 % |

Wave by wave on the chosen bed (the Small swell at 1.6 m, `padangWaves`): 22 clean waves at a median 11.5 m/s, 37° geometric, 14 of them at 30–40°; the design's phase matching gives 11.6 m/s. On the calibrated 1.2 m Small swell the design predicts 29–31° geometric: the ladder's fast end, makeable.

Catch and ride (`npm run report:catch -- --ghosts`, `npm run report:ride -- --practice --ghosts`, 2 seeds × 3 min):

| Sea | Attempts | Cue lit | Stood | Rides ≥ 3 s | Longest |
|---|---:|---:|---:|---:|---:|
| Medium swell (2.2 m, 17 s; median ride 8.9 s, top speed 16.1 m/s) | 795 | 56 | 37 | 25 | 12.0 s |
| Hs 0.6 m (faces 2.2 m) | 877 | 52 | 12 | 1 | 4.3 s |
| Hs 0.9 m (faces 2.8 m, the advisor's 2.4–3 m) | 894 | 74 | 12 | 0 | 1.3 s |
| Ride report, Hs 0.6 m (the autopilot) | 188 | — | 5 | 0 | 1.0 s |

The Medium swell's catch and ride ran with the rider at the old take-off, 23 m seaward of its sets' break; rerunning them at the new one is **open**. **Practice Padang Padang is marginal, true to the spot**; the Medium swell catches and rides (25 rides of 3 s or more, median 8.9 s), so it is Practice's size, not the bed (an expert break that needs a solid swell; it works from about 4 ft). Practice stays at 0.6 m, its faces in band. Most attempts get no cue (the crest never lifts the board onto the face). The advisor's level-9 Basilisk test hints that the game's small Padang waves break later and shallower than real ones; its fine run will say why. The "no support (lost board)" ends on the steep faces (122 at 0.9 m) are a question for the ride physics, not the bed or the size.

Tubes, today's lip before Part B (`npm run report:tubes -- --practice`): 2,554 jets, a median tube 1.04 m long (90th percentile 2.19 m), width over length 0.65 (97 % inside 0.25–1). On the reef breaks the tube's length over width is **2.97, narrower than Mead & Black's Padang Padang ratio of 1.97–2.14** (their fit for the gradient climbed: 2.45; 28 % held at the roundest 1.42). As the spec expected, today's tube is narrow: it is Part B's "before".

Open edges: the peak (x −60) stands 100 m inside the window's −x edge, and the ride ends where the channel begins (x 70), 90 m inside the +x edge. The side feed keeps the −x strip's sea the incoming one (ADR 0004 asks for a wavelength, about 150 m at 16 s on the ramp; a 320 m window gives it at the peak).

## The reference clip (for Part B's film, the owner to approve)

The 2026 Rip Curl Cup Padang Padang ran in all-time conditions on 20 August 2026, a full day of tube riding: the [official playlist](https://www.youtube.com/playlist?list=PL6gIcanRGetr9sW7kvootB8kc0i-i_p2o), with [Stab's re-watch](https://stabmag.com/news/live-now-the-rip-curl-padang-padang-cup/) as a backup. Not downloaded.
