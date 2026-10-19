# The horizon haze on the land, lips, tubes and spray (2026-10-20)

A step-7 follow-up of the web-ocean plan, on `claude/haze-land` (from `claude/playtest-2026-10-20` at 3064e25f: the
main line `claude/wave-pool` with #120 and the foam freshness). It closes the first item of
`horizon-haze-2026-10-17/README.md`'s "Open" list: at 1 km the Rich water took 28 % haze and the sand beside it none.

Rich only. Classic's programs are the text they were (tested). The Rich tank, its edge band and the far ocean are byte
for byte as before: their compiled programs, with every option a spot turns on, were dumped before and after and
compared (64 of 64 the same). The haze GLSL the water uses was split into shared pieces with the same text. Nothing
felt changes. No sampler anywhere; the texture-unit guard passes.

## What is hazed now

The water's law and the water's uniform objects (`horizonHazeUniforms`), in `src/scene/water/hazeLand.ts`: what lies
d m off keeps e^(−βd) of its colour (β = 3.912 / 12 km) and takes the rest from the horizon's colour in its direction
(the photo's ±1° ring, turned with it; its AgX preimage under the glow), mixed over the tone-mapped colour before its
encoding, as the water's. The one `applyHorizonHaze` call reaches everything: no haze under water, none before a
photographed sky.

| drawing | where | route |
| --- | --- | --- |
| seabed and dry sand (`SpotSeabed`) | every spot | per vertex (one varying) |
| lip sheets (`LipSheetMesh`, Rich) | every spot | per pixel, from its `vLipWorld` |
| spilling curl (`SpillingCurlMesh`) | the Canyon | per pixel, from the water's `vWaterWorld` |
| swept barrel (`SweptBarrelMesh`) | Padang Padang | per pixel, from the water's `vWaterWorld` (not in its dev views) |
| spray, mist and foam balls (`SprayPoints`, Rich) | every spot | per sprite (one vertex is one sprite) |
| edge whitewater (`EdgeWhitewater`) | the open sides | through the lip's and the spray's materials, which its mirrored copies share |
| bubbles (`BubblePoints`) | above water | per point |
| riders, boards, leashes (`SurferView`, `createBoardMesh`, `LeashCord`) | local and online | per pixel, from three's `vViewPosition` |
| the Wave Pool's deck, walls, hall and ground (out to 1.5 km) | the pool | per pixel, from `vViewPosition` |

- The per-pixel route does nothing nearer than 25 m (`HAZE_NEAR`): the haze there is under 0.82 %, within a level of
  255. A rider, the curl at the face and the barrel from inside are mostly that near.
- The drawings with a look of their own (lip, curl, barrel, spray) haze in their Rich programs. The rest follow the
  water's look (`setHazeLandLook`, from main's `applyWaterLook`) through their program key.
- Dev: `?hazeLand=off` (or `window.waterHazeLand(false)`) draws everything but the water as before.
  `?hazeLand=vertex|pixel` forces one route wherever a drawing can take either.
  `window.waterHazeLand({ sites: { barrel: 'vertex', seabed: 'off' } })` sets one drawing alone.
  `?horizon=off` and `?horizonHaze=off` turn the land haze off with the water's.

### Which route where (timed, not assumed)

- **The seabed is per vertex.** I first put it per pixel, from the foam work's lesson that varyings cost more than
  arithmetic. Timed alone (High, the Canyon, water hidden so the whole seabed shows), per pixel cost +0.8 to
  +1.6 ms and per vertex +0.3 to +0.7 ms: its small MeshBasic program pays less for a varying.
- **In the game the water hides the seabed by depth.** It is drawn first: three sorts opaque drawings by material id,
  and the water's is older (11 against 12). So only the sand in sight pays.
- **The thin sheets (lip, curl, barrel) stay per pixel.** Timed at the Canyon's curl (frame by frame, below), the two
  routes came within 0.1–0.2 ms of each other, inside the noise. Per pixel adds no varying to the big Rich programs,
  and the near cutoff spares their largest areas.

## Where the land meets the horizon

Hazed all the way, the sand is the sky's horizon pixel, as the water is. This was checked in the page with β forced
to 0.05/m (80 m visibility), from the Canyon's overview turned along the beach at midday. The table compares the sand
with the water just below it and the sky 4 px above it (0–255):

| column | sand | water below | sky above |
| --- | --- | --- | --- |
| glow off, x 700 | 126.6 129.0 146.2 | 126.6 129.0 146.2 | 125 126 144 |
| glow off, x 1100 | 128 132 151 | 128 132 151 | 125 128 145 |
| glow on, x 700 | 126.6 129.4 146.4 | 126.4 129.4 146.4 | 125.4 125.8 144 |
| glow on, x 1100 | 128.2 132.2 151 | 128.2 132.2 151 | 124.2 127.8 144.8 |

- Sand and water reach the same value to within 0.2, glow on or off.
- Both sit within 2–6 of the sky pixel above them. The ring is the ±1° band's mean, so the water was this close
  before too.

## Cost

The budget was ≤ +0.3 ms a frame at the Canyon and Padang Padang on Medium and High.

**How it was measured.** M1, pane hidden, the GPU timer, 1280×720 at pixel ratio 1, `&compute=gpu`. The Canyon ran
its medium swell (the curl largest); Padang Padang ran its practice hold on an open barrel.

**Why the method changed.** Another process kept the GPU at 98–100 % the whole time (`ioreg`'s Device Utilization,
measured with my page idle). Frames that take 14 ms alone took 30–100 ms in its bursts. Timing each arm over its own
batch of 20–40 frames, alternated over 10–20 rounds as the brief asked, left the off/off control 0.5–1 ms apart
(once 4 ms). That is far wider than the budget.

So `waterSheetGpuAB` (new, dev) times the arms frame by frame in turn: off, on, off again, the order turned every
cycle. Each figure below is the median over 40–80 cycles of a frame less the "off" frame of the same cycle. Each
shot ran 3–7 times; the table gives the median of those runs, with the off/off2 control beside it.

| spot · preset | shot | off, ms (the runs' medians) | on − off | off2 − off (control) |
| --- | --- | --- | --- | --- |
| Canyon · High | lineup | 16.9 | +0.02 | +0.02 |
| | face (curl at the face) | 30–106 | +0.02 to +0.09 | −0.02 to 0.00 |
| | overview | 39–88 | +0.02 | −0.02 |
| | overview along the beach (sand) | 58–78 | −0.03 | −0.05 |
| | curl 60 m off | 25–87 | **+0.23** (7 runs: −0.36 to +0.64) | +0.01 (−0.32 to +0.45) |
| Canyon · Medium | lineup | 14.6 | −0.15 | +0.14 |
| | face | 26–92 | +0.05 | −0.01 |
| | overview | 33–75 | +0.05 | −0.08 |
| | overview along the beach | 52–82 | +0.05 | −0.04 |
| | curl 60 m off | 44–77 | **+0.16** (4 runs: +0.14 to +0.23) | −0.11 |
| Padang · High | lineup | 17.6 | −0.06 | −0.02 |
| | barrel from the channel | 11.9 | +0.02 | +0.03 |
| | barrel from behind | 28–72 | **+0.13** (+0.10 to +0.29) | +0.03 |
| | inside the barrel | 13.0 | −0.05 | −0.01 |
| | overview | 33–55 | −0.03 | −0.05 |
| | barrel 150 m off | 18.4 | +0.05 | +0.04 |
| Padang · Medium | lineup | 12.9 | −0.13 | −0.06 |
| | barrel from the channel | 10.7 | −0.10 | −0.01 |
| | barrel from behind | 15.3 | −0.20 | +0.05 |
| | inside the barrel | 11.7 | −0.05 | +0.01 |
| | overview | 21–28 | −0.02 | −0.07 |
| | barrel 150 m off | 13.0 | −0.08 | −0.02 |

**Reading.** Everywhere within the budget. The largest is the Canyon's curl at mid-distance: +0.16 ms on Medium and
+0.23 ms on High. There the curl lies past the near cutoff, and the break's spray is in frame. Where the water alone
fills the frame (lineup, overview), it costs nothing measurable. The Padang Medium runs came in a quiet spell (steady
baselines), and the hazed programs there ran 0.05–0.2 ms *faster*, consistently over the three runs. I can only guess
why (a different compile of the barrel's program); it is not a saving to count on.

**Timed apart, to choose the routes.** Canyon, High, the water hidden so each drawing shows whole; batch runs, p10
and fastest frame against the off/off control, ±0.1–0.4 ms:

- the whole seabed: per pixel +0.8 to +1.6 ms, per vertex +0.3 to +0.7 ms;
- the curl: either route within ±0.3 ms of nothing, at the face and at 60 m;
- the spray: within the control.

In the game the water hides all but the dry sand (above), so the seabed's share there is the sand's.

Not timed: the Wave Pool (scenery per pixel, beyond 25 m), the riders online (the sheet draws none), and Low, which
draws Classic.

## Stills

Rich, High, glow off, from the water sheet (`?inpage&waterSheet&spot=…&compute=gpu&graphics=high`). Before is
`waterHazeLand(false)` on the same held sea and the same frame. The time sheets have before on top and after below,
with dawn, midday and sunset left to right. The crops are full-resolution pixels, 2–5× enlarged.

**At 12 km visibility the change is small, as the maths says it should be.** The far sand, 400–600 m off, takes 13–18 %
haze. A curl or barrel 150–300 m off takes 5–9 %. So each set also has a *diagnostic* at 326 m visibility (β forced to
0.012/m in the page, the land haze off above and on below). It shows plainly what is hazed and that it meets the water
and the sky.

| still | read |
| --- | --- |
| `beach-lineup-shore.jpg` | From 1.6 m, toward the far beach (the horizon-haze notes' open case). The sand strip's far end now greys with the water beside it, mauve at dawn and blue-grey at midday. |
| `beach-lineup-shore-sand.jpg` | That strip at 2×. Mean change 0.7–0.9 of 255 over the crop, 13–23 % of its pixels by more than 2, most at the far end. |
| `beach-lineup-shore-sand-forced.jpg` | Diagnostic. Off: a sharp yellow strip on a fogged sea. On: it melts into the haze with the water (mean change 7–13). |
| `beach-overview-shore.jpg`, `-forced.jpg` | The overview turned along the beach. The far end of the dune greys; in the diagnostic the whole beach fades into the fog with the sea instead of standing out. |
| `beach-overview.jpg` | The game's own overview, which frames no sand: before and after are the same (a control). |
| `canyon-overview-shore.jpg`, `canyon-overview-shore-sand-{dawn,midday,sunset}.jpg` | The Canyon's long beach from 16 m. Its last few hundred metres take the dawn mauve and the sunset gold of the haze band behind them, as the water in front of them does. |
| `canyon-lineup-shore.jpg`, `canyon-lineup-shore-sand-midday.jpg` | From the lineup, the sand is a thin line on the horizon; after, a shade nearer the sky's band. |
| `canyon-curl-150m.jpg`, `canyon-curl-300m.jpg` | The medium swell's spilling curl from 150 and 300 m, 2× crops. To the eye before and after are the same: mean change ≤ 0.01 of 255, under 0.1 % of pixels by more than 2. |
| `canyon-curl-150m-forced.jpg` | Diagnostic. Off: dark teal flecks of curl at the horizon line. On: they go into the fog. |
| `padang-barrel-150m.jpg`, `-crop.jpg`, `padang-barrel-300m-crop.jpg` | The swept barrel from the channel. At 300 m (5×) its dark throat is a shade lighter after; at 150 m the change is under a level. |
| `padang-barrel-150m-forced.jpg` | Diagnostic, 3×. Off: a sharp teal barrel sits in a fully fogged sea. On: it fades with the sea, and only its brightest foam glints through. |
| `padang-overview.jpg` | The game's overview with the barrel 125 m off: no visible change. |
| `padang-barrel-forced-glow.jpg`, `padang-barrel-150m-glow.jpg` | Glow and grade on (Medium preset). Diagnostic at 489 m visibility: off, the teal barrel and the far sand on the left stand out of the fog; on, both melt into it with the sea, as with the glow off. At 12 km, no visible change at 150 m. |

Glow on: the land check above was repeated with the glow and grade on. Sand and water still meet the same value, and
that value is the glow-off one.

The Beach and Canyon sets were shot while the seabed was still per pixel; its route changed afterwards. Per vertex
on its 2–30 m grid the result is the same to well under a level. Along a 30 m edge, the haze's curvature leaves an error
of β²(Δd)²/8 ≈ 10⁻⁵. A triangle near enough to span more than one ring bin (11°) lies within about 150 m, where the
haze is under 5 %.

## Still open

- **The land's far edge.** The seabed mesh ends 600 m along the shore and 30 m inland. There it keeps 82 % of its
  colour against the sky. A far rim like the far ocean's, which takes the rest of the way to the horizon, or land
  meshed out toward the horizon, would finish the meeting at the far end. That is new geometry, not haze. At the
  Beach, from the overview turned along the shore, the sand's inland edge also shows as a cut slab.
- **The 0.3 ms budget was met on a GPU another process held at 100 %.** The owner's shown-pane timing on an idle M1
  (`waterSheetGpuAB(view, 'rich', arms)` with `waterHazeLand(false)` / `(true)`) is the check that counts. The Canyon's
  curl at 60 m on High (+0.23 ms) is the case to watch.
- **The Wave Pool and online riders** are hazed but untimed. The pool's ground runs out to 1.5 km, per pixel. Riders
  lie past 25 m only when far.
- **Visibility is still one constant (12 km)** for the water and the land alike, as in the horizon-haze notes.
