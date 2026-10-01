# A: the current hybrid (height field + lofted Basilisk profiles)

**How it works.** The water is one height field on a 0.5 m grid: a single sech² swell crest growing by Green's law and steepening toward the throw (analytic stand-in, not the game's solver). The crest is oblique so it crosses the throw line (z = -12.5 m, depth 4.5 m ≈ H_b/0.78) at t_throw(x) = 2 + (x-5)/11 s. Each 0.5 m slice reads one straight, real-time clock τ = t - t_throw(x), looks up the stored Navier-Stokes profile (pad19-a45-l12, ×7 m) at that τ, pins its crest landmark onto the height-field crest and replaces the height field there; ends blend over 6 samples and 2.5 m, and after touchdown the slice fades out over 0.3 s, leaving foam and spray. **Computed:** the shoaling crest track (analytic). **Stored:** the whole curl shape and timing. **Hand-shaped:** throw line, peel rate, blends, foam/spray, post-break bore.

**Cost (provisional).** Per frame: 121 columns × 238 verts (57k tris), 121 profile lookups, lip ray-casts. Measured 4.6–6.4 ms/frame in node for the generator alone. Browser: loft ~2–4 ms in JS; WebGPU on M4 Pro guess <1 ms loft plus ~1–2 ms for the real solver.

**Looks right:** the curl itself: a real plunging lip with a thin backlit tip, a hollow throat, peeling cleanly at 11 m/s; no seams between slices with one smooth clock.

**Looks wrong:** the open curl is short (only ~1.2 s of library, ≈13 m of tube) and appears abruptly at the shoulder (the 2.5 m end blend reads as a hard start). The profile's vertical shape is unrelated to the height field's, so the 6-sample pinned ends make a visible kink at the back. After touchdown the curl just dissolves into an opaque white bore: no roller or splash-up. Slices run along +z, oblique to the crest.
