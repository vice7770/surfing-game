# The compressed turn's exit (compress-exit, 2026-10-29)

Found in #167 (bottom-stop): out of a compressed bottom turn at the Canyon's Big, letting Compress go lifted the rider
off the deck at +1.1 m/s, the unloaded board slowed under him, and he fell 2.1–2.7 s after standing.

This work was done on the M1 Air (8 GB), branch `claude/compress-exit`, from main at 2b1890a4. It used headless
`RideSession` probes only, with no SurfZoneRunner rider sessions.

## In short

- **The cause: letting Compress go, the legs extended at a jump's pace.**
  - The leg's rest rose at up to 1.25 m/s, accelerating at EXTEND_ACCELERATION's 1.5 g: a 2.5–3 body-weight push.
  - The body rose 1.4 m/s off the deck (+1.1 m/s over the ground).
  - The board then came off the bottom and rolled out of the turn. The deck stopped rising under the feet and dropped
    away, the leg's push fell to zero, and the feet left it for about 0.4 s.
  - The unloaded 5 kg board turned and slowed under the airborne rider, who landed off it and fell.
- **The physics:** the leg is a spring under the body (Blickhan 1989's spring-mass leg). It sags m g / k under the
  body's weight. A body rising at v along it swings about that sag by v / ω (ω = √(k/m)), so if the deck stops under the
  feet they leave it once v > g / ω = g·√(m/k). That is the jump's take-off: the push falls to zero with the body still
  rising (Linthorne 2001). For the reference rider (73 kg), that is 0.40 m/s at the riding stance's 44 kN/m and
  0.57 m/s at Compress's softened 22 kN/m. The extension ran at two to three times that.
- **The fix:** letting Compress go, the legs rise no faster than g·√(m/k) (`projectionCatch` in `AttachedRider`).
  - Only Compress's release: the pumping crouch let go keeps its pace, which the pumps' tests and the stance map pin.
  - Coaches read the bottom turn's extension as progressive (De Sousa 2022), and river-wave turns load the knees at
    45–90 N·m (Weiß et al. 2024), not a jump's push.
- **Not the carry:** with CARVE_CARRY off the riders fell the same way, at the same times. The carry does add about
  1.1 m/s over a 0.8 s compressed turn on the Big face, which brings the top speed to Farley's 12.5 m/s (below).
- **The result on wave 9 (Big seed 1, seven standing riders each way):** 7 and 6 of 7 ride on, against 1 and 4.
- **Big sets (seeds 1–2, the catch probe's compressed-turn scripts, 8 stands each):** turning left, 3 ride 3 s and
  3 ride 5 s, against 1 and 1; turning right, 1 and 1, unchanged.
- **Not all of it:** on other set waves most compressed turners still fall about 0.8 s after letting go, at any pace of
  extension tried. There the board leaves the water about 0.45 s after the release (its wetted area 0.19 → 0.08 m²,
  no volume under) and slides out from under the rider when it lands. It is a second mechanism, diagnosed below and
  left open.
- **The projection's timing:** the riding stance comes 0.72 s after letting go (0.47 s before), and the tall stance
  from 0.87 to 1.35 s (0.6 to 1.1 s). The drawn knees straighten later.
- **Phase 5's bars hold:** the still-water compressed turn, the projection let go at 12° and 25°, the W/S range, the
  stance map, the pinned fails and the pumps.
- **The A/B switch:** `?extension=old`. Online rooms run the default. Every spot.

## Reproduce first

`bottom-replay.ts` (from #167) on the same sea: Big seed 1 at t 151.9 s (wave 9), eight riders 4 m apart, each turning
with Compress and the steer from 0.6 s after standing for 0.8 s, then letting both go. One rider (dx 0.6) falls
popping up in every run. `--trace-dx D` now also logs the leg: its rest and rate, extension, rate and push, the load it
feels, the bank, the carry and the assist, the sway, contact and flight.

The faller at dx −1.7, turning left, before (`--extension old`) and now:

| t after standing, s | 1.40 | 1.50 | 1.60 | 1.70 | 1.80 | 1.90 | 2.00 | 2.10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Before: the leg's rest, m | −0.29 | −0.21 | −0.10 | −0.04 | −0.01 | +0.01 | +0.03 | +0.04 |
| Before: the leg's push, body weights | 1.55 | 2.44 | 2.13 | 0.43 | −0.36 | −0.27 | 0.10 | −2.08 |
| Before: the body's rise, m/s | −1.19 | −0.47 | +0.92 | +0.85 | −0.04 | −0.85 | −1.36 | −2.24 (falls) |
| Before: the board's speed, m/s | 12.21 | 12.50 | 11.62 | 11.61 | 10.69 | 11.98 | 11.20 | 8.96 |
| Now: the leg's rest, m | −0.29 | −0.24 | −0.19 | −0.15 | −0.10 | −0.06 | −0.03 | −0.00 |
| Now: the leg's push, body weights | 1.55 | 1.94 | 1.85 | 1.06 | 0.53 | 0.83 | 1.08 | 1.17 |
| Now: the body's rise, m/s | −1.19 | −0.60 | +0.26 | +0.50 | +0.18 | −0.14 | −0.25 | −0.16 |
| Now: the board's speed, m/s | 12.21 | 12.43 | 11.72 | 11.85 | 11.42 | 11.44 | 11.31 | 11.22 |

- Before, the push peaks at 2.4 body weights 0.1 s after letting go, and the body rises at +0.9 m/s. From 1.75 s the
  push is gone (negative: the spring would have to pull). The body comes up out of its lean (38° → 21°) in the air,
  while the board turns on and slows under it, 11.2 → 9.0 m/s, and the rider falls at 2.17 s.
- Now the push stays between 0.5 and 1.9 body weights, the body rises at most +0.5 m/s, and the rider stands through
  at 11–12 m/s, upright by 2.2 s.

### What it was not

On the same wave, each change alone, seven standing riders a side (left, right; 1 and 4 of 7 ride on as main is). The
changes to the legs and the carry were temporary hooks, since removed (`runs/w9-try-*`):

| Change | Ride on | Top speed, m/s |
| --- | --- | --- |
| CARVE_CARRY off | 1, 1 | 11.2–11.4, 11.0–11.2 |
| No tall stance (EXTENSION_TALL 0) | 1, 0 | 12.4–12.6, 11.9–12.3 |
| Compress held on after the turn (never let go) | 7, 7 | |
| Compress alone, no steer, then let go | 7, 7 | |
| Compress let go 0.3 s after the steer | 4, 4 | |
| Compress let go 0.6 s after the steer | 5, 2 | |
| The steer alone, no Compress | 6, 6 | 11.4–12.3 |
| The extension's acceleration 6 m/s² (not 15), every extension | 2, 3 | |
| The extension at most 0.8 m/s, every extension | 4, 4 | |
| The extension at most 0.5 m/s, every extension | 7, 6 | |
| **The catch, g·√(m/k)** | **7, 6** | 12.4–12.6, 11.9–12.3 |

- Neither the carry nor the tall stance throws the riders: the falls come from letting Compress go after a turn.
- Released riding straight, or held, the riders stay on. After a turn the board comes off the bottom and rolls flat
  under the extending body, and the deck drops away under the feet.
- The pace of the extension decides it. The catch is the physical bound on that pace, and it lands where the probe
  does.

The remaining faller (dx −0.6, turning right) extends at the catch's pace, the push still 1.2 body weights 0.3 s after
letting go. Then the deck drops away under the feet as the board comes off the bottom (its fall 0.2 → 0.7 m/s), the
push goes, and the light board slides 3 m/s sideways from under the body. That is the board leaving the rider, not the
push throwing him.

### The carry and the top speed

- The carry (CARVE_CARRY, the owner's gameplay rule of 2026-10-07) pushes the body along the path while Compress and the
  steer are held, by 0.4 of the pull its bank balances. On flat water it gives back the speed the carve sheds. On the
  Big face, where gravity already feeds the turn, it adds about 1.1 m/s over the 0.8 s turn: tops of 12.4–12.6 m/s
  against 11.2–11.4 without it.
- Farley et al. 2012 measured competitive surfers' top speed at 12.5 m/s (their mean maximum 9.3 m/s). So the scripted
  compressed turn reaches the measured top, and holding it for 1.6 s reaches 13.3–14.0 m/s.
- Tried: the carry capped at the turn's entry speed. Speeds fell to 10.8–11.4 m/s, but 6 of 7 riders turning right
  then lost the board 2.6–3.4 s after standing. Not built; the carry is the owner's rule.

## Measured

### The Big sets

The catch probe's sets at Big (faces ≥ 2.29 m from 3 m out, seeds 1 and 2, five sets each, the feathered stroke),
ridden on to 6 s after standing. `turnL` and `turnR` turn with Compress and the steer from 0.6 s after standing for
0.8 s, then let both go. "Before" is main at 2b1890a4 (#167's runs).

| Script | Stands | Ride 3 s, before → now | Ride 5 s, before → now | Median ride, before → now |
| --- | --- | --- | --- | --- |
| turnL | 8 of 10 | 1 → 3 | 1 → 3 | 2.28 → 2.78 s |
| turnR | 8 of 10 | 1 → 1 | 1 → 1 | 2.32 → 2.35 s |

Every wave (29 a script, 16 stands): turnL 3 → 6 riding 3 s and 3 → 6 riding 5 s; turnR 3 → 4 and 3 → 3.

- The catches, pops and stands are the same before and after: the change acts only once Compress is let go.
- Turning left, the set wave 9 of seed 1 and wave 13 of seed 2 now ride on to 6 s, and wave 2 of seed 1 a little
  longer. The rest fall about as before, 2.2–2.8 s after standing.

### What still throws them: the board leaving the water

Seed 2's set wave 8 (sea saved at t 144.8 s), eight riders a side:

| Script | Left: ride on | Right: ride on |
| --- | --- | --- |
| Straight | 8 of 8 (both) | |
| The compressed turn, let go, before | 0 | 0 |
| The compressed turn, let go, now | 2 | 1 |
| Compress held on after the turn | 7 | 8 |
| Compress alone, then let go | 8 | 8 |
| The steer alone | 4 | 8 |
| Letting go at half and 0.7 of the catch's pace | 2, 2 | 7, 5 |

The faller at dx −1.7, turning right, now:
- the legs extend at the catch's pace (0.45–0.55 m/s) and the push stays 0.7–2.0 body weights for 0.4 s;
- the body rises out of the turn at up to +0.56 m/s while the board's fall stops (−1.07 → −0.25 m/s);
- from 0.4 s after letting go the board runs out of the water on the 12° face: wetted area 0.19 → 0.08 m², no volume
  under, the lowest point at the surface;
- the board then falls at about g (−0.25 → −1.20 m/s in 0.1 s) and the push goes to nothing;
- landing, it is kicked sideways: it turns 17° away in 0.3 s (its sideways speed 7.0 → 3.8 m/s against the rider's
  6.9), and the rider falls the other way, 'lost board', 0.9 s after letting go.

Tried on this wave, none of which holds them: a slower catch (above), the legs following a rising body when the feet
go light (keeping half or 0.8 of the weight on them: 3 and 6 of 16), the feet no longer held neutral through the
projection (0 of 16), and the steer kept on for 0.5 s after letting go (0 of 16). The fall needs both the turn and
the release. It is a second mechanism: the board's own response to being unloaded while it comes off its rail at
11 m/s. Left open.

### Phase 5's bars

All pass with the catch (the bars of `docs/superpowers/plans/2026-10-22-phase5-physics.md` §0):

| Bar | Before | Now |
| --- | --- | --- |
| The still-water compressed bottom turn, 90° in ≤ 1.15 s keeping > 0.85 (`compressTurn`) | passes | passes (held: the catch acts on letting go) |
| The projection let go at 12° keeps > 0.83 (`projectionLean`; 7.3 and 8.5 m/s) | 0.885, 0.881 | 0.885, 0.883 |
| … at 25° keeps < 0.74 | 0.633, 0.729 | 0.645, 0.715 |
| W/S moves the feet's pressure as far compressed as standing (`stanceLadder`) | passes | passes |
| The stance map's targets and pinned misses (`stanceTargets`) | passes | passes |
| The pinned physics fails (`AttachedRider.test`, `bodyFilm`) | expected fail | expected fail |
| The pumps (`pumping`), the cutback, the lean-out | pass | pass |

Applied to every extension, not only Compress's (tried first), the catch moved the pump's extension weight on the
stance map, the drawn hands in a pump and the tube tuck's rise: so it is Compress's release only.

On flat water (`runs/flat-exit.txt`), out of a 0.5–0.8 s compressed turn at 9 and 11 m/s, the leg's least push after
letting go is 0.58–0.77 body weights now against −0.29 to 0.64 before, the body rising off the deck at 0.74–0.93 m/s
against 1.26–1.55.

## Tests

- tsc: clean.
- Main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 2928 passed, 18 expected fail, 36 skipped; `uniformSnapshot`'s Canyon bytes timed out
  under the probes' load (70 s against 60 s) and pass on their own.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`:
  21 passed (83 skipped by the filter), 20 min.
- **New and changed (`stanceLadder.test.ts`):**
  - letting Compress go, the legs rise no faster than the softest leg's catch (0.57 m/s), where at full pace they rose
    over twice as fast;
  - out of a compressed turn at 9 and 11 m/s on flat water, both ways, letting Compress and the steer go keeps over half
    the weight on the feet, where at full pace, at 9 m/s, the push fell below nothing;
  - the projection's rise: the riding stance by 0.6 s and tall from 0.9 to 1.3 s now, the old 0.4 s and 0.7–0.95 s
    kept for `extension: 'old'`.
  - `PhysicalMode.test.ts`: the `?extension=old` switch at every spot, and online rooms on the default.
- No rider sessions.

## Open

- **The carry on a wave:** it lifts the scripted compressed turn to the measured top speed, and past it when held. Capped
  at the entry speed, the riders slowed enough to be overtaken by the wave. The owner's call.
- **The pumping crouch let go** extends at its old pace. The same physics applies, but the pumps' tests and the stance
  map pin that pace, and no fall was traced to it.
- **The projection looks slower:** the knees straighten over about 0.7 s, where the phase-5 plan noted they were
  already late at 0.3 s.
- **The board leaving the water after the release** (above): on most set waves the compressed turner still falls
  about 0.8 s after letting go. The next item, if the owner sees it too.

## Shot list for the owner

1. **Canyon, Big, a set wave: a compressed bottom turn, then let go of Compress and the steer together.**
   - Before, the rider hopped off the deck about 0.2 s after letting go and fell within a second.
   - Now the legs straighten over about 0.7 s and the feet stay on. Say whether it reads as a projection or as slow.
   - Say whether you still fall about a second after letting go. If you do, watch the board: does it skip out of the
     water and kick sideways under you?
   - Repeat with `?extension=old` for the A/B.
2. **The same, but let go of Compress only once the board has come round and is climbing.** The probes suggest a
   release with the board carrying on up the face holds better. Say whether it does.
3. **Top speed:** hold a compressed bottom turn longer, about 1.5 s, on a Big set. The carry takes it to 13–14 m/s, past
   the fastest measured surfers (12.5 m/s). Say whether it feels too fast.
4. **Pumping down the line (Medium, any spot):** crouch and let go of the crouch in rhythm. Nothing should change.
5. **Online room:** the same as the default, whatever the URL says.

## Tools

Build each tool with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.

- **`bottom-replay.ts`** (bottom-stop) adds:
  - `--turn-compress c`, `--turn-steer s`: how far Compress and the steer are held through the turn (0: none);
  - `--compress-after c --compress-after-for s`: Compress held on after the turn;
  - `--steer-after s --steer-after-for t`: the steer held on after Compress is let go;
  - `--extension old`;
  - `--trace-dx` logs the leg, the carry, the sway and the flight.
- **`catch-probe.ts`** (canyon-catch) adds `--extension old`.

## Sources

- Blickhan, R. (1989). The spring-mass model for running and hopping. Journal of Biomechanics 22(11–12), 1217–1227.
- Linthorne, N. P. (2001). Analysis of standing vertical jumps using a force platform. American Journal of Physics
  69(11), 1198–1204.
- De Sousa, M. (2022). Development of an observation tool for the Bottom-Turn manoeuvre in surfers. Master's
  dissertation, Faculdade de Motricidade Humana, Universidade de Lisboa.
- Weiß, A., Koelewijn, A., Masmoudi, I. & Lluch, È. (2024). Combining pose estimation and inertial measurement tracking
  data for a biomechanical simulation of river wave surfing using optimal control. ECSS 2024, Glasgow. (Peak knee
  moments 44.5 and 51.4 N·m in back and front turns, 87.8 N·m on the rear leg; one surfer.)
- Farley, O. R. L., Harris, N. K. & Kilding, A. E. (2012). Physiological demands of competitive surfing. J. Strength
  Cond. Res.
