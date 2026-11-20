# Big's abrupt stop at the bottom (bottom-stop, 2026-10-29)

Found in #165 (popup-moving-face): straight-in riders at the Canyon's Big reached 10–11.6 m/s, then stopped dead about
1.4 s after standing, 9.6 → 5.1 m/s within four steps.

This work was done on the M1 Air (8 GB), branch `claude/bottom-stop`, from main at 2480ccd1. It used headless
`RideSession` probes only, with no SurfZoneRunner rider sessions.

## In short

- **Not the honest physics of the flat.** The stop came from the Canyon roller's froth drag (S3, the owner's option B of
  2026-10-07), which held the board at up to 0.55 of the rider-and-board's weight.
  - The riders were 6–8 m ahead of the crest, still on a 15–17° face, at ξ 0.6–0.83 of their own wave's lens: a young
    lens (g 0.22–0.5) whose thickness there was 0.5–3 cm, where no white is drawn yet.
  - The drag acted in full anywhere in the lens's footprint, against the lens's g-blended flow (slower than the
    roller), with no cap. On a board at 10 m/s it came to 540–1460 Pa.
  - The rider, braced against it, pushed the board forward through the contact (up to 0.39 of the weight), then lost it.
    The bare 5 kg board then stopped at about 11 g.
  - With the froth drag off, all seven standing riders ride on.
- **The fix, after the water-physics advisor's ruling of the same day.** The froth holds a board:
  - only where the lens reaches, ξ ≤ g. A young roller is short: spilling rollers grow to full length over 5–8 breaker
    depths (Svendsen 1984), and Duncan's steady spillers covered about 60 % of the face;
  - only past the roller's own water, c·n̂, not the g-blended flow;
  - never harder than the roller's grip on the face there, ρ(1 − ᾱ)·g·t·sin θ (Duncan's shear between roller and wave,
    Martins et al. 2018 eq. 1);
  - only on the share of each hull patch's depth that the lens covers.
- **The result on the wave that showed it (Big seed 1, wave 9, eight riders 4 m apart, one falls popping up):**
  - straight in: all 7 ride on to the end of the run (5.7 s riding), against 7 of 7 falling at 1.3–1.6 s;
  - the most speed lost in 0.1 s: 0.2–0.3 m/s, against 4.4–7.0 m/s;
  - the bottom turn carries the speed: 11.9–12.6 m/s at the top, against 10.4–12.0 before.
- **Big sets (seeds 1–2, catch probe, ridden to 6 s), straight in:** of 8 stands, 6 ride 3 s and 5 ride 5 s, against
  3 and 2. The median ride is 5.75 s, against 2.25 s.
- **The scripted bottom turn carries the speed** through the bottom: 11.9–12.6 m/s. But the compressed turn's scripts
  still fall at its exit, 2.1–2.7 s after standing, with or without the froth: Compress released at once throws the
  rider off the deck. With the steer alone, 6 of 7 ride on each way. This is the compressed turn's own rule, not the
  water; it is the next item (below).
- **No regressions:** the pop-ups are unchanged, the climb back on in the Medium inside is unchanged, and the Canyon's
  1.2 c carry bar (`rollerFeel`) holds.
- **The A/B switch:** `?froth=old`. Online rooms run the default. Only the Canyon has roller lenses: other spots are
  unchanged bit for bit.

## Reproduce first

`bottom-replay.ts` loads a saved sea and places riders prone along the crest, a few metres apart. Each sprints when the
crest is 2 s away and pops at the cue. Standing, it rides straight (`--ride straight`) or makes a scripted bottom turn
(`--ride turn --side left|right`: Compress and the steer held from 0.6 s after standing, for 0.8 s). From the stand it
logs the board's speed, each force along the travel as a share of the rider-and-board's weight, the board's pitch and the
face's slope, the hull's depth, the wave frame, and the lens at the board: its thickness, g and c, and each roller slot's
ξ, g, H and L there.

The sea is Big seed 1 at t 151.9 s (wave 9), saved by `catch-probe.ts --save-at`, as in #165 and #166.

Before, a straight-in rider (dx −4.0 m; forces as shares of the rider-and-board's weight):

| t after standing, s | speed, m/s | froth | contact | face slope | ahead of the crest, m | lens at the board |
| --- | --- | --- | --- | --- | --- | --- |
| 0.78 | 10.33 | −0.07 | −0.18 | 18.3° | 5.5 | some patches, not the centre |
| 0.98 | 10.47 | −0.24 | +0.03 | 17.5° | 6.3 | |
| 1.18 | 10.26 | −0.41 | +0.19 | 16.3° | 7.0 | t 0.7 cm, g 0.22, c 6.6 m/s |
| 1.33 | 9.93 | −0.55 | +0.39 | 15.4° | 7.6 | t 1.9 cm, g 0.23 |
| 1.38 | 6.20 | −0.38 | 0 | 14.9° | 7.7 | the rider has let go |
| 1.43 | 5.83 | fallen | | | | |

- The froth grows from nothing to over half the weight while the board is still on the face, 6–8 m ahead of the crest.
- The contact turning positive is the rider pushing the board forward against the brake. Once the rider lets go, the
  bare board stops at about 11 g.
- The roller's slot at the board: H 2.45–2.55 m, L 10.9–11.4 m, g 0.22–0.5, the board at ξ 0.6–0.83.
- Each hull patch was 1–3 cm under the surface, within the lens's thickness: the hull's depth in the lens is not the
  cause.

### What it was not

The candidates in the brief, each checked on the same wave (the same rider as above):
- **The nose catching the flat:** the stop comes on a 15–17° face, 6–8 m ahead of the crest, not on the flat. The nose
  comes down to 4 cm under the surface only in the last 0.3 s, as the rider braced against the brake leans onto it.
- **Planing drag or added mass:** the hull's friction is 0.04–0.07 of the weight through the stop; added mass and
  radiation mostly push forward (−0.09 to +0.18).
- **The surface's sampling or the moving-surface fix:** the stop goes away with only the froth removed, the moving
  surface unchanged.
- **The contact or buoyancy as the board digs:** the hull's patches in the lens are 1–3 cm deep, within its thickness;
  the wetted area grows steadily, 0.25 → 0.52 m².
- **The froth drag:** set to zero (an experiment hook, since removed), all seven standing riders rode 5.7 s at about
  11.4 m/s, the most lost in 0.1 s about 0.3 m/s.

## The ruling

Asked of the water-physics advisor on 2026-10-29 (read-only, by its knowledge base and sources):

1. **How hard can thin froth hold a planing hull?** Not 0.4 body weights. A hull in froth planes on it: the froth lowers
   its support and its friction rather than adding drag.
   - Froth friction by Schoenherr's formula (Tavakoli et al. 2024): about 20–30 Pa at 4–5 m/s in froth of 750 kg/m³.
     In green water at about 9 m/s the hull already pays about 120 Pa. Bubbles cut friction further (Elbing et al. 2008:
     over 25 % near the injector, over 80 % with an air layer).
   - The roller's grip on the wave, Duncan's τ = ρ_r g A sin θ / L (Martins et al. 2018 eq. 1): about 420 Pa for a
     developed roller on this 11 m, 12.8° face; 110–190 Pa at g 0.27–0.45.
   - The game applied 540–1460 Pa: 4–12 times the hull's friction and 5–8 times the roller's grip.
2. **Does the froth reach the face's base?** Not for a developing roller. Developed bores cover crest to toe (Duncan
   L_r ≈ 2.9 H; Martins L_r·tan θ ≈ H at 16–22°). Young rollers are shorter (Haller & Catalán 2009, near the plunge
   point) and grow to full length over 5–8 breaker depths (Svendsen 1984). The drawn white reaches the foot 2 s after
   touchdown (`SpillingCurl`).
3. **The scaling, ranked:**
   - **a.** Drag only where the white is drawn (`SpillingCurl`'s share). This reopens the owner's 2026-10-11 "look
     only" ruling, so it is the owner's call. The fallback that does not read the look: **ξ ≤ g** (built).
   - **b.** The speed excess against **c·n̂**, not the g-blended flow (built). A developed lens (g = 1) is unchanged.
   - **c.** **Cap** the stress at the roller's local grip, ρ(1 − ᾱ)·g·t(ξ)·sin θ (built). On the test bores it binds
     only above about 1.15 c near ξ 0.8, so the 1.10 c carry holds.
   - Do not scale by the lens's √(1 − ξ²) profile: carried prone boards ride at ξ 0.5–0.8, so it weakens the owner's
     1.2 c bar first. (Tried before the ruling; dropped.)
4. **Real decelerations:** no published braking data. GPS and IMU studies give speeds only: competitive surfers' mean
   maximum 9.3 m/s, top 12.5 m/s (Farley et al. 2012); at Macaronis, top 9.7 m/s, bottom turns 7.3 m/s (Sci Rep 2024).
   10.5–11 m/s is high but real. The bare board's 11 g is not; the hull's 0.1–0.3 g is plausible.

## The fix

- `SpillingRoller` gives each lens point its ξ (`LensPoint.xi`).
- `PhysicalSurfWater`'s `applyLens` gives the sample, in a lens's footprint, the lens's thickness, the point's ξ
  (`lensReach`), the roller's own velocity c·n̂ (`lensSpeedX/Z`) and its grip there, ρ(1 − ᾱ)·g·t·sin θ (`lensGrip`).
- `BoardBody`'s froth drag, per hull patch:
  - nothing unless ξ ≤ g;
  - the speed past c·n̂, along n̂;
  - the stress `frothStress`: FROTH_DRAG·g·(speed past c)·(the lens's share of the patch's depth), at most the grip.
- `?froth=old` (`SurfZoneConfig.froth`): the samples leave the new fields out, and the drag is as before. Online rooms
  fix it to the default (`main.ts`).
- FROTH_DRAG stays 500 N·s/m³.

## Measured

### Wave 9, eight riders (Big seed 1, t 151.9 s)

One rider (dx 0.6) falls popping up in every run, as in #165; the table is of the seven who stand.

| Script | Before (`--froth old`) | Now |
| --- | --- | --- |
| Straight | 0 of 7 ride on; falls 1.33–1.62 s after standing; top 10.0–10.7 m/s; the most lost in 0.1 s 4.4–7.0 m/s | 7 of 7 ride on (5.7 s riding); top 11.4–11.5 m/s; the most lost in 0.1 s 0.20–0.32 m/s |
| Bottom turn, left | 0 of 7; falls 1.17–2.08 s; top 10.4–12.0 m/s | 1 of 7; falls 1.85–2.48 s; top 12.4–12.6 m/s |
| Bottom turn, right | 0 of 7; falls 1.18–2.80 s; top 10.4–11.9 m/s | 4 of 7; falls 2.22–2.27 s; top 11.9–12.3 m/s |

The speed through the bottom, straight in (dx −1.7):

| t after standing, s | 0.08 | 0.48 | 0.88 | 1.28 | 1.68 | 2.08 | 2.48 | 2.88 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Face slope | 19.1° | 19.0° | 18.2° | 15.2° | 9.4° | 4.5° | 1.6° | 0.5° |
| Now, m/s | 8.63 | 9.85 | 10.54 | 11.22 | 11.40 | 10.85 | 10.10 | 9.38 |
| Before, m/s | 8.63 | 9.82 | 10.01 | 6.42 (fallen at 1.37) | | | | |

- Now the rider runs down the face to 11.4 m/s at the bottom, then out onto the flat ahead of the wave, losing about
  1.7 m/s² (0.17 g): the hull's friction, 0.09–0.17 of the weight, with the trim at 0–3°. That is a planing hull's
  drag-to-lift ratio at low trim (Savitsky 1964: about tan τ plus friction, 0.1–0.15), and within the advisor's
  0.1–0.3 g.
- The froth reads 0 on these riders throughout: they are past the young lens's reach.

The bottom turn (right, dx 2.9): before, the froth reached −0.74 of the weight at 1.48 s and the board stopped,
10.6 → 5.2 m/s. Now it carries 12.0 m/s through the turn and holds 9.9–11.2 m/s on the lower face for the next 1.2 s.

**The turn scripts' falls are not the stop.** With the froth off entirely they are the same falls, at the same times,
to the step. They come at the compressed turn's exit (`--trace-dx`, turn left, dx −1.7):
- through the turn (0.6–1.4 s) the carve's carry (CARVE_CARRY, a gameplay rule) does about 40 J a step on the rider;
- when Compress and the steer let go at 1.4 s, the rider is moving up off the deck, +1.1 m/s at 1.65 s, while the board
  runs on at the bottom;
- the contact goes slack from 1.75 s: the rider is in the air for 0.3–0.4 s, falling, while the unloaded 5 kg board
  turns on and slows under him (11.2 → 8.0 m/s in 0.3 s, by its own friction);
- then the session calls it a fall (balance).

The same wave with the turn varied (eight riders; seven stand):

| Bottom turn | Left: ride on | Right: ride on | Top speed |
| --- | --- | --- | --- |
| Compress + steer, 0.8 s (the script) | 1 of 7 | 4 of 7 | 11.9–12.6 m/s |
| Compress + steer, 1.6 s | 2 of 7 | | 13.3–14.0 m/s |
| Steer alone, 0.8 s | 6 of 7 | 6 of 7 | 11.4–12.3 m/s |

- The steer alone carries the riders through; they lose about 2 m/s in 0.1 s in the hardest part of the carve, then ride
  on.
- Held longer, the compressed turn reaches 13.3–14.0 m/s, past the fastest measured surfers (12.5 m/s, Farley 2012):
  its assist adds speed.
- So the compressed turn's exit throws the rider. That is the turn's own rule (Compress, its pull and carry; Stances and
  Compress, #45–#50), not the water. It is the next item, and not changed here.

### The Big sets

The catch probe's sets at Big (faces ≥ 2.29 m from 3 m out, seeds 1 and 2, five sets each), its feathered stroke, every
rider ridden on to 6 s after standing (`--ride-time 6`). "Riding" is the time standing ahead of the crest at 0.6 of its
speed or more. The scripts: `good` pops at the cue and rides straight; `turnL` and `turnR` add the compressed bottom turn
(Compress and the steer from 0.6 s after standing, for 0.8 s).

| Script | Stands | Ride 3 s, before → now | Ride 5 s, before → now | Median ride, before → now |
| --- | --- | --- | --- | --- |
| good (straight) | 8 of 10 | 3 → 6 | 2 → 5 | 2.25 → 5.75 s |
| turnL | 8 of 10 | 1 → 1 | 0 → 1 | 2.17 → 2.28 s |
| turnR | 8 of 10 | 1 → 1 | 1 → 1 | 2.27 → 2.32 s |

Every wave (29 a script, sets and others; 16 stands):

| Script | Ride 3 s, before → now | Ride 5 s, before → now | Median ride, before → now |
| --- | --- | --- | --- |
| good | 9 → 12 | 6 → 9 | 4.37 → 5.45 s |
| turnL | 1 → 3 | 0 → 3 | 2.28 → 2.42 s |
| turnR | 3 → 3 | 1 → 3 | 2.43 → 2.45 s |

- The catches, pops and stands are the same to the hundredth before and after: the froth acts only after the stand here.
- The two set rides still short straight in (0.43 s and 1.75 s) are riders left on the crest: the wave runs away from
  them, as before.
- The turn scripts are held by the compressed turn's exit, as on wave 9.

### No regressions

- **Pop-up (`popup-replay`, Big seed 1):**
  - wave 9 (t 151.9 s, eight riders): the same pop-ups, to the push loads (7 ride, 1 falls popping up). Before, all 7
    then fell standing; now all 7 ride.
  - t 100.9 s (sixteen riders 8 m apart): identical, all 16 ride.
- **The climb back on (`swim-probe`, Canyon Medium inside, let go by broken water):** lying on the board 2.22–2.50 s
  from the fall, the same to the hundredth as `--froth old`; the swim's thrust and drag within 2 N.
- **Big wipeouts (`swim-probe --ride`, wave 9, two riders a script):** the riders now ride the wave on and fall
  14–17 s into the run, on the inside, where before they fell at 8.2–8.9 s by the bottom stop (one idle rider still
  loses the board at 6.3 s, as before). From the fall to lying on the board: swim 2.95, 1.90 s (5.25, 8.32 before);
  reel 4.02, 3.23 s (6.42, 3.88); both 3.38, 4.25 s (3.42, 3.67). The old numbers are #166's to the hundredth.
- **Paddle balance and the pop-up's contact:** `AttachedRider`, `movingFace`, `RideSession` and the rest of the main
  suite pass.
- **The roller's feel (`rollerFeel`):** the 1.2 c carry bar holds (1.10 c), the Q4 push, the punch-through and the
  bog unchanged.

## Tests

- tsc: clean.
- Main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 2925 passed, 18 expected fail, 36 skipped; one timed out under the probes' load
  (`uniformSnapshot`'s Canyon bytes, 60 s), which passes on its own.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Swim]"`:
  101 passed, 3 failed, 2 h 6 min. `[Swim]` is a character class, so the filter runs nearly the whole file. The three
  failures fail the same on main's sources (2480ccd1), and none touches a board: "preserves dynamic void fraction
  receivers…", "breaks waves in the surf zone, measures the peel…" and "does not read the spin-up bores as one
  simultaneous close-out".
- **New:**
  - `frothDrag.test.ts`:
    - no drag on a board past a young roller's reach (ξ > g), drag within it, and the whole footprint before;
    - a board at 0.9 c just behind a young lens's crest is not held back (it outruns the blended flow, not the roller);
    - `frothStress`: the grip caps it, the lens's share of the depth scales it, and g scales it.
  - `PhysicalMode.test.ts`: the `?froth=old` switch at every spot, and online rooms on the default.
- No rider sessions.

## Open

- **Drag only where the white is drawn** (the advisor's first choice) reads the look, which the owner ruled "look only"
  on 2026-10-11. ξ ≤ g is the fallback that does not. The owner's call.
- **The compressed bottom turn's exit:** letting go of Compress throws the rider off the deck at the bottom (above),
  1 and 4 of 7 riding on against 6 and 6 with the steer alone; held longer, the turn reaches 13–14 m/s. Not the water:
  the compressed turn's own rule (its pull and carry). Worth its own item, after the owner's playtest.
- **Speeds:** 11.4 m/s straight in and 11.9–12.6 m/s through the bottom turn, at the top of the measured range
  (Farley 2012: top 12.5 m/s on bigger waves than a 2.5 m face).

## Shot list for the owner

1. **Canyon, Big, a set wave, straight down.** Catch it at the cue, stand, and go straight to the bottom without
   turning.
   - Before, the board stopped dead on the lower face about 1.4 s after standing, at about 10 m/s, and threw you.
   - Now you should run down to about 11 m/s and out onto the flat ahead of the wave, slowing over a second or two, the
     white chasing from behind.
   - Repeat with `?froth=old` for the A/B.
2. **The same, with a bottom turn** (the steer, without Compress): the turn should carry you round at about 12 m/s and
   back toward the face.
3. **The same, with a compressed bottom turn** (Compress and the steer, then let go). Say whether letting go of
   Compress at the bottom pops you off the deck. In the probes it does in most runs, with or without this fix.
4. **Canyon, Big, ride in the whitewater after the wave has broken** (prone, then standing): the froth should still hold
   you back in a developed roller's white, and push a prone board along at about the bore's speed, as before.
5. **Canyon, Medium:** a few rides as usual. Nothing should feel different on the face.
6. **Online room:** the same as the default, whatever the URL says.

## Tools

Build each tool with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.

- **`bottom-replay.ts`:** one saved wave, many riders, ridden straight or with a scripted bottom turn.
  - `--state <sea> [--spot canyon] [--size big] [--seed 1] [--seconds 16]`
  - `--riders n --spread m`
  - `--ride straight|turn [--side left|right] [--turn-at 0.6] [--turn-for 0.8] [--turn-compress 1]` (0: the steer
    alone)
  - `--after s`: ride this long after standing.
  - `--every n`: log every nth step; `--log-dx D`: print the log of the rider at dx D (else the first that lost over
    2 m/s in 0.1 s).
  - `--trace-dx D --trace-from s`: per step, the board's and the rider's velocities and each ledger's work.
  - `--froth old`, `--quiet`.
- **`catch-probe.ts`** (canyon-catch) adds the scripts `turnL` and `turnR` (Compress and the steer from 0.6 s after
  standing, for 0.8 s), `--ride-time s` (ride on to this long; 2 s still counts as "rode") and `--froth old`.
- **`popup-replay.ts`** (popup-moving-face) and **`swim-probe.ts`** (swim-back) add `--froth old`.

## Sources

- Martins, K., Blenkinsopp, C. E., Deigaard, R. & Power, H. E. (2018). Energy dissipation in the inner surf zone: new
  insights from LiDAR-based roller geometry measurements. JGR Oceans. (Duncan's roller shear, eq. 1.)
- Duncan, J. H. (1981). An experimental investigation of breaking waves produced by a towed hydrofoil. Proc. R. Soc. A.
  (Read through Martins 2018 and Haller & Catalán 2009.)
- Haller, M. C. & Catalán, P. A. (2009). Remote sensing of wave roller lengths in the laboratory. JGR Oceans.
- Svendsen, I. A. (1984). Wave heights and set-up in a surf zone. Coastal Engineering.
- Elbing, B. R. et al. (2008). Bubble-induced skin-friction drag reduction and the abrupt transition to air-layer drag
  reduction. J. Fluid Mech.
- Tavakoli, S. et al. (2024). Ocean Engineering (Schoenherr's friction line in aerated water).
- Savitsky, D. (1964). Hydrodynamic design of planing hulls. Marine Technology.
- Farley, O. R. L., Harris, N. K. & Kilding, A. E. (2012). Physiological demands of competitive surfing. J. Strength
  Cond. Res. (GPS speeds.)
- Sci Rep 2024: surfboard fins and surfing performance at Macaronis (GPS/IMU speeds).
