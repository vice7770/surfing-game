# Solver stability: why big Reef swells blow up

On the biggest Reef swells (Hs 3–4 m, 17–18 s, high tide) the sea can go non-finite within a minute. The predictor-gate session traced every case to one mechanism, and three patches in a row failed or made it worse: thinning the dispersive strips, cutting the coupling at the switch, and levelling the edge. So this is an architecture question for you.

**Decided (2026-09-29): depth-aware dispersion, plus the guard.** The predictor session is building three changes, test-first on CPU and GPU:

- dispersion sized for the water actually there where a trough drains below half its still depth (d\_eff = min(d, 2h), provisional);
- a Froude cap of 10, as in FUNWAVE-TVD, counting its trips;
- a smooth 20-column edge ramp.

Together they held every sea tested:

- the edge case (which blew up) ran at 14.8 m/s;
- the high-tide Big swell at 20° fell from 21.5 to 14.4 m/s;
- at 25° (which blew up) it ran at 18.8 m/s, with 13 cap trips in real water;
- the Wave Lab maximum was still running.

Two cheaper routes failed: depth-aware dispersion alone, and a naive velocity form. The full rewrite below stays the long-term option. PR #63 (the latch) is on hold as a draft.

## What goes wrong

- The solver switches breaking or drained cells to plain shallow-water maths, and keeps the wave's dispersion maths elsewhere.
- The dispersion maths ends in a smoothing solve for the **flux** (water per metre per second). Its strength is set by the **still-water depth** d, not the water actually there, h.
- A cell drained to 1–3 m over a 2.5–6 m ledge is smoothed as if it were deep. Its flux is forced to about the average of its deep neighbours'.
- In 1–2 m of water that flux means 80 m/s or more; the cell drains further, and the sea blows up.
- Cutting that coupling was far worse, because the same coupling holds the rest of the dispersive water together.

## What published models do instead

- **They solve for velocity, not flux, with the actual depth.**
  - FUNWAVE-TVD's fully nonlinear equations build their implicit variable on the total depth H = h + η and recover the velocity ([Shi et al., CACR-11-04](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.1.pdf), Eq. 23).
  - Green–Naghdi models build the operator on the total depth and solve for a pressure correction ([Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf), Eqs. 4–8).
  - Pinning a thin cell's velocity to its neighbours is harmless; pinning its flux is not.
- **They break without the switch.** MIKE 21 BW runs our exact equations and breaks with a surface-roller term, with no switch to shallow water ([DHI](https://manuals.mikepoweredbydhi.help/2017/Coast_and_Sea/MIKE21BW_Sci_Doc.pdf)). Kazolea & Ricchiuto found an eddy-viscosity closure far more robust than switching, and call the switch's interface its documented flaw.
- **They guard velocities.** FUNWAVE-TVD caps the Froude number at 5–10 whenever it computes velocities, and steps adaptively at CFL 0.5. The game has no cap and a fixed 1/60 s step.

## Your options

| Option | What it takes | Risk |
| --- | --- | --- |
| **Guard now:** cap the Froude number at 10, as FUNWAVE-TVD does, and log each time it trips; keep the smoother edge ramp | Days | Hides the cause; needs its trip count watched |
| **(a) Actual depth in the dispersion maths:** min(d, h) as a quick test, or properly a velocity-form fully nonlinear solver (FUNWAVE-TVD or Green–Naghdi) | Test: days. Rewrite: weeks, on CPU and GPU, keeping online matches exact | The quick test is unpublished and may not be enough; the rewrite touches everything the sea drives |
| **(b) Break without the switch**, leaning on Kennedy's eddy viscosity (already in the game) or a roller term | Weeks | The switch went in for the Reef's extreme troughs; likely needs (a) too |
| **(c) Cap the Reef's Wave Lab swell and tide** | Hours | Teahupo'o's biggest days would be out of reach |

**My recommendation:** the guard now, so no player ever sees a broken sea, then decide between (c) and the rewrite. The rewrite is the only option that fixes the cause. Hold PR #63 either way: it makes the Big swell at high tide worse (16 → 233 m/s).

What option (a)'s rewrite would take, following FUNWAVE-TVD's form: Rewrite sketch.
