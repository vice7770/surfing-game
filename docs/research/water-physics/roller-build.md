# Roller build: a lens on the barrel's loft

The roller becomes the swept barrel's second stage. Once a slice's tube has gone, its profile blends from the library into the solver's section plus a lens, so one mesh, one seam and one contact path serve both. Nothing is built yet: it waits for the barrel's Part B, and the numbers below are what a roller report should check.

## Where it lives

- **Tracking.** Each step, every crest slice reads the solver surface along its normal.
  - Crest and trough are the nearest extremes ([Tissier et al. 2012](https://david-lannes.perso.math.cnrs.fr/wp-content/uploads/2019/01/papiercoastal.pdf)).
  - The toe is where the slope falls to 20 % of its peak ([Martins et al. 2018](https://purehost.bath.ac.uk/ws/files/170060912/Martins_et_al_JGR2018.pdf)).
  - The bore's strength is Fr₁ = √(r(r+1)/2), with r the crest depth over the trough depth.
- **Life.**
  - It is born when a plunging slice's tube has gone, or when a spilling front reaches B ≥ 0.3 and Fr₁ ≥ 1.45.
  - It grows over 5–8 breaker depths of travel ([Svendsen 1984](https://icce-ojs-tamu.tdl.org/icce/index.php/icce/article/download/3785/3468)).
  - It is shed below Fr₁ = 1.3, which is about H < 0.4 of the trough depth. That threshold is uncertain by about 0.1: a lab jump at 1.19 still broke ([Misra et al. 2008](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/b/10612/files/2020/12/Misra-et-al-2008-POF-weak-hydraulic-jump.pdf)).
  - At the shore it becomes the thin run-up layer.
- **Online.** The roller state rides in the sea handover, and it is guarded by:
  - hysteresis between 1.3 and 1.45;
  - closing gaps under 4 m along the crest;
  - a cap on how fast the lens changes;
  - thresholds that use only + − × ÷, square root, floor and integer multiply, because engines may approximate exp and hypot ([ECMA-262](https://tc39.es/ecma262/multipage/numbers-and-dates.html)).

## Its shape

- **Water in it:** 0.33–0.36 H², calibrated in the field and independent of the assumed density (Martins 2018). The foam ball's 0.9 H² should come from this instead.
- **Air:** void fraction 0.9 ζᴺ by height ζ, with a mean of 0.13–0.4 ([Shi et al. 2023b](https://staff.civil.uq.edu.au/h.chanson/reprints/Shi_et_al_ijmf_2023b.pdf)); 0.25 is provisional. The underside sits about 0.15 H below the surface at the crest.
- **Roughness:** a hashed noise that is bit-identical in JavaScript, GLSL and WGSL.
  - Its height spread is 0.13–0.4 × the trough depth, largest in the toe half.
  - Features grow from 0.5 to 3 × the trough depth, and the toe wanders at 1 and 5–10 × ([Wang, Leng & Chanson 2017](https://staff.civil.uq.edu.au/h.chanson/reprints/Wang_Leng_Chanson_eacm_2017.pdf)).
  - At surf scale it pulses at about 0.1–1 Hz, slower than lab bores.

## What the rider meets

- The lens changes only what the water sample returns:
  - the loft's top, from the same triangles that are drawn;
  - the air by height;
  - the flow: the bore's speed inside the roller, blending into the current below.
- It replaces the P11 roller push (`ROLLER_SHARE`).
- **Checks:**
  - the top \~36 % of the lens can't float a prone rider on a 30 L board;
  - the push comes out near 330·H Pa;
  - a paddler hit at H = 1.5 m is 1.4–2.8 kN, and the front's peak is no more than about 1.5× that.

## Look and cost

- **Look:**
  - a fingered toe with dark holes, up to a solid white band at the crest;
  - fresh foam 0.4–0.55, the gaps between it bubbly green-cyan;
  - its foam texture moves with the lens's own flow, and the foam field takes over behind the crest;
  - spray leaves the toe at 30–45° and the crest on the wind.
- Surf's Up's roller skirt was "artistically directed and not physically based" ([course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)), so it fails your rule; the sourced toe replaces it.
- **Cost** (measured on the M1 under load): 0.065 ms per step for the sections, and about 0.8 µs per contact query. Drawing adds work to the loft's vertex shader.

## Your decisions

1. **Classic draws the roller too.** The rider hits it, so by the one-water rule Classic must show it, as you ruled for the swept barrel. This reopens "Classic unchanged" for whitewater.
2. **Roller density** within the sourced void fraction of 0.13–0.4. It sets how much boards bog.
3. **Aerated water behind the roller:** whether it also raises the surface.
4. **Roughness** within the sourced range, judged on film. **Lens shape** (thickest at the crest, or an even band) can be settled by our own Basilisk runs.

**Risks:**

- it needs the barrel's Part B;
- the solver's bore shape shows through;
- a hard barrel contact would let boards stand on froth, so the lens must be soft (agree this with the Padang Padang session).

**Decided 2026-09-29, as recommended:** Classic draws the roller too, since the rider hits it. The void fraction is 0.25, the middle of the sourced 0.13–0.4. Aerated water behind the roller does not raise the surface: a few centimetres at most, and it would complicate the online match [inferred]. Roughness starts mid-range and is tuned on film, and the lens shape comes from the Basilisk runs.
