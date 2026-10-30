# Spray sheet (spray-sheet, 2026-10-30)

The owner, on #170's spray: "That spray is a bit too simple; is there a way to be more realistic?" Of the four upgrades
offered (a sheet off the rail, many fine streaked drops, mist and backlight, drops landing), the owner chose **the water
sheet off the rail**.

This work was done on the M1 Air (8 GB), on branch `claude/spray-sheet` from main at 79e604fb. It used the in-page strip
tool on the Wave Pool and headless benches. No SurfZoneRunner rider sessions were run in tests.

## In short

- **A curtain of water now peels off the rail** wherever #170's jet throws, and tears into the existing drops at its
  break-up line.
  - It is thin and mostly clear. It shows the sky's and sun's reflection, streaked along its flight, with rims along its
    free ends. Past about half its flight it fingers into ligaments, then tears raggedly.
  - The water it carries is unchanged. All of it becomes the drops #170 throws: about 22 % shed on the way, the rest
    thrown from the tear.
  - It is drawn in both looks: Rich lights it as the Rich lip (sky, sun, glitter), and Classic uses a simple shader with
    the same blending. Other players' boards throw it too, from their poses.
- **The physics** follows the water-physics advisor's ruling and its follow-up of the same day (see Model):
  - **Thickness:** the water off the rail over its speed across it.
  - **Tear time:** set by how fast the air's flapping grows on the sheet (Squire). It tears after 2.5 e-folds.
  - **Shape:** drawn from the rows the hull actually launched, so in a turn it trails along the arc.
- **Measured** (Wave Pool, the strip tool):

  | Case | Sheet at the rail | Speed through the air | Tears after | Curtain, rail to tear |
  | --- | --- | --- | --- | --- |
  | Straight trim | the flat blister only | 3.6–4.5 m/s | none (blister) | none |
  | Bottom turn | 30–35 mm, 48–55 kg/s | 2.3–3.0 m/s | 0.3 s (the clamp) | 1.3–2.2 m, trailing |
  | Compressed turn | 17–50 mm, 23–100 kg/s | 4.3–4.6 m/s | 0.12–0.14 s | 0.6–0.9 m |

  - Computed, not run: at the Canyon's speeds (#170: sheets launched at 10–12.5 m/s), the sheet tears in 6–11 ms. It
    reaches under 0.15 m and fades out: drops at once.
  - The advisor calls that physical for fast sheets, but it is the main thing for the owner to judge (Open, item 1).
- **Cost on the M1:**
  - **Worker:** about 1.5 µs a step.
  - **Page:** about 24 µs a frame for the player's two sides, plus about 0.6 µs per other player.
  - **GPU:** no measurable difference at 720p in either look.
  - Because it costs nothing measurable, it is not scaled by the Particles setting. It shows and hides with the spray.
- **A/B:** `?spraySheet=off` restores #170: no curtain, drops off the rail at once. Online rooms use the default.

## The model

`src/physics/boardSpray.ts`, per side per step, from #170's sheet: its rail stretch, water ṁ, launch velocity and the
hull's velocity where it leaves.

- **Root.**
  - The rail stretch runs from the aftmost exit to the foremost. #170 centred it on the water's mean, which a heavy tail
    and a light nose pushed past the tail; this was fixed here and also moves where #170's drops leave.
  - A lone station spans its own length.
- **Thickness at the rail:** h0 = ṁ / (ρ · L · |(U − U_hull) · n̂|).
  - It is a line source, so it does not thin as 1/r. n̂ is normal to the rail, in the hull's frame.
  - It comes to 4–8 cm when the low rail is buried 0.2–0.25 m: 2D+t gives D·tanβ/8, about 2–3 cm, and κ and cos β
    bring it to 3–5.5 cm.
  - The advisor: the sheet's mass has never been measured at these rolls, which are past TN 4187's 15°. This is the
    owner's call on volume, from the strips.
- **The tear:** t_b = N_t / n, measured from the rail.
  - N_t = 2.5 (provisional; plausible range 2–4).
  - n is Squire's growth rate of the sinuous waves, through the air (wind included): ρ_a U² / √(2σρh) for thin sheets
    (ρ_a U² h / 2σ under 27/16), and 0.385 ρ_a^1.5 U³ / (σ √ρ), about 0.22 U³ s⁻¹, for thick ones.
  - It is clamped at 0.3 s, which binds only below about 3.4 m/s through the air. A sheet that slow would land or fall
    before it tears.
- **Dai's wall-jet onset is not in series** (the advisor's follow-up).
  - The first recipe added Dai, Hsiang & Faeth's turbulent onset before the flapping. That put every turn at the clamp.
  - Spray-root water is near-potential: the bottom's boundary layer is 2.5–6 mm after 0.1–0.3 m of run, against
    cm-thick sheets. So it leaves the rail smooth.
  - The onset is kept only as when the sheet sheds its first drops, capped at the tear. For these thick sheets it falls
    at the tear.
- **No curtain:**
  - where the flat blister throws (the jet's share under half);
  - under 1 mm;
  - where it tears within 10 ms;
  - on the page, where it reaches under 0.08 m (fading in to 0.15 m).
  - Fast snaps throw drops at once, which is physical.
- **Where it tears.**
  - The worker keeps a short history of the rows each side launched (`SheetHistory`). The tear is the row launched t_b
    ago, flown on: root + v·t_b − ½ g t_b².
  - So in a turn, the drops leave from where the water went, not from a rigid copy of the hull's present state.
- **The drops** (`src/wave/SprayCloud.ts`). The same kilograms and particles per kilogram as #170:
  - 22 % shed between the onset and the tear, along the curtain's chord plus gravity's bulge, a little finer and mistier;
  - the rest leave the tear line ±15 % raggedly, at the tear's velocity. They are bigger there and fall at 9 m/s off
    sheets slower than 12 m/s (the advisor).
  - Untorn sheets take exactly #170's path, on the same random order.
- **Drawn** (`src/scene/SpraySheetMesh.ts`).
  - Each curtain is a 24 × 10 grid from the page's own history of the snapshot's rows.
  - Each vertex is placed by root_then(s) + v_then·τ − ½ g τ², moved with the drawn board.
  - Each row carries a thickness, thinning as the row fans out wider than its root. The look does not use it: at these
    thicknesses, absorption is under 0.5 %.
  - Normals come from the grid. There are up to 8 curtains, in one draw call.

### The look

- **Rich:** the Rich lip's chunks (its sky reflection, sun, glitter and optics), on a MeshPhysicalMaterial.
  - Roughness is 0.18, because the sheet is rough and streaked, never mirror-glassy.
  - It uses glass's blending (One, OneMinusSrcAlpha). What it reflects is added over what it lets through.
  - Its cover is the water's Fresnel at the view's angle, with a readability floor of 0.15.
  - The sheen past the water's own Fresnel (the floor, streaks and rims) adds more of the sky it reflects. So the floor
    brightens what is behind, as wet glass does, rather than greying it.
  - It has no transmission pass and its own program, so the water's shader and its texture units are untouched.
- **Classic: drawn**, with a small shader and the same blending.
  - Its colour is the sky's sheen by Fresnel (with the floor), a trace of the water's colour with the sun through it,
    and the whitening tear.
  - It is drawn because the drops now leave from the tear. Without the curtain, Classic's drops would start 0.1–1 m off
    the rail with nothing joining them.
- **Both looks:**
  - Clear and rough to 0.55 of the flight. Then fingers 10πσ/(ρ_a U²) apart (8–60 a metre), each a little longer or
    shorter, tearing raggedly at the break-up line.
  - Streamwise streaks, 3 to a finger.
  - Rims just inside the frayed sides, thickening as it flies (Taylor–Culick, about 1 cm by the tear).
  - Whitening of up to 0.3 at the tear, where ligaments, rims and the first drops crowd.

## Measured

### Strips

Six strips in `strips/`, all from the Wave Pool and stepped in the page.
- **Rows:** the chase camera (6 m behind, 2.2 m up), the side camera (7 m off), and a close-up 2.2 m off the curtain,
  square to it.
- **Columns:** 0.6, 0.9, 1.2 and 1.5 s after the start. The turns steer, or steer and compress, from 0.5 s.
- **Rich, before and after:** `trim-sheet-rich.jpg` / `trim-drops-only-rich.jpg`, `turn-sheet-rich.jpg` /
  `turn-drops-only-rich.jpg`, `compress-sheet-rich.jpg` / `compress-drops-only-rich.jpg`.
  - "drops only" is `?spraySheet=off`, i.e. #170.
- **Classic:** `turn-sheet-classic.jpg`, `compress-sheet-classic.jpg`.

What they show:
- **The trim:** unchanged. The flat blister throws no curtain.
- **The turn and the compressed turn:** a glassy, streaked sheet runs back from the tail, low over the water. The drops
  begin where it tears, 0.6–0.9 m out in the compressed turns.
  - At 0.9 s, the compressed turn's close-up is the clearest frame.
  - In the slow turn (2.3–3 m/s through the air), the curtain trails 1.3–2.2 m.
- **The sheet is subtle against the Wave Pool's bright, shallow water,** as about 96 % transmission face-on makes it. It
  reads best edge-on and from the chase camera.

### CPU

Measured with `curtain-bench.ts` and #170's `spray-bench.ts`, on an idle M1:
- **Worker:**
  - two sheets' history and tear take 1.05 µs a step;
  - `hullSpraySheets`, now with the clock, takes 3.6 µs a call (#170: 3.2).
- **Page:** `SpraySheetMesh.update` with two curtains takes 24 µs a frame.
  - This is after looking each row up once rather than per point; it was 174 µs before.
- **The spray's step at High, on the test sea's busy whitewater,** with a compressed turn's sheet: 0.2787 ms thrown at
  once (#170), 0.2835 ms torn from its curtain (+0.005 ms).
- **Other players:** `RemoteSpray.add` with the history and tear takes 5.1 µs per player per frame (#170: 4.5).

### GPU

The strip tool's A/B at the compressed turn's busiest frame, at 720p from the chase camera. It alternates three arms
frame by frame for 60 cycles: drawn, curtains hidden, and all spray hidden.
- **Rich:**
  - frames are 25.8–27.3 ms;
  - the curtain's cost (median of the per-cycle differences) is between −0.07 and −0.04 ms, i.e. not measurable;
  - the whole spray layer costs 0.04–0.06 ms.
- **Classic:**
  - frames are 10.0 ms;
  - the curtain costs −0.001 ms.

### Tests

- **tsc:** clean.
- **Main suite** (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 2950 passed, 18 expected fail, 36 skipped.
  - One test failed in that run: `WorkerSurfZone.test.ts`'s transfer list lacked the new sheets buffer. With the buffer
    added, it passes (23 of 23).
- **SZS filter** (`npx vitest run src/wave/SurfZoneSimulation.test.ts -t
  "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`): 11 passed (93 skipped by the filter), 10 min.
- **New:**
  - `boardSpray.test.ts`:
    - Squire's two regimes;
    - the curtain's thickness and its tear after 2.5 e-folds;
    - the first drops never after the tear;
    - the clamp when slow, drops at once when fast;
    - no curtain for the blister, under 1 mm, or in still air;
    - the root on the board, from its aftmost exit to its foremost.
  - `SprayCloud.test.ts`: the drops leave from where the curtain tears (some shed on the way); the same kilograms.
  - `SpraySheetMesh.test.ts`:
    - the curtain's points from the history;
    - fingers per metre;
    - drawn with the board's offset;
    - nothing drawn for a short tear.
  - `remoteSpray.test.ts`: other players' sheets are marked with their player and side, and torn where their water
    went.
  - `PhysicalMode.test.ts`: `?spraySheet=off`.

## Open (the owner's calls)

1. **N_t, from footage.** At 2.5, the sheets tear:
   - in 0.12–0.14 s in the pool's compressed turns;
   - at the 0.3 s clamp in slow turns;
   - in 6–11 ms at the Canyon's 10–12.5 m/s launches, so drops come at once there.

   Smooth sheets would take 12–13 e-folds. Raising N_t to 3–4 lengthens every curtain by the same factor (it is
   `CURTAIN_CLOCK.foldings`).
2. **The spray's volume.** The 4–8 cm sheets come from 2D+t with a deeply buried rail. That mass is unmeasured at
   35–45° of roll.
3. **The blister wing.** The flat blister is physically a sheet too: a narrow, slow, clear wing. It is not drawn.
4. **Aeration.** The sheet is clear. In whitewater its root's water is aerated, and it should turn milky from the root.
   This is not built (AerationField's void at the root).
5. **The readability floor** (0.15) and the tear's whitening (0.3) are readability choices, not physics.

## Shot list for the owner

Ride with Rich first, then Classic, and the same moves with `?spraySheet=off` to compare.

1. **Wave Pool, a bottom turn at speed, chase camera.** Does the outside rail throw a glassy sheet that tears into the
   drops? Or does it read as plastic, or not at all?
2. **Wave Pool, a compressed bottom turn.** This is the thickest sheet. Look at it from the side too (the camera's side
   view).
3. **A turn that slows to a crawl.** The curtain trails up to about 2 m behind. Say if that reads too long.
4. **A straight trim.** There is no curtain, only the blister's drops. Say if you want the blister wing (Open, item 3).
5. **The Canyon's Medium or Big: a hard bottom turn and a snap at speed.** Per the model, the fast sheets tear almost at
   once. Say if the rail should hold a sheet longer there (Open, item 1).
6. **Online, with a second player:** their turns throw the curtain too, from their pose.
7. **For N_t:** if you can, a side view at water level of a slow turn, a carve, a compressed turn, a snap and a trim.
   Footage to compare against is the best calibration.

## Tools

- `?spraySheet=off`: #170's spray, with no curtain. It is local only; online rooms use the default.
- **The strip tool.** Its new parameters:
  - `&close=1`: the close-up row.
  - `&only=curtains`: re-renders each tile with the drops hidden.
  - `&look=classic|rich`.
  - `&spraySheet=off`: files named `-drops`.
  - The frame log adds each sheet's root, thickness, tear time, speeds, and where the curtain is drawn.
  - The GPU A/B times the curtains alone and the whole spray layer.
  - To run it, open `?inpage&boardSprayStrip&cases=trim,turn,compress&close=1&look=rich` with the receiver on 5199.
- **`curtain-bench.ts`:** the worker's and the page's cost, and the spray's step at once against torn.

## Sources

From the water-physics advisor (consult log, 2026-10-30):
- Squire 1953 (the sinuous growth rate).
- Kooij et al. 2018, PRX 8, 031019.
- Gaillard, Sijs & Bonn 2021, arXiv 2108.11163: λ = 10πσ/(ρ_a U²), ligaments 0.48 √(λh).
- Villermaux & Clanet 2002, JFM 462.
- Dai, Hsiang & Faeth 1997, 21st Symposium on Naval Hydrodynamics (its onset; not in series, per the follow-up).
- arXiv 2510.19198, a flat-fan DNS review: Fraser's modes; N = 12, after Clark & Dombrowski.
- Pope & Fry 1997, via `docs/research/water-physics/graphics.md`: transmission.
- `docs/research/water-physics/spray-and-mist.md`: optical depth past the tear.
