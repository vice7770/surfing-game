# Breaking: why the face stays a slope

The solver's face angle is set by its breaking model, not by its grid. It is right for a broken bore and wrong only where the wave plunges. So leave the solver's face alone, time the lip by the crest's speed, make breaking a continuum, and let the swept profile carry the plunge.

## What the game does

- **Onset:** a cell starts breaking when its surface rises faster than 0.35 √(gh) at the Beach or 0.65 √(gh) elsewhere. The threshold eases to 0.15 √(gh) over 5 √(h/g), which are Kennedy et al.'s constants, also used by FUNWAVE ([docs](https://fengyanshi.github.io/build/html/wavebreaking.html)).
- **The face clamp:** a rise rate is a face slope times the wave's speed. So these thresholds allow about 27–33° at onset, then damp any face steeper than about 13–17° once breaking is under way. That is an inference from the constants, and it matches what I measured: the Reef face peaks near 27°, the Point near 21°.
- **The shallow-water switch:** where the surface stands above 0.8 of the still depth, the solver drops its dispersive terms, so bores stay sharp (Tonelli & Petti 2009).
- **The type switch:** at onset, each 1 m column either throws one lip (plunging) or nothing (spilling).
- **The peel meter reads angles too fast.** It turns the break point's speed V into a peel angle with sin α = √(g·h\_b)/V (`Breaking.ts`). But the skill ladder (27° pro, 29° advanced) is made of angles measured on photos (Hutt 1997), and a real breaking crest outruns √(g·h): linear theory "generally underestimates" surf-zone celerity ([Tissier et al. 2013](https://hydralab.eu/uploads/TAdocuments/213_tissier_marion.pdf)). So reported angles run about 5–7° low: a meter 24° is about 30° on a photo.

## What real breaking does

- **Onset is about speed, not slope.** The crest face goes vertical as the water at the crest reaches 0.85–0.88 of the crest's speed, and it overturns at 1.0 ([Derakhti et al. 2020](https://arxiv.org/pdf/1911.06896)). In the game's own equations, a crest-speed trigger gave the best onset position; its threshold was lowered to about 0.75 because these equations under-shoal ([Bacigaluppi et al. 2019](https://arxiv.org/pdf/1902.03021)).
- **Spilling and plunging are one continuum.** They run from a small jet at the crest to an overturn of much of the wave ([New et al. 1985](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/computations-of-overturning-waves/1C114232AF35590F75E52775F7B41044)).
- **Breaking starts at a point and spreads** along the crest; a wave "does not break as a whole at once" ([Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)).
- **Bores keep a white front, then stop.** The roller face eases from 25° to 16–22° over a roller about 2.9 H long ([Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)). A bore stops breaking when its Froude number falls below about 1.3 ([Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)).

## What to change, and what you would see

1. **Leave the solver's face alone.** It matches measured bores. Pushed steeper, hybrid breaking models oscillate at the switch and become sensitive to the mesh ([Kazolea & Ricchiuto 2018](https://www.math.u-bordeaux.fr/~mricchiu/kr18.pdf)).
2. **Add a crest-speed trigger.** For each crest segment, take the surface velocity from the solver's vertical velocity profile and the crest's speed from tracking it:
   - past about 0.75–0.85, the swept profile starts standing the face up;
   - at 1.0, it throws. Kennedy's rule keeps controlling the dissipation only.
3. **Make breaking a continuum.** The profile library runs from a small spilling curl to a heavy plunge. Spilling waves then get a crest that tumbles and a roller, not just foam.
4. **Add a stop rule.** Where the bore's Froude number falls below about 1.3, thin the roller and let the wave reform.
5. **Narrow the swell's spread at shallow tank edges, for realism rather than peel.** The game seeds its 5–8 m tank edges with s = 12–24. By refraction, real swell there is narrower than s = 100 ([Goda, Takayama & Suzuki 1978](https://icce-ojs-tamu.tdl.org/icce/article/download/3297/2965/14059)). Tested at the Point, narrower spread did not reduce close-outs (88 % at s = 12, 96 % at s = 150): peel needs a shaped bed. On a shaped reef it should let the break follow the reef edge; Padang Padang is testing s = 150.
6. **Measure peel with the real crest speed.** Divide V into the solver's own measured crest speed at the breaking columns, the same tracking that gives the crest-speed trigger. Keep the skill thresholds as they are. Every spot's rating moves toward easier, so it is its own change (your call).

**What you would see:**

- The wave visibly stands up before it throws.
- Breaking starts at one point and runs down the line.
- Beach waves tumble at the crest.
- Bores keep a white front that fades where they stop breaking.

**Cost:** a few operations per crest segment (my estimate). The trigger reads the solver and does not change it.
