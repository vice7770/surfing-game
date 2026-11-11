# Ruling 9: the Barrel's falling lip is a thick, clean stub; a pool lip is a thin, fraying sheet

Date 2026-11-11. Advisor: water physics. Code read at main 4c38264c.
Owner's words: the falling water "should be light", ours is "thick from the start", it "should start thinner and with foam then becomes thicker with also foam".

## The short answer

1. The owner is right about the start of the fall and about the foam. He is not right that the total water is too much: at touchdown ours carries about 0.13 H² per metre of crest, which is inside the sourced pool range.
2. What we draw and collide is exactly the Basilisk case's outline, scaled. There is no mesh minimum and no blend artefact. The thickness comes from the case.
3. The case is thick at the start for a sourced reason: the runs carry lab-scale surface tension (Bo = 1000 on h0). Scaled to the pool, that is a capillary length of 9 to 11 cm, where real water has 2.7 mm. Mostert, Popinet and Deike (2022) state that a moderate Bond number makes the jet thicker and throws it less far. Our jet cannot start thin.
4. The stand-in case (Canyon a38) is also about 1.6 times thicker than the pool's own case, and lands in 0.70 s against 1.24 s.
5. The lip is drawn clean and glassy until touchdown. That was my own ruling of 2026-11-01 ("lips are laminar until touchdown"). It came from lab-scale simulation. At field scale it is wrong: Feddersen et al. (2024) write that for field-scale overturning waves "plentiful spray droplets appear during the overturn". I reopen that ruling here.

Build order: the look first (render only, the rider's water untouched), then ride the pool's own case as an A/B, then a higher-Bond rerun on the owner's M4.

## 1. What ours does now (measured)

Method: a read-only node script decodes `public/barrels/<id>.bin`, interpolates frames in tau and measures the outline. Script: `tools/lip.mjs`. Thickness is measured across the lip at three places along its underside: near the root (0.9 of the underside from the tip), mid (0.5), near the tip (0.15). tau is seconds after the face goes vertical.

### Default pool case (`periodic-canyon23-a38-l13`), 1.5 m faces

Foot crest 0.84 m, h0 2.71 m, time unit 0.526 s, H at the throw 1.60 m, touchdown at 0.70 s.

| tau (s) | root (m) | mid (m) | mid / H | tip (m) | reach past throat (m) | jet water (m² per m crest) | overhanging water (m²) |
|---|---|---|---|---|---|---|---|
| 0.05 | no sheet yet: a blunt nose 0.45 m across | | | | 0 | | |
| 0.10 | 0.21 | 0.115 | 0.072 | 0.039 | 0.08 | 0.068 | 0.014 |
| 0.20 | 0.31 | 0.163 | 0.102 | 0.060 | 0.18 | 0.100 | 0.048 |
| 0.40 | 0.48 | 0.258 | 0.161 | 0.117 | 0.48 | 0.218 | 0.152 |
| 0.60 | 0.39 | 0.191 | 0.119 | 0.187 | 0.81 | 0.336 | 0.258 |
| 0.70 touchdown | about 0.4 | about 0.19 | 0.12 | about 0.2 | about 0.9 | about 0.34 (0.13 H²) | about 0.27 |

### Same case, 1.8 m faces

Foot crest 1.08 m, h0 3.48 m, time unit 0.596 s, H 2.06 m, touchdown at 0.79 s.

| tau (s) | root (m) | mid (m) | mid / H | tip (m) | jet water (m²) |
|---|---|---|---|---|---|
| 0.10 | 0.24 | 0.130 | 0.063 | 0.044 | 0.104 |
| 0.20 | about 0.36 | 0.194 | 0.094 | about 0.07 | about 0.13 |
| 0.40 | about 0.55 | 0.310 | 0.150 | about 0.13 | about 0.29 |
| 0.60 | 0.60 | 0.298 | 0.145 | 0.205 | 0.494 (0.116 H²) |

### For comparison

| Case | mid thickness | note |
|---|---|---|
| Pool's own small case at 1.5 m (`?poolTubeCase=pool`) | 0.069 m at 0.1 s, 0.092 at 0.2, 0.156 at 0.4, 0.170 at 0.6 (0.042 to 0.107 H) | about 0.6 times a38; touchdown 1.24 s |
| Reef (reef42, H 2.9 m) | 0.53 to 1.13 m (0.18 to 0.39 H) | a slab |
| Padang (a30) | 0.25 to 0.52 m (0.08 to 0.18 H) | |

### Is it thick from the first frame, and why

- Yes, in shape. At 0.10 s the lip is 0.21 m thick at the root and reaches only 0.08 m. It stays thicker than it is long until about 0.4 s of a 0.70 s fall. The player sees a blunt roll of water tipping over, not a sheet being thrown.
- Not the mesh. `src/wave/barrel/sweptLoft.ts:1385-1510` draws the lip's vertices at the profile's own points. There is no minimum thickness.
- Not the frame blend. `profileAt` blends frames linearly; frames are 0.013 s apart here.
- Not the scaling law. `scale = footHeight / A0` (`ProfileLibrary.ts:554`) is plain Froude scaling. It keeps thickness as a fraction of H.
- It is the case profile, for two reasons:
  1. Surface tension. `tools/basilisk/periodic.c:82-93` and `slope.c:61-93` set `BO 1000.0`, `RE 40000.0`. Capillary length = h0 / sqrt(1000) = 0.0316 h0 = 8.6 cm (1.5 m wave) and 11 cm (1.8 m). Real: 2.7 mm. Real Bond number for this pool wave on h0 is about 1.0e6 (reasoned from the formula); ours is 1000. Mostert's correction puts the jet's capillary width near pi times the capillary length, so 9 to 27 cm of our lip is surface tension. Our measured tip and mid thickness is 4 to 26 cm. The match is close enough to name this the main cause.
  2. The stand-in. a38 is a Canyon wave on a 1:23 slope, chosen 2026-11-04 for more air in the tube. It is 1.6 times thicker early than the pool's own case.
- One draw fault on top: the sheet's weight `formed` (`lipSheet.ts`, `SHEET.formed: 0.035`) goes from 0 to 1 between 0.05 and 0.10 s. The sheet shading pops onto the blunt nose in one to four frames.

### Foam and spray on the lip today

| Stage | What we draw | Code |
|---|---|---|
| Throw | Clean glass. Foam only if the crest was already white, then thinned by stretch and capped at 0.3 | `src/scene/barrel/brokenCrest.ts` `LIP_FOAM = { cap: 0.3, flash: 0.15, edge: 0.15 }` |
| Fall | Same. Straight, smooth tip line along the crest. No drops, no ragged edge | `SweptBarrelMesh.ts` |
| Crest mist | Only with offshore wind. The pool's wind is 0, so none | `src/wave/SprayCloud.ts:727` `feather()` |
| Touchdown | White flash at the tip within 0.15 s, sweeping back; landing spray by impact energy | `lipFoamAt`, `SPRAY_PER_JOULE` |

Missing: a fraying tip, fingers along the crest, drops leaving the tip during the fall, whitening of the thin part of the sheet, mist from the wave's own speed through still air.

## 2. What a real one does

| Fact | Value | Kind | Source |
|---|---|---|---|
| Moderate Bond number thickens the jet and shortens its throw | "moderate Bo leads to a jet thicker than observed in the laboratory"; higher Bo: thinner, further | modelled (3D DNS) | Mostert 2022 |
| Jet thickening is capillary, not viscous | thickness independent of Re at Bo 500 | modelled | Mostert 2022 |
| Capillary jet width | about pi times capillary length | modelled fit | Mostert 2022 |
| Surf Ranch field Bond number (on h0) | 3.6e5; their DNS used 4000, "not at field scale" | stated | Feddersen 2024 |
| Surf Ranch jet water at overturn | A_J / H_b² = 0.219 no wind, 0.132 strong onshore | modelled (2D DNS, Bo 4000, slope 0.0693, a0/h0 0.6) | Feddersen 2024 |
| Surf Ranch wave | soliton about 2.25 m high | measured | Feddersen 2024 (citing 2023) |
| Field-scale lips shed spray during the overturn | "plentiful spray droplets appear during the overturn" | observed, stated in passing | Feddersen 2024 |
| Jet tip is rounded, not a knife edge | lab, potential flow and DNS agree | measured and modelled | Feddersen 2024, Erinin 2023 |
| The falling jet's tip goes three-dimensional before impact | run-to-run tip scatter 3 mm (0.0025 wavelength) from "transverse instabilities in the falling jet" | measured, lab, wavelength 1.18 m | Erinin 2023 part 1 |
| Lab drops come mostly after impact | first drops near 110 ms after impact; drops to about 1 mm | measured, lab | Erinin 2023 part 2 |
| How a thin sheet's edge frays | rim undulations grow to fingers, fingers stretch and break into drops; stretching turns capillary ripples along the jet (Longuet-Higgins 1995, as reported) | measured (wall jets) and review | Watanabe and Ingram 2015 |
| Mean lip thickness against slope | about 0.05 H on 1:50, 0.12 H on 1:20, 0.2 to 0.27 H on 1:15 to 1:10; no surface tension | modelled (potential flow) | Pick and Feddersen 2026 (already in the KB) |
| Teahupo'o lip | about half the wave height | anecdotal | KB |

What I could not source: no opened paper gives jet thickness against time from the throw, for a pool or a lab wave. No measurement of a Wavegarden Cove, URBNSURF, PerfectSwell or Waco lip exists that I could open. I did not open Longuet-Higgins 1995 or Saruwatari 2009; they are cited only through Watanabe and Erinin.

### Reasoned from the above (not measured)

- Thin first, thicker later. The jet is fed from the crest. Its first water is the little that sits above the vertical point of the face; more arrives as the crest drains into it. Without a capillary floor, the first sheet is as thin as the feed. Ours also grows (0.115 m to 0.26 m), but from a floor of one capillary length.
- When it whitens. A sheet a few centimetres thick, moving at 5 m/s, has a Weber number near 10 000 or more. Surface tension cannot hold its edge. So the tip and the thin first sheet fray within the first tenths of a second, and the thicker water that follows stays green for longer. That is the owner's "starts thinner with foam, then thicker with also foam". Timing is a guess: white tip by 0.1 to 0.2 s at 1.5 m.
- Why a pool lip is "light". Water over the top scales with H². Pool, H 1.6 m, 0.13 H²: 0.33 m², about 330 kg per metre of crest, falling about 1.6 m: about 5 kJ per metre. Teahupo'o, H 3 to 5 m, 0.27 H²: 2.4 to 6.7 tonnes per metre, falling 3 to 5 m: 70 to 330 kJ per metre. The pool lip has 15 to 60 times less energy. The slab's lip is 0.4 to 0.5 H thick because the wave meets a ledge at H/d near 1 and the whole crest goes over; the pool wave is a short single pulse on a 1:19 slope and only its top goes over. A light sheet is also the one the air can tear, so it shows more white for its size.
- Mist without wind. The crest moves at about 5 m/s through still air. The face meets that air like a 5 m/s offshore wind. A light veil off the tip is physical in a pool with no wind (reasoned).

## 3. What to change, ranked

### Rank 1. Lip look: a fraying white tip, driven by thickness and stretch. Switch `?lipLook=fray`

Render only. The collided surface, the void and the rider's water do not change, so the ride with `wallBody=stream` and `tubeSeam=blend` is untouched.

| Part | Physical driver | Rule | Cost on the M4 |
|---|---|---|---|
| Thin water is white | A thin sheet breaks up and scatters light | Lip foam = function of the sheet thickness already in `sheetTablesLookup`: full white under about 4 cm, clean over about 15 cm (provisional), replacing the 0.3 cap before touchdown | none: same shader, one smoothstep |
| Ragged tip, fingers | Rim instability; spacing set by the tip's thickness | Alpha cut-outs in the last 15 % of the underside, spacing about 5 tip thicknesses (guess), depth growing with the lip's stretch since it formed. The pattern is a fixed function of the place along the crest where that water was thrown. It moves with the water. It is not noise in time | none to small: fragment only |
| Drops off the tip | Fingers pinch into drops | `SprayCloud` parcels born at finger ends, at the tip's velocity, rate tied to the tip's stretch rate; ballistic | cap 400 live points for the whole tube; state the measured frame cost before merging |
| Veil off the crest | Relative air speed = wave speed minus wind along travel | Feed `feather()` with relative air speed instead of wind alone | within the same 400 cap |
| Sheet fades in | The underside's length | Ease `formed` over underside length 0.035 to about 0.15 h0 instead of the snap | none |

- Player sees: a white, toothed edge appears as the lip throws; the edge leads; green glass follows behind it and thickens; drops trail the tip; the landing flash stays.
- Headless bar: on the pool case at 1.5 m, tip band (last 15 % of underside) foam at least 0.6 by 0.2 s; root band foam at most 0.2 until touchdown unless the crest was white; cut-out depth at most 0.10 m and never outside the tip band; live points at most 400; no change in any contact or rider probe (bit-identical sea).
- Owner bar: stills at 0.1, 0.3 and 0.6 s after the throw from the shoulder and from inside, `fray` against off.
- Risk: the cut-outs draw less water than the rider can hit, by up to 0.10 m at the tip. That is a small break of "one water". The owner decides if 0.10 m is acceptable; if not, keep whitening and drops and drop the cut-outs.
- Do not: animate the pattern with time noise; add overdraw sheets or soft particles near the tube (the owner's fps fell there); whiten the whole lip (the root stays green).

### Rank 2. Ride the pool's own case. Switch exists: `?poolTubeCase=pool`

- What changes: lip about 0.6 times as thick in the first half; fall 1.24 s instead of 0.70 s, so the lip reads as a thrown sheet. Contact, void and feel change.
- Cost: none to build.
- Headless bar: mid thickness at 0.1 s at most 0.045 H (measured 0.042); rerun the pool pop-up and seam bars from rulings 5 to 7 with it.
- Risk: less air in the tube (0.076 H² against the stand-in), which is why the owner chose a38 on 2026-11-04. This reopens that choice, so it is the owner's call after riding both.
- Do not: make it the default without the ride.

### Rank 3. Fix the source: a pool case at a higher Bond number. New case behind `?poolTubeCase=bo4k`

- What: rerun the pool case with Bo = 4000 (the value Feddersen 2024 used for the Surf Ranch) at L14. Capillary length halves: about 4.5 cm at pool size, about 2.5 cells at L14, so still resolved. Expect the capillary share of thickness to halve and the throw to lengthen (direction sourced from Mostert 2022; size inferred).
- Cost: about one day of wall time per run on the owner's M4 (L14 runs took 21 to 22.5 h). No frame cost.
- Headless bar: `lip.mjs` on the new file: tip thickness at 0.1 s at most 0.025 m; mid at most 0.04 H at 0.1 s; jet water at touchdown 0.10 to 0.22 H²; tube area not below the present case.
- Risk: Bo 10 000 or more at L14 leaves the capillary length under 2 cells and the tip breaks up on the grid; do not go there without L15. The new case changes contact, so it needs the ride bars too.
- Do not: rescale an existing case's thickness by hand and call it a new case.

### Rank 4 (provisional, owner's decision). Take the capillary share off the underside. Switch `?lipCap=off-underside`

- What: thin the lip from the air side only, by up to one capillary length (0.0316 h0), ramped from zero at the root to full at the tip, floor 2 cm. The top surface stays, so what a rider outside hits is unchanged; the void grows by a few centimetres. Drawn and collided together, so "one water" holds.
- Basis: Mostert's own cavity correction uses the same width. Applying it to our shape is my inference, not a sourced shape.
- Bar: mid thickness at 0.1 s at most 0.04 H; touchdown time unchanged; pop-up and seam bars unchanged.
- Risk: it is a hand correction on a simulated profile. Rank 3 is the honest route; this is the stopgap if the day-long runs wait.

### Must not, for all of these

- Do not move the throw or its depth.
- Do not low-pass anything in time.
- Do not draw a thinner sheet than the one collided, beyond the 0.10 m tip cut-outs the owner accepts.
- Do not cut the total water at touchdown below 0.10 H²; that amount is already right for a pool.
- Every change behind its switch, off by default, with its frame cost measured on the M4.

## Sources (all opened; PDFs read as text)

- Mostert, Popinet, Deike 2022, "High-resolution direct simulation of deep water breaking waves", JFM 942 A27. https://arxiv.org/abs/2103.05851
- Feddersen, Hanson, Mostert, Fincham 2024, "Modeling wind-induced changes to overturning wave shape", JFM (author's revised copy). https://falk.ucsd.edu/pdf/Feddersen_etal2024JFM_revised.pdf
- Erinin, Liu, Wang, Duncan 2023, "Plunging breakers. Part 1: analysis of an ensemble of wave profiles". https://arxiv.org/abs/2210.01925
- Erinin, Liu, Wang, Liu, Duncan 2023, "Plunging breakers. Part 2: droplet generation". https://arxiv.org/abs/2210.01923
- Watanabe, Ingram 2015, "Transverse instabilities of ascending planar jets formed by wave impacts on vertical walls", Proc. R. Soc. A 471:20150397. https://doi.org/10.1098/rspa.2015.0397 (read from https://hdl.handle.net/2115/63046)
- Pick, Feddersen 2026 (already in the knowledge base, `docs/research/water-physics/sources.md`).
- Not opened, cited second-hand only: Longuet-Higgins 1995 (jet disintegration); Saruwatari, Watanabe, Ingram 2009 (fingering).
- Code: `tools/basilisk/periodic.c:82-93`, `tools/basilisk/slope.c:61-93`, `src/wave/barrel/ProfileLibrary.ts:527-567`, `src/wave/barrel/sweptLoft.ts:1385-1510`, `src/wave/barrel/lipSheet.ts`, `src/scene/barrel/brokenCrest.ts`, `src/wave/SprayCloud.ts:727`, `src/wave/barrel/barrelLibrary.ts`, `src/wave/barrel/barrelSpots.ts:355`.
