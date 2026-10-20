# The Canyon's spilling lip, 2026-10-11

The owner's playtest of 2026-10-11, at the Canyon: "I don't want the wave to become white then have the spilling; spilling should be like a tube animation but as a separator that the wave is breaking."

What was built, on `claude/canyon-lip` (five passes: the first build, the coordinator's look pass, round 2 after the water-physics advisor's review, round 3 for the shoulder at Big, and round 4: the game itself, distance, light and size):

- **A small rolling lip.** At each wave's spilling front the crest sharpens and its tip is thrown out and falls down the face. It runs along the crest at the S2 front's pace (the 55° peel), just behind the front's tip. Each column goes through the break's own sequence as the peel passes it.
- **A clean shoulder ahead of it.** No whitewater is drawn ahead of the front. The drawn foam drifts shoreward and its lace lasts 6 s rather than 15 s. On each wave's unbroken shoulder ahead of its front, the drawn lace is held back (round 3), so the shoulder is clean green water at Medium and Big.
- **White that trails the break.** No white is drawn on a column's face until its curl lands. A bright patch then shows where it lands, with a splash of drops. The white grows down the face and reaches the face's foot 2 s later.

It is **look only**. The water, the solver's breaking strength, the S2 whitewater (which feeds the air and the roar), the breaking the rider feels, the roller table (`writeTable`: push, froth drag, water entry, lens top), the aeration the rider floats in (`aerateBores` → `voidFraction`) and its turbulence, the bores the air reads, and the lip impacts (the sound and the reports) are byte for byte the same with the lip on and off. A test checks this every step over 5 s of Canyon Medium, the foam's drift and the curl's splash included. The curl collides with nothing. `heightAt` and the drawn heights are unchanged. Only the Canyon has the lip; every other spot draws exactly as before, in both looks.

## The stills

Canyon, Medium swell (Hs 1.4 m, Tp 11 s, 0°, s = 150), seed 1, in the page, at sea time 133.47 s: a set wave about 2 m high peeling toward +x at the take-off. They were shot from the dev water sheet (`?inpage&waterSheet&spot=canyon&swell=medium&direction=0&spreading=150`, with `&spillingCurl=0` for the before), midday, in the Rich look unless noted. The before and after show the same wave at the same moment, from the same cameras, because the switch changes nothing felt. The after stills and the Medium motion strip are round 4's. The Big motion strip is round 3's.

| | Before (`spillingCurl` off) | After |
| --- | --- | --- |
| From the lineup, looking along the crest | ![](before-lineup.jpg) | ![](after-lineup.jpg) |
| Up close, beside the curl as it passes | ![](before-beside.jpg) | ![](after-beside.jpg) |

- **From the beach** (after): ![](after-beach.jpg)
- **Beside the curl, Classic look** (after): ![](after-beside-classic.jpg)
- **Big** (`&swell=big`, sea time 201.89 s; this wave is 1.5–1.6 m high, Big's sets reach 2.5 m), beside and from the lineup: ![](after-big-beside.jpg) ![](after-big-lineup.jpg)
- **At distance** (round 4): Big from the beach, ![](after-big-beach.jpg), in Classic, ![](after-big-beach-classic.jpg), and from about 37 m, ![](after-big-far.jpg); Medium from about 40 m, ![](after-far.jpg). Without and with the distance drawing, Big, from about 37 m, from the beach and from the lineup (left without, right with): ![](distance-big.jpg)
- **Small** (round 4; `&swell=small`, sea time 99.73 s, a wave about 1.2 m high at the take-off, x −30, z −287), beside and from the lineup: ![](after-small-beside.jpg) ![](after-small-lineup.jpg). Before and after the run ends taper (left, round 3's pods; right, round 4): ![](small-taper.jpg)
- **Low sun** (round 4; Medium, Rich, the same moment): beside at dawn, ![](after-beside-dawn.jpg), at sunset, ![](after-beside-sunset.jpg), and from the lineup at sunset, ![](after-lineup-sunset.jpg)
- **In the game** (round 4; the solo game through the worker, GPU tier, 64 components): Medium from the ride camera, ![](ingame-medium-ride.jpg), and the overview, ![](ingame-medium-overview.jpg); Big from the ride camera, ![](ingame-big-ride.jpg), and the overview in Classic, ![](ingame-big-classic-overview.jpg)

**Motion strips.** 8 frames, 0.15 s apart, read left to right then down. Each is from a fixed camera beside the take-off column (x −30) as a curl passes:

- **Medium,** from about 10 m, sea time 132.87–133.92 s: ![](motion-medium.jpg)
- **Big,** from 10 m, sea time 201.29–202.34 s: ![](motion-big.jpg)

**My read.**

- **Before:** the face is white (S2's foam) right up to the front. There is no curl.
- **After, Medium:**
  - The ordering reads: a clean shoulder, then a small lip just behind the front, then a bright white patch at the crest where it has landed, with drops thrown up. The white spreads down the face. The lace that covered the face and shoulder in the earlier stills is gone.
  - Beside it, the lip now reads as a translucent sheet arching off the crest and down the face. It is longer where it is older and short at the front, with lighter streaks across it and a darker band under it.
  - The strip shows the sequence: the white patch spreading along the crest frame by frame, with the lip reaching out and down ahead of it.
- **What is still off:**
  - **Glassy.** The lip is still smooth and a little glassy, more a clear awning over the crest than water pouring. The streaks' downward motion can only be judged in motion, not in stills.
  - **The tip.** The ragged tip is too small on screen to see at these distances.
  - **From the beach.** The curl is subtle: a thin lip on the crest beside the white.
  - **Classic.** It reads darker teal, with its inner side showing through.
- **After, Big (round 3):**
  - The lace network that covered the face and the water ahead of the front in round 2 is gone. The shoulder reads as clean green water: smooth, with the face's own ripples and shading, and the lip and the white patch behind the front.
  - Behind the front, the white patch, its lace trail and the whitewater inshore are as they were.
  - The strip shows the shoulder staying clean as the white patch spreads along the crest. It doesn't flicker or pop.
  - The bright blotches low on the right of the strip are the sun's glints on the near water. The snapshot's drawn foam there is 0.
  - The curl is still small beside the white patch.
  - The dark dashes in the Big stills are in the water without the curl too, so they are not the curl's.
- **After, Medium (round 3):** nothing regressed. The lip, the landing white and the trail behind are unchanged. The few faint lace flecks left on the shoulder in round 2 are gone.

## Round 4: the game, distance, light and size

**In the game.** The solo game draws it through the worker as in the water sheet: PhysicalMode, the worker (GPU tier, 64 components), the snapshot's slices, the page's mesh. I checked Canyon Medium and Big in Rich, and Classic at both, from the ride camera at the start position and from the overview.
- The curl, the delayed white and the clean shoulder all show. At Big a 2.9 m set reads well from the ride camera: the white on the left, the lip at the front on the crest, clear green face and shoulder to the right.
- From the overview (60–100 m) the white patch and the clean shoulder read; the lip is a short dark line at the front.
- No console errors or warnings, in either look.
- **The browser pane was hidden** throughout. The page ran at 30–50 fps at first, then at about 1 fps, then stopped compositing. The Big sessions were stepped and drawn through the game's own diagnostics hooks (`?diagnostics`: `breaklineDiagnostics.step` and `render`), which drive the same PhysicalMode, worker and draw as a frame.
- **A bug it showed.** At Big the overview showed a crest's white broken into dashes. The shoulder's band ran on along the crest into a second wave's broken stretch and faded its whitewater. The band now stops at a column another wave has reached with its crest in the band; a break still ahead of that wave's own front stays shoulder. A test covers both cases. The round-3 shoulder test now ends its measurement there too.

**Frame cost in the game** (Medium, ride camera, curls in 2,207 of 2,211 frames; the curl drawn and rebuilt, or hidden and not rebuilt, alternating every 2.5 s in one session; the pane hidden):

| | Lip on | Lip off |
| --- | --- | --- |
| Page CPU per frame, median (mean) | 1.6 ms (1.75 ms) | 1.6 ms (1.67 ms) |
| GPU per frame (timer query), median (mean) | 37.0 ms (35.4 ms) | 36.7 ms (35.4 ms) |
| Rebuilding the ribbon (`drawCurl`), mean per frame | 0.016 ms (0.2 ms at most) | none |

- The lip costs the page about 0.1 ms of CPU per frame. Its GPU cost is within the timer's noise (less than 1 %).
- The GPU times are inflated: the pane was hidden, and ANGLE's Metal timer on this M1 Air counts queued work. Only the difference means anything.
- The worker's own costs are the node timings below. In this session the worker's sea ran at about 0.2× real time, waiting about 100 ms a step to read the GPU water back while the page drew. That is the M1 Air's GPU shared with the page, not the lip.
- `?spillingCurl=0` turns the lip off in the game now (a dev switch, tested). I didn't compare whole sessions with it: each session draws a new random seed, so the sea differs, and the GPU readback dominated the worker's time.

**Readable at distance** (`DISTANCE` in `SpillingCurlMesh.ts`). From the beach and the lineup at Big the curl was subtle and its ragged tip too small to see. The shape's rules are unchanged (the apex at most 0.1 H, the contrast void). As the lip's nominal thickness (0.052 H, or its own when thicker) shrinks on screen from 5 px to 2 px, the separator is drawn as a line:
- the lip's two faces are pushed apart along their normals, so it is never drawn thinner than 2 CSS px (a screen-space floor);
- its tip's froth line widens from its last fifth back to 0.4 of the lip, at 0.8 rather than 0.3, evenly, and its fingers (under a pixel there, a dotted edge) close;
- its void darkens by up to half again (at most 85 %), but not under its tip from 0.6 of the lip on, so its falling edge reads as a light line over a dark one.
- Up close nothing changes: beside the Big curl only the far end of the ribbon, 20 m and more away, changed. At Medium the beach and lineup views (about 15 m) barely change; from 40 m the separator now reads.

**My read of the distance images** (`distance-big.jpg`, `after-big-beach.jpg`, `after-big-far.jpg`, `after-far.jpg`):
- From about 40 m the curl was nearly invisible; it now reads as a dark line along the crest with a light edge over it, between the white and the shoulder.
- From the beach it reads as a crisp lip on the crest, darker under its edge.
- From the lineup it is more defined where it meets the white. It is still a fine line at these distances, not a bold one.

**Light** (`after-beside-dawn.jpg`, `after-beside-sunset.jpg`, `after-lineup-sunset.jpg`):
- The lip takes the water's colour in both, and the darkened void stays a soft grey-teal band, never black.
- At sunset the low sun behind it lights a few small warm patches along its lower edge, the backlit sheet. That is plausible and not a glow.
- At dawn the lip is a pale silvery sheet and the landing white is faint. The water around it reflects the bright dawn sky as strongly as the foam, under a sun 2° high. That is the game's foam lighting at dawn, not the lip's. I changed nothing.

**Small** (`after-small-beside.jpg`, `after-small-lineup.jpg`, `small-taper.jpg`). At Small the onsets along the crest are patchy: columns are missing and neighbouring ages jump. The curl was drawn as glass pods: short runs of two or three slices, each closed blunt at a young lip, floating over the gentle face. Two changes fixed it:
- one missing column is bridged (slices up to 2.6 m apart join);
- each run tapers to an end closed by a slice of nothing over its last 2.5 m (its size and opacity), not to its front, which pinches by itself.

Now the Small curl reads as a lip along the crest that fades out at its ends. The taper also smooths the old end at Medium and Big, where the collapsing lip met the white patch as a grey wedge; it now blends into the white. That is the only up-close change at Medium and Big.

**The Medium motion strip** is refreshed (`motion-medium.jpg`): the clean shoulder, the lip at the front and the white spreading behind it.

## Round 5: where the lip lands, pitch then pour, and contrast (2026-10-20)

Branch `claude/lip-r5`, from `main` at e9745b4b, after the water-physics advisor's consult of 2026-10-20 (its row in `docs/research/water-physics/consult-log.md`). The advisor's changes 1–3 were built, with one fix found on the way. Nothing felt changed: the lip's felt-identity test, the shoulder tests at Medium and Big, the roller lens's tests and the other spots' test pass.

**1. The fray stops where the lip lands** (`drawnEdges.ts`, `SpillingFront.update`, `SpillingCurl.drawBand`, `SurfZoneSimulation.writeRoller`).
- #126's `frayRow` cut 0–4 m and faded 2 m at both ends of each row's drawn white, and `frayBand` faded the band over 1–6 columns at both ends. At the peel-side end, where each curl lands, the white started up to about 1 s after touchdown, and the 0.15 s landing flash faded.
- Now, with the lip's look, a run's peel-side end gives up at most 0.45 m (`RAGGED.period`, the lip's finger scale) and fades over at most 1 m; the band's peel-side end fades over half a column to one. This holds while that end's white is younger than the look's span (3.6–3.8 s at the Canyon). Over the next 1 s it eases back to #126's full fray, so the end of a peel that stops later still frays, and nothing pops.
- The upcoast end and the toe keep #126's fray. Without the lip (`?spillingCurl=0`) nothing changes.
- Drawn only: each row's cell ages and the band's ages (`SpillingCurl.bandAge`) are written beside the drawn copies; the felt whitewater and the felt roller table never read them (tested bit for bit).

**2. Pitch, then pour** (`SpillingCurlMesh.buildCurlRibbon`, `lipFlight`).
- The tip still goes out at a steady pace to its landing at τ_i = 0.6 √H. It is held level at the peak until τ_i − t_f, then falls as t² over t_f = √(2 Δy / 0.65 g), Δy each slice's own peak over its landing.
- The lip droops from the crest to its tip as a parabola whose depth grows as t², so at touchdown it is the same arc as before and the collapse is unchanged. The void opens from a quarter of the fall before the pour to touchdown.

| Wave | τ_i | t_f | Level, then falling | Landing speed | Along the crest (5.7 m/s front) |
| --- | --- | --- | --- | --- | --- |
| H 2 m (Δy 0.56 m) | 0.85 s | 0.42 s | 0.43 s, then 0.42 s | 2.7 m/s | 2.4 m level, 2.4 m falling |
| H 2.3 m (the strips' wave) | 0.91 s | 0.45 s | 0.46 s, then 0.45 s | 2.9 m/s | 2.6 m, 2.6 m |
| H 2.5 m (Δy 0.70 m) | 0.95 s | 0.47 s | 0.48 s, then 0.47 s | 3.0 m/s | 2.7 m, 2.7 m at 5.7 m/s (the advisor's 3.4 + 3.3 m at Big's faster front) |

Before, the drop (about 0.28 H) was spread over all of τ_i: about 0.16 g, landing at 1.3–1.5 m/s.

**3. Contrast for distance** (`SpillingCurlMesh`: `UNDER_SHADE` 0.45 → 0.6, `FLOOR_SHADE` 0.6 → 0.8, `FLOOR_ALPHA` 0.75 → 0.9, `DISTANCE.nearPixels` 5 → 8). The floor at full opening now keeps 0.28 of the face's light under it, not 0.55, and from 15 m the separator is already partly drawn as a line. Mesh only: no new samplers, the tank's programs untouched (the curl's own vertex shader changed one literal).

**The fix found on the way: no drawn air on the shoulder** (`SpillingCurl.clearShoulder`, `airShare`). With the foam's detailed look (the Medium preset and up), the face ahead of the lip drew a grey, pillowed mat: Rich's churn and plume. Where the solver breaks ahead of a front before any onset joins it to a wave, no front owns the cells. Their felt whitewater aerates them, and round 3's clearing held back their drawn foam but not their drawn air. The clearing now records what it holds back per cell, and the drawn air takes it. It clears the shoulder; the first 3 m ahead of the front, where the band fades in, and the face just below a young curl still show some (see the strips).

### How it was checked

- **The page:** the dev water sheet in the page (`?inpage&waterSheet&spot=canyon&swell=medium|big&direction=0&spreading=150&components=24`), seed 1. The graphics were set to the High preset in both pages, since the two dev origins had different saved settings (one was Low, with the simple foam). Before is e9745b4b and after is this branch: the same sea, step for step (h, q and the felt whitewater checked equal).
- **The wave:** Medium, a 2.3–2.4 m set breaking at the take-off at 149.7 s (x −36.5, z −344), peeling toward +x and shrinking to 1.6 m by 156 s.
- **The tool:** the contrast ratios are measured by a new dev tool, `waterSheetLipContrast(view, look, time)`.
  - The band under the lip is the pixels the void's darkening changes, measured against the same pixels without the curl and against the green face 2–6 m ahead of the front (foam-free pixels). It also reports the band's darkest quarter, since the band's pixels include the translucent lip over it.
  - The landing white is the columns 0.15–0.65 s after touchdown, against the columns 4.5–5.5 s after. Each is taken over the face from 1 m behind the crest to 6 m ahead, by the white's own pixels (the foam drawn magenta).
- **The camera:** "ride" views look along the game's start camera's heading (seaward, toward the peel, from 3.6 m up) at 15 m and 40 m from the curl. That brackets the start position's view of a wave breaking at the break line, about 20 m off.

### The strips and stills

- **Pitch, then pour** (`r5-pour-medium.jpg`): one column (x −27.5) from 151.8 to 152.9 s, 0.1 s apart, before above and after below, from 4 m in front of the face, tracking the crest. ![](r5-pour-medium.jpg)
- **The landing handing over to the white** (`r5-handover-medium.jpg`, beside the break from the shoulder side, 152.0–153.4 s, 0.2 s apart; `r5-ride15-medium.jpg`, the ride camera at 15 m): ![](r5-handover-medium.jpg) ![](r5-ride15-medium.jpg)
- **Stills at 156 s** (`r5-stills-medium.jpg`: ride camera at 15 m and 40 m, from behind the wave in the lineup, beside; midday and sunset, before and after), Classic (`r5-classic-medium.jpg`), and close and overview (`r5-close-medium.jpg`): ![](r5-stills-medium.jpg) ![](r5-classic-medium.jpg) ![](r5-close-medium.jpg)
- **What was measured** (`r5-contrast-regions.jpg`; the band red, the face beside it yellow, the landing cyan, the white 5 s older magenta): ![](r5-contrast-regions.jpg)
- **Big** (`&swell=big`, after only; a 2.7 m set breaking at the take-off at 149.25 s, x −37.5, z −350): one column's pitch and pour from in front of the face (`r5-pour-big.jpg`, 0.1 s apart), the ride camera at 15 m and beside from the shoulder (`r5-ride15-big.jpg`, `r5-handover-big.jpg`, 0.2 s apart), and stills at 155.9 s of the same crest's next stretch (2.1 m): ride camera at 15 m and 40 m, beside and the overview, midday, sunset and Classic (`r5-stills-big.jpg`). ![](r5-pour-big.jpg) ![](r5-ride15-big.jpg) ![](r5-handover-big.jpg) ![](r5-stills-big.jpg)

**My read.**
- **Pitch, then pour.** Before, the lip slid out as one smooth tongue sloping down the whole way (152.0–152.3 s). After, it goes out as a level ledge on the crest for about 0.4 s, with the darker band under it, then drops quickly onto the face (152.5–152.8 s), and the splash follows. The ledge does read as a shelf for those few frames: this is the advisor's named risk, for the owner to judge in motion.
- **The handover.** The white follows the landing with no green gap in either strip; the white's leading edge runs diagonally from the crest down the face, as the 2 s toe draws it. The peel-side end is a sharp edge now rather than a 1–6 m fade.
- **The shoulder.** The grey pillows ahead of the front are gone from the shoulder in the ride view. Some remain in the first metres ahead of the front and on the face below a young curl, in both builds.
- **At distance.** From 40 m the lip is a fine dark line along the crest in both builds, and the changes are subtle at this wave's size (1.6 m by 156 s).
- **Big.** The lip reads as a short level ledge on the crest for about half its flight, then the splash and the white; it stays small beside the white, as the advisor expects. From the overview the white's peel-side ends are now crisp, diagonal edges (the white growing down the face behind the landing). Where the solver's onsets are patchy, so one crest is split between two fronts, the stretches show as separate patches with crisp leading edges: the full fray returns 1 s after the look's span, so these older ends soften, but the youngest stay sharp.

### The contrast ratios (Medium, 156 s, Rich, midday; before → after)

| | Ride camera, 15 m | Ride camera, 40 m | Target |
| --- | --- | --- | --- |
| Band under the lip ÷ the face beside it (mean) | 1.14 → 1.14 | 0.82 → 0.80 | ≤ 0.5 |
| The band's darkest quarter ÷ the face beside it | 0.85 → 0.80 | 0.53 → 0.60 | |
| The band ÷ the same pixels without the curl | 0.93 → 0.84 | 0.60 → 0.54 | |
| Landing white ÷ white 5 s older (the white's pixels) | 0.94 → 0.89 | 0.83 → 0.80 | ≥ 1.5–2 |
| The same, its 90th percentile | 0.95 → 0.97 | 0.59 → 0.75 | |
| Big (after; 155.9 s, H 2.1 m): band ÷ face beside, mean and darkest quarter | 1.05, 0.75 | 1.08, 0.69 | ≤ 0.5 |
| Big: the band ÷ the same pixels without the curl | 0.68 | 0.65 | |
| Big: landing white ÷ white 5 s older (the white's pixels; 90th percentile) | 1.03 (separate frames) | 0.75 (0.86) | ≥ 1.5–2 |

In Classic, the band at 15 m is 1.29 → 1.36 of the face beside it, and its darkest quarter 0.91 → 0.86. The 15 m white ratio is measured with the camera on the 5 s older white, the landing at its edge; the 40 m one has both in one frame. These rest on 3–4 columns each, so they move by ±0.05 between frames.

**Neither target is met, and these knobs can't meet them.**
- **The band.** From the ride camera, 3.6 m up over a 1.6–2.4 m crest, the lip covers its own void. The band's pixels are seen through the translucent lip, so darkening the void barely moves them. At 156 s, the runtime trials took the void's shade to 85 % at full opacity and moved the band only from 1.14 to 1.03 of the face beside it.
  - The face beside it, the shoulder 2–6 m ahead, is itself darker (0.38–0.41) than the upper face under the lip without the curl (0.48–0.57).
  - Reaching 0.5× would take the lip itself reading dark where it hangs over the void, or a deeper void than the gentle drawn face allows. Both are look questions for the advisor and the owner.
- **The white.** The landing white (the drawn band at full scale and the collapsing curl) reads 0.55–0.66. The white 5 s older is the foam field's dense whitewater, at 0.60–0.69: those columns have no roller band any more.
  - **The air share is not the lever.** Zeroing all drawn air (the youth signal Rich reads) changed the old white by 1 % (0.523 → 0.517) and the landing by 0 %.
  - **Nor is the band.** Aging the drawn band (scale × 0–0.4 by 5 s, tried on the uploaded table) changed nothing in the old white and the landing by ≤ 2 %.
  - **What would.** A 1.5× ratio needs the aged foam itself drawn darker, through the foam's freshness in the Rich tank shader (the M1 cost cliff) or the drawn foam values (which would change the owner's white). That is the owner's and the advisor's call, so I left it.

**Cost.**
- Building the ribbon: 0.075–0.079 ms for 20 slices and 0.21–0.22 ms for 56, the same before and after within noise. That is node on the M1 Air, interleaved over 40 rounds while other jobs ran; round 4's idle figures were 0.063 and 0.164 ms.
- The fray's ages: one store per breaking cell in the front's row pass and per band cell.
- The shoulder's air: one fill of the cell grid and a store per band cell per step.
- No GPU timing was taken: the tank's shaders are untouched, and the curl's shader changed by one literal.

## The numbers and their sources

| What | Value | Source |
| --- | --- | --- |
| Touchdown after the front reaches a column | τ_i = 0.6 √H s (0.84–0.86 s for the 2 m wave in the stills; 0.95 s at 2.5 m) | The barrel clock (along-the-crest.md); advisor 0.35–0.7 s at Medium (inferred) |
| The tip's flight | Out at a steady pace to the landing at τ_i (0.2–0.3 C) from a peak at most 0.1 H over the crest, sharpened over the first third. Round 5: held level until τ_i − t_f, then falling as t² over t_f = √(2 Δy / 0.65 g), Δy the slice's peak over its landing (0.42 s at H 2 m, 0.47 s at 2.5 m; landing at 2.7–3.0 m/s); rounds 1–4 spread the drop over all of τ_i (about 0.16 g, 1.3–1.5 m/s) | The advisor, round 2 (the jet leaves nearly level and falls ballistically; Mostert, Popinet & Deike 2022: laminar until touchdown); round 5 (Drazen et al. 2008: free fall; the game's library 0.58–0.71 g) |
| The void fills, the curl whitening from its tip | 0.5 s | along-the-crest.md (collapse from T to T + 0.5 s) |
| The white's toe reaches the face's foot | 2 s after touchdown | The owner (2026-10-11); advisor's sourced 2–3.5 s (Svendsen 1984, 5–8 h_b) |
| Overturn shape | Pick & Feddersen (2026) fits (`Overturn.ts`), ψ0 from each column's Mead & Black gradient at h_b | The advisor; provisional |
| ψ0 range | Held to 1:50–1:30 at H0/h0 0.28: void 0.10–0.20 H², W/L 0.35–0.37, 47–50°, curl 0.23–0.33 H high (0.58–0.83 m at H 2.5 m) | The advisor's span for the fan face. Downcoast the fan grows gentler (1:60–1:95), and the arm's end and the beach face are steeper (1:25) |
| Landing | 0.60 H ahead: Pick & Feddersen's far end (1.5 m at H 2.5 m) | The coordinator's ruling, round 2 (the contrast route) |
| Lip thickness | A_J·H² / (L + W), no less than 0.052 H: 0.13–0.15 m at H 2.5 m | Advisor: about 0.05 H; 0.13–0.15 m at Big |
| The splash | At touchdown, per column: 0.3 of the jet (`SPLASH_UP.share`), on at the breaker celerity, down at 3.2 m/s | The advisor, round 2 (about 1.0 C forward, 2.5–4 m/s down) |
| Surface drift of the drawn foam | Q_s = 0.18 H_b² m²/s over the still depth, at most 0.4 m/s, where the still depth is under 1.3 h_b (Q_s 1.3 m²/s at Big) | Hansen & Svendsen 1984; the advisor's Q_s ≈ 1.2–1.5 m²/s at Big and 0.3–0.4 m/s |
| Drawn lace | 6 s (the Canyon's was 15 s) | The coordinator's ruling, round 2 |
| The shoulder held back | Along each wave's crest line, up to 30 m ahead of its front, faded in over 3 m from the front. Across shore, from 2 m behind the crest to 12 m or 5 H_b ahead of it, whichever is more, faded over 3 m at both ends. The lace fades with a 0.1 s e-folding time | The coordinator's ruling, round 3; extents set by eye and by the measurement below |
| Streaks | Two flow-map layers half a 0.45 s period apart; scrolled along the lip at 0.4 m/s near the crest to 3.2 m/s at the tip; 0.3 m apart in world x, 1.2 m long | Surf's Up course notes p. 80; Vlachos 2010; the advisor (2–4 lip thicknesses apart, 4:1) |
| Ragged tip | Fingers cut from the tip's last fifth, 0.45 m period in world x; the tip's froth varied with the same noise | Surf's Up's lip trains; the advisor (0.3–0.6 m) |
| Readable at distance (round 4) | The lip at least 2 CSS px thick; drawn as a line as its nominal thickness (0.052 H) goes from 8 px (round 4: 5 px) to 2 px on screen: froth from 0.4 of the lip at 0.8, fingers closed, the void up to 1.5× darker (at most 85 %) except under its tip from 0.6 | The coordinator's ruling, round 4; values set by eye on the distance stills; 8 px in round 5 |
| The void's darkening (round 5) | 60 % on the lip's underside (was 45 %) and 80 % on the face under it (was 60 %), at 90 % opacity (was 75 %): the floor at full opening keeps 0.28 of the face's light, not 0.55 | The advisor's target, round 5: the throat at most 0.5× the face beside it (inferred) |
| The drawn white's peel-side end (round 5) | While its white is younger than the look's span, a run's peel-side end gives up at most 0.45 m (the lip's finger scale) and fades over at most 1 m, the band's over half to one column; over the next 1 s it frays as #126 drew it (0–4 m, 2 m fade; 1–6 columns). The upcoast end and the toe keep #126's fray | The advisor, round 5 (#126's fray started the white up to about 1 s after touchdown) |
| Run ends (round 4) | A run tapers over 2.5 m to an end closed by a slice of nothing; slices up to 2.6 m apart join (one missing column) | Set on the Small stills |
| Along the crest (the stills' wave) | 0.17 s per metre (a 5.7 m/s front), curl standing over about 7 columns, the face's foot (the lens's toe) 7 m | Measured. Advisor: 0.175 s/m; 2–4 m of open curl, then about 3 m collapsing |

**How it is drawn:**

- **The curl** (`src/wave/SpillingCurl.ts`, `src/scene/SpillingCurlMesh.ts`):
  - **The slices.** A ribbon is lofted along each wave's crest from the snapshot's slices: up to 56 slices of 13 floats, 2.9 KB, carried through the snapshot so solo, worker and online clients all draw it. Each slice carries its column's curl at full size and its age. The ribbon builds the column's stage of the break from that age, so the curl doesn't inflate as one shape.
  - **The sequence per column:**
    - the crest sharpens to a peak at most 0.1 H over the drawn crest;
    - the tip goes out first at a steady pace, held level (pitched), and in the last t_f of the flight pours: it falls as t² at 0.65 g onto the drawn face at the landing, 0.6 H ahead, at touchdown (round 5; before, it fell over the whole flight);
    - the void under it opens from a quarter of the fall before the pour to touchdown;
    - after touchdown the lip settles onto the face over 0.5 s, whitens from its tip, bulks into a white mass and fades out into its landing patch.
  - **The contrast route.** The drawn face is gentler than an overturning one, so the void a real curl has, 0.15–0.2 H more, is drawn as contrast, not geometry. The lip's underside and a veil on the face under it are darkened for the sky the lip hides. That darkening is 60 % on the underside and 80 % on the face under it, at 90 % opacity, as the void opens (round 5; 45 %, 60 % and 75 % before).
  - **Shading.** It is shaded on the water's own uniforms, with the face's column of water as its body, so it takes the face's colour. Its falling outer half is the swept barrel's thin backlit sheet: translucent, letting 30 % of the water behind show through, brightest toward its tip.
  - **Streaks and tip.** Its falling half carries the streaks, and its tip the ragged fingers and froth, both fixed in world x. As the peel passes, they stay put while each column runs through its sequence.
  - **Rim and sheen.** Its view cosine is held off grazing, which removes the dark rim. Its Rich roughness is 0.25, which removes the plastic sheen.
  - **Fades.** It is blended: it fades into the crest where it attaches and out as it collapses, with no end cap. Classic draws it too, with Classic shading.
- **The drawn white:**
  - **S2's drawn whitewater.** S2 writes a drawn whitewater beside the felt one. It is zero before touchdown, then runs from the landing line (the void filling up to the crest) down to a toe that reaches the foot 2 s later. It also holds back the next crest's weak breaking before its onset joins it. The foam field takes its foam and source from this drawn whitewater; its bore measurement for the air is unchanged.
  - **The band.** The roller band's drawn copy (`writeRoller`) waits and grows the same way. Once its curl has landed, it is drawn at full scale within 0.15 s: a bright white patch where the lip lands (fresh foam averages about 41 % reflectance over its first second; the advisor), brightest at the crest and fading toward the toe.
  - **The drawn air.** Rich's churn and plume show only under drawn foam, and only in columns whose curl is still young. A developed bore draws its air as before.
- **The splash.** Each touchdown pushes a `LipImpact` (kind 1, a splash-up) into `drawnImpacts`, which only the drawn spray reads. It never enters `lipImpacts`, so the water, the foam's air, the sound and the reports never see it. Classic throws no drops from a splash-up, the rule Classic's spray has kept since G9, so the splash shows in Rich only.
- **The foam's drift.** The foam field takes the drift on top of the current for its own departure points only. The advection stencil it records, which the aeration reuses, stays the current's: a test checks the stencils are identical with and without the drift.
- **The shoulder** (round 3; `SpillingCurl.clearShoulder`, called each step before the foam's own step):
  - **Where.** For each wave, it finds the crest at the front, then follows the crest line column by column ahead of the front, taking the highest water within 2 m of the last column's crest. It stops where the water stands less than 0.3 of the front's crest height above still water: there is no shoulder there.
  - **What it holds back.** On a band along that line, it fades the drawn foam (`dense` and `residual`) with a 0.1 s e-folding time, and zeroes the drawn whitewater, the foam's source. That source is the solver's weak breaking ahead of a front, which no onset has joined to a wave yet.
  - **Edges.** Every edge of the band is smoothstepped over 3 m, and the fade is a decay rather than a cut, so nothing pops or flickers as the band moves.
  - **What it leaves.** Behind each front nothing changes, so the whitewater and its lace trail are as they were. Nor does it where another wave has broken further along the crest (round 4): the band stops at the first column another wave has reached with its crest in the band.
  - **Felt.** Nothing felt changes. The foam is drawn only, and the bores the air reads come from the felt whitewater. The felt-identity test passes with it on.
  - **Measured.** At the take-off, the mean drawn foam on the shoulder 3–15 m ahead of each front, from 1 m behind its crest to 8 m ahead, up to another wave's break:
    - **Medium:** 0.0004 over 83 samples, max 0.0065 (round 3: 0.0000, max 0.00001);
    - **Big:** 0.0001 over 24 samples, max 0.0025 (round 3: 0.0000);
    - **Without the lip:** 0.22 at Medium and 0.17 at Big.
    - The samples span 30 s of sea, taken every 8 frames.
    - A test holds each sample at or under 0.02 at both sizes.
- **The crest tracker** (Wave Lab Follow, `crestTracker.ts`) reads the drawn foam from the snapshot. With the lip, the breaking edge it slides to is the white's edge, a few metres behind the curl, rather than S2's early foam. The shoulder's clearing is ahead of the front, so it doesn't move that edge. Its tests pass unchanged after rounds 3 and 4.

**Cost** (node timings on this M1 Air):

- The look's step and splash: about 0.01 ms per step.
- The snapshot's slices: about 0.03 ms (worker).
- The foam's drift: +0.2 ms per step on the foam stage (2.26–2.30 → 2.47–2.48 ms in the page's CPU run).
- The shoulder's clearing (round 3): 0.035 ms per step at Medium and 0.026 ms at Big.
- Building the ribbon on the page: 0.063 ms for 20 slices and 0.164 ms at the 56-slice maximum, cheaper than the look pass (0.082 and 0.225 ms) because each slice samples the face fewer times. The ribbon is rebuilt once per snapshot, not per frame.
- The GPU draws one mesh of at most 1,152 vertices with the water's sheet shading, plus two value-noise layers for the streaks and one for the tip. In the game (round 4) its cost was within the timer's noise; see the frame cost table above.
- The distance drawing (round 4) adds one depth product and two smoothsteps per vertex and a few per fragment.

## Sources

- Pick & Feddersen 2026 (J. Fluid Mech. 1040 A8): the overturn's fits (`Overturn.ts`).
- Mostert, Popinet & Deike 2022: breaking jets are laminar until they touch down.
- Watanabe, Saeki & Hosking 2005: fingers and drops form on the splash.
- Saruwatari et al. 2008: the splash-up and its jets.
- Surf's Up, SIGGRAPH 2007 course notes, pp. 80–82: the falling face's texture shifted for downward motion; lip trains.
- Vlachos 2010, "Water Flow in Portal 2": two-layer flow maps.
- Hansen & Svendsen 1984: the breakers' shoreward surface mass flux.
- Deike, Melville & Popinet 2015: surf-scale spillers overturn.
- Svendsen 1984: the roller's development over 5–8 h_b.
- Mead & Black 2001: the orthogonal gradient.
- Drazen, Melville & Lenain 2008: the plunging jet falls freely (round 5's pour).
- Koepke 1984: fresh foam's reflectance falls as it ages (round 5's contrast target).

## What is provisional

- **The shape.** Pick & Feddersen's potential-flow fits stand in for the Canyon's own break until the high-resolution Basilisk level-15 run.
- **The void.** The drawn void is as high as the gentle face allows under a lip at most 0.1 H over the crest, so it is drawn as darkness rather than its full 0.23–0.33 H. The 0.2–0.35 H test holds for the overturn's size W, not for the drawn void.
- **The look's game values.** These were set by eye on these stills:
  - the sharpening (0.1 H over the first third);
  - the light behind the lip (`SKY_BEHIND` 0.1, up to 0.5 more toward the tip);
  - its translucency (`THIN_SHOWS` 0.3) and its fades;
  - the darkening (`UNDER_SHADE`, `FLOOR_SHADE`, `FLOOR_ALPHA`);
  - the streaks and the ragged tip (`STREAKS`, `RAGGED`);
  - its Rich roughness (0.25);
  - the landing flash (0.15 s);
  - the splash's share (0.3) and fall speed (3.2 m/s).
- **The foam's drift and lace.** The drift's flux constant (0.18) and reach (1.3 h_b), and the 6 s lace.
- **The shoulder's band** (round 3). Its reach (30 m), its extent across shore (2 m behind the crest, 12 m or 5 H_b ahead, whichever is more), its 3 m fades, its 0.1 s e-folding time, and the 0.3 crest height where the shoulder ends.
- **The distance drawing and the run ends** (round 4). `DISTANCE` (2 and 8 px, 5 px before round 5; the froth's 0.4 and 0.8, the void's 1.5× and 85 %, the lit tip from 0.6), the 2.5 m end taper and the 2.6 m join.
- **Round 5.** The pour's 0.65 g (the library's 0.58–0.71 g), the void opening from a quarter of the fall before it, the void's 60 % and 80 % at 90 %, and the peel-side end's 0.45 m, 1 m, one column and 1 s ease back to the full fray.
- **The curl's direction and the air rule.** The curl's direction is held within 30° of the shore's normal. The drawn air reaches full strength under foam 0.5 thick.

## Open checks for the owner (no rider tests were run)

- **Does it read as water spilling and rolling?** It should read as a small lip thrown off the crest just behind the front, a white landing behind it, and a clean shoulder ahead, rather than a glassy awning or a shape sliding along. The motion needs judging in motion: the streaks' fall and each column's sequence can't be read from stills.
- **The shoulder** (rounds 3 and 4). It is clean at Medium and Big. Check in play that the band's far edge (12 m or 5 H_b shoreward of the crest, whichever is more) never shows as a line in the lace beyond, and that a second break along the crest keeps all its white.
- **At distance** (round 4). Is the line strong enough from the beach and the overview, or should the 5 px ramp start further out? It is still a fine line at 15–40 m.
- **The white's pace.** Is 2 s from touchdown to the face's foot right, and is the landing white bright enough?
- **Dawn.** The landing white is faint at dawn: the game's foam lighting under a 2° sun, not the lip's.
- **Big's motion strip** is round 3's; round 4 changed only its far end and the old end's taper.
- **The game's frame rate on the M1 Air**, with the pane shown: the frame costs above were measured with the pane hidden.
- **Nothing felt changed**, so the ride itself should feel exactly as before. Worth confirming on the board, since the white now arrives later than the push.
- **Round 5: the level ledge.** Pitch, then pour, holds the lip level for about half its flight (0.43–0.48 s, 2.4–2.7 m of crest), then drops it in the other half. In the strips the ledge reads as a shelf for a few frames. Does it read as the lip pitching out in motion, or as a shelf?
- **Round 5: the landing white against the old white.** The landing reads no brighter than the white 5 s older (0.8–0.9×, against the advisor's 1.5–2×). Reaching it means drawing aged foam darker, a change to the white you approved. Is that wanted?
- **Round 5: the throat from the ride camera.** From 3.6 m up, the lip hides its own void, so the darker void reads as a slightly darker lip, not a dark band (1.1× the face beside it at 15 m, 0.8× at 40 m).
- **Round 5: the pillows.** The grey churn on the shoulder is gone. Some remains in the first metres ahead of the front and on the face just below a young curl, where the shoulder's band fades in. Is it visible in play at High and Ultra?
