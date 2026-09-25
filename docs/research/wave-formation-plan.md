# Wave formation plan: physics and graphics

- Status: **Proposed.** Decisions were settled in a grilling session on 2026-09-25 (log in [Appendix A](#appendix-a--decision-log)). The solver change is drafted as [ADR 0004](../adr/0004-dispersive-surf-zone-solver.md).
- Sources given for this plan: [Passy's World of Mathematics, *Mathematics of Ocean Waves and Surfing*](https://passyworldofmathematics.com/mathematics-of-ocean-waves-and-surfing/) and [D. T. Sandwell, *Physics of Surfing: Waves* (UCSD lecture)](https://topex.ucsd.edu/ps/waves.pdf). Further primary sources were verified for this plan and are listed in [Appendix C](#appendix-c--references).
- Scope: how the game forms, propagates, shoals, refracts and breaks waves, and how it draws them. The plan fits the math to the engine's frame budget. It supersedes the "Claims to avoid" limits in [surf-physics-calibration.md](surf-physics-calibration.md) only where a validation test below replaces a game constant.

The plan has two parts, as requested. **Part 1 (physics)** gives the math and the reason for each model choice. **Part 2 (graphics)** lists every visual improvement, and each one states the physics it makes visible and what it costs. Parts 3–5 cover performance, delivery order, validation and the draft roadmap entries.

---

## 0. Summary

Every wave property in the game will come from one physically consistent chain:

```text
storm (wind U10, fetch F, duration, distance R)       optional "storm mode"
   │  JONSWAP growth + dispersion over R  (long periods arrive first → sets)
   ▼
sea state at the spot (Hs, Tp, direction θ0, spread s, tide)   the "buoy"
   │  N seeded components aᵢ, ωᵢ, θᵢ, φᵢ ; ω² = g k tanh(k h)
   ├──────────────► far field: analytic swell to the horizon (GPU)
   ▼
relaxation zone (generates the incoming swell, absorbs reflections, is the far-field seam)
   ▼
surf-zone solver on 2D bathymetry, SI units, g = 9.81
   stage 1: nonlinear shallow water (finite volume)  →  stage 2 (objective): Madsen–Sørensen Boussinesq
   │  shoaling, refraction, breaking onset (Kennedy ∂η/∂t), bores, run-up
   ├──► plunging lip parcels (only where the local Iribarren number says "plunging"), mass-conserving
   ├──► foam/dissipation field  ──► whitewater, foam, spray, bubbles
   └──► board + rider forces (same field, velocity at hull depth)
```

Speed, wavelength, breaking point, peel angle and set timing stop being independent sliders. They become **measurable outputs** of the chain, shown live in the Wave Lab and checked by automated tests against textbook relations.

---

## 1. Where the current model stands

The current `InteractiveWaterField` (`src/wave/WaveModel.ts`) is a well-engineered qualitative field. Its structure prevents the behaviour both sources describe:

| Physics in the sources | Current code | Consequence |
|---|---|---|
| Phase speed depends on wavelength and depth. Sandwell's Airy solution: $c(d)=\left[\frac{gL}{2\pi}\tanh\frac{2\pi d}{L}\right]^{1/2}$ | `speed` is its own slider. Water gravity is `speed²/meanDepth` = **2.25 m/s²** at the defaults, while the board uses 9.81 m/s² | Water and board follow different physics. A real 8 s swell in 4 m of water has **L = 48 m, c = 6.0 m/s**. The game's wave moves at 3 m/s. |
| Period T stays constant; L shrinks as the water shallows (passyworld) | Period only sets a Gaussian width (`packetWidth` ≈ 5.5 m at the defaults) | The wave is a narrow bump, not a swell. |
| Sets come from interference of nearby periods, $T_B = T_1T_2/\lvert T_2-T_1\rvert$ (Munk, in Sandwell) | One launched packet, or one moving wave maker (`driveSwell`) | No sets and no lulls. |
| Refraction matters where depth < L; reefs and canyons bend and focus swell (Sandwell, Munk & Traylor 1947) | `depthAt(x, z)` ignores x | No refraction, so no peel can come out of the physics. |
| Depth-limited breaking at $d_b = 1.28H_b$, i.e. $H_b/d_b ≈ 0.78$ (Sandwell) | A peel front moving at a fixed 2.8 m/s plus a slope gate | Where the wave breaks is scripted, not physical. |
| Trochoidal crest sharpening toward the break (passyworld) | Skewed Gaussian profile | Wrong crest shape. |
| Swell reaches the horizon | The only water mesh is the 48 × 80 m field; beyond it are the sky sphere (radius 150 m) and coastline cards | No readable swell lines or incoming sets. |

**Measured baseline** (Node 22, this machine, `vitest` microbenchmark, 97 × 161 grid): **0.50 ms per step** for a finite packet and **0.80 ms** for the sustained wave maker. Sampling the 97 × 161 render vertices costs **0.65 ms** per frame, before `computeVertexNormals()`. These figures exclude rendering, but they show about an order of magnitude of CPU headroom inside the 16.7 ms frame.

---

# Part 1 — Physics

## 1.1 Units and time (Q1)

- $g = 9.81\ \mathrm{m/s^2}$ for water, board, rider, lip parcels and spray. `effectiveGravity` is removed, and so is the **Wave speed** slider.
- **Global time-scale** $s \in [0.4, 1.0]$, default 1.0. The fixed step stays $\Delta t = 1/60$ s of *simulated* time. The frame accumulator adds $s \cdot \Delta t_{wall}$. Every subsystem slows together, so the motion is Froude-consistent: a slow-motion replay of real physics, not weaker gravity. Determinism is unchanged because the step size never changes.

## 1.2 Linear dispersion: the backbone (Sandwell slides 5 and 11)

Sandwell derives the deep-water speed from a pressure restoring force, $\omega^2 = 2\pi g/L$. The general Airy result is

$$\omega^2 = g\,k\tanh(kh),\qquad c=\frac{\omega}{k},\qquad c_g = n\,c,\quad n=\tfrac12\left(1+\frac{2kh}{\sinh 2kh}\right)$$

- **Deep water** ($h > L/2$): $c = gT/2\pi$, $L_0 = gT^2/2\pi \approx 1.56\,T^2$ m, $c_g = c/2$. Speed depends on period, so the sea disperses.
- **Shallow water** ($h < L/20$; the CEM text uses 1/25): $c = \sqrt{gh}$. Speed depends on depth, which is what drives refraction.
- **Wave base:** orbital motion is negligible below $h \approx L/2$ (Sandwell's orbit figure). This sets how deep the seabed begins to "feel" the swell.

**Engine implementation.** `k` is evaluated per component and per cell with **Guo (2002)**'s explicit form, which needs no iteration:

$$kh \approx \frac{\omega^2 h}{g}\left(1-e^{-(\omega\sqrt{h/g})^{5/2}}\right)^{-2/5}$$

It is exact in both limits. Checked for this plan over T = 2–25 s and h = 0.2–1000 m, its maximum error in k is **0.79 %**.

**Reference values for the game** (computed for this plan):

| T (s) | h (m) | L (m) | c (m/s) | c_g (m/s) | kh | class |
|---:|---:|---:|---:|---:|---:|---|
| 8 | 15 | 81.8 | 10.2 | 7.5 | 1.15 | transitional |
| 8 | 4 | 48.0 | 6.0 | 5.5 | 0.52 | transitional |
| 8 | 1.8 | 33.0 | 4.1 | 4.0 | 0.34 | transitional → breaking |
| 12 | 15 | 135.4 | 11.3 | 9.8 | 0.70 | transitional |
| 12 | 4 | 73.8 | 6.2 | 5.9 | 0.34 | transitional |
| 18 | 15 | 211.6 | 11.8 | 11.0 | 0.45 | transitional |
| 18 | 4 | 111.8 | 6.2 | 6.1 | 0.22 | near-shallow |

## 1.3 Sea state, spectrum and sets (Q2, Q3, Q21, Q31)

**Buoy-style inputs** are the primary Wave Lab controls:

| Control | Range | Notes |
|---|---|---|
| Hs (offshore) | 0.3–3.0 m | Breaker height is a readout after shoaling. |
| Tp | 6–18 s | Sandwell's surf range is 5–18 s. |
| Direction θ₀ | −40° to +40° from shore-normal | |
| Spread | narrow (groundswell) to broad (windswell) | |
| Tide | −1.0 to +1.0 m | |
| Local wind | −12 to +12 m/s | Offshore (−) to onshore (+). |
| Time-scale | 0.4–1.0 | |

**Spectrum.** JONSWAP (Hasselmann et al. 1973):

$$S(\omega)=\frac{\alpha g^2}{\omega^5}\exp\!\left[-\tfrac54\left(\frac{\omega_p}{\omega}\right)^4\right]\gamma^{\,r},\quad r=\exp\!\left[-\frac{(\omega-\omega_p)^2}{2\sigma^2\omega_p^2}\right],\quad \gamma=3.3,\ \sigma=\begin{cases}0.07 & \omega\le\omega_p\\0.09 & \omega>\omega_p\end{cases}$$

In buoy mode, α is solved so that $H_s = 4\sqrt{m_0}$ matches the slider. Direction uses a cos-2s spread, $D(\theta)=Q(s)\cos^{2s}\!\big((\theta-\theta_0)/2\big)$ with $Q(s)=\frac{2^{2s-1}\Gamma^2(s+1)}{\pi\Gamma(2s+1)}$. The **Spread** slider maps to s. The mapping from "narrow" to "broad" (s ≈ 24 → 4) is a proposed **game mapping**, not a measured one.

**Discretization.** N components: **24 on CPU, 64 on WebGPU**.
- Frequencies are split into equal-energy bins, with the seed jittering each frequency inside its bin so the sum never repeats exactly.
- Each component's direction is drawn from $D(\theta)$ by inverse CDF using the seed.
- Phases φᵢ also come from the seed.
- Amplitudes are $a_i=\sqrt{2S(\omega_i)\Delta\omega_i}$.

The linear surface and depth-averaged flow are then

$$\eta_{lin}(\mathbf{x},t)=\sum_i a_i\cos(\mathbf{k}_i\!\cdot\!\mathbf{x}-\omega_i t+\varphi_i)$$

with Airy velocities (§1.9). **The seed now means one realization of a sea state**, not a reshaped bump. Replay keeps the same phases, the same run-start instant and the same inputs. New Wave keeps the sea state and draws new phases.

**Sets fall out of the sum.** Two equal components add as

$$\cos\omega_1t+\cos\omega_2t = 2\cos\!\left(\tfrac{\omega_1+\omega_2}{2}t\right)\cos\!\left(\tfrac{\omega_1-\omega_2}{2}t\right)$$

This is a carrier at the mean period, modulated by a beat of period $T_B = T_1T_2/|T_2-T_1|$ (Sandwell slide 19). The envelope travels at $c_g$.

| T₁, T₂ (s) | T_B | waves per set cycle |
|---|---:|---:|
| 12.5, 13 (Sandwell's exercise) | 325 s (5.4 min) | ≈ 25 |
| 8, 8.5 | 136 s | ≈ 16 |
| 12, 14 | 84 s | ≈ 6.5 |
| 8, 9 | 72 s | ≈ 8.5 |

The physics stays honest. **Presets choose period spreads with playable intervals**, and a **"skip to next set"** control fast-forwards (§1.6). The next set is predicted analytically. The envelope $\left|\sum_i a_i e^{i(\mathbf{k}_i\cdot\mathbf{x}_b-\omega_i t+\varphi_i)}\right|$ at a reference break point is cheap to scan ahead, so a run can start a fixed lead time before the set's largest wave arrives.

**Storm mode (Q22)** derives the buoy values instead of taking them directly.
- **Growth at the storm.** Fetch-limited JONSWAP: $\omega_p = 22\,(g^2/(U_{10}F))^{1/3}$ and $\alpha = 0.076\,(U_{10}^2/(Fg))^{0.22}$, capped by a fully developed Pierson–Moskowitz sea, $H_s \approx 0.21\,U_{19.5}^2/g$ ($\approx 0.22\,U_{10}^2/g$). Duration-limited growth converts duration to an equivalent fetch (USACE CEM Part II-2; coefficients to be verified during implementation). This reconciles passyworld's "energy ∝ wind⁴": since $H_s \propto U^2$, $E \propto H_s^2 \propto U^4$.
- **Consistency checks.** Fetch-limited JONSWAP with U₁₀ = 15 m/s gives Tp = 7.1 s for F = 100 km and 12.2 s for F = 500 km. A fully developed sea at U₁₀ = 27 m/s gives Tp ≈ 20 s, so it can produce Sandwell's "17 s waves require ≈ 27 m/s wind" (deep-water c = gT/2π = 26.5 m/s at 17 s: *wind speed ≥ wave speed*). Sandwell's Table 8-1 (fully developed sea) is the check table for the mode.
- **Travel to the spot.** Each component arrives after $t = R/c_g(\omega)$, with $c_g = g/2\omega$ in deep water. From R = 7000 km (Munk's Antarctic example), 18 s energy arrives after 5.8 days and 12 s after 8.7 days. Swell at the spot is therefore narrow-banded around $\omega = gt/2R$. The storm's size D sets the remaining bandwidth ($T_2 = T_1(R+D)/R$, Sandwell slide 18), and **distant storms give cleaner, more grouped swell**. Energy falls with spreading distance; the geometric spreading law is a documented simplification.

## 1.4 Bathymetry and spots (Q4, Q16, Q29)

Still-water depth is $h(x,z) = h_{spot}(x,z) + \text{tide}$. Spots are built from composable, deterministic TypeScript shapes (height-map import comes later):

| Spot | Shapes | Target tanβ | ξ_b (1.4 m, 8 s → 12 s) | Expected break |
|---|---|---:|---:|---|
| **Beach** (was Training) | Plane slope + seeded sandbars, with rip gaps | 0.02 | 0.17 → 0.25 | Spilling; peaks shift with seed |
| **Point** (was Glassy Point) | Headland with contours angled to the swell | 0.04 | 0.34 → 0.51 | Spilling → plunging; long peel |
| **Reef** (was Windy Reef) | Deep channel, then an abrupt shelf | 0.10–0.15 | 0.84 → 1.90 | Plunging, hollow |
| **Canyon** (new) | Beach plus an offshore submarine canyon, after Sandwell's "Why is Black's so good?" | 0.02 + canyon | — | Refraction focuses peaks beside the canyon |

- **Refraction physics.** Along a wave ray, $\sin\theta/c$ is constant (Snell). Offshore of the domain, contours are taken as straight and parallel, so each component is refracted and shoaled **analytically**:

$$\sin\theta(h)=\frac{c(h)}{c_0}\sin\theta_0,\qquad K_s=\sqrt{\frac{c_{g0}}{c_g}},\qquad K_r=\sqrt{\frac{\cos\theta_0}{\cos\theta}}$$

  Irregular features (the canyon, the reef, sandbars) must lie **inside** the solver domain so the solver refracts over them. Sandwell's rule that refraction matters where d < L (up to about 200 m for long swell) sets how far offshore the domain must reach for the Canyon spot.
- **Seabed seed.** The seed perturbs sandbar position and rip spacing on the Beach spot, which makes New Wave meaningful there.
- **Tide** moves the break zone (passyworld: the same reef can be "fabulous" at one tide and a dumper at another).

## 1.5 Domain, grid and boundaries (Q10, Q30)

- **A window that slides along shore.** The domain always spans cross-shore, from the offshore relaxation zone to the beach (with wet/dry cells). It slides **along-shore (x)**, following the rider, or the predicted set peak before the catch. It shifts by whole columns, like today's `advanceWindow()`, but along x. The seabed is a world function, so new columns are exact. The current z-scrolling of the grid is retired; the swell passes through a fixed seabed instead.
- **Stretched cross-shore grid.** Along-shore Δx is 1.0 m on CPU and 0.5 m on WebGPU. Cross-shore Δz is 1 m through the surf zone and grows smoothly offshore up to $\Delta z_{off} = \mathrm{clamp}(L_{min}/20,\,1,\,4)$ m, where $L_{min}$ is the wavelength at the relaxation depth for the shortest significant period (about 0.8 Tp). Boussinesq needs roughly 20 points per wavelength. The grid is fixed at run start, so determinism holds.
- **Size estimate** (CPU): 160 m along-shore × about 300 m cross-shore gives ≈ 160 × 210 ≈ **34k cells**. WebGPU: 0.5 m cells, ≈ **128k cells**.
- **Stability.** The fixed step Δt = 1/60 s satisfies CFL everywhere. With Courant 0.5 and |u| ≤ 3 m/s, the limit is 0.13 s at (15 m, 4 m cells), 0.059 s at (3 m, 1 m) and 0.030 s at (3 m, 0.5 m).
- **Offshore relaxation zone (Q30).** One band both makes and absorbs waves. Each step, the state (η, fluxes) is blended toward the analytic incoming field from §1.3, refracted per §1.4, using a smooth weight w(z) (Mayer et al. 1998; Jacobsen et al. 2012):

$$\mathbf{U} \leftarrow (1-w)\,\mathbf{U} + w\,\mathbf{U}_{analytic}$$

  - Waves reflected from shore are absorbed.
  - The **same w(z) is the graphics blend band** into the far field (§2.2), so the seam is continuous by construction.
  - Width: at least one peak wavelength at the zone's depth (18 s at 15 m: 212 m ≈ 53 cells at 4 m).
  - This replaces the source-line-plus-sponge wave maker (Wei et al. 1999), which needs sponges roughly one wavelength wide per side and is unaffordable for 18 s swell at 1 m cells.
- **Along-shore edges.** Relaxation bands relax toward the analytic linear field, with shoaling and refraction assuming locally straight contours. New columns are initialized from it. These bands are at least one wavelength from the rider. *Limitation:* the state inside them is approximate.
- **Shoreline.** Wet/dry handling uses well-balanced, positivity-preserving reconstruction (hydrostatic reconstruction, Audusse et al. 2004; or the Kurganov–Petrova 2007 central-upwind scheme used by Celeris). This gives run-up and swash, and keeps a lake at rest over any bathymetry exactly at rest.

## 1.6 Starting a run and skipping to the next set (Q20)

1. Pick $t_0$: the predicted arrival (§1.3) of the next set's largest wave at the break, minus a fixed lead time for the paddle window.
2. **Warm start.** Initialize (η, u, w) from the linear analytic solution at $t_0 - t_{spin}$, with shoaling and refraction per component.
3. Run $t_{spin} \approx 2\,T_p$ of solver steps faster than real time, behind a short fade, so the nonlinear shape (crest steepening, set-down, first breaking) forms.
4. Hand control to the player. The process is deterministic from (seed, settings, t₀). "Skip to next set" repeats steps 1–3.

## 1.7 Solver, stage 1: nonlinear shallow water, finite volume (Q9)

With total depth $H = h + \eta$ and fluxes $P = Hu$, $Q = Hw$:

$$\partial_t \eta + \partial_x P + \partial_z Q = 0$$
$$\partial_t P + \partial_x\!\left(\frac{P^2}{H} + \tfrac12 gH^2\right) + \partial_z\!\left(\frac{PQ}{H}\right) = gH\,\partial_x h + \tau_x$$
$$\partial_t Q + \partial_x\!\left(\frac{PQ}{H}\right) + \partial_z\!\left(\frac{Q^2}{H} + \tfrac12 gH^2\right) = gH\,\partial_z h + \tau_z$$

- **Scheme.** MUSCL reconstruction with a limiter, HLL or Kurganov–Petrova fluxes, well-balanced bed source, 2nd-order time stepping (SSP-RK2 or Adams–Bashforth). τ holds bottom friction, background current, crest wind stress (§1.8) and breaking terms.
- **Why stage 1 is not enough.** The equations are non-dispersive: every component travels at √(gh). Compared with Airy, the phase-speed error is **+4 % at kh = 0.5, +15 % at kh = 1 and +44 % at kh = 2** (computed). Waves also over-steepen and break too early. Stage 1 therefore places its relaxation zone shallow, at kh ≤ 0.6 for Tp (error ≤ 6 %), and its dispersion and breaking-depth tests *record* the known error instead of passing.
- **Why stage 1 is still useful.** Breaking waves become **bores** (moving hydraulic jumps). The scheme conserves mass and momentum and removes energy at the shock at the rate a hydraulic jump would. This is the correct post-breaking physics for whitewater, and stage 2 keeps it (§1.8).
- **Performance** is covered in Part 3. The simulation runs in a Web Worker.

## 1.8 Solver, stage 2 (the objective): Madsen–Sørensen Boussinesq with breaking (Q9, Q27, Q32)

Madsen & Sørensen (1992) add dispersive terms to the momentum equations, with coefficient **B = 1/15**. The linear dispersion becomes the [2,2] Padé approximation of Airy:

$$\frac{c^2}{gh}=\frac{1+B(kh)^2}{1+(B+\tfrac13)(kh)^2}\quad\text{vs.}\quad\frac{\tanh kh}{kh}$$

| kh | NLSW phase error | Madsen–Sørensen phase error |
|---:|---:|---:|
| 0.5 | +4.0 % | +0.00 % |
| 1.0 | +14.6 % | +0.02 % |
| 2.0 | +44.0 % | +0.53 % |
| 3.0 | +73.6 % | +2.4 % |

This error table is computed for this plan. It is why stage 2 is the objective: shoaling, skewed and forward-pitched pre-break faces, crest speed and breaking depth all become right to within a few percent, and the relaxation zone can move out to about 15 m.

- **Numerics.** The dispersive terms include mixed time derivatives, which give one tridiagonal system per row and per column each step. Stage 2 uses the Thomas algorithm on CPU and cyclic reduction on WebGPU. It stays tridiagonal on the stretched grid, with variable coefficients. The flux part reuses stage 1: this is the hybrid FV/FD structure of Celeris (Tavakkol & Lynett 2017) and FUNWAVE-TVD (Shi et al. 2012).
- **Breaking onset, dissipation and end (Q27).** Kennedy et al. (2000) eddy viscosity, driven by the rate of surface rise $\eta_t$:

$$\nu_b = B\,\delta^2\,(h+\eta)\,\eta_t,\qquad B=\begin{cases}1 & \eta_t\ge 2\eta_t^*\\ \eta_t/\eta_t^*-1 & \eta_t^*<\eta_t\le 2\eta_t^*\\ 0 & \text{otherwise}\end{cases}$$

  - The threshold $\eta_t^*$ ramps from onset $\eta_t^{(I)}$ to end $\eta_t^{(F)} = 0.15\sqrt{gh}$ over $T^* = 5\sqrt{h/g}$ after onset, with **δ = 1.2**.
  - **Onset is set per spot:** $0.35\sqrt{gh}$ for Beach (bar and trough), $0.65\sqrt{gh}$ for Point, Reef and Canyon (plain or steep slopes).
  - Each cell carries a **breaking age**, advected with the flow, which drives the ramp.
  - Celeris-WebGPU ships a variant (onset 0.50, δ = 2.0, δ not squared). It is recorded as an alternative to compare against, not the default.
- **Stability backstop.** The solver switches to NLSW wherever $H/h > 0.8$ (Tonelli & Petti 2009; the FUNWAVE-TVD default). Bores then stay shock-captured.
- **In stage 1**, the same Kennedy $B$ is computed as a **breaking flag** (the NLSW solver already dissipates at bores). Lip spawning, foam, board instability and readouts use one signal in both stages.
- **Wind on crests (Q23).** Wind never changes chop inside the solver, because chop is below grid resolution. It acts in two ways near crests:
  1. A crest-local stress term $\tau_w \propto \rho_a C_d |U|U$, applied where $\eta_t > 0$.
  2. A small shift in the onset threshold. Offshore wind holds the face up (later, more plunging breaks, spray feathering off the lip); onshore wind lowers onset (crumbling, spilling).

  This is qualitative. Its magnitude must be sourced before implementation (candidate references: Douglass 1990; Feddersen & Veron 2005; **not yet verified**).
- **Reference implementation (Q32).** [Celeris-WebGPU](https://github.com/plynett/plynett.github.io) (Lynett et al. 2026; MIT). We port its flux, tridiagonal and breaking logic with attribution and its MIT notice, adapt them to our architecture (sliding window, stretched grid, CPU reference), and compare results on shared benchmark cases.

## 1.9 Breaker type, peel and the plunging lip (Q5, Q12, Q13)

**Breaking is emergent: there is no scripted peel and no rideability safety net.**

- **Validation limits** are tests, not triggers:
  - Depth-limited (McCowan) $H_b/h_b \approx 0.78$. This is Sandwell's $d_b = 1.28\,H_b$, which is simply 1/0.78.
  - Slope-dependent form (Battjes): $\gamma_b = 1.06 + 0.14\ln\xi_b$.
  - Miche steepness limit: $(H/L)_{max} = 0.142\tanh(kh)$, which becomes the deep-water 1/7 limit (Michell).
- **Breaker type** comes from the local breaker-point Iribarren number, using the local bed slope at the breaking cell:

$$\xi_b=\frac{\tan\beta}{\sqrt{H_b/L_0}}:\quad \text{spilling }<0.4,\quad \text{plunging }0.4\text{–}2.0,\quad \text{surging/collapsing }>2.0$$

  (The deep-water ξ₀ cut-offs are 0.5 and 3.3.)
- **Peel is measured, not scheduled.** The peel angle α is the angle between the broken whitewater trail and the unbroken crest (0° is a closeout; Walker 1974; Hutt, Black & Mead 2001). The breaking point moves along the crest at

$$V_s=\frac{c_b}{\sin\alpha},\qquad c_b=\sqrt{g\,h_b}=\sqrt{1.28\,g\,H_b}$$

  which is the speed a surfer must hold to stay in the pocket. Sandwell's breaker-speed table checks this: 4.5 ft → 10 mph, and the formula gives 4.1 m/s = 9.3 mph. The rider's available speed comes from the drop: $v=\sqrt{2gH}$ (passyworld) from rest, or Sandwell's $v_d=\sqrt{3.28\,gH_b}$ for a rider already moving at $c_b$ ($c_b^2 + 2gH_b$).

  | H_b | c_b | v_d | V_s at α = 60° | 45° | 40° | 29° | 27° | 15° |
  |---:|---:|---:|---:|---:|---:|---:|---:|---:|
  | 1.0 m | 3.5 | 5.7 | 4.1 | 5.0 | 5.5 | 7.3 | 7.8 | 13.7 |
  | 1.4 m | 4.2 | 6.7 | 4.8 | 5.9 | 6.5 | 8.6 | 9.2 | 16.2 |
  | 2.2 m | 5.3 | 8.4 | 6.1 | 7.4 | 8.2 | 10.8 | 11.6 | 20.3 |

  (speeds in m/s)

  Hutt et al. (2001) give minimum makeable peel angles by skill: level 1, 90°; level 3, 60°; level 6, 40°; level 7 (top amateur), 29°; level 8 (professional), **27°**; below that, not made at the time of publication. These figures come from secondary copies; verify them against the paper's figures.
- **Close-outs are physics (Q13).** A close-out, a too-fast section or a fat spilling wave is a real outcome. The rider may ride the bore or wipe out. The post-run readout explains the cause, for example: *"Closed out: peel angle 14°; a 1.4 m wave needs ≥ 27° (pro) to ≥ 40° (intermediate)."*
- **Plunging lip (Q12).** `PlungingSheet` spawns **only where ξ_b says plunging**.
  - Launch velocity comes from the local crest velocity. Throw strength and tube shape scale with ξ_b, from almond (about 3:1 length to width) near 0.4 to round (1:1) near 2.0 (passyworld's tube ratios). This is a modeling mapping, not a measured law.
  - **Mass conserving:** the lip's volume and momentum are removed from the source cells at launch and deposited into the landing cells at impact. That makes the splash-up and the secondary bore. The limit on how finely parcels represent volume stays documented, as in ADR 0003.

## 1.10 Board physics consequences (Q14)

- **Water velocity at hull depth.** The solver stores depth-averaged velocity ū. Linear theory gives the vertical profile, which is the "orbits shrink to the wave base" figure (Sandwell slide 10):

$$\frac{u(z)}{\bar u}=\frac{kh\,\cosh k(z+h)}{\sinh kh}$$

  Here k is estimated locally from the dominant component (or the zero-crossing wavelength). Board drag and lift use $u$ at hull depth, not ū. At the surface in the Beach break zone, this gives about 3–4 % more velocity than ū at kh ≈ 0.3. Offshore at kh ≈ 1 the difference grows to about 1.3×. The same profile drives the rider's underwater tumble in `RiderFall`.
- **Paddling.** passyworld's $m a = P + D$: paddle thrust plus drag from the orbital flow. Paddle force gets realistic values. Planning target: sustainable paddling speed of about 1.5–2 m/s, to be sourced from measured surfer studies in P4. A catch then emerges when face slope ($g\sin\theta$ along the face) and orbital drag bring the board toward $c$. Under Q1 that is about 4–6 m/s, not the current 3 m/s.
- **Board tests:**
  - No catch in flat water from paddling alone.
  - Drop speed within tolerance of $\sqrt{2g\Delta h}$.
  - Drop-in crossing angle near passyworld's ~50°, reported as a statistic.
  - Wave-assisted paddling ($D>0$ on the face) versus flat water.

## 1.11 Physics readouts (Q26)

The Wave Lab shows the following live. The same values feed the diagnostics and tests.
- $c$, $c_g$, $L$, $h/L$ class (deep / transitional / shallow)
- predicted $h_b = 1.28H_b$ and predicted $H_b$ after shoaling ($K_sK_r$)
- $\xi_b$ with breaker type
- **measured** peel angle and required $V_s$
- set period $T_B$ and time to next set
- total energy, dissipation, and relaxation-zone reflection

A refraction-ray overlay draws wave orthogonals from the analytic components.

---

# Part 2 — Graphics

Each item states what changes, **the physics it makes visible**, and what it costs. The order follows Q17, interleaved with the physics phases in Part 4. The standing rule from ADR 0002 applies: **one water state**. Graphics may add pixels, never a second wave.

## 2.1 G1 — GPU displacement from the physics field (performance enabler)

- **Change.** Each frame, upload the solver state as float textures: η; (u, w); breaking B and foam F. On CPU at 34k cells that is about 0.55 MB per frame for four 32-bit channels, or about 0.27 MB with half floats. The vertex shader displaces the render mesh with **the same bicubic (Catmull-Rom) kernel the board uses**, and computes normals from central differences in the shader. The render mesh becomes independent of the grid (2× denser near the camera, with LOD rings). On the stretched grid, mesh vertices carry world z as an attribute and texture coordinates in index space.
- **Physics reason.** The rendered surface *is* the surface the board is pushed by, sampled with the same interpolation, so render and contact agree exactly. An existing test concept (render-sample agreement) becomes exact.
- **Cost.** Removes about 0.65 ms of per-vertex JS sampling plus `computeVertexNormals()` from the main thread every frame, which pays for the bigger domain. Implemented through `onBeforeCompile` on the current `MeshPhysicalMaterial` (WebGL2), or TSL nodes (WebGPU).
- **Implementation status (2026-09-25, not yet committed).**
  - `WaterSurface` now uploads an RG float texture of (height, foam) per grid node. The vertex shader applies the field's own **bilinear** lookup, `InteractiveWaterField.sample()`'s central-difference normal, and the crest and foam color mix.
  - `sampleSurfaceHeight` and `sampleSurfaceNormal` are CPU copies of the shader lookups. Tests assert they equal the board's `heightAt` (exactly) and `sample().normal`, including after the sustained grid scrolls. Foam memory matches the previous per-vertex rule on every node.
  - Measured `WaterSurface.update()`: **3.36 → 1.07 ms** per frame (Node microbenchmark). The remaining cost is the per-node foam rule on the CPU.
  - Browser: no shader errors, 120 FPS in the local in-app browser. Chase, Profile and Below views match the previous build side by side.
  - **Differences from the text above:**
    - The render mesh stays at 1× grid density, and the kernel stays bilinear. A denser mesh adds no detail until the board's bicubic kernel lands in P2, and both must switch together.
    - Velocity and breaking channels are not uploaded until a shader uses them (G3/G4).

## 2.2 G2 — Swell to the horizon and wind chop (Q11)

- **Change.**
  - Outside the domain, a far-field mesh (projected grid or concentric rings to the horizon; the sky sphere radius grows to match) displaces **Gerstner waves** from the same N components.
  - Each component follows the depth-dependent dispersion and analytic refraction of §1.4.
  - **Steepness cap $k_ia_i \le 0.45$** per component. Gerstner crests cusp only at H/L = 1/π ≈ 0.32, far past the real Stokes limit of 0.142.
  - The blend into the solver uses the relaxation weight w(z).
  - Along-shore beyond the window, a cheap **surf-zone proxy** caps height at γh and draws a foam band along the breaker-line contour $h = H/\gamma$, so lateral edges don't reveal the window.
  - **Chop:** the WebGL2 tiers use 2–3 scrolling normal-map octaves; WebGPU uses a Tessendorf FFT (256²) with a Phillips or JONSWAP tail. Chop amplitude and roughness come from local wind: glassy when offshore, textured when onshore (passyworld).
- **Physics reason.** Crest spacing on the horizon shows the period ($L_0 = 1.56T^2$), and lines bend near shore (refraction). **Sets arrive as visible bands of bigger waves** (group envelopes at $c_g$), so the player reads the ocean the way a surfer does. Gerstner's circular particle orbits are passyworld's trochoid, and in deep water they reproduce second-order Stokes crest sharpening (the trochoid expands to $\eta \approx a\cos\theta + \tfrac12 ka^2\cos2\theta$ plus a constant).
- **Cost.** Vertex-shader sums: 24 components (WebGL2) or 64 (WebGPU) on a few thousand far-field vertices. Normal maps are one texture fetch per octave. The FFT is WebGPU only.

## 2.3 G3 — Physically based water shading

- **Change.**
  - Schlick Fresnel with $F_0 = ((n-1)/(n+1))^2 = 0.020$ for n = 1.333.
  - **Beer–Lambert absorption per color channel**, $T_\lambda = e^{-(a_\lambda + b_{turb})\,d}$. Base coefficients: pure water (Pope & Fry 1997) a₄₅₀ = 0.009, a₅₅₀ = 0.057, a₆₅₀ = 0.34 per metre. Clearest ocean water (Smith & Baker 1981) is 0.015, 0.064 and 0.35. A per-spot **turbidity** term is added, since surf water is never this clear.
  - The path length d comes from the height field: water depth to the seabed along the view ray for shallow water; crest thickness along the view and sun ray for thin crests and the lip.
  - A thin-crest transmission and scattering term, weighted by sun-behind-wave geometry.
  - The existing sky/coast PMREM reflections. Screen-space reflection and refraction on the WebGPU tier only.
- **Physics reason.**
  - Red light dies within a few metres: through 1 m of water red transmits 71 %, green 94 % and blue 99 % (computed from the coefficients above). **This is why backlit crests and lips glow turquoise** (visible in Sandwell's slide photos).
  - Colour shifts from turquoise over sandbars to deep blue in channels, so the **bathymetry becomes readable from above**, which is how surfers find the peak.
  - Fresnel makes glassy faces mirror the sky at grazing angles.
- **Cost.** Per-pixel ALU only. The thickness estimate is 2–4 extra height-texture fetches. SSR is gated to the high tier.

## 2.4 G4 — Foam carried by the flow, and whitewater bores

- **Change.** A foam scalar F lives on the solver grid:

$$\partial_t F + \mathbf{u}\cdot\nabla F = S - F/\tau$$

  - The source S is proportional to the local **breaking dissipation** (Kennedy $\nu_b$ work in stage 2, bore energy loss in stage 1) plus lip-impact volume.
  - F is advected semi-Lagrangian by the same velocity field.
  - The decay time τ is a per-spot parameter. Foam grows and decays in similar patterns across lab and field data, but absolute durations differ (Callaghan et al. 2024, already cited in [breaking-wave-representations.md](breaking-wave-representations.md)).
  - Rendering: tiled cellular foam textures thresholded by F; stretched lacework where the velocity gradient is large; a noisy, displaced white roller on bore faces; bubbles below bores in the underwater view.
- **Physics reason.** Foam is the **visible record of where energy was dissipated**. The foam lines trace breaker zones, rips and refraction patterns, like the foam bands in Munk & Traylor's aerial plate (Sandwell slide 28).
- **Cost.** One advection pass over the grid (CPU worker or GPU compute) plus texture sampling in the water shader.

## 2.5 G5 — Caustics from the real surface

- **Change.** Replace the decorative seabed bands with a caustic map computed from **the same surface normals**. Refract a sun-ray grid through the surface onto the bed; light intensity is the area ratio of the refracted triangles (Evan Wallace's WebGL Water method, via screen-space derivatives). Beer–Lambert attenuation applies over the ray depth. Resolution: 128² on medium, 256² on high, off on low.
- **Physics reason.** Caustics are light focused by the curvature of the actual wave surface. They move with the swell and sharpen under steep faces.
- **Cost.** One small offscreen pass.

## 2.6 G6 — Spray and mist

- **Change.** Pooled, instanced soft particles, emitted from:
  1. lip impacts (volume and momentum from the §1.9 mass exchange)
  2. offshore-wind feathering off the crest (§1.8)
  3. bore faces

  Count caps per tier (1k / 4k / 16k). Instanced points, not objects, per the existing decision note.
- **Physics reason.** Spray marks where kinetic energy converts at impact, and which way the wind blows relative to the wave.

## 2.7 Underwater and diagnostic views

- The underwater fog becomes per-channel Beer–Lambert, replacing the single-colour `FogExp2`. Bubbles come from the foam source, and optional light shafts from the sun direction.
- Profile and diagnostic views draw the wave-class band (h/L), predicted breaking depth, measured peel angle and refraction rays (§1.11).

## 2.8 Quality tiers (Q6, Q7, Q24)

| Feature | Low (WebGL2, phone) | Medium (WebGL2, laptop) | High (WebGPU) |
|---|---|---|---|
| Physics grid | CPU 1 m | CPU 1 m | GPU 0.5 m |
| Solver stage | 1 → 2 (see gate in §3.3) | 1 → 2 | 2 |
| Components | 24 | 24 | 64 |
| Near render mesh | 1× grid | 2× grid | 2× grid |
| Chop | 1 normal-map octave | 2–3 octaves | FFT 256² |
| Shading | Fresnel + absorption | + thin-crest transmission | + SSR / refraction |
| Foam | advected | + detail texture | + FFT Jacobian whitecaps |
| Caustics | off | 128² | 256² |
| Spray particles | 1k | 4k | 16k |
| Device-pixel-ratio cap | 1.0 | 1.75 | 2.0 |

Photoreal is the target. **Readability of the face and the pocket wins any conflict**, and the tier values are planning targets to validate by profiling.

---

# Part 3 — Performance and engine fit

## 3.1 Budgets (Q24)

| Tier | Water + board simulation | Upload (main thread) | Rendering | Target FPS |
|---|---|---|---|---|
| CPU / WebGL2 | ≤ 4 ms per step, in a Web Worker | ≤ 0.5 ms | ≤ 8 ms | 60 desktop, 30 phone minimum |
| WebGPU | ≤ 3 ms GPU compute per step | patch readback async | ≤ 8 ms | 60 |

**Automatic quality scaling.** Frame time is monitored, and quality drops in this order: render resolution (device pixel ratio), then chop octaves or FFT size, then far-field component count, then particles and caustics. **The physics grid, component count used by the solver, and solver stage never change mid-run**, so replays stay deterministic.

## 3.2 Architecture

- **Worker simulation (CPU tier).** The whole fixed-step simulation moves into a Web Worker: water, board, rider fall and lip parcels. Board and water step in lockstep and exchange reactions every step, so they belong together.
  - The main thread sends inputs tagged with a step index and receives snapshots. Snapshots are transferable `Float32Array`s for the textures, plus body transforms.
  - The renderer interpolates between the last two snapshots. The cost is one frame of input latency.
  - `SharedArrayBuffer` is **not** required, so no cross-origin isolation headers are needed for static hosting.
- **WebGPU tier (Q18).** The GPU field is the single authority. Each frame, a small patch (about 16 × 16 cells) around the board and rider is read back asynchronously. Board physics uses the one-frame-old patch, corrected forward by $\eta + \eta_t\,\Delta t$. Rendering reads the same GPU buffers directly. The lag is measured and tested.
- **Determinism (Q19).** The CPU tier replays bit-exact on the same build, and the worker is bit-identical to the main-thread reference in tests. WebGPU replays match within a stated tolerance on the same device. **All automated tests run on the CPU reference.**
- **Legacy (Q25).** The current `InteractiveWaterField` stays behind a `legacy` flag until the new solver passes the validation suite (§4.2) and the per-spot rideability report. Then it is deleted along with its legacy-only tests.

## 3.3 Cost estimates and gates

These are planning estimates. The measured baseline is 0.50–0.80 ms per step for 15.6k cells.

| Configuration | Cells | Estimate per step | Where |
|---|---:|---:|---|
| Stage 1 NLSW, CPU (**measured**) | 36.2k (160 m × 330 m stretched spot domain) | P2a SSP-RK2: 7.5 ms. P2b-1 typed-array sweeps: 7.0 ms. **P2b-2 fused MUSCL-Hancock: 4.05 ms** (bundled Node, development machine), which meets the 4 ms worker budget. 1.5 m along-shore cells would give 2.7–2.9 ms of headroom for the phone tier | worker |
| Stage 2 Boussinesq, CPU | ~34k | 5–8 ms (tridiagonal solves plus breaking) | worker |
| Stage 2 Boussinesq, WebGPU | ~128k | < 3 ms; Celeris-WebGPU reports ~1M cells at 4.2× real time on an RTX 4090 in standard mode | GPU |
| Far field, 24–64 components | — | < 0.5 ms GPU | vertex shader |

**P5 performance gate.** If CPU Boussinesq exceeds the 4 ms worker budget on the reference laptop after optimization, three fallbacks are available: (a) a narrower CPU window; (b) keep stage 1 on the Low tier only; (c) consider WebAssembly or SIMD. Each has visible physics consequences, so the choice goes back to the user at that gate. **It is not assumed here.** Tests always run the full CPU Boussinesq, because Node has no real-time requirement.

**Benchmarks.** Vitest benchmarks per solver stage and grid, with regression thresholds, plus an on-screen frame-time and simulation-time readout.

---

# Part 4 — Delivery, validation and roadmap drafts

## 4.1 Phases (Q28)

Each phase is playable and has exit criteria.

| Phase | Content | Exit criteria |
|---|---|---|
| **P0** | Sustained-wave and rider-fall milestone | Landed in `1848d80` and `085bef1`. Close its open browser validation item in the roadmap. |
| **G1** | GPU displacement from the height texture; normals in the shader; bicubic kernel shared with the board | Render-sample agreement test is exact. Main-thread water cost drops by ≥ 0.6 ms. No visual regression. |
| **P1** ✓ | SI foundation: `dispersion.ts` (Airy, Guo), `SeaState` (JONSWAP, cos-2s spread, seeded components, linear sampler, set predictor), Froude time-scale, physics readouts. **Done 2026-09-25** ([task plan](../superpowers/plans/2026-09-25-p1-sea-state-foundation.md)). | Dispersion, beat-period and determinism tests pass (74 tests). The legacy solver is unchanged and still the default. |
| **P2** ✓ (view only) | Spots and stage 1 (P2a, P2b, P2c). Seabeds; finite-volume solver (fused MUSCL-Hancock, 4.05 ms per step for 36.2k cells in bundled Node); open along-shore edges; stretched grid; sliding window; sea-state relaxation boundary; column WKB warm start and set timing; **view-only physical surf zone** behind the Wave Lab's Water model switch or `?physical`. Per option (a) of the P2c decision, the legacy wave stays the playable default. Deferred: the Web Worker and bicubic sampling (P4, with board coupling), removing the Wave speed slider (with the legacy solver, P5), and the far field (G2). In-browser main-thread cost is 5.7–7.6 ms per step, so the worker is required before physical waves become playable. | Validation as listed (lake at rest, conservation, Stoker, √(gh), reflection, Green, Snell, run-up, stretched-grid reflection 1.5 %, generated Hs 0.95 of linear); 111 tests. |
| **G2** | Far-field Gerstner swell, steepness cap, chop, blend band, lateral surf-zone proxy | No visible seam at 1/60 s. Sets are visible on the horizon. Budget met. |
| **P3** | Emergent breaking: Kennedy flag, ξ_b breaker type, mass-conserving Iribarren lip, peel measurement, close-out readouts, rideability statistics, crest wind stress, storm mode | Breaking-depth and Miche tests (stage 1 records its known bias); lip mass balance; per-spot rideability report generated. |
| **G3** | Fresnel, Beer–Lambert, thin-crest transmission | Backlit crests show turquoise transmission and sandbars are visible from above. Budget met on all tiers. |
| **G4** | Advected foam from dissipation; bore roller; bubbles | Foam follows dissipation and currents. Decay time is configurable per spot. |
| **P4** | Board: velocity at hull depth, paddle retune, drop and angle tests, rider fall in the orbital flow | Board tests (§1.10) pass. Catches work at real speeds. |
| **P5** | **Objective:** Madsen–Sørensen Boussinesq, Kennedy eddy viscosity, Tonelli–Petti backstop, ported from the Celeris reference with attribution; retire `legacy` | Dispersion error ≤ 2.5 % to kh = 3; breaking-depth tests pass without bias; benchmark cases match the Celeris reference; performance gate decided. |
| **G5–G6** | Caustics from real normals; spray and mist pools | Budget met per tier. |
| **P6** | WebGPU tier: GPU solver, 0.5 m cells, 64 components, FFT chop, async patch readback | Readback lag tested. Tolerance-level replay on one device. CPU fallback unchanged. |

## 4.2 Validation suite (replaces "guaranteed ride" tests; Q13)

Physics tests run on the CPU reference solver and assert tolerances. Stage 1 records NLSW's known bias instead of asserting.

1. **Dispersion.** A monochromatic wave on a flat bed has phase speed matching Airy (stage 2: ≤ 2.5 % to kh = 3). Group speed is measured from a packet.
2. **Shoaling.** Height before breaking follows $K_s=\sqrt{c_{g0}/c_g}$ (Green's law $H\propto h^{-1/4}$ in shallow water) within 10 %.
3. **Refraction.** Oblique incidence on a plane slope satisfies Snell ($\sin\theta/c$ constant) within 2°.
4. **Breaking depth.** $H_b/h_b$ lies in 0.6–1.0 and follows the Battjes slope trend. Miche: no unbroken wave exceeds $0.142\tanh(kh)$ by more than 10 %.
5. **Breaker type.** Iribarren classification per spot matches the design table in §1.4.
6. **Sets.** A two-component input gives the envelope period $T_1T_2/|T_2-T_1|$ within 2 %. The set predictor's arrival time matches the simulated arrival.
7. **Conservation.** A lake at rest over every spot stays below |u| < 1e-6 m/s. Volume is conserved, including lip exchange, apart from boundary flux. Energy never increases without forcing.
8. **Boundaries.** Relaxation-zone reflection coefficient < 10 %. No drift at the along-shore window shift.
9. **Determinism.** CPU replay is bit-exact. The worker matches the main-thread reference. WebGPU replay stays within tolerance (device test, not CI).
10. **Board** (§1.10) and render-sample agreement (G1).
11. **Rideability report** (reported, not asserted): for each spot and default conditions, the share of set waves whose measured peel angle is makeable at each Hutt skill level, and ride-time distributions. The existing "20 m no-paddle ride on seeds 1–12" test retires with `legacy`.
12. **Benchmarks** with thresholds (§3.3).

## 4.3 Draft roadmap entries

Paste these into `ROADMAP.md` when the plan is accepted. They are kept here to avoid editing a tracker another session may be updating.

```markdown
## Next milestone — physical wave formation (see docs/research/wave-formation-plan.md)

### P0 · GPU displacement from the shared field (G1) — `Ready`
- [ ] Upload η/u/w/breaking/foam as float textures each frame; displace and shade with the board's bicubic kernel; drop per-vertex CPU sampling and computeVertexNormals.

### P0 · SI wave foundation (P1) — `Backlog`
- [ ] g = 9.81 everywhere; remove effectiveGravity and the Wave speed slider; add Froude-consistent time-scale.
- [ ] SeaState: JONSWAP + cos-2s, seeded components, Guo dispersion, analytic sampler, set predictor, Wave Lab readouts.

### P1 · Spots, sliding window and finite-volume solver (P2) — `Backlog`
- [ ] Composable 2D bathymetry for Beach, Point, Reef, Canyon; along-shore window; stretched grid; relaxation zone; wet/dry NLSW in a worker; warm start and skip-to-set.

### P1 · Far-field ocean (G2) — `Backlog`
### P1 · Emergent breaking and Iribarren lip (P3) — `Backlog`
### P2 · Shading, foam, board consequences (G3, G4, P4) — `Backlog`
### P2 · Boussinesq objective (P5) and WebGPU tier (P6) — `Backlog`
```

## 4.4 Proposed glossary changes (apply to `CONTEXT.md` in P1)

- **Wave seed:** a value that selects one realization of the configured sea state: component phases, frequency jitter and directions, plus seabed perturbations on seeded spots. *Avoid:* "wave shape".
- **Sea state:** the spectral description of the swell at the spot (Hs, Tp, direction, spread, tide), entered as buoy values or derived from a storm.
- **Set:** a group of larger waves produced by interference of nearby periods, arriving at the group velocity.
- **Relaxation zone:** the offshore band that generates the incoming swell, absorbs reflected waves and blends into the far field.
- **Peel angle:** the angle between the broken whitewater trail and the unbroken crest; it sets the speed a rider needs.
- **Breaker type:** spilling, plunging or surging, classified by the local Iribarren number.
- **Time-scale:** a uniform slow-motion factor on simulated time. It is not a change to gravity.

---

## Appendix A — Decision log

| # | Decision |
|---|---|
| Q1 | SI-true physics (g = 9.81 everywhere) plus a global Froude-consistent time-scale; the speed slider is removed. |
| Q2 | Buoy-style inputs are primary; storm mode derives them; local wind is separate. |
| Q3 | Physical sets at real intervals, a skip-to-next-set control, and presets with playable period spreads. |
| Q4 | Hand-built 2D seabed per spot, then seeded sandbars. |
| Q5 | **Fully emergent breaking, with no safety net.** |
| Q6 | WebGPU high tier plus WebGL2 CPU fallback; 60 FPS desktop and 30 FPS phone targets; CPU is the test reference. |
| Q7 | Photoreal target with tiers; readability wins. |
| Q8 | This repo document, a draft ADR 0004, draft roadmap entries, and a shareable page. |
| Q9 | Stage 1 finite-volume NLSW; **objective: Madsen–Sørensen Boussinesq** with an NLSW switch where waves break. |
| Q10 | Along-shore sliding window; 1 m cells on CPU and 0.5 m on GPU; bicubic board sampling. |
| Q11 | Far-field analytic swell from the same components, plus chop (FFT on WebGPU, normal maps on WebGL2). |
| Q12 | Lip spawns on plunging breakers only (Iribarren), tube shape from ξ, mass-conserving exchange. |
| Q13 | Close-outs are physics, with explained readouts; physics validation tests; rideability reported as statistics. |
| Q14 | Board consequences in scope: velocity at hull depth, paddle retune, drop tests. |
| Q15 | The sustained-wave milestone lands first (done). |
| Q16 | Beach, Point, Reef, Canyon; time-scale default 1.0, range 0.4–1.0. |
| Q17 | Graphics order: GPU displacement, far field, shading, foam, caustics, spray. |
| Q18 | WebGPU authority with async patch readback and forward correction. |
| Q19 | CPU bit-exact replays; WebGPU replays within tolerance; tests on CPU. |
| Q20 | Warm start from linear theory plus spin-up; runs start before the set's largest wave. |
| Q21 | JONSWAP with cos-2s spread; 24 or 64 seeded components; the seed selects phases. |
| Q22 | Storm mode: fetch- and duration-limited JONSWAP plus dispersion over distance. |
| Q23 | Chop visual only; wind acts physically on crests and on breaking onset. |
| Q24 | Frame budgets, automatic quality scaling that never touches the physics grid, benchmarks. |
| Q25 | Legacy solver kept behind a flag until validation passes, then deleted. |
| Q26 | Live physics readouts plus a refraction-ray overlay. |
| Q27 | Kennedy $\eta_t$ breaking (per-spot onset 0.35 or 0.65 √(gh), end 0.15 √(gh), T* = 5√(h/g), δ = 1.2); H/h > 0.8 NLSW backstop; γ and Miche as tests. |
| Q28 | Interleaved phases P0 → G1 → P1 → P2 → G2 → P3 → G3 → G4 → P4 → P5 → G5–G6 → P6. |
| Q29 | Composable TypeScript seabed shapes now; height-map import later. |
| Q30 | Offshore relaxation zone that is also the far-field seam; stretched cross-shore grid. |
| Q31 | Wave Lab ranges as in §1.3. |
| Q32 | Celeris-WebGPU (MIT) as the reference implementation; port with attribution. |

## Appendix B — Open items to resolve during implementation

- Duration-limited growth coefficients (USACE CEM Part II-2).
- Magnitude of the wind-on-breaking effect (Douglass 1990; Feddersen & Veron 2005: not yet verified).
- Hutt et al. (2001) skill table against the original figures.
- Measured paddling speeds for P4.
- Mapping of the spread slider to s.
- Choice between the Kennedy and Celeris breaking-coefficient variants.
- The P5 CPU performance gate (§3.3).

## Appendix C — References

**Sources provided for this plan**
- Passy's World of Mathematics, *Mathematics of Ocean Waves and Surfing*: https://passyworldofmathematics.com/mathematics-of-ocean-waves-and-surfing/
- Sandwell, D. T., *Physics of Surfing: Waves* (UCSD lecture): https://topex.ucsd.edu/ps/waves.pdf. Same course, energy slides: https://topex.ucsd.edu/ps/energy.pdf.2006

**Dispersion, spectra and sets**
- USACE, *Coastal Engineering Manual*, Part II-1 (water wave mechanics): http://www1.frm.utn.edu.ar/laboratorio_hidraulica/Biblioteca_Virtual/Coastal%20Engineering%20Manual%20-%20Part%20II/Part_II-Chap_1.pdf
- Guo, J. (2002), Simple and explicit solution of wave dispersion equation, *Coastal Engineering* 45:71–74. Fenton's note: https://johndfenton.com/Papers/Dispersion-Relation.pdf
- Hasselmann et al. (1973), JONSWAP; Pierson & Moskowitz (1964). Summary: https://geo.libretexts.org/Bookshelves/Oceanography/Introduction_to_Physical_Oceanography_(Stewart)/16:_Ocean_Waves/16.4:_Ocean-Wave_Spectra
- Horvath, C. (2015), *Empirical directional wave spectra for computer graphics*, DigiPro. Code: https://github.com/blackencino/EncinoWaves
- Tessendorf, J. (2001), *Simulating Ocean Water*: https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf
- Munk, W. H. (1949), Surf beats, *EOS Trans. AGU* 30:849: https://agupubs.onlinelibrary.wiley.com/doi/pdf/10.1029/TR030i006p00849. Munk, W. H. & Traylor, M. A. (1947), Refraction of ocean waves, *J. Geology* 55(1).

**Solvers and boundaries**
- Madsen, P. A. & Sørensen, O. R. (1992), A new form of the Boussinesq equations with improved linear dispersion characteristics, Part 2, *Coastal Engineering* 18:183–204.
- Kennedy, A. B., Chen, Q., Kirby, J. T. & Dalrymple, R. A. (2000), Boussinesq modeling of wave transformation, breaking, and runup. I: 1D, *J. Waterway, Port, Coastal, Ocean Eng.* 126(1). FUNWAVE 1.0 manual: https://repository.tudelft.nl/file/File_b5b04d7c-6f76-4a39-8c28-407661b58eea
- Shi, F. et al. (2012), FUNWAVE-TVD, *Ocean Modelling* 43–44. Breaking docs: https://fengyanshi.github.io/build/html/wavebreaking.html
- Tonelli, M. & Petti, M. (2009), Hybrid finite volume – finite difference scheme for 2DH improved Boussinesq equations, *Coastal Engineering* 56.
- Tavakkol, S. & Lynett, P. (2017), Celeris, *Computer Physics Communications* 217:117–127: https://arxiv.org/abs/1611.05984
- Lynett, P. et al. (2026), Celeris-WebGPU, *JWPCOE* 152(4): https://ascelibrary.org/doi/10.1061/JWPED5.WWENG-2370. Code (MIT): https://github.com/plynett/plynett.github.io
- Kurganov, A. & Petrova, G. (2007), well-balanced positivity-preserving central-upwind scheme, *Commun. Math. Sci.* 5(1). Audusse, E. et al. (2004), hydrostatic reconstruction, *SIAM J. Sci. Comput.* 25(6).
- Mayer, S., Garapon, A. & Sørensen, L. S. (1998), *IJNMF* 28. Jacobsen, N. G., Fuhrman, D. R. & Fredsøe, J. (2012), wave generation toolbox (relaxation zones), *IJNMF* 70.
- Wei, G., Kirby, J. T. & Sinha, A. (1999), source-function wave generation, *Coastal Engineering* 36 (the alternative that was not chosen).

**Breaking and surf breaks**
- Battjes, J. A. (1974), Surf similarity, *ICCE*: https://icce-ojs-tamu.tdl.org/icce/article/view/2921. Breaker index summary: https://www.coastalwiki.org/wiki/Breaker_index
- Miche criterion: https://en.wikipedia.org/wiki/Miche_criterion. CEM steepness limits: https://coastalengineeringmanual.tpub.com/Part-II-Chap1/Part-II-Chap10041.htm
- Walker, J. R. (1974), *Recreational surf parameters*, Univ. Hawaii. Hutt, J. A., Black, K. P. & Mead, S. T. (2001), Classification of surf breaks in relation to surfing skill, *J. Coastal Research* SI 29. Review: https://escholarship.org/content/qt6h72j1fz/qt6h72j1fz.pdf
- Thürey, N. et al. (2007), Real-time breaking waves for shallow water simulations: https://matthias-research.github.io/pages/publications/breakingWaves.pdf
- Callaghan, A. H., Deane, G. B. & Stokes, M. D. (2024), whitecap foam evolution: https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2023JC020193

**Optics and rendering**
- Pope, R. M. & Fry, E. S. (1997), *Applied Optics* 36(33): https://omlc.org/spectra/water/data/pope97.txt. Smith, R. C. & Baker, K. S. (1981), *Applied Optics* 20(2): https://omlc.org/spectra/water/data/smith81.txt
- Finch, M. (2004), Effective water simulation from physical models, *GPU Gems* ch. 1 (Gerstner waves): https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
- Wallace, E., *WebGL Water* (caustics from surface normals): https://madebyevan.com/webgl-water/
- Jeschke, S. et al. (2018), Water Surface Wavelets. Yuksel, C. et al. (2007), Wave Particles. Schreck, C. et al. (2019), Fundamental Solutions for Water Wave Animation. These are linear, non-breaking alternatives, considered only for open-ocean detail.
