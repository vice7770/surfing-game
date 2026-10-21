# The Canyon's white shallows: a rock floor (2026-10-22)

The owner's playtest (M4, max settings, Rich water): "There is also a white colour on the left side of the view, from
the shorter bed of the sand. This needs to be removed." From the start, looking out, a pale wedge ran from the left edge
of the view out to the peak, where the waves break.

## Reproduced

The water sheet on the Canyon (`?inpage&waterSheet&spot=canyon&compute=gpu&graphics=ultra&swell=medium`) from the
game's start view (`SpectatorCamera`'s idle overview: eye at focus + (70, 16, 95), looking at focus + (0, 0, −40),
focus (−2, −147.5)) draws the owner's frames: `00-repro-start-view-main.jpg` (main at dawn, midday and sunset).

## The cause: the raised break is drawn as sand

One dev switch at a time on one held sea (`01-cause-toggles.jpg`, Rich, midday):

| Arm | The wedge |
| --- | --- |
| main | pale, near white |
| the bed's albedo set to the deep water's reflectance (the bed unseen) | gone, entirely |
| caustics off | unchanged |
| the foam drawn magenta | unchanged: a faint lace on it, no more |

So it is the seabed seen through the water: neither the caustics, nor the foam, nor the haze (it lies 30–200 m from the
camera, where the haze is nil). From above with the bed's albedo set to red (`02-cause-bed-from-above.jpg`), the red is
the terrace the waves break on: the arm's 1 m top, its 2 m back, its upcoast end and its fan face, out to where they
reach 5–6 m.

The water's body is lit from the bed up through it (`waterBodyReflectanceLit`, Maritorena et al. 1994), with one albedo
for a whole spot (`SPOT_OPTICS`). The Canyon's is sand, 0.42/0.36/0.24, under its terrace too. Through 1–2 m of its
water (turbidity 1) the bed's share is 37/73/82 % per channel, and the body gain (×4 in Rich) takes 1 m of sand to about
0.66/1.1/0.84 (a grazing view, a high sun): near white, against a teal 0.06/0.39/0.52 over the 6 m platform.

## The owner's choice: rock

Asked whether this beach should have a reef at all (the waves come from the bed's shape, so only its colour changes),
the owner chose "Rock: a grey-brown rock bed (a rocky point or ledge), darker than sand but without the coral look" over
sand or a coral reef. A first pass drew it as live coral (Padang Padang's 0.08/0.08/0.025): it read olive-green; that
is replaced here.

## The fix: the terrace's rock floor (drawn only)

- `src/scene/water/rockBed.ts`: the rock's cover of the bed per render node: 0 sand, 1 the spot's rock, and on up to
  `ROCK_DARKEST` (1.35) darker rock. At the Canyon it is the terrace where it stands above the sand bed it is built on,
  the platform and the 1:15 beach face (`canyon` in Bathymetry.ts takes the shallowest of the three): none below 0.3 m
  of relief, all from 1.5 m (`ROCK_RELIEF`). It follows the terrace by its shape, not by coordinates: `?canyonBed=old`
  covers the old long arm (`11-old-layout.jpg`), and a redesigned terrace will be covered where it stands. It reads
  `canyonTerraceDepth`, `shelfDepth` and `shoreSlope`. Past the arm's end, where the terrace tapers into the platform, on
  the beach face inshore of the terrace's back (shallower than its 2 m trough) and on land, the floor stays sand.
- The rock's albedo, 0.14/0.12/0.09 at 650/550/450 nm (`SPOT_OPTICS.canyon.rockAlbedo`), a third of the sand's:
  weathered basalt, granite or dark sandstone reflect about 0.1–0.3 dry across the visible, warmer toward red where iron
  oxides weather them (USGS Spectral Library 7, Kokaly et al. 2017), and wetting darkens a rough mineral surface by about
  a third to a half (Twomey, Bohren & Mergenthaler 1986; Lekner & Dorf 1988), to about 0.08–0.2. It is neutral enough
  (450/550 at 0.75, against coral's 0.31) that the water over it reads grey-teal, not olive. Its darkest joints, at the
  cover's 1.35, stay at 0.04/0.04/0.04.
- The rock's texture (`ROCK_TEXTURE`, on the CPU, baked into the cover):
  - jointed blocks and boulders about 7 m across (cellular noise), each up to 10 % darker or paler;
  - their joints up to 25 % darker, only in fractured stretches (13 m value noise), so they never run as an even paving
    (`13-rock-texture-tuning.jpg`; the first rock try, joints everywhere, read as paving: `14-rock-first-try-paving.jpg`);
  - broad patches up to 12 % darker or paler (20 m);
  - sand banked in a few hollows, up to 35 % toward sand, on 11 m and 4 m noise: kept modest, as the coral's first try
    (70 % on 9 m) read as white blotches (`09-mottle-tuning.jpg`);
  - the shallowest tops (1.05–1.6 m) up to 12 % paler, barnacled and bleached.
- The cover rides in the bed texture's green channel (RG32F where a spot has a cover, R32F as before elsewhere): the
  vertex stage reads height and cover in the one lookup it made for the height, and hands the cover on in one float
  varying; the fragment stage mixes the sand albedo toward the rock's by it (on past it, beyond 1). No texture unit is
  added: the edge band stays at its 16 (`textureUnits.test.ts` counts the rock's programs too). The edge band fades the
  cover with its weight, as it does the current and the air.
- The spilling curl's body is the face's column of water, so it takes the same floor (`10-spilling-curl.jpg`, no seam).
- The seabed mesh (seen only from under the water) takes a rock colour by the same cover, on the CPU.
- Only where a spot's bed has a cover (the Canyon) is the code compiled in (`-rock-bed` in the program key): every other
  spot's programs, textures and images are as before, byte for byte. `?rockBed=off` (and the first pass's
  `?reefBed=off`, kept as an alias), or `waterRockBed(false)` (alias `waterReefBed`) in a page, draws the terrace as sand
  again, for before-and-after stills.

## Before and after

All on one held sea, `?rockBed=off` against the fix (03–08, 10, 11, 13 and 14 on High, `swell=medium`; 00–02 and 09 on
Ultra, from the first pass):

- `03-start-view-rich-midday.jpg`: the owner's view. The white wedge is a grey rock ledge under the turquoise, darker
  joints and blocks, a little sand in its hollows.
- `04-start-view-rich-dawn-sunset.jpg`: the same at dawn and sunset.
- `05-rider-view-rich-midday.jpg`: the front view behind the waiting rider, over the ledge's face: grey-teal water with
  dark rocks under it, where it was pale cyan.
- `06-face-bore-horizon-rich.jpg`: the sheet's face, bore and horizon shots. Out to sea the ledge's face shows as a
  darker tongue, where the pale stripe was.
- `07-classic.jpg`: the Classic look, the same.
- `08-from-above.jpg`: the ledge's footprint from 330 m up.
- `10-spilling-curl.jpg`: the spilling curl over the rock.
- `11-old-layout.jpg`: `?canyonBed=old`, the long arm, covered where it stands.
- `13-rock-texture-tuning.jpg`: sand, the texture as kept (A), and larger blocks with fainter joints (B).
- `14-rock-first-try-paving.jpg`: the first rock try, joints everywhere, an even paving.

## Cost (M1, the water sheet's 1280 × 720, `waterSheetGpuAB`, `?rockBed` off against on)

Measured on this M1 under heavy load from other sessions (four Node processes at 100 % CPU each), so the frame times
themselves swing widely; the A/B pairs each cycle's two frames, so its paired median holds. The shader is the same as
the coral pass's (one varying, one mix; the rock's texture is baked on the CPU):

| View | Look, preset | Cycles | Frame (median, off) | On − off (paired median) |
| --- | --- | --- | --- | --- |
| start view (rock) | Rich, High | 120 | 51 ms | +0.05 ms |
| rider view (rock) | Rich, High | 120 | 131 ms | +0.16 ms |
| start view | Rich, High | 300 | 83 ms | +0.05 ms |
| rider view | Rich, High | 300 | 55 ms | +0.14 ms |
| face | Rich, High | 120 | 123 ms | +0.04 ms |
| start view | Classic, High | 120 | 63 ms | +0.05 ms |
| face | Classic, High | 120 | 14 ms | +0.11 ms |

At most about 0.15 ms, within the runs' noise: no cliff. The cover is baked once per start, on the main thread: about
45–75 ms for the Canyon's 221 × 511 nodes, plus the seabed mesh's vertices.

## Other spots

They draw as before: no cover, so no change to their programs (no `-rock-bed` in their keys), textures or images. On
the Reef's held sea, its program key read `breakline-water-surface-rich-foam-fresh-no-streaks`, as on main.

The Reef shares the model but not the white (`12-reef-spot.jpg`, its start view and lineup, as drawn and with its bed
unseen): its reef ledge and lagoon are drawn in its carbonate sand's albedo (0.5/0.47/0.36) through its clear water
(turbidity 0.15), so the water over them is a bright cyan where the open sea is deep blue; but its whitest part, the
flat inside the crest, stays white with the bed unseen: that is the foam on the flat, not the bed. Its bed already knows
where it is reef (`materialAt`, for contact), so a cover from it would give the Reef its own floor, if the owner wants
it; left as it is here. Padang Padang is the reverse: coral everywhere, under its sand beach and channel too.
