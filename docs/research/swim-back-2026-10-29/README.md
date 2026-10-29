# Swimming back to the board after a wipeout (swim-back, 2026-10-29)

The owner: "The user should swim and go back to the board; right now after falling he just struggles without moving."

This work was done on the M1 Air (8 GB), branch `claude/swim-back`, from main at bf4e6d5d. It used headless
`RideSession` probes only, with no SurfZoneRunner rider sessions.

## In short

- **The swimmer did swim.** Its own speed through flat water was 0.92 m/s.
- **What stalled was holding the board.** It took 2–16 s from the grab to lying on it, and sometimes it never happened.
  - The hands' places sat 2 cm above the deck. For the arm's 11 cm sphere, that put each hand 9 cm inside the board.
  - Every step, the board's contact pushed the hands out and the springs pulled them back in, kicking the light board's
    rails.
  - The board rolled and spun at 2–9 rad/s while held. Meanwhile the body hung still beside it (0.05 m/s), its hands and
    chest 0.2–0.5 m from their places.
  - The climb waited for a deck within 18° of level, turning under 1 rad/s, with the hands and chest at their places.
    That rarely came.
  - This is the "struggle without moving".
- **The reel stopped at the feet.** The cord was reeled in to the ankle, down to 0.8 m, which left the chest a body's
  length from the board.
- **The fixes:**
  - **The climb.** Once the hands have the board deck-up and turned, with the chest by it, the rider climbs on from where
    the body is. This is a transition of the attached rider's own posture, over 1.2 s (`AttachedRider.climbFrom`).
  - **The reel.** The reel takes the cord in through the hand nearer the board, until the tail is in the hand.
  - **Swimming at the surface.** The stroke swims up toward the light only when the swimmer is under: the chest under,
    the head well under, or the head under for longer than a crawl's arm cycle. Before, it did so whenever the head was
    under, as a crawl's face is for much of each stroke.
  - **The drawn climb.** The drawn climb follows the physics' climb.
- **Back lying on the board, measured from the fall:**
  - Big Canyon wipeouts: 3.4–8.3 s, against 6.7–22.5 s before.
  - Medium: 1.8–2.8 s, against 2.0–16.0 s.
  - Twelve flat-water falls holding the reel: 2.1–5.5 s, against 2.2–16.1 s, or not within 20 s.
- **Swimming speed through the water:** 0.95 m/s on flat water, 0.76–0.78 through a wind chop, and 0.80–0.81 in the
  Canyon's inside after the whitewater. Trained swimmers hold about 1.34 m/s over 400 m (a 40-study meta-analysis, below); a surfer
  swimming after a board is slower. The broken water still carries the swimmer and the board, and the hold-downs are
  unchanged.
- **The A/B switch:** `?swim=old`. Online rooms run the default.

## Reproduce first

`swim-probe.ts` runs one rider per script on the same water, puts it off its board, and then plays the player:
- **idle:** no input.
- **swim:** the paddle held, steered toward the board while free; the pop-up pressed whenever the board is in reach.
- **reel:** the pop-up key held, which reels the cord in and grabs the board once it is in reach. This is what the game's
  prompt tells the player: "hold {popUp} to pull the leash and climb back on".
- **both:** swim and reel together.
- **away:** the paddle held, steered out to sea. This measures the swim's own speed through the water, along its heading,
  with the board in tow.

The falls:
- flat water or a wind chop (`ChopWater`), from lying at rest with the board flung away, or from standing at 5 m/s;
- the Canyon's sea (`--ride`): riders catching a wave from a saved sea, as the catch probe's good script does, and riding
  it until they fall;
- the Canyon's inside (`--inside 40`, Medium): lying 40 m shoreward of the default start until broken water lets the
  rider go.

`--trace <script>` logs the stroke's thrust, the drag, the control, the leash, and, while holding, the deck's level, the
board's spin and the hands' and chest's distances to their places.

### Before (`--swim old`, main's behaviour)

Times are from the fall, in seconds. A dash means not within the run (20 s on flat water and chop, 35 s at the Canyon).

| Fall | swim | reel | both |
|---|---|---|---|
| Flat, from standing at 5 m/s | 8.58 | — | — |
| Chop, from standing | 1.60 | 2.33 | 2.28 |
| Chop, lying, board flung | 1.03 | 6.45 | 0.68 |
| Canyon Big, real wipeouts (two riders a script) | 6.72, 8.53 | 22.48, 16.35 | 10.48, 7.97 |
| Canyon Medium, real wipeouts | 3.27, 2.00 | 16.00, 3.07 | 3.88, 3.90 |

- **Flat, standing fall, holding the reel** (the old trace): the swimmer grabbed the board 2.6 s after the fall, then held
  it for the rest of the 20 s.
  - The deck stayed within 18° of level only in flashes (its up 0.28–1.0), and the board spun at 2–8 rad/s.
  - Its speed jumped by 0.4–2.6 m/s while the swimmer floated still.
  - The hands and chest hovered 0.2–0.5 m from their places.
- **The reel stopped by the feet.** The cord came in to 0.8 m from the ankle, the board stopped by the feet, and the
  chest stayed out of reach unless the body turned.
- **Swimming:** 0.92 m/s through flat water and 0.70 through the chop (`away`). In the chop, the head was under for much
  of each stroke, and every such stroke went 60° up toward the light.

## The causes and the fixes

### 1. The hands held inside the deck: the climb from where the body is

`BoardRecovery`:
- placed the hands 2 cm above the deck, 9 cm inside the board for the arm's 11 cm sphere;
- pulled them there with springs of 300 N/m, each impulse capped at 6 N·s.

`DetachedSurfer.resolveBoardContact` pushed every node out of the board's box. So each step the contact and the springs
fought over the hands, and the impulses landed on the board's rails. Its roll inertia is tiny, so it spun.

The gate the climb waited for asked for all of these at once:
- the deck within 18° of level (`MOUNT_UP`);
- the board turning under 1 rad/s;
- the hands within 25 cm of their places, and the chest within 35 cm;
- relative speeds under 1.2 m/s.

That gate came seldom.

**The fix, by default:**
- The grab is unchanged: within 1 m, and the board coming no faster than 1.5 m/s.
- The hands then turn the board deck-up and toward the swimmer as before (`align`), and the chest is held by it
  (`hold`).
- Once the deck is up within about 32° (`CLIMB_UP`), the board is turned (within 25°) and the chest is in reach, the
  board takes the rider (`climb-ready`). No spring pulls the body onto the deck first.
- The attached rider then moves into the prone posture from the swimmer's own parts (`AttachedRider.climbFrom`), over
  `CLIMB_TIME` = 1.2 s.
  - This is a provisional value, taken from the pop-up's two moves: the arms' push up (`PUSH_TIME`, 0.72 s,
    Borgonovo-Santos 2021) and a move of the whole body onto its support (`LANDING_TIME`, 0.48 s).
  - The body comes across and along the board low, still floating, over the first 55 % of the time. It rises from 15 %
    of the time on.
- The contact carries the climb as it carries any change of posture: the grip, the friction and the separation are
  unchanged. A wave or a board torn away can still put the rider back in the water.
- The phase is `prone` throughout the climb. While climbing, the rider neither paddles nor pops up, and no cue shows.

**Two findings while building the climb:**
- **Rising first rolled the board over.** Risen out of the water beside the board first, the body's weight came onto the
  near rail and capsized it: across the six flat and chop falls, 9 climbs fell back, in 3 of the runs. Coming across low
  first holds.
- **The deck's plane cut the buoyancy of parts beside the board.** The prone rider's water forces count a part's sphere
  below the deck's plane as "board", along the board's whole length. Beside the board, where the climb starts, that cut
  the body's buoyancy and put its weight on the near rail.
  - The fix: while climbing, a part past the rail is in the water.
  - The same cut still applies to a prone rider's arms by the rails. It was left alone: changing it would change all
    prone riding.

**The join:**
- The swimmer's and the board's linear momentum is kept (`RideSession.climbOn`, as before).
- The pair turns at the swimmer's own spin (`DetachedSurfer.spin`). The board's spin is a few hundredths of the pair's
  angular momentum; kept as it was, it swung the heavy body round with it at the join.
- The climb waits for a board turning slower than 1.5 rad/s in the hands (`CLIMB_RATE`).
- There is no position jump: the rider starts where the swimmer's centre of mass was.

### 2. The reel to the hand

Hand over hand, the cord comes in through the hands, so the board's tail comes to them, not to the ankle.

- While the reel is held and the board is not yet held, the cord's body end is the swimmer's arm nearer the board.
- It starts at the length it has there (at most the cord's own), then shortens at 0.6 m/s while the arms can still pull
  (290 N, as before).
- It shortens down to `LEASH.handReach` = 0.35 m from the arm's centre, which is the tail in the hand.
- Once the board is held, or the reel is let go, the cord is the ankle's again at its full length.
- The drawn cord already came from the pulling hand while reeling, so the physics and the drawing now agree.

### 3. Swimming at the surface with the face in the water

`DetachedSurfer` swam up toward the light (60° up) whenever the head's sphere was under. A crawl's head is in the water
for much of each stroke, so at the surface half the push went up.

By default, the stroke now swims up toward the light only when the swimmer is under, which means any of:
- the chest is under too (held down);
- the head's centre is deeper than two of its radii (plunged, not a face in the water);
- the head has been under for longer than a crawl's arm cycle, 2.6 s (0.38 cycles a second at 1.0 m/s, Kjendlie et al.
  2004, as the drawn crawl's `crawlRate`), so a breath is due.

The first of these alone left a plunged swimmer swimming on face-down for 6 s.

| Swim's own speed | Before | Now |
|---|---|---|
| Through the chop | 0.70 m/s | 0.76–0.78 m/s |
| On flat water | 0.92 m/s | 0.95 m/s |

The plunged swimmer surfaces in 3.9 s, against 3.6 s before. Diving, the breath and the hold-downs are unchanged.

### What drew the struggle, and the drawn climb now

- **The swim strokes.** The swimmer is drawn stroking whenever the physics' stroke pushes (`SWIM_BITS.stroking`), as
  before: the crawl and the flutter kick.
- **The climb.** While the physics climbs, the snapshot carries a new climbing bit (`SWIM_BITS.climbing`).
  - The rig then brings the prone pose in over the physics' `CLIMB_TIME`.
  - The feet swing on from where they were drawn in the water, over the climb.
  - The physics' hands go from the swimmer's arms to the rails over the climb's first quarter.
  - While climbing, the drawn body's switches blend in the world frame, as the swimmer's do, because the board slides
    under it.
- **Measured on the surfer's skeleton** (`fallReflexes.test.ts`): the chest comes over the deck before the feet,
  within the climb's 1.2 s, and the feet never move faster than 6 m/s across the board (4 m/s measured).
- **Measured on the test humanoid** (`climbOn.test.ts`): the drawn hips stay within 12 cm of the physics' pelvis
  (5 cm measured) and the wrists by the physics' hands.
- **The body film** (`bodyFilm.test.ts`) reads the climb's switch within the falls' limits at 60 Hz.
  - At 120 Hz, the display frames between two physics steps carry the board's slide under the body. The joints read
    against the board jump up to 3.1 m/s at the switch, against the falls' 2 m/s.
  - This is an open item: watch for it at a high refresh rate.
- **Online:** the climbing bit is local only. Another player's climb draws as before, the prone pose coming in at once.
- **The dev pages:** the pose sheet's "Climbing back on: the grab" and the realism sheet's tile still read the old hold
  (`swim: 'old'`). They need a refresh to show the climb from the water.

## After

**Back lying on the board, seconds from the fall.**

| Fall | swim | reel | both |
|---|---|---|---|
| Flat, from standing at 5 m/s | 5.77 (8.58) | 5.25 (—) | 3.78 (—) |
| Flat, lying, board flung | 1.45 (0.50) | 1.43 (1.28) | 1.43 (0.52) |
| Chop, from standing | 2.17 (1.60) | 3.23 (2.33) | 3.68 (2.28) |
| Chop, lying, board flung | 1.47 (1.03) | 1.50 (6.45) | 1.45 (0.68) |
| Canyon Big, real wipeouts | 5.25, 8.32 (6.72, 8.53) | 6.42, 3.88 (22.48, 16.35) | 3.42, 3.67 (10.48, 7.97) |
| Canyon Medium, real wipeouts | 2.77, 2.03 (3.27, 2.00) | 2.25, 1.83 (16.00, 3.07) | 2.20, 2.15 (3.88, 3.90) |
| Canyon Medium, inside, let go by broken water | 5.75, 2.22 (2.07, 1.32) | 2.18, 2.22 (3.00, 2.23) | 2.25, 2.25 (3.60, 2.80) |

Before (`?swim=old`) is in brackets. Two cases got a first climb that fell back and a second that held: Big reel 6.42,
and Medium inside swim 5.75.

**Twelve flat-water falls holding the reel** (3, 4, 5 and 6 m/s; 0.5, 1 and 1.5 s standing; `twelve-falls.ts`):

| | Seconds to lying on the board |
|---|---|
| Today | 2.5, 4.5, 2.1, 5.4, 4.2, 2.5, 5.5, 5.3, 4.3, 4.5, 5.0, 3.4 |
| Before | 2.2, 7.2, 3.1, 9.6, 9.2, —, 6.8, 5.7, 16.1, 6.7, 11.5, 2.3 |

**Where the time goes now:**
- **The climb itself:** 1.2 s.
- **The whitewater.** It holds the swimmer without control for about 2 s after a Big wipeout, as the hold-downs do.
- **Turning the board deck-up in the hands.** This takes 0.5–1.5 s on calm water. It can take up to 3 s when the board was
  flipped and the plunged swimmer drags it under while holding it. The hands' servo (40 N·m, 3 rad/s) is unchanged.
- **Where the old way was quicker.** When the board lay right beside a swimmer who fell lying down, the old springs
  snapped the body on in 0.5–1.3 s. Today's climb takes its 1.2 s. In the chop from standing, today is a second slower
  in two cases (the old way happened to work there).
- **Chasing the board on Big waves.** On Big waves the board can be carried shoreward faster than a swimmer swims (one
  swim-only case chased it for 6.9 s). Holding the reel brings it in.
- **A climb that falls back.** A climb can still fall back when the water moves the board under it. The player then
  grabs again (2 of the table's 30 climbs).

**Swim speed through the water, along the heading, while swimming free** (`away`):

| Water | Today | Before |
|---|---|---|
| Flat | 0.94–0.95 m/s | 0.92 m/s |
| Wind chop | 0.76–0.78 m/s | 0.68–0.70 m/s |
| Canyon Medium inside, after the whitewater | 0.80–0.81 m/s | 0.74–0.76 m/s |

For comparison, the average speed over 40 studies of the 400 m front-crawl test is 1.34 m/s for trained swimmers
([meta-analysis, UFRGS LUME](https://www.lume.ufrgs.br/handle/10183/263941)). Competitive 100 m swimmers hold
1.3–1.65 m/s ([Štastný et al. 2016](https://rua.ua.es/dspace/handle/10045/64871)). A surfer swimming after a board, a
leash and a board in tow, sits below those, in the brief's 0.8–1.2 m/s.

## What stays

- **The whitewater still has the swimmer.**
  - No stroke while broken water is over it (breaking past 0.4) or while it tumbles.
  - The aerated water still sinks it, and the breath drains held under.
  - The broken water still carries the swimmer and the board shoreward.
- **The leash** still stretches, recoils and snaps as before.
- **The duck-dive** lets go of a held board, as before.
- **Prone riding and riding the wave** are unchanged.
  - The climb's code runs only while climbing.
  - The ankle's cord is unchanged when not reeling.
  - The surface crawl acts only on a fallen swimmer.

## A/B and online

- `RideSessionOptions.swim: 'old'` and `SurfZoneConfig.swim: 'old'` (the `?swim=old` dev switch) bring back all of the
  old behaviour:
  - the reel to the ankle;
  - the springs' pull and the strict gate;
  - the stroke up whenever the head is under.
- Online rooms fix it to the default (`main.ts`).
- The dev pages' recipes take `swim: 'old'` too (`StanceRecipe.swim`).

## Tests

- `npx tsc --noEmit -p .`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 307 files passed (30 skipped); 2922 tests passed (18 expected fail, 36 skipped).
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t
  "[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`: RESULT_SZS.
- **New:**
  - `swimBack.test.ts`:
    - the swim's own speed on flat water, 0.8–1.2 m/s;
    - through a chop, faster than before and over 0.75 m/s;
    - the twelve falls holding the reel, each under 6 s, where half took longer before;
    - swimming and reeling together, under 4 s;
    - the climb with no jump, the momentum kept, the body floating beside the board, then up onto the deck, the drawn
      hands on the rails;
    - no paddle, pop-up or cue while climbing.
  - `climbOn.test.ts`: the climbing bit, and the drawn hips and wrists following the physics, then lying on the deck.
  - `bodyFilm.test.ts`: the climb from the water's switch blended out (60 Hz within the falls' limits; 120 Hz under
    3.5 m/s).
  - `DetachedSurfer.test.ts`, unchanged: the dive, swimming up under water and the hold-downs pass as before.
  - `RideSession.test.ts`: the reel through the hand (the cord's end, the board reaching the hands, back to the ankle
    let go); the reel-and-climb test run with both behaviours.
  - `BoardRecovery.test.ts`: a board deck-up and in reach is climbed at once without pushing anything; an upside-down
    one is held and turned first.
  - `fallReflexes.test.ts`: the climb from the water drawn on the surfer.
  - `PhysicalMode.test.ts`: the `?swim=old` switch, and online rooms on the default.
  - `riderVisualState.test.ts`: the climbing bit decoded.
- **Changed:**
  - These tests run with `swim: 'old'`, the behaviour they describe:
    - `BoardRecovery.test.ts`: the old grab;
    - `fallReflexes.test.ts`: the old reel and climb;
    - `bodyFilm.test.ts`: the old climb;
    - the `climb-grab` pose recipe.
  - `bodyFilm.test.ts`: the local reel draws no climb while the cord comes in (0.02 on the frame the hold begins).
- No rider sessions.

## Tools

Build each tool with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`.

- **`swim-probe.ts`:**
  - `--water flat|chop|canyon`
  - `--from prone|standing`
  - `--fling 4`
  - `--speed 5`
  - `--seconds`
  - `--scripts idle,swim,reel,both,away`
  - `--trace <script>`
  - `--swim old`
  - At the Canyon: `--state <sea> --size`, with `--inside m --white s` or `--ride --riders n --spread m`.
- **`twelve-falls.ts`:** the twelve falls, today and before.
- **Runs:** `runs/`, `new-*` and `old-*`. The Canyon's seas came from `catch-probe.ts --save-at`:
  - Big seed 1 at t 151.9 (wave 9);
  - Medium seed 1 at t 79.6 (wave 6).

## Shot list for the owner

1. **Canyon, Medium.** Wipe out off a set wave, then hold Enter (the reel).
   - The swimmer should pull the cord in hand over hand until the tail is in the hand, grab the board, turn it deck-up
     and climb on over about a second: chest first, then the legs.
   - It should then lie paddling-ready, about 2–4 s from the fall.
   - Repeat with `?swim=old` for the A/B.
2. **The same, but swim to the board first** (the paddle with the arrows toward it), then press Enter by it. The swimmer
   should crawl toward the board at a walking pace, the face in the water, sighting it now and then.
3. **Canyon, Big, a wipeout in the whitewater.** The swimmer is carried and held without control for about 2 s, as
   before. Then the reel and the climb should take a few seconds, not the 10–20 s of struggling by the board.
4. **The climb itself, close up** (chase camera). Watch the hands on the rails, the body coming across low and then up,
   and the feet coming out of the water last. Say whether it reads as a climb or as being lifted.
5. **Hold the reel through a broken wave.** The climb may fail and drop you back; say whether that feels fair.
6. **Online room.** It should behave like the default, whatever the URL says. Another player's climb still draws as
   before.
