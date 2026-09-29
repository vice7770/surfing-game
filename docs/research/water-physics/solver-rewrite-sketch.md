# Solver rewrite: what option (a) would take

If you choose to fix the blow-ups at their cause, the closest published model to the game's own machinery is FUNWAVE-TVD, which solves fully nonlinear Boussinesq equations. It keeps what the game already does well: finite-volume fluxes, per-row and per-column tridiagonal solves, and the 0.8 switch to shallow water. What changes is what those solves recover, and on which depth. Source throughout: [Shi et al., FUNWAVE-TVD report CACR-11-04 v2.1](https://www1.udel.edu/kirby/papers/shi-etal-cacr-11-04-version2.1.pdf), §2–3.

## What stays

- The grid, the MUSCL reconstruction and HLL fluxes. FUNWAVE uses MUSCL-TVD with HLL(C) (§3.2).
- Tridiagonal solves along rows and columns, with cross-derivatives kept on the right-hand side. FUNWAVE solves its velocity "with tridiagonal matrix formed by (23), in which all cross-derivatives are moved to the right-hand side" (§2.3).
- The switch to shallow water where the wave stands above 0.8 of the depth (Tonelli & Petti), and wetting and drying (§3.4).
- Everything that reads the sea: lips, foam, the rider and the renderer read the surface, the flow and the rise rate as today.

## What changes

1. **The recovered unknown.** FUNWAVE carries V = H(u + V′₁), with H = h + η the total depth, and recovers the velocity u (Eq. 23). The game recovers the flux P on the still depth, which is the root of the thin-cell blow-ups.
2. **Fully nonlinear dispersive terms** on the total depth: the ψ terms of Eqs. 27–28, expanded in its Appendix A. They use central differences.
3. **Fluxes with a dispersive correction.** The mass flux is H(u + U₄), not Hu.
4. **Time stepping.** FUNWAVE uses third-order SSP Runge–Kutta, with a tridiagonal recovery at each of three stages and an iteration on the source terms. Its report calls its older predictor–corrector "not suggested". Plan on about three recoveries per step.
5. **Guards.** A Froude cap of 5–10 when velocities are computed; mirrored dispersive terms at dry cells; a 0.01 m minimum depth at field scale.
6. **The fixed step stays** at 1/60 s, for online determinism. FUNWAVE steps adaptively at CFL 0.5. On 1 m cells that holds while |u| + √(gH) stays under 30 m/s, which the cap guarantees \[inferred\].

## Why this form rather than Green–Naghdi

Green–Naghdi models also use the total depth ([Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)). In two dimensions, though, their operator couples x and y in one elliptic system, which typically needs a full sparse solve \[inferred\]. FUNWAVE's form keeps the row-and-column solves the game already runs on the CPU and in WGSL.

## Cost and risk

|  | Estimate |
| --- | --- |
| Code | Solver core on CPU and WGSL, plus the dispersion, shoaling and parity tests. Weeks |
| Per step | About 2–3× today's solver (three recoveries per step); measure it on the M4 Pro |
| Re-baselining | Catch, ride, peel and rideability reports, plus every spot's tuning |
| Online | Unchanged in principle: same fixed step, same CPU/GPU parity checks (PR #66) |
| Risk | The switch's interface flaw may remain, though velocity recovery plus the cap is how FUNWAVE lives with it; spots need re-tuning |

**What you get:** big Reef and Padang swells that stay finite at their cause rather than behind a cap, and dispersive terms that follow the water actually there. That should also ease the under-shoaling Bacigaluppi et al. 2019 found in the game's weakly nonlinear equations near breaking \[inferred\].
