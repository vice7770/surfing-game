# G9 · Barrel and whitewater

Agreed in a grilling session on 2026-09-26 (three rounds, Q1–Q14, every recommendation accepted). This is the requirements record; the plan follows it.

## Goal

Make the barrel read on screen, and make breaking whitewater as physical as the tube: explosive on a steep reef, gentle on a spilling beach, because of how each wave breaks rather than because of per-spot tuning.

- **Part A · the barrel look.** The lip and the tube drawn well from the physics P7 already has, in the look of the G8 Rich water (the *Surf World Series* references): a thick, glassy lip, backlit green-turquoise where the sun shines through it, sharp reflections on its outside, whitening to foam as it falls.
- **Part B · breaking whitewater.** New physics for what a plunging lip does when it lands and its tube collapses (splash-up, trapped air and spit, air entrainment, the foam ball, the bubble plume), and its look.

## Starting point

- **The lip (P7):**
  - `PlungingLip` throws each column's jet as a strip of 8 parcels over 0.25 s. Strips of neighbouring columns thrown within 1 s link into one sheet.
  - Each strip carries its tube: the overturn Pick & Feddersen (2026) fit for the bed slope and sea, the lower half of Longuet-Higgins's curve, riding with its crest and opening as the jet flies.
  - `carve(x, z, surface)` lowers the surface to the void's floor for the rider, the board, the lip's landing and the render grid. It is per 1 m column and closes the moment its strip lands (provisional).
- **What the page gets:** the snapshot carries the lip's parcels (`LIP_STRIDE` 7: position, column, index, launch time, age) and the render grid's heights already carved at 1 m nodes. No tube shapes.
- **How the lip is drawn:** `LipSheetMesh` joins the parcels into one thin surface, with its own `ShaderMaterial`: fixed colours, a Fresnel term and a glow when the sun is behind it. It ignores the photo sky, the sun's colour and the water optics, and has no Classic/Rich look.
- **The tube's inside** is the 1 m carve. The Reef's tubes run a median 1.1 m (1.8 m at the 90th percentile), so a void spans one or two nodes. G8's 0.25 m patch interpolates those nodes and adds no detail.
- **When a lip lands:**
  - its water returns to the solver with its horizontal momentum, driving the solver's splash-up and secondary bore; its vertical momentum is lost to turbulence;
  - `FoamField.addSplash` adds dense foam;
  - `SprayCloud` throws drops in proportion to its kinetic energy, each launched at a random 30–80 % of the impact speed upward, whatever the spot.
- **Breaking by spot** (tube report, Wave Lab defaults): the Reef throws 2,925 jets and 7 spilling rollers; the Beach 380 jets and 2,486 rollers; the Point 2,830 and 155; the Canyon 45 and 1,441.
- **G8 Rich water:** churn marks fresh whitewater where the foam value is above 0.55. Spray and mist are lit and fade into the water. Classic is pinned byte for byte by snapshots.

## Decisions

### Scope and order

- **One spec, two parts, both planned now.** Part A is built first (rendering only, no physics), then Part B.
- **Honesty.** Everything drawn is what the physics has. The lip is as thick as its water, and the tube as big as its overturn; resolution and shading improve, sizes never grow. If barrels read too small, that is a conditions or physics question, raised separately.
- **Rich only.** Every new drawing is in the Rich look. Classic keeps today's lip sheet, spray and foam, byte for byte (the snapshots are extended to the lip sheet). Part B's physics runs whatever the look.
- **Out of scope:**
  - the player's tube camera (P12);
  - whitewater forces on bodies (Backlog; see Part B);
  - the tank and far-field seam, the beach and coastline.

### Part A · the barrel look

- **Tube shapes reach the page.** The worker adds a small table of flying tubes to its snapshot: for each strip, its origin, travel direction, crest speed and jet's relative speed, overturn length, width and tilt, launch time and column span. The edit to `SurfZoneRunner` stays small.
- **The void cut on the GPU.** The Rich water shader cuts each flying tube per vertex in the 0.25 m patch, with the same `tubeFloorDepth` curve the physics uses (a GLSL twin, tested against it).
  - Along the peel, the tubes of neighbouring columns are interpolated between column centres, as the surface is between nodes, instead of stepping each metre. The CPU carve takes the same interpolation, so the board and the eye keep one surface.
  - The CPU's 1 m carve stays for the physics and for Classic.
- **The lip in the Rich look.**
  - The sheet is smoothed between its parcels (splines along each strip and across linked strips), so it reads as one glassy curtain.
  - It has the thickness its water gives it (volume per link over the link's area), with two faces and a rounded lip edge.
  - It is shaded like the Rich water: the photo sky's reflection at the Rich balance, the sun's colour, the G3 body colour, and light through the lip by Beer–Lambert over its own thickness (green-turquoise where thin, deep where thick). It is glossy with the Rich roughness and whitens to foam as the parcels age.
- **Judging it.** The water sheet gains tube shots at the practice Reef: beside the tube, from the shoulder looking in, and at eye level inside. A short `?record&watch` clip shows the motion. Final approval is the user's, in play.

### Part B · breaking whitewater

- **One cause, five effects.** The plunging jet's energy and the air it traps drive all of these; the Reef's explosiveness and the Beach's gentleness come out of each spot's bed slope and wave height (through Pick & Feddersen's ψ0 and the jet's impact speed), not from per-spot values.
  1. **Splash-up.** A landing lip re-throws water up and forward as a secondary jet, a sheet built with the lip's own machinery, instead of random drops. Its speed and share of the lip's water come from the literature on plunging breakers.
  2. **Trapped air, the collapse and the spit.** Each tube's air (its void's area times its column span) is squeezed out as the tube collapses.
     - The void shrinks over the time its air takes to escape, replacing P7's provisional instant close. The rider, the board and the drawing all meet that one surface.
     - The escaping air leaves through the tube's mouth at the speed mass conservation gives (the volume shrinking per second over the mouth's area), blowing spray and mist out as the spit, and bursts up through the whitewater.
  3. **Air entrainment.** How much air the plunge drives into the water sets an **aeration** field, carried by the currents like the foam and bleeding away as bubbles rise (at measured rise speeds over the plume's depth).
     - Aeration decides G8's freshness: churn shows where and while air was driven in, strongest on steep reefs and faint on spilling beaches.
     - The foam value keeps setting how much of the surface foam covers.
  4. **The foam ball.** The tumbling, aerated whitewater in the tube's back, chasing the rider, from the roller's volume and speed.
  5. **The bubble plume.** The white cloud under the surface, as deep as the plunge drives it, fading as it degasses.
- **Drawn in Rich only:**
  - the splash-up as a sheet;
  - the spit and the eruption as bursts of lit spray and mist sprites, glowing when backlit;
  - the foam ball as clusters of large lit foam sprites with the churn texture, tumbling above the surface;
  - the plume as a white density under the surface in the water shader, seen from below and through clear reef water.
- **Visual only.** Whitewater puts no forces on the rider or board yet: no lost buoyancy in aerated water, no hits from the splash-up or foam ball. The collapse is the exception: it reshapes the tube's existing carve. Forces from whitewater go to the Backlog, after the riding physics (reworked in another session) settles.

### Sources

Part B is sourced as P7 was. Each value comes from a measured range, is marked provisional where no source gives it, and is checked in a per-spot whitewater report. Candidate sources, to be read and confirmed in the plan's research task (the user may add theirs):
- Lamarre & Melville (1991, *Nature* 351): air entrained by breaking waves and the share of dissipated energy it takes.
- Blenkinsopp & Chaplin (2007, *Proc. R. Soc. A* 463): void fractions in plunging and spilling breakers.
- Kiger & Duncan (2012, *Annu. Rev. Fluid Mech.* 44): air-entrainment mechanisms in plunging jets and breaking waves.
- Deane & Stokes (2002, *Nature* 418): bubble sizes in breaking waves.
- Peregrine (1983, *Annu. Rev. Fluid Mech.* 15): breaking waves on beaches, the splash-up.
- Duncan (1981, *Proc. R. Soc. A* 377) and Svendsen (1984): the breaking roller.
- Bubble rise speeds (Clift, Grace & Weber, 1978).
- The spit has no direct measurement we know of: its speed follows from mass conservation, and its drop and mist loading are provisional.

## Checking

- **Tests:**
  - Classic stays byte-identical (snapshots extended to the lip sheet);
  - the GLSL tube floor agrees with `tubeFloorDepth`, and the interpolated carve agrees between the CPU and the GPU;
  - the lip's drawn thickness matches its water;
  - Part B's quantities conserve what they should (the lip's water through the splash-up, the tube's air through the collapse and spit) and stay within their sourced ranges.
- **The water sheet** gains tube and whitewater shots at the practice Reef and the Beach, Classic beside Rich, under the three skies. A `?record&watch` clip is made per part.
- **A whitewater report** per spot (splash-up heights, spit speeds, peak aeration, plume depths, collapse times) is checked against the sourced ranges. It is reported, not asserted, as the tube report is.
- **Performance** in the worker and on the GPU is measured on the M1 Air and recorded, never a gate.
- **Done** is judged together in play.

## Order of work

1. **Part A:** tube table in the snapshot → interpolated carve (CPU and GLSL twin) → the void cut in the Rich patch → the lip sheet smoothed, thickened and shaded → sheet shots and a clip → record.
2. **Part B:** research task (sources and ranges) → aeration field and its source → splash-up sheet → trapped air, collapse and spit → foam ball → plume → the look of each in Rich → whitewater report → sheet shots and a clip → record.

## Backlog

- Whitewater forces on bodies: lost buoyancy in aerated water, hits from the splash-up and the foam ball.
- The player's tube camera (P12).
- A lip and whitewater look for Classic, if weaker machines call for one.
