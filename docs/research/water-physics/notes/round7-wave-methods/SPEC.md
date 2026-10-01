# Wave-method prototypes: shared spec (throwaway, never merged)

Root: OPT=the scratch folder
Tools: node, ffmpeg, Playwright with Chromium (software rendering). No numpy in the container, so everything is JS.
Game repo read-only; stored Basilisk curl cases: public/barrels/*.bin
  (format: u32 magic, u32 headerLen, JSON header {id, slope, nonlinearity, breakerHeight, tauStep, tauStart, touchdown,...} padded to 4,
   then float32 frames: nFrames × 128 points × (along, above), lengths in units of h0 (foot depth, use h0 = 7 m);
   landmarks: back 0, crest 32, lip 64, throat 88, toe 112, front 127; tau in units of sqrt(h0/g)).

## The scene (identical for every option)
- Units metres, seconds. y up, still water y = 0. Swell travels toward +z (shoreward). The break peels toward +x.
- Window: x ∈ [0, 60], z ∈ [-40, 15]. Bed: depth 7 m at z = -40 rising at 1:19 toward +z (depth(z) = 7 - (z+40)/19, clamp ≥ 0.3).
- One plunging wave, breaker height ~3.5 m (Padang Padang Big), peeling along +x at ~11 m/s (lip throws first at x≈5, reaches x≈55).
- Duration 8 s, 24 fps → 192 frames. Frame k is at t = k/24.

## Mesh hand-off (what each option writes)
OPT/<option>/frames/f0000.bin … f0191.bin, little-endian:
  u32 nVerts, u32 nTris,
  float32 pos[3*nVerts],
  float32 thick[nVerts]   // water thickness along the surface normal at that vertex, m (lip ≈ 0.2–1; open water = large, e.g. 50); used for translucent colour
  float32 foam[nVerts]    // 0..1 whitewater cover
  u32 idx[3*nTris]
Optional spray: OPT/<option>/frames/p0000.bin: u32 n, float32 xyz[3n] (droplets, drawn as small white points).
One closed-or-open triangle surface for ALL water in the window is preferred (it may overlap/self-intersect; the renderer z-buffers).

## Rendering (done by OPT/render/render.js, same for all)
node OPT/render/render.js <option>  → OPT/<option>/<option>-channel.mp4 and <option>-shoulder.mp4, plus a 2×2 contact sheet jpg.
Cameras: "channel" = elevated 3/4 view from the channel side looking at the peeling curl (like a drone shot); "shoulder" = low, side-on down the line from the unbroken shoulder, eye ~2 m above water, looking back into the tube.
Shading identical for all: sky-gradient background, Fresnel sky reflection, body colour from `thick` (thin = bright cyan-green transmitted light, thick = deep teal; Beer–Lambert with absorption ≈ (0.45, 0.07, 0.03)/m for R,G,B), sun specular, foam = white matte, spray = white dots. Simple, fast, deterministic.

## Every option reports (in OPT/<option>/REPORT.md, ≤ 300 words)
- How it works in 3–5 plain sentences; what is physically computed vs. stored vs. hand-shaped.
- Real-time cost estimate in a browser (what runs per frame, measured ms of its own generator per frame in node, and a guess for WebGPU on an M4 Pro), marked provisional.
- What looks right, what looks wrong, honestly.
- Checkpoint progress in OPT/<option>/NOTES.md as you go (the container can restart; files in the scratchpad survive).
