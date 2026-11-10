# The hollow over a banked deck: built behind `?deckHollow=on`, and measured (2026-11-10)

An opt-in physics change and its measurement. Default off; with the switch off nothing changes (the existing tests
are untouched and pass). Leg drive off in every run here.

## Result

- **The rule does what it was meant to do, and it is not enough on its own.** On flat water with the carry at 0, a
  Compress turn at full stick keeps 0.60–0.70 of its speed through the first 90° instead of 0.48–0.64. Peak drag
  drops from 0.57–0.59 g to 0.46–0.50 g. The arc before the fall is 13–14° longer. A real turn keeps 0.88–0.95.
- **Every flat-water arc at carry 0 still ends in a fall**, as before. None reaches 180°.
- **What is left is the hull.** The legs' drag is about halved (peak 0.28–0.32 g → 0.18–0.21 g). The deck's friction
  falls by a third to a half. The hull's bottom pressure (0.13–0.18 g, the nose-high planing) does not move, and is
  now the largest term by far.
- **On the Canyon-matched wave the pair counts do not clearly improve.** Carry 0: set B 7 → 6 of 16 make one pair,
  set C 3 → 6 of 8. Carry 0.2: set B 7 → 8, set C 6 → 8 of 8, and the 90–120° cutback 5 → 8 of 8. Carry 0.4 (today's):
  set B 14 → 12, set C 7 → 7, and the 150–180° cutback 2 → 1 of 16. With 8 or 16 runs per cell, changes of one or
  two runs are noise. The only consistent gain is at carry 0.2.
- **Standing turns: nothing worse.** Same arcs (within 2°), same or slightly higher speed at 90°.
- **Trim: about 0.1–0.3 m/s faster** (7.3 → 7.4–7.5 m/s on a held line), because the deck near the low rail is no
  longer counted wet. No new fall on a held line. The hands-off runs wander differently (see section 3).
- **One new fall to know about:** flat water, carry 0.4, full stick from 9 m/s. Off, the run completes 180° while
  the carry drives it to 12.5 m/s. On, it falls at 123°, at 12 m/s. See "Surprises".

So the hollow is worth having as a correction (the legs no longer drag in water that is not there), but the
"turn loses 40 % of its speed in 90°" problem is the hull's trim, which this change does not touch.

## The rule as built

The advisor's provisional rule (`docs/research/water-physics/consult-log.md`, row of 2026-11-10). Its three numbers
(2.3, 0.6, 1.5) are the only constants; they live in `src/physics/deckHollow.ts` as `HOLLOW`.

The maths is one pure function, `hollowWetShare(distance, speed, depth, foam)`:

- wet (share 1) if `depth ≤ 0` or `speed < 1.5·√(g·depth)`;
- age = `distance / speed`; seal time `T = 2.3·√(depth / g)`;
- share = smoothstep of age from `0.6·T` to `T` (0 open, 1 sealed);
- white water: share + (1 − share) × foam.

How the inputs are found (in `BoardBody.placeHollow`, once per substep, before the hull's forces):

- **V** (`speed`): the mean, over the wetted bottom patches, of the water's speed along the board's length. It is the
  number the hull already computes to place its pressure. Its sign says which end of the board meets the water.
- **Low rail and vent, per station** (12 stations along the board): the depth of the deck's edge at each rail under
  the surface sampled there. The edge is extrapolated half a patch spacing outward from the two outer patches. The
  station is **vented** when the low rail's edge is under the surface and the high rail's edge is above it. Both
  under: no air path, wet. Neither under: nothing to do.
- **s** (`distance`): measured along the board from the entry point, back along the flow. The entry point is where
  the low rail's edge crosses the surface, found by walking the stations from the leading end and interpolating
  between the first station whose low rail is under and the one ahead of it (the board's end if the first station
  is already under).
- **d** (`depth`): at the place asked about, the sampled surface height minus the deck plane's height straight below
  it. On a wave face this is the local surface, not the still level.
- **foam**: the larger of the sample's void fraction and its lens share.

Where it applies:

- **The hull's deck** (`patchForce` in `hullForces.ts`): the deck's wet share is multiplied by the hollow's share at
  that patch. This scales deck friction, the deck-face pressure and `deckWettedArea` (added mass, froth).
- **The rider** (`AttachedRider.applyWater`): for a part whose centre is over the deck planform, the part of its
  sphere between the surface and the deck plane counts dry by (1 − share). What is below the deck plane (a foot
  hanging past it) stays wet as before. Hands are not touched.

Never applied when: the rider is not upright (prone, climbing, duck-diving, in the water), the board is upside
down, the part is outboard of the rail, the sample is covered by the lip or inside a tube or carved void, both
rails are under at that station, or the Froude test fails.

**Buoyancy (the advisor's open question): the simplest consistent thing.** A dry part gets no buoyancy and no drag
(the rider's one wet share drives both). The hull's own buoyancy is its slab volume, unchanged. No extra term for
the missing column of water over the dry deck was added.

Switch wiring follows `?legDrive=on` (b6c14540): `deckHollowSwitch()` in `PhysicalMode.ts`, `SurfZoneConfig.deckHollow`,
`SurfZoneRunner` → `RideSessionOptions` → `BoardBodyOptions`, and online rooms pin it off in `main.ts`.

## Set-up

The probes are the earlier ones, unchanged: the flat-water ledger (`../compress-drag-2026-11-10`), the turn pair
(`../turn-pair-2026-11-10`), the carry probe (`../carve-carry-2026-11-10`). `run.sh.txt` has the commands,
`scratch.diff.txt` the scratch on top of this branch (never committed in `src/`), `results.txt` every run.

**Switch-off cells reproduced exactly** before anything was compared: carve-carry README set B 7 and 1 of 16 at
carry 0, 7 and 3 at 0.2, 14 and 6 at 0.4; set C 3, 6, 7 of 8; the cutback rows; flat arc 7.5 m/s carry 0: 135° /
147°, 4.5 / 4.4 m/s at 90°; compress-drag README: 7.36 → 4.38 m/s at 90°.

No `SurfZoneRunner` session, catch report, autopilot ride, dev server or browser was run. The wave is the analytic
`FaceWater` matched to the Canyon arm (1.4 m, 16°, 5.7 m/s): no pocket, no breaking, no white water.

## 1. Flat water, carry 0 (off → on)

Entry speeds are after a 0.2 s settle: 5.9, 7.4, 8.8 m/s. Drag terms are along the path, in body weights of rider
plus board. Means are over the 0.2 s steps up to 90°; peaks over the whole planing arc.

### Compress held

| Entry, stick | Speed at 90° (share kept) | Peak drag, g | Arc before the fall | Mean drag to 90°, g | Legs: mean / peak, g | Deck friction, g | Hull pressure, g | Deck wet share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6, 0.5 | 2.4 (0.40) → 2.8 (0.47) | 0.40 → 0.33 | 96° → 101° | 0.26 → 0.23 | 0.05 / 0.18 → 0.02 / 0.09 | 0.018 → 0.016 | 0.16 → 0.16 | 0.36 → 0.29 |
| 6, 1 | 2.8 (0.48) → 3.5 (0.60) | 0.57 → 0.46 | 111° → 124° | 0.30 → 0.29 | 0.10 / 0.32 → 0.08 / 0.21 | 0.021 → 0.015 | 0.14 → 0.16 | 0.37 → 0.29 |
| 7.5, 0.5 | 4.5 (0.60) → 4.5 (0.62) | 0.47 → 0.43 | 135° → 142° | 0.22 → 0.21 | 0.01 / 0.21 → 0.00 / 0.17 | 0.022 → 0.018 | 0.14 → 0.15 | 0.30 → 0.22 |
| 7.5, 1 | 4.4 (0.59) → 4.9 (0.66) | 0.59 → 0.49 | 147° → 161° | 0.30 → 0.26 | 0.07 / 0.28 → 0.03 / 0.18 | 0.026 → 0.017 | 0.17 → 0.17 | 0.31 → 0.18 |
| 9, 0.5 | 5.2 (0.59) → 5.3 (0.60) | 0.45 → 0.42 | 161° → 170° | 0.21 → 0.20 | 0.00 / 0.18 → 0.00 / 0.14 | 0.025 → 0.017 | 0.13 → 0.13 | 0.25 → 0.17 |
| 9, 1 | 5.6 (0.64) → 6.2 (0.70) | 0.59 → 0.50 | 160° → 173° | 0.31 → 0.26 | 0.05 / 0.29 → 0.01 / 0.18 | 0.028 → 0.015 | 0.18 → 0.18 | 0.26 → 0.12 |

Every run ends in the same fall as before (the speed runs out, the board drops off the plane).

The earlier what-if ("legs and deck dry whenever the board planes", compress-drag README) gave 0.59 → 0.72 at
7.5 m/s full stick. The rule gives 0.59 → 0.66. The difference is the part of the turn the rule leaves wet: see
"What the rule does not cover".

### Standing (no Compress)

| Entry, stick | Speed at 90° (share kept) | Peak drag, g | Arc before the fall | Legs: mean / peak, g | Deck friction, g | Deck wet share |
| --- | --- | --- | --- | --- | --- | --- |
| 6, 0.5 | 2.2 (0.38) → 2.3 (0.39) | 0.27 → 0.27 | 92° → 92° | 0.00 / 0.01 → 0.00 / 0.01 | 0.018 → 0.015 | 0.41 → 0.33 |
| 6, 1 | 2.9 (0.48) → 2.9 (0.49) | 0.31 → 0.30 | 108° → 110° | 0.00 / 0.01 → 0.00 / 0.00 | 0.020 → 0.016 | 0.40 → 0.31 |
| 7.5, 0.5 | 3.5 (0.48) → 3.6 (0.49) | 0.28 → 0.28 | 122° → 123° | 0.00 / 0.01 → 0.00 / 0.00 | 0.022 → 0.017 | 0.34 → 0.25 |
| 7.5, 1 | 4.6 (0.63) → 4.8 (0.65) | 0.43 → 0.38 | 137° → 136° | 0.01 / 0.14 → 0.00 / 0.07 | 0.027 → 0.017 | 0.36 → 0.22 |
| 9, 0.5 | 4.1 (0.47) → 4.2 (0.48) | 0.27 → 0.27 | 145° → 147° | 0.00 / 0.00 → 0.00 / 0.00 | 0.024 → 0.017 | 0.30 → 0.20 |
| 9, 1 | 5.8 (0.66) → 5.9 (0.67) | 0.38 → 0.41 | 119° → 120° | 0.00 / 0.03 → 0.00 / 0.27 | 0.031 → 0.015 | 0.27 → 0.13 |

Nothing worse. (The 9 m/s full-stick row's larger legs peak with the switch on comes late in the arc, after 90°; it was
not traced. The arc and the speed at 90° are unchanged.)

### One arc with the carry on (flat water, from the carry probe; stick 0.5 / stick 1)

| Entry | Carry | Arc reached, off | Arc reached, on | Speed at 90°, off | Speed at 90°, on |
| --- | --- | --- | --- | --- | --- |
| 6.0 | 0.2 | 109° / 128° | 118° / 143° | 3.4 / 3.7 | 3.8 / 4.4 |
| 6.0 | 0.4 | 134° / 144° | 149° / 171° | 4.4 / 4.7 | 4.6 / 5.3 |
| 7.5 | 0.2 | 164° / 180° | 180° / 180° | 5.2 / 5.8 | 5.2 / 6.4 |
| 7.5 | 0.4 | 180° / 180° | 180° / 180° | 5.9 / 7.7 | 6.0 / 8.0 |
| 9.0 | 0.2 | 180° / 180° | 180° / 180° | 6.1 / 7.6 | 6.2 / 7.8 |
| 9.0 | 0.4 | 180° / 180° | 180° / **123° (fall)** | 7.3 / 9.7 | 7.5 / 10.0 |

At carry 0.2, 7.5 m/s, the full-stick 180° arc ends at 3.3 m/s instead of 0.9, and the half-stick one now completes.

## 2. The pair on the Canyon-matched wave, Compress held (off → on)

### Set B (16 runs per cell)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| Top turn begun | 16 → 15 | 15 → 14 | 15 → 15 |
| One pair | 7 → 6 | 7 → 8 | 14 → 12 |
| Two pairs | 1 → 0 | 3 → 4 | 6 → 6 |
| Pair 1 time, median | 4.32 → 4.09 s | 4.00 → 4.05 s | 4.60 → 4.75 s |
| Bottom turn → top turn, median | 2.08 → 2.05 s | 2.25 → 2.40 s | 2.54 → 2.75 s |
| Waiting on the flat, median | 1.05 → 1.04 s | 1.16 → 1.30 s | 1.45 → 1.57 s |
| Speed at the top turn, median | 4.9 → 4.5 m/s | 4.6 → 5.1 m/s | 5.4 → 6.1 m/s |
| First-pair fails: falls (sudden / stall / other) | 4 / 2 / 0 → 0 / 3 / 2 | 0 → 1 / 0 / 0 | 1 / 0 / 0 → 3 / 0 / 0 |
| First-pair fails: carried over the crest | 3 → 4 | 8 → 5 | 0 → 0 |
| First-pair fails: left out in front | 0 → 1 | 1 → 2 | 1 → 1 |

### Set C (8 runs per cell: top turn begun early)

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| One pair | 3 → 6 | 6 → 8 | 7 → 7 |
| Two pairs | 2 → 4 | 6 → 7 | 7 → 6 |
| Pair 1 time, median | 3.90 → 4.78 s | 4.63 → 4.44 s | 4.29 → 4.37 s |
| Bottom turn → top turn, median | 1.87 → 1.92 s | 2.20 → 2.45 s | 2.75 → 2.96 s |

### Cutbacks

| | Carry 0 | Carry 0.2 | Carry 0.4 (today) |
| --- | --- | --- | --- |
| 150–180° completed (of 16) | 0 → 0 | 0 → 1 | 2 → 1 |
| 150–180°: falls in the first arc | 7 → 6 | 1 → 0 | 1 → 6 |
| 90–120° completed (of 8) | 3 → 3 | 5 → 8 | 8 → 8 |

The rider carries a little more speed with the switch on, so she runs further out on the flat before the wave
brings her back (the waits and bottom → top times are 0.1–0.25 s longer at carry 0.2 and 0.4). The timing of the
script's turns was not retuned for that, and some of the changed outcomes will be the script meeting the wave at a
different place. At carry 0.4 the 150–180° cutback's first arc fails more often (1 → 6 of 16); the cause was not
traced.

## 3. Trim, hands off the turn (16 s, one run per cell)

| Run | Off | On |
| --- | --- | --- |
| Standing, held line, entry 7.4 | rides 16 s, 7.3 m/s | rides 16 s, 7.4 m/s |
| Standing, held line, entry 8.9 | rides 16 s, 7.3 m/s | rides 16 s, 7.5 m/s |
| Compress, held line, entry 7.4 | rides 16 s, 7.3 m/s | rides 16 s, 7.4 m/s |
| Compress, held line, entry 8.9 | rides 16 s, 7.4 m/s | rides 16 s, 7.6 m/s |
| Standing, no input, entry 7.4 | rides 16 s, 7.4 m/s | rides 16 s, 7.5 m/s |
| Standing, no input, entry 8.9 | still up at 16 s but at the crest, 3.7 m/s | dropped behind the crest at 14.1 s |
| Compress, no input, entry 7.4 | dropped behind the crest at 15.6 s | fell at 13.0 s (speed ran out) |
| Compress, no input, entry 8.9 | fell at 11.7 s | fell at 11.6 s |

Held lines: no fall, trim slightly faster. The three no-input runs that were already being lost with the switch off
are lost with it on too, two of them 1.5–2.6 s sooner. One run each, so this says "not clearly worse", no more.
(Rows are carry 0. At carry 0.2 and 0.4 the standing and no-input rows are identical; the Compress held-line rows, where the
stick corrects the line and so the carry acts a little, read 7.3 → 7.4 and 7.5 → 7.8 m/s at 0.2, 7.3 → 7.6 and 7.7 → 8.0 at 0.4.)

## What the rule does not cover

- **The tail late in the turn.** As the board slows it runs nose-high and the tail sinks. Then both rails are under
  at the rear stations (a typical vent pattern tail → nose late in a 6 m/s arc: closed at the four tail stations,
  open at the next six). The rule says "both rails under: no air path, wet", so the rear leg goes wet again exactly
  where the drag peaks. The advisor's row says the hollow is real "while it has an air path (the high rail **or the
  tail** above the surface)"; a board planing fast with a dry transom would vent over the tail. The build tests the
  rails only, station by station. This is the main reason the result is 0.66 and not the what-if's 0.72.
- **The hull's nose-high trim** (0.13–0.18 g of pressure drag). Untouched; now 60–70 % of the turn's drag.
- **The Froude test is a step.** At 1.5 the share jumps between the hollow's value and 1. No blend was added because
  that would need a new constant. No jump was seen to cause a fall in these runs, but it was not looked for.
- **White water.** Built as ruled (fade with void fraction or lens share) but not exercised: the test wave has none.
- **Under the lip, tubes, the carved void.** Built as "never"; not exercised.
- **Hands.** A trailing hand over the deck is not sheltered.

## Surprises

- **The carry is a stronger motor with the hollow on.** Flat water, carry 0.4, full stick: from 7.4 m/s the 180° arc
  ends at 9.8 m/s (8.7 off). From 8.8 m/s the speed climbs to 12 m/s and at 123° the board snaps round (236 °/s) and
  the rider falls; off, the same run wobbles at the same place and survives to 12.5 m/s. The trace shows the turn
  rate oscillating from 2.7 s on in both. Speeds of 11–12 m/s on flat water exist only because the carry pushes.
- **Trim changes although the rider's legs are dry in trim.** The deck near the low rail is part-wet in trim; the
  hollow dries it, and the board runs 0.1–0.3 m/s faster.
- **Standing turns barely change**, as the compress-drag ledger predicted: standing legs are dry until the end.

## Not verified

- Anything on real solver water: breaking waves, white water, the pocket, lips, tubes. The owner rides
  (`?deckHollow=on`, Canyon with `?canyonWaves=true`).
- The pair and cutback counts are 8–16 scripted runs per cell on a wave with no pocket; they indicate, they do not
  rate.
- The advisor's rule itself is provisional: the planar cavity constant, the ramp's form, separation off a soft rail
  and the buoyancy question are open in the consult log.
- The cause of the extra first-arc cutback falls at carry 0.4, and of the 12 m/s snap.

## Tests

`src/physics/deckHollow.test.ts`: the pure function (open, closing, sealed, the Froude cut, foam, the rail-edge
depth), and two integration tests on flat water (a Compress arc loses less to the water and to friction with the
switch on; level trim is unchanged to six decimals). `src/game/PhysicalMode.test.ts`: the switch.
