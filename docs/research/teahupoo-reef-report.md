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

## Commands

- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "steep Reef holds"`
- `http://localhost:<port>/gpu-check.html?spot=reef`, from `npx vite --port <port> --strictPort --host localhost` in the worktree
- `npm run report:tubes -- --spots reef --seeds 1 --periods 4 --out <file>`, here and in a detached `origin/main` worktree
