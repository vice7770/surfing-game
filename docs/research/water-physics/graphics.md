# Graphics: lip, tube interior and spray

Once the geometry is right, five shading changes decide whether a barrel reads as water: light through the lip, a dark throat framing a bright mouth, a lip that tears where it breaks, spray that stays light, and a camera that doesn't drown in whitewater. All five are shader or per-vertex work.

## What a real barrel shows

- **The glow needs a long light path.** Through a lip 0.1–0.3 m thick, pure water passes 90–97 % of red light and nearly all blue ([Pope & Fry 1997](https://omlc.org/spectra/water/data/pope97.txt)). A lip shaded by its thickness alone therefore looks like pale glass. The emerald in photos comes from bubbles and particles stretching the path to metres. With a typical amount of dissolved matter in coastal water (an assumed value, computed), a 3 m path peaks near 500–550 nm, green-cyan.
- **It is brightest at the thin tip and darkest at the throat,** because transmittance falls exponentially with thickness.
- **Dark inside, bright mouth.** The lip blocks the sky, so the inner face sees only the opening and green light through the lip. At the grazing angles seen from inside (75–85°), the smooth face reflects 24–64 % of light, so it should mirror the mouth, not open sky.
- **The lip tears as it breaks.** *Surf's Up* switched on "lip trains" partway through the break: a roughening shaded brighter as if aerating, which also emitted the lip spray ([course notes](https://robbredow.com/2007/08/surfs-up-course-at-siggraph/Surfs-Up-the-making-of-an-animated-documentary.pdf)).

## What to change, ranked

1. **Lip glow from its thickness, lengthened.** Let each colour channel pass exp(−σ·k·d), with k ≈ 5–20 standing in for scattering, plus a glow toward the sun only when the sun is behind the lip. This is the family of [Barré-Brisebois 2011](https://colinbarrebrisebois.com/2011/03/07/gdc-2011-approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look/) (0.03 ms full-screen on a 2011 PC) and [Crest's shader](https://raw.githubusercontent.com/crest-ocean/crest/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl).
2. **Break-up instead of teeth.**
   - Add lip trains where the lip starts to collapse, and a fraying white leading edge.
   - Launch whitewater from one continuous crash curve, strongest at first impact and then decaying.
   - Add a low "skirt" of foam over the seam where lip meets water. All three are from *Surf's Up*.
3. **A dark throat and a mirrored mouth.** Compute how much sky each vertex under the lip can see, and dim sky light and sky reflections by it. *Surf's Up* rendered a reflection-occlusion pass for this; the per-vertex version is inferred. Add green light through the lip onto the inner face.
4. **Spray that stays light.**
   - Clear when young, white when old, stretched along its motion.
   - Bright only when backlit, and faded where it meets the water.
   - Opacity capped near the impact. *Surf's Up* found spray too dense looks pasted on, and too sparse looks fake.
5. **A tube camera that survives whitewater.** True Surf's developer named whitewater covering the screen, with the camera in the barrel, as their main performance problem ([Meta blog](https://www.meta.com/blog/true-surf-launch/)). Cap overdraw and soften particles near the camera.

## Cost on the M4 Pro and the M1 Air

- **Changes 1–4:** per-pixel or per-vertex work with no extra render passes. They should fit both machines.
- **Change 5 and all spray:** the risk is blended spray covering the screen, and any extra full-screen pass. Both cost more on Apple's tile-based GPUs.
- **On the M1 Air:** keep the shading and cut particle count and resolution.
- **Measurements:** there are no published timings for these techniques on Apple GPUs or in WebGPU, so each one needs measuring in the game's performance survey.
