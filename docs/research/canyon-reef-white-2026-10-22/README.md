# The Canyon's white reef (2026-10-22)

The owner's playtest (M4, max settings, Rich water): "There is also a white colour on the left side of the view, from
the shorter bed of the sand. This needs to be removed." From the start, looking out, a pale wedge ran from the left edge
of the view out to the peak, where the waves break.

## Reproduced

The water sheet on the Canyon (`?inpage&waterSheet&spot=canyon&compute=gpu&graphics=ultra&swell=medium`) from the
game's start view (`SpectatorCamera`'s idle overview: eye at focus + (70, 16, 95), looking at focus + (0, 0, −40),
focus (−2, −147.5)) draws the owner's frames: `00-repro-start-view-main.jpg` (main at dawn, midday and sunset).

## The cause: the reef is drawn as sand

One dev switch at a time on one held sea (`01-cause-toggles.jpg`, Rich, midday):

| Arm | The wedge |
| --- | --- |
| main | pale, near white |
| the bed's albedo set to the deep water's reflectance (the bed unseen) | gone, entirely |
| caustics off | unchanged |
| the foam drawn magenta | unchanged: a faint lace on it, no more |

So it is the seabed seen through the water: neither the caustics, nor the foam, nor the haze (it lies 30–200 m from the
camera, where the haze is nil). From above with the bed's albedo set to red (`02-cause-bed-from-above.jpg`), the red is
the reef's terrace: the arm's 1 m top, its 2 m back reef, its upcoast end and its fan face, out to where they reach 5–6 m.

The water's body is lit from the bed up through it (`waterBodyReflectanceLit`, Maritorena et al. 1994), with one albedo
for a whole spot (`SPOT_OPTICS`). The Canyon's is sand, 0.42/0.36/0.24, under its reef too. Through 1–2 m of its water
(turbidity 1) the bed's share is 37/73/82 % per channel, and the body gain (×4 in Rich) takes 1 m of sand to about
0.66/1.1/0.84 (a grazing view, a high sun): near white, against a teal 0.06/0.39/0.52 over the 6 m platform.

## The fix: the reef's own floor (drawn only)

- `src/scene/water/reefBed.ts`: the reef's cover of the bed, 0 (sand) to 1 (reef), per render node. At the Canyon it is
  the terrace where it stands above the sand bed it is built on, the platform and the 1:15 beach face (`canyon` in
  Bathymetry.ts takes the shallowest of the three): none below 0.3 m of relief, all from 1.5 m (`REEF_RELIEF`). It follows
  the terrace by its shape, not by coordinates: `?canyonBed=old` covers the old long arm (`11-old-layout.jpg`), and a
  redesigned terrace will be covered where it stands. Past the arm's end, where the terrace tapers into the platform, on
  the beach face inshore of the back reef (shallower than its 2 m trough) and on land, the floor stays sand.
- The reef's floor is a mosaic (`REEF_MOTTLE`): value noise at 5 and 2 m turns up to 35 % of it toward sand, as rubble
  and sand pockets among coral and turf. A first try with 70 % on 9 and 3.5 m read as pale blotches, white again from the
  start (`09-mottle-tuning.jpg`).
- The Canyon's `reefAlbedo` is Padang Padang's live coral, 0.08/0.08/0.025 at 650/550/450 nm (Hochberg & Atkinson 2003),
  so the game's two reefs share one floor; the water mixes its sand albedo toward it by the cover.
- The cover rides in the bed texture's green channel (RG32F where a spot has a cover, R32F as before elsewhere): the
  vertex stage reads height and cover in the one lookup it made for the height, and hands the cover on in one float
  varying. No texture unit is added: the edge band stays at its 16 (`textureUnits.test.ts` now counts the reef's
  programs too). The edge band fades the cover with its weight, as it does the current and the air.
- The spilling curl's body is the face's column of water, so it takes the same floor (else its lip would read paler
  than the face beside it); `10-spilling-curl.jpg` shows no seam.
- The seabed mesh (seen only from under the water, and dry on the beach) takes a reef colour by the same cover, on the
  CPU.
- Only where a spot's bed has a cover (the Canyon) is the code compiled in (`-reef-bed` in the program key): every other
  spot's programs, textures and images are as before, byte for byte. `?reefBed=off` (or `waterReefBed(false)` in a
  page) draws the Canyon's reef as sand again, for before-and-after stills.

## Before and after

All on one held sea, `?reefBed=off` against the fix (03–08 and 11 on High, `swell=medium`; 00–02 and 10 on Ultra):

- `03-start-view-rich-midday.jpg`: the owner's view. The white wedge is a mottled olive-brown reef under the turquoise.
- `04-start-view-rich-dawn-sunset.jpg`: the same at dawn and sunset.
- `05-rider-view-rich-midday.jpg`: the front view behind the waiting rider, over the reef's face.
- `06-face-bore-horizon-rich.jpg`: the sheet's face, bore and horizon shots. Over the reef the water in front of the
  wave is green-teal rather than pale cyan; out to sea the reef's face shows as a darker tongue, where the pale stripe was.
- `07-classic.jpg`: the Classic look, the same.
- `08-from-above.jpg`: the reef's footprint from 330 m up.
- `11-old-layout.jpg`: `?canyonBed=old`, the long arm, covered where it stands.

## Cost (M1, the water sheet's 1280 × 720, `waterSheetGpuAB`, `?reefBed` off against on)

Measured on this M1 under heavy load from other sessions (four Node processes at 100 % CPU each), so the frame times
themselves swing widely; the A/B pairs each cycle's two frames, so its paired median holds:

| View | Look, preset | Cycles | Frame (median, off) | On − off (paired median) |
| --- | --- | --- | --- | --- |
| start view | Rich, High | 300 | 83 ms | +0.05 ms |
| rider view | Rich, High | 300 | 55 ms | +0.14 ms |
| start view | Rich, High | 120 | 43 ms | −0.02 ms |
| face | Rich, High | 120 | 123 ms | +0.04 ms |
| start view | Classic, High | 120 | 63 ms | +0.05 ms |
| face | Classic, High | 120 | 14 ms | +0.11 ms |
| start view | Rich, Ultra | 60–200 | 35–123 ms | +0.10 to +0.26 ms |

At most about 0.15 ms, within the runs' noise: no cliff. The cover is baked once per start, on the main thread: about
25–45 ms for the Canyon's 221 × 511 nodes, plus the seabed mesh's vertices.

## Other spots

They draw as before: no cover, so no change to their programs (no `-reef-bed` in their keys), textures or images. On
the Reef's held sea, its program key read `breakline-water-surface-rich-foam-fresh-no-streaks`, as on main.

The Reef shares the model but not the white (`12-reef-spot.jpg`, its start view and lineup, as drawn and with its bed
unseen): its reef ledge and lagoon are drawn in its carbonate sand's albedo (0.5/0.47/0.36) through its clear water
(turbidity 0.15), so the water over them is a bright cyan where the open sea is deep blue; but its whitest part, the
flat inside the crest, stays white with the bed unseen: that is the foam on the flat, not the bed. Its bed already knows
where it is reef (`materialAt`, for contact), so a cover from it would give the Reef the same floor, if the owner wants
it; left as it is here. Padang Padang is the reverse: coral everywhere, under its sand beach and channel too.
