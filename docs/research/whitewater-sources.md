# Breaking whitewater · sources and ranges (G9 Part B)

The values Part B's whitewater physics uses, with their sources, measured ranges and conditions. **Sourced** means a measured range supports the value; **provisional** means no source gives it directly, and it waits for one (the user may add theirs). The whitewater report (`npm run report:whitewater`) checks the outcomes against these ranges.

| Quantity | Symbol | Value | Range and conditions | Status |
| --- | --- | --- | --- | --- |
| Share of a breaker's dissipated energy spent entraining air (work against buoyancy) | β | 0.1 | 4–9 %, up to 14 %, in laboratory breakers on a slope (Blenkinsopp & Chaplin 2007); 30–50 % in deep-water breakers (Lamarre & Melville 1991) | Sourced (the surf-zone measurement) |
| Plume depth under a plunging break, per breaker height | κ_p | 0.8 | Plunging breakers trap large cavities and drive dense plumes deeper than spilling ones (Rojas & Loewen 2010; Kiger & Duncan 2012) | Provisional (no direct depth ratio read) |
| Plume depth under a spilling bore, per bore height | κ_s | 0.3 | As above: spilling rollers entrain nearer the surface | Provisional |
| Bubble rise speed | w_b | 0.25 m/s | 0.2–0.3 m/s for bubbles of radius above about 0.5 mm, which carry most of the void fraction (Deane & Stokes 2002; Clift, Grace & Weber 1978) | Sourced |
| Peak depth-averaged void fraction under a breaker | α_max | 0.2 | Maximum void fraction about 20 % under surf-zone plunging breakers in the laboratory; spilling lower (Blenkinsopp & Chaplin 2007; surf-zone void-fraction studies) | Sourced (order of magnitude) |
| Splash-up share of the landing jet's volume | σ | 0.3 | The jet's impact drives a splash-up and secondary jets (Peregrine 1983; Kiger & Duncan 2012); no volume share read | Provisional |
| Splash-up speed over the jet's impact speed: vertical, horizontal | ζ_v, ζ_h | 0.6, 0.8 | The splash-up's tip moves at up to 2.65 times the phase speed in deep-water plunging breakers, and its height is comparable to the original wave's (Peregrine 1983); the jet lands at 1.2–1.6 times the crest speed (P7) | Provisional (bounded by these) |
| Time for a trapped void to collapse | t_c | √(2W/g) | The void's own height W in free fall; cavities collapse and fragment into bubble clouds soon after impact (Kiger & Duncan 2012) | Provisional |
| Share of trapped air leaving as spit when the tube has a mouth | ε | 0.5 | The collapsing tube works as bellows: air and spray are funnelled out of the open end for two or three seconds, strongest where a section throws ahead faster than its air can escape (surfing accounts: Encyclopedia of Surfing, "spit") | Provisional (mechanism sourced) |
| Spit speed | v_spit | the collapsing air's volume per second over the mouth's area | Mass conservation: no measurement needed | Sourced (physics) |
| Fastest spit | v_max | √(ρ_w/ρ_a)·√(gW/2), about 50 m/s for a 0.6 m void | The roof falls on the air at about √(gW/2), so the air's pressure rises no higher than the roof's dynamic pressure; air the mouth cannot pass that fast bursts up through the lip | Provisional (a mechanism, not a measurement) |
| Rendered spray and mist per m³ of escaping air | s_a | 40 | A render density, as G6's spray per joule | Provisional (render) |
| Breaking roller cross-section, per H² | κ_r | 0.9 | The roller is a volume of water moving with the wave, its area proportional to H² (Svendsen 1984; 0.9 H² is the value commonly carried from it) | Sourced |
| **The lip's veil** (C2 step 5g, `?lipVeil=on`; `LIP_VEIL` and `VEIL_AIR` in `src/wave/SprayCloud.ts`) | | | | |
| Droplet count shares and mean directions of the two post-impact regions | — | I-A **32 %** at **81°** from horizontal, I-B **46 %** at **56°**, both leaning downstream | Every droplet d ≥ 100 µm crossing a plane over the crest of three laboratory plungers, λ₀ = 1.18 m, H ≈ 0.09 m, still air (Erinin et al. 2023). Their region II, the foam wake's bursting bubbles (15–28 %), travels "no more than a few centimetres" vertically and is `boreSpray`, not the veil | Sourced |
| Droplet speed over the jet's impact speed | — | mean **0.32–0.44**, tail to **2×** | As above; Mostert et al. 2022 agree in DNS (most at one phase speed, fastest three or four) and fit a skewed law. `SPLASH_UP.vertical` = 0.6 ± 20 % is about 1.5× the mean with no tail | Sourced |
| Droplet size spectrum | — | N ∝ d^−1.9…−2.4 below d_i, d^−5.4…−6.1 above; d_i = **0.82–1.48 mm** | As above, weak to strong breakers | Sourced |
| …integrated to **optical area**, which is what a drawn sprite stands for | — | **8 %** under 0.2 mm, **57 %** in 0.2–1 mm, **35 %** over 1 mm | Reasoned from the spectrum above at α −2.1, β −5.8, d_i 1.14 mm over 0.1–3 mm. The middle band is the veil and had no class before C2 step 5g | Reasoned on a sourced spectrum |
| Delay from the jet's impact to the first droplets | — | **0.19–0.52 s** on a 2 m wave | 110.8 ms after impact, generated 25–70 ms earlier (Erinin et al. 2023), Froude-scaled. Also the guard that keeps the veil behind the curl's tip | Sourced (scaled) |
| **The air over a breaking crest that carries the veil** | w_air | 0.9 √(gH) at the water, to nothing 1.6 × the wave height above it | **Nobody has measured this field.** Thrown drops cannot reach the veil's measured top, and Erinin's own still-air back-tracking put 40 % of their droplets on water ahead of the breaker, which they call nonphysical and an "indication of the need for including the temporally evolving breaker-generated air flow field". The value here is fitted to the owner's Abu Dhabi photograph (`docs/research/tube-spray-reference-2026-11-14/`), measured in `docs/research/wave-strategy-alternatives/c2-step5g.md` §2 | **Provisional — calibrated, and the gap is real.** Our Basilisk runs are two-phase and already carry the gas velocity; a rerun saving it would make the number ours |

## Changes from the plan's defaults

- β 0.3 → 0.1: the surf-zone measurement (Blenkinsopp & Chaplin 2007) rather than the deep-water one; the surf zone is what the game simulates.
- w_b 0.22 → 0.25 m/s: the middle of the measured 0.2–0.3 m/s.
- α_p and α_s become one measured peak, α_max = 0.2; plunging and spilling differ through their energy and penetration, not through separate caps.

## References

- Blenkinsopp, C. E. & Chaplin, J. R. (2007). Void fraction measurements in breaking waves. *Proc. R. Soc. A* 463, 3151–3170.
- Clift, R., Grace, J. R. & Weber, M. E. (1978). *Bubbles, Drops, and Particles.* Academic Press.
- Erinin, M. A., Liu, C., Wang, S. D., Liu, X. & Duncan, J. H. (2023). Plunging breakers. Part 2. Droplet generation. *J. Fluid Mech.* 967, A36. (And Part 1, 967 A35.)
- Mostert, W., Popinet, S. & Deike, L. (2022). High-resolution direct simulation of deep water breaking waves: transition to turbulence, bubbles and droplets production. *J. Fluid Mech.* 942, A27.
- Deane, G. B. & Stokes, M. D. (2002). Scale dependence of bubble creation mechanisms in breaking waves. *Nature* 418, 839–844.
- Kiger, K. T. & Duncan, J. H. (2012). Air-entrainment mechanisms in plunging jets and breaking waves. *Annu. Rev. Fluid Mech.* 44, 563–596.
- Lamarre, E. & Melville, W. K. (1991). Air entrainment and dissipation in breaking waves. *Nature* 351, 469–472.
- Peregrine, D. H. (1983). Breaking waves on beaches. *Annu. Rev. Fluid Mech.* 15, 149–178.
- Rojas, G. & Loewen, M. R. (2010). Void fraction measurements beneath plunging and spilling breaking waves. *J. Geophys. Res.* 115, C08001.
- Svendsen, I. A. (1984). Wave heights and set-up in a surf zone. *Coastal Engineering* 8, 303–329.
- Encyclopedia of Surfing, "spit, spitter" (eos.surf), and "Why do barreling waves spit?" (surfertoday.com).
