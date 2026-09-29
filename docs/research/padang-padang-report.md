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

Tests in `src/wave/SurfZoneSimulation.test.ts` ("Padang Padang holds"). Unlike the Reef's CI probes they run the game's whole 160 m window, with 1 m cells and 12 swell components, so the level strip at the −x edge and the channel at the +x edge are both inside. Each runs the Big swell (Hs 3 m, Tp 18 s) through its set's arrival, 45 s after the hand-over:

| Case | Result |
|---|---|
| Big swell, from 20° | finite, under 20 m/s; throws lips; the peel runs toward +x, the channel: a left |
| The lowest spring tide, −1.2 m (5 cm over the reef flat) | finite, under 30 m/s |
| High tide, +0.9 m | finite, under 20 m/s |
| Swells from 0° and from 45° (the real frame's wrapped swell) across the open −x edge | finite, under 20 m/s |
| The menu's Padang Padang: its Practice on the GPU tier's 64 components, seeds 1–3 | spins up finite, every column within 10 m of the platform |

The five took 716 s together on the loaded M1.

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

- The channel, not the wedge's angle, sets the peel. With it gone or kept inshore, the two halves run at the same speed, which is what phase matching predicts.
- β barely matters here: at 35° and at 40° the median wave is 40° geometric. Refraction over the 1:80 ramp turns the crests before they reach the wedge, so the crest line's angle is not the angle they meet it at.
- The inshore channel keeps a deep lane beside the reef for paddling back out without tilting the crests offshore of it.
- The Big swell (Hs 3 m, Tp 18 s) peels left on the 1:15 wedge even with the full channel: 13 clean waves, all toward +x, median 12.5 m/s (geometric α 46°), onsets in 3.1–5.7 m of water. The stability tests pass on the 1:15 wedge, all finite. The Big swell's direction test now takes most of the well-fitted estimates, not the last one.
