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
