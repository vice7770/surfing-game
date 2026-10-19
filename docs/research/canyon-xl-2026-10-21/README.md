# The "Canyon at XL" clip (v4, playtest 2026-10-21): it was Padang Padang

The owner's v4 clip came from the Wave Lab: sunset, Rich water, max settings on the M4, overview camera. It showed:
- "Spilling · closes out" and surf of 4.44–4.8 m;
- a tall, straight, vertical white wall;
- a flat tan plane;
- brown chunks in the water.

It was read as the Canyon at a size above Big. It isn't the Canyon.

## 1. Which sea it was

The info card's developer rows identify the sea. Each row was rebuilt here: the water sheet holds the same sea with `?inpage&waterSheet&spot=padang&compute=gpu&height=4&period=12&direction=10&spreading=8.19&physicsDx=2&physicsDz=1`.

| Row | Owner's frame | Padang, Lab sea rebuilt | Canyon at its 3 m Lab cap |
|---|---|---|---|
| SPOT | PADANG | PADANG | CANYON |
| SWELL | Hs 4.0 m · Tp 12.0 s · 10° | Hs 4.0 m · Tp 12.0 s · 10° | Hs 3.0 m (capped) |
| SPREAD | s 8 | s 8 | s 8 |
| BREAK LINE | 262 m out · 4.76 m deep | 262 m out · 4.76 m deep | 407 m out · 4.76 m deep |
| SOLVER | GPU · 64 components · 105,120 cells | 105,120 cells | 101,760 cells |

So the clip shows **Padang Padang with a custom Lab buoy sea**:
- the height slider at its top (Padang's limit is 4 m);
- a 12 s period;
- the Lab's default 10° direction;
- spread 0.6 (s ≈ 8).

It is not a Surf size. Padang's own sizes are 1.2, 2.2 and 3.8 m at 16–18 s, square to the beach, at s = 150.

## 2. The close-out is the sea's, not a bed fault

The peel meter was read once per period. All runs use seed 1 and the game's grid at Padang (2 m along shore, 1 m across), on the CPU.

| Sea | Periods | Close-outs (< 27°) | Others |
|---|---|---|---|
| Owner's Lab sea: 4 m, 12 s, 10°, s 8 | 14 with a wave | 9 of 13 clean (median 25°) | 31°, 32°, 50°, 54°, plus 1 mixed |
| Same height and period, square, s 150 (stopped after 5) | 5 | 4 (17–19°) | 46° |
| Canyon Big: 2.4 m, 14 s, 0°, s 150 | 14 | 0 of 13 clean | 30–60°, all toward +x, plus 1 mixed |

- A 4 m, 12 s sea breaks on Padang's shore-parallel ramp, 262 m out, before it reaches the 40° wedge. It closes out whether it comes square and narrow or oblique and spread.
- Padang's Big (3.8 m at 18 s) peels left (`padang-padang-report.md`: 13 clean waves, all toward +x).
- The Canyon's Big still peels one way at its own size.
- No bed or swell change was made.

## 3. The brown chunks: the swept barrel's curl stubs

**What they are.** The chunks are Padang's swept barrel (`src/scene/barrel/SweptBarrel.ts`, `src/wave/barrel/sweptLoft.ts`):
- The barrel's phase view turns them green: open slices (`chunks-phase-view.jpg`, +6 s).
- From the owner's angle, looking into the sun, they read as tan-topped blocks with a dark teal throat (`chunks-toward-sun.jpg`, +7 to +10 s).

**Why they look like rocks on this sea:**
- **The fronts are short.** On this close-out the solver's onsets make short fronts. Over 20 s the drawn open runs were a median 5.7 m long: 17 of 36 under 5 m, 27 under 10 m. Each run takes a plunging tube from Padang's library, and each end blends into the water over only `LOFT.endBlend` (2.5 m). A 2–3 m tall run therefore stands as a block with cut ends.
- **The block has no foam.** A lifted vertex takes no foam (`sweptBeginNormal`: `vWaterFoam = (1 − sweptLift) · foam`). On a spilling close-out the solver's crest is already white, so the curl is a clean block in the foam.
- **The block is shaded as a column over coral.** It takes the depth over the bed, and Padang's bed is dark coral (`SPOT_OPTICS.padang`, albedo 0.08 / 0.08 / 0.025). Under the sunset that reads olive-brown. In `chunk-close-tests.jpg`, a deep-water bed albedo turns the block blue, while drawing the lip as a column (the sheet off) changes little.

**Padang's own Big for comparison.** The same measure gives Big runs just as short: a median of 5.7 m, 50 of 57 under 10 m. Yet the sheet's sunset curl shots show one long, foam-laced face (on a plunging face the lifted water is clean, as it should be). So run length alone is not the fault, and a minimum run length would strip Big's curls too.

**Why there is no cheap gate.** The take-off's Iribarren number reads "spilling" for Padang's own Medium (ξ 0.36) and Big (0.27) as well as for this sea (0.16). Gating the barrel on the breaker type would remove Big's tubes too.

The fix options are in the session report. Each changes how Padang's barrel looks, so each needs the owner's call and the advisor's.

## 4. The wall and the tan plane: not reproduced in this sea, but they match the patch seam

**What was ruled out.** The owner's sea was held for about 250 s of sea time and seen from more than 20 cameras, with debug paints: the seabed in magenta, the barrel's phase and region views, and the far ocean, edge band and barrel each hidden in turn. No large tan plane appeared. Ruled out:
- **The reef drying in the trough.** The inside never went below about 0.2 m deep, and the reef flat averages 1.5 m.
- **The barrel's held trough.** Its sunken, foam-free area peaked at about 5 × 5 m.
- **The edge band and the far ocean** beside the tank.
- **Sunset foam.**

**The crest light** (`waterBodyFragment`'s crest term, `CREST_SCATTER`) does draw tan sawtooth plates along crests when the camera faces a low sun. They vanish with that term off (`crest-light-on-off.jpg`). It treats 0.35 of the sunlight as scattered toward the viewer even through near-zero water, so the thinnest paths glow brightest. These plates are narrow, not the owner's plane. This is a general Rich-look issue at dawn and sunset, left for a separate look decision.

**What reproduces the look.** The owner's look reproduces closely when the Rich patch (`richPatch.ts`) is missing while the coarse water is still cut under its 96 m rectangle (`patch-hole-forced.jpg`):
- the seabed shows through as a smooth tan sand plane with straight edges;
- the water resumes at the far edge as a raised step;
- the cut wave's edge stands up as a wall.

That is the same artifact as v3-seam (3.7 s) and v5 from the same playtest, at other spots on calm seas. It belongs to `claude/patch-seam`. To force it here, the patch mesh was moved 50 m down after `placePatch`. The in-game trigger was not found.
