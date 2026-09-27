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

## Changes from the plan's defaults

- β 0.3 → 0.1: the surf-zone measurement (Blenkinsopp & Chaplin 2007) rather than the deep-water one; the surf zone is what the game simulates.
- w_b 0.22 → 0.25 m/s: the middle of the measured 0.2–0.3 m/s.
- α_p and α_s become one measured peak, α_max = 0.2; plunging and spilling differ through their energy and penetration, not through separate caps.

## References

- Blenkinsopp, C. E. & Chaplin, J. R. (2007). Void fraction measurements in breaking waves. *Proc. R. Soc. A* 463, 3151–3170.
- Clift, R., Grace, J. R. & Weber, M. E. (1978). *Bubbles, Drops, and Particles.* Academic Press.
- Deane, G. B. & Stokes, M. D. (2002). Scale dependence of bubble creation mechanisms in breaking waves. *Nature* 418, 839–844.
- Kiger, K. T. & Duncan, J. H. (2012). Air-entrainment mechanisms in plunging jets and breaking waves. *Annu. Rev. Fluid Mech.* 44, 563–596.
- Lamarre, E. & Melville, W. K. (1991). Air entrainment and dissipation in breaking waves. *Nature* 351, 469–472.
- Peregrine, D. H. (1983). Breaking waves on beaches. *Annu. Rev. Fluid Mech.* 15, 149–178.
- Rojas, G. & Loewen, M. R. (2010). Void fraction measurements beneath plunging and spilling breaking waves. *J. Geophys. Res.* 115, C08001.
- Svendsen, I. A. (1984). Wave heights and set-up in a surf zone. *Coastal Engineering* 8, 303–329.
- Encyclopedia of Surfing, "spit, spitter" (eos.surf), and "Why do barreling waves spit?" (surfertoday.com).
