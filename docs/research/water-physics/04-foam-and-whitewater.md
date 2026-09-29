# Foam and whitewater: why it reads as paint

The game's whitewater drivers are sound: dissipation makes foam, the jet's impact makes spray, and the aeration field tracks the air. What reads wrong is how foam is lit and how it ages, the missing roller, and a spray budget that runs out exactly where the reef should explode. Fixed, whitewater flashes white against darker water, thins into lace and streaks over seconds, every broken wave carries a tumbling white front, and reef impacts throw tall spray.

## Why it reads as paint

- **Foam no brighter than the water.** Real foam only adds light to the water under it: its reflectance is a flat 55 % across the visible, lowered only by water's absorption in the infrared ([Koepke 1984](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)). The game instead paints foam as one opaque colour over the water, and Rich multiplies only the water by 4 (`RICH_WATER.bodyGain`). Measured on screen at midday (below), the lace is 2.1× the water in its gaps at the Beach, but only 0.92× at the Reef in Rich (1.1× in Classic): grey threads on brighter water. That is the grey foam ball too.
- **One pattern at every age.** Real foam is bright only at first: about 41 % reflectance averaged over its first second, 16 % over ten, while the patch spreads and opens into lace ([Koepke 1984](https://user.eumetsat.int/s3/eup-strapi-media/pdf_il_07_07_13_a_dfa14e9e2f.pdf)).
  - The game draws one Voronoi lace in one colour at every age, with 0.4–0.55 m holes however old the foam is. Twice each flow cycle two half-strength networks overlap: the ghosting [Neyret 2003](http://www-evasion.imag.fr/Publications/2003/Ney03/neyret161.pdf) warns about.
- **No roller.** A broken wave carries a white roller about 2.9 H long on its face ([Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)). The game draws flat water; its foam ball is a cloud of 0.5–0.8 m sprites floating above it.
- **Spray runs out and looks like dots.** The 4,096-particle pool is full on 17 % of Reef steps. Spray is 6–14 cm round sprites that live 3 s, and mist lives 4 s. Lidar over an Oahu reef measured spray plumes 25–35 m high ([Porter et al.](http://www.soest.hawaii.edu/higear/SEASpaper/UHlidar_F.pdf)).

&#91;image: Reef in Rich at midday: today the lace is 0.92 times the water, grey; in a throwaway prototype where foam adds light (fresh 0.55, lace 0.25, streaks 0.10, gain on the whole) it is 1.14 times, white\]

## What to change, ranked

| # | Change | Cost |
| --- | --- | --- |
| 1 | **Foam brighter than the water.** Draw foam as a layer that adds light to the water under it, R\_f + T\_f²·R\_w/(1 − R\_f·R\_w), not as an opaque colour. Then apply Rich's gain to the whole, or move the gain into exposure. Prototyped above in six shader lines: the grey goes, though the Reef's near-white water leaves foam little headroom. Your call: it changes the Rich look; Classic stays as is | Trivial |
| 2 | **Foam that ages.** Carry a foam age that grows with the bubble field's turbulence, and look up one baked foam-cycle texture by age, as Surf's Up did ([Kluyskens 2007](https://www.imageworks.com/sites/default/files/2023-10/Surfs-Up-beach-break.pdf)): dense, holes, cells, lace, threads, from 0.55 down to 0.1 in brightness. Bake it from floating foam on churning water ([Larkin et al. 2009](https://arxiv.org/pdf/0911.1784)), and blend the flow phases before thresholding ([Heitz & Neyret 2018](https://eheitzresearch.wordpress.com/722-2/)) | Low to medium: about 0.2–0.3 ms on the M4 Pro (estimate), and an 8–25 MB asset or a bake on load |
| 3 | **Persistence from physics.** Dense foam lasts about as long as its bubbles take to rise: a few seconds, longer for bigger breaks. Lace lasts tens of seconds. Today the Reef's foam fades fastest (3 s and 8 s against the Beach's 3 s and 20 s); it should last at least as long ([Callaghan et al. 2012](https://doi.org/10.1029/2012JC008147), [2013](https://doi.org/10.1175/JPO-D-12-0148.1)) | Trivial |
| 4 | **Green aerated water.** The Rich water reads the aeration field: brighter and greener where bubbles are, white only where surface foam is dense | Low |
| 5 | **A roller with body.** A white roller on each bore's front, about 2.9 H long, that the rider hits (your Q4). The foam ball folds into it; see Roller | Low to medium |
| 6 | **Spray that explodes.** Emit spray as the square to cube of the impact speed: a burst under 0.4 s at impact, a second pulse when the tube collapses, then seconds of fizz ([Chanson et al. 2002](https://staff.civil.uq.edu.au/h.chanson/reprints/coastal02.pdf)). GPU particles allow 100k–250k on the M4 ([Chentanez & Müller 2010](https://matthias-research.github.io/pages/publications/hfFluid.pdf)) | Medium |
| 7 | **Streaks and rip plumes.** Let converging flow pack foam into lines, stretched by the flow rather than by a fixed factor on steep faces, so rips show as dark gaps with foam plumes beyond the break | Low |

The roller's measured shape, and what it does to a board and rider: Roller.
