# Open decisions, 2026-10-22: the curl stubs' foam and the glow's MSAA

The owner's call on two open decisions was "use the recommended". Both are built on `claude/open-decisions`.

## 1. Padang Padang's curl stubs: option (a)

**The problem** (`../canyon-xl-2026-10-21/README.md`, section 3): on a close-out, short swept-barrel runs stood as clean blocks in the whitewater. They read as olive-brown at midday and tan toward a sunset sun, like rocks. A lifted curl vertex took none of the solver's foam.

**The fix.** A drawn slice keeps the solver's foam on its lifted water when its crest is broken: when the solver's foam is whitewater both on the crest and down the face below it.
- The code is in `src/scene/barrel/brokenCrest.ts`, wired through `SweptBarrel.draw` and `SweptBarrelMesh.update`.
- A clean crest's curl is drawn exactly as before, byte for byte.
- It is drawing only:
  - The existing `sweptLift` attribute carries the lift less the kept share. That attribute only weighs the foam.
  - No new attribute, sampler or program. `textureUnits.test.ts` passes.
  - The loft, the water mask, the contact and the camera's water are untouched.
- Dev A/B on one held sea: `waterSheetBarrel.brokenFoam = false` draws it as before.

**The reading** is per slice, on the drawn water:
- It reads the solver's foam under the crest landmark, and halfway from the crest to the toe.
- It takes the lesser of the two:
  - lace riding on a clean face's crest does not count;
  - nor does old foam on the face below a clean crest.
- Weight: smoothstep from 0.55 (none kept) to 0.8 (all kept). Big's lace background reads about 0.5.
- Before touchdown the slice reads the water as it is. After touchdown it holds its last reading, kept by front and metre of crest x, because the crash's own foam arrives then.

### What the solver's foam shows

The first version held each place's whitest reading since its front's join. On Big, that turned 60 % of the visible curl white.

Big's crests are whitewater before the throw too: the solver's own onset leads the lip by up to 2 s. The crash withholds the breaking over the curl from the join, so this onset whitewater fades as the tube opens.

The lesser of crest and face foam, by the slice's clock τ (s), on Big's own sea:

| τ | −1.0 | −0.5 | 0 | +0.5 | +1.0 | at touchdown (face) |
|---|---|---|---|---|---|---|
| foam | 0.86 | 0.83 | 0.49 | 0.28 | 0.24 | 0.82 |

**Close-out.** On the close-out, the outer break's crests read clean (about 0.1). The stubs inside stand on bores and read 0.7–0.8 on the crest and face while they are open. So the slice reads the water as it is: by the time the curl is drawn open, the onset's foam has gone, while older whitewater stays.

### Result

Visible slices (open or collapsing, weight above 0.3), sampled every 0.5 s for 20 s after each sheet's hold (GPU, 64 components):

| Sea | Slice samples | Keep more than half | Keep none | Mean kept |
|---|---|---|---|---|
| Lab buoy Hs 3.8 m, Tp 12 s, square (close-out) | 820 | 22 % | 71 % | 0.20 |
| Padang's Big | 1883 | 18 % | 72 % | 0.17 |
| Big, outside (z < −100) | 1008 | 7 % | | |
| Big, inside | 875 | 30 % | | |

**For the owner to judge:**
- **Big's outside tubes are unchanged.** See the `big-outside-*` stills.
- **Big's inside curls change where they stand in whitewater.** The sheet's held Big curl is 31 m long, on the inside (z −13). Its +x half stands in whitewater: the solver's crest and face read 0.80–0.88. That half now keeps the foam (41 of 64 slices).
- **Levers, if Big's inside should stay as it was:** the thresholds (`BROKEN_CREST`), or a switch per spot.
- **The sunset tan is the crest light.** The tan tint left on a lip seen against a low sun is the crest light, not the column body. It is a separate look decision (`../canyon-xl-2026-10-21/README.md`, section 4).

### Stills

Each still is before (top) and after (bottom) from one held sea, Rich look, `waterSheetPair` with `brokenFoam` off and then on.

| File | What it shows |
|---|---|
| `closeout-stub-a-toward-sun-sunset.jpg` | The 4 m stub at the close-out's hold (x 85–89, z −56), looking into the sunset sun. The tan block turns to whitewater. |
| `closeout-stub-a-toward-sun-midday.jpg` | The same stub at midday. |
| `closeout-stub-a-phase-view.jpg` | The barrel's phase view on that stub: green open, red after touchdown. Below it, the stub as drawn. |
| `closeout-stub-b-toward-sun-sunset.jpg` | A 5 m stub 4.5 s later (x 116–121, z −7), toward the sun. |
| `closeout-stub-b-behind-midday.jpg`, `closeout-stub-b-behind-sunset.jpg` | The same stub from seaward: an olive block in the white water before; laced like the water around it after. |
| `big-outside-tube-midday.jpg`, `big-outside-tube-toward-sun-sunset.jpg` | Big's outside tube on a clean crest (x −62 to −58, z −187): identical before and after. |
| `big-inside-curl-channel-sunset.jpg`, `big-inside-curl-front-midday.jpg` | Big's held inside curl: its +x half, on whitewater, keeps the foam. |

**Reproduce:**
- Load `?inpage&waterSheet&spot=padang&compute=gpu&height=3.8&period=12&direction=0` (the close-out), or `&swell=big` in place of the height and period.
- Run `waterSheetPair(view, 'rich', 'sunset', [{ label: 'before', set: () => { waterSheetBarrel.brokenFoam = false } }, { label: 'after', set: () => { waterSheetBarrel.brokenFoam = true } }], 'pair.jpg', 0.75)`.

## 2. The glow's MSAA: 2× by default

With the glow on, the HDR scene target now draws 2× MSAA (`GLOW.samples`, `src/scene/glowMath.ts`). It cost about +0.75 ms on the M1, against about +2.8 ms at 4×.
- `?glowMsaa=4` keeps 4×. Any other value gets the default.
- The glow adds about 39 bytes a pixel, in place of 63.
- Glow-off rendering is unchanged: the canvas keeps its own 4× antialias.
- No setting or help text names the sample count. "Glow and colour grade" is unchanged.

## Checks

- `tsc --noEmit`: clean.
- Tests run with `vitest --maxWorkers=2`:
  - `src/scene/barrel/` (with the new `brokenCrest.test.ts`) and `src/scene/textureUnits.test.ts`: 67 passed;
  - `glowMath`, `GlowPass`, `settingsModel`, `Settings` and `Graphics`: 93 passed.
