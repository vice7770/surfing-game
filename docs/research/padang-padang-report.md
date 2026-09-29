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

## The peel investigation (open, 2026-09-29)

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

**Open questions, for the advisor and the next session:**

- Should the side feed stop where the linear sea stops holding (an Ursell or Schäffer S limit, as the tank's offshore edge now does), rather than at the breaking share of the depth? That is the wave-sizes session's machinery and would change every spot's strips.
- Should the peak move further from the −x strip (for example x −30), at the cost of a shorter reef (the ride stays within 50–150 m)?
- Is a peel set by crest steepness growing down the reef (Ursell about 40 on a 10 m platform at 16 s) partly real? A long flat 10 m platform ahead of an oblique ramp gives the far end a longer run in shallow water. The build sheet says Padang Padang has no platform (ramp, focus, wedge), so a design whose forereef runs straight into the ramp belongs in the sweep, though phase matching then gives a faster peel (about 16 m/s from 25 m at 30°).
- The sweep (plan Task 7) waits on these answers.
