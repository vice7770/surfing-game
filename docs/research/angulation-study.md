# Angulation: first measurements

On the user's choice of option A after the carve-drag study (2026-09-29): the body leaning past the rail in a hard carve, as Forsyth et al. 2024's surfers do (a 55° lean over a 42° rail at 1.41 g). Measured on the carve lab's plant, a held rider (`HeldRider`) towed along its heading on flat water. The last 0.5 s of 1.5 s held are read. Work stopped here when the user took it on locally.

**Outcome (2026-09-30):** no angulation is missing. Forsyth et al. measured the rail and the yaw rate; the 1.41 g and the 55° lean were derived here from speed × yaw rate, which overstates a turning board's pull. Planing hulls banked into a turn give no grip along their beam. See the last section.

## The hull alone cannot angulate

A couple at the feet flattening the board under a held 22° lean, at 7 m/s:

| Couple | Rail | Pull | The lean it balances |
|---:|---:|---:|---:|
| 0 | 22.1° | 0.42 g | 22.8° |
| −50 N·m | 19.1° | 0.32 g | 17.8° |
| −100 N·m | 16.3° | 0.25 g | 13.8° |
| −150 N·m | 12.8° | 0.14 g | 8.2° |

- The pull per rail is G = pull / tan(rail) ≈ 1.0 at 7, 9 and 11 m/s. A planing bottom's force is normal to it, so the hull alone gives exactly tan(rail).
- Flattening the board under the body cuts the pull, and the leaning body is no longer held. It falls into the turn.
- **Angulation needs sideways force from something not parallel to the bottom**: the fins or the rails. In carves both sit idle: the fins' attack is their 3° toe-in, and they carry 4–9% of the pull.
- Forsyth's G is 1.41 / tan 42° = 1.57.
- The held rider leaning past about 30° falls off the towed board (not a turning path), so this table is limited to moderate leans.

## A yaw couple through the feet loads the fins

The same held lean with a couple turning the board about the vertical into the turn. It stands in for the feet's twist: surfers' rotation, the back foot driving the tail. The probe's couple is reacted by nothing.

| Speed, lean | Yaw couple | Rail | Pull | G | Fins' share of the pull | Drag |
|---|---:|---:|---:|---:|---:|---:|
| 7 m/s, 22° | 0 | 22.1° | 0.42 g | 1.03 | 5% | 181 N |
| | 20 N·m | 18.8° | 0.41 g | 1.20 | 16% | 173 N |
| | 40 N·m | 15.6° | 0.41 g | 1.47 | 29% | 170 N |
| | 80 N·m | 8.3° | 0.39 g | 2.68 | 59% | 168 N |
| 9 m/s, 22° | 0 | 19.3° | 0.36 g | 1.02 | 5% | 149 N |
| | 20 N·m | 16.4° | 0.36 g | 1.22 | 17% | 150 N |
| | 40 N·m | 13.1° | 0.36 g | 1.53 | 31% | 147 N |
| | 80 N·m | 7.4° | 0.36 g | 2.77 | 60% | 139 N |

- A twist of 20–40 N·m puts 16–31% of the pull on the fins and raises G to 1.2–1.5 (Forsyth's 1.57). The same pull comes on a rail 3–9° flatter than the body: **angulation, and the equilibrium holds.**
- The drag does not rise. It falls a little (181 → 170 N at 7 m/s), because the fins' lift is cheaper than the rolled hull's.
- Past about 80 N·m the fins do most of the turning, and the rail goes flat.

## Reading and what next

1. In this model, angulation is not a balance setting on its own. It is the fins carrying pull, and that takes a twist of the board into the turn.
2. **The twist needs a source.** A steady couple through the feet must react against something:
   - the upper body turning the other way, a rotor like the swing, which holds no steady torque over a long carve;
   - the hand in the water;
   - the whole body's yaw as the turn builds.

   Sizing it: over a 1 s turn, 30–40 N·m is an angular impulse of 30–40 N·m·s. The upper body (about 2 kg·m² about the vertical) would have to turn about 15 rad/s the other way to supply it. That is too much, so a held twist must react against the legs' torsion on a body whose yaw is carried with the board. It needs its own design.
3. Then the balance: the reference lean up to where the rail sits at its bite (48°) with the twist's G, and the twist scaled with the steer.
4. Before building, the don't-retry list in memory (p4e-carve-root-cause) applies: the roll–yaw wobble (Mode B) is fed by yaw and roll feedbacks, and a twist is a yaw actuator.

The probe that produced these tables is `TwistedRider`: a `HeldRider` whose `coupleStanding` adds `h · yawCouple` to the board's yaw row, run by `held(speed, steer, rollCouple, yawCouple)`. It was left uncommitted in the session's worktree as `src/dev/zz-angulation.test.ts`.

## The twist's source (2026-09-30)

Picked up from the open question above. The probes are the same carve lab (`HeldRider`, towed on flat water, the last 0.5 s of 1.5 s read) and the deep U (`FaceToFlat`, crouched down the 15° face at 7.3 m/s, full lean and Compress 1 m before the flat).

### No steady twist through the feet

- In a steady turn the body yaws at a steady rate, so the net yaw torque on it is nothing. A couple the feet put on the board, the board puts back on the body, and nothing else holds the body round.
- Over a whole turn the body's own yaw momentum changes by only I Δω, about 2 kg·m² × 1.9 rad/s ≈ 4 N·m·s. At the entry it resists the turn: the feet must spin the body up.
- So the probe's couple was an outside torque. The only outside yaw torques are the water's: on the hull, the fins, the rails and the hand.

### Where the rider pushes sets the fins' share

- In the board's frame the hull's pressure acts along the bottom's normal. Its pitch balance puts its centre under the rider's push, and it takes nothing along the deck.
- Angulated, the rider pushes the board out along its deck by R sin(θ − φ). Only the fins can take that. The yaw balance then asks F (z_rider − z_fins) = M_hull: the fins' force times their distance behind the rider's push equals the yaw moment the hull's drag gives on its wetted inside rail.
- The probe's 40 N·m stands in for about 100 N over 0.4 m. Physically that would be the rider's push over the fins.

Measured, 7 m/s, steer 0.6 (22° of bank held):

| Change | Body along the board | Nose up | Rail | G | Fins' share | On |
|---|---:|---:|---:|---:|---:|---|
| none | −0.20 m | 7.6° | 22.1° | 1.03 | 5% | on |
| trim −0.5 | −0.27 m | 9.0° | 20.6° | 1.04 | 4% | on |
| trim −1 (weight back) | −0.35 m | 11.1° | 19.8° | 1.14 | 21%, unsteady | on |
| the whole stance 0.1 m aft | −0.28 m | 9.3° | 20.1° | 1.00 | 4% | on |
| the whole stance 0.2 m aft | | | | | | off |

- Trim moves the body back 0.15 m at most (the balance keeps the centre of pressure within 0.2 m of the stance's middle), and the hull's centre follows it back. The nose rises, and the fins gain nothing steady. At 9 m/s and 0.4 steer the same.
- 0.2 m aft or more, the body is past the rear foot and falls.

### The reaching hand

- Held at 15–22° of bank, Compress's reaching hand does not reach the water.
- In the deep U it touches, and turns the board by 10 N·m at most, fading to 2 N·m as the turn slows. The probe needed 20–40 N·m.
- Deeper, it drags: fully under at 7 m/s it pulls about 0.4 body weights.

### The deep U angulates the wrong way

The bottom turn as it is (steer −1, crouch 0.6, Compress 1):

| t s | Turned | Body's bank | Rail | Bank asked | Ankle rest | Pull g | G | Fins | Speed m/s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.4 | 3° | 19° | 20° | 38° | 1° | 0.58 | 1.66 | 14% | 5.9 |
| 0.6 | 13° | 25° | 27° | 36° | 7° | 0.46 | 0.92 | 15% | 5.6 |
| 0.8 | 26° | 29° | 37° | 34° | 12° | 0.63 | 0.86 | 9% | 5.3 |
| 1.0 | 42° | 30° | 44° | 29° | 14° | 0.76 | 0.82 | 7% | 4.9 |
| 1.2 | 61° | 29° | 45° | 21° | 14° | 0.60 | 0.63 | 4% | 3.9 |

(The ankle rest is signed against the lean: positive rolls the board further onto its rail than the body.)

- From 0.6 s the rail rolls past the body, 15° by 1 s, with the ankle's rest at its end. Forsyth's surfers lean 13° past their rail; the model rides 15° the other way.
- The feet catch the body's fall into the turn by rolling the board further onto its rail. On a board whose pull per rail is 1, that is the only way to get more pull.
- The lean cap, atan(v² / (g · 4.5 m)), falls with the speed: 38° → 21°. So the balance asks the body back up while the board slows, and the feet dig the rail further, to its bite. The rail at 44–45° is where the speed goes.

Two tries within today's physics, reverted:

| Try | Turned at 1.2 s | Body / rail at 1 s | Speed at 1.2 s | On |
|---|---:|---:|---:|---|
| as it is | 61° | 30° / 44° | 3.9 m/s | on |
| the feet never roll the board past the body while steering | 44° | 30° / 29° | 4.0 m/s | failing: 0.44 g at a 29° rail cannot hold a 30° body; by 1.2 s the pull is 0.09 g and the swing is at 59° of its 69° |
| the lean cap held at its highest since the steer began | 67° | 42° / 49° | 3.3 m/s | on, the rail past its bite |
| both | 51° | 42° / 42° | 3.8 m/s | failing: the body at 62° by 1.2 s, the pull 0.09 g |

### Reading

1. With the hull's pull per rail at 1, neither the balance nor the stance can lean the body past its rail. Every way round it digs the rail or drops the rider.
2. Angulation needs a force along the deck, under the rider's push. On a real board that is the buried rail. Surf Simply's ribbon study found the suction around the rails "seems to overpower" the side fins' deflection ([Surf Simply](https://surfsimply.com/magazine/surfboard-hydrodynamics-whats-really-happening-beneath-your-board)).
3. The model's rail faces push only when the board slides into the water on their side, never suction. In a carve the buried inside rail slides away from its water, so they give nothing.
4. Sources to size a rail's grip from:
   - planing hulls in yaw: Lewandowski's semi-empirical sway and yaw coefficients (beam, speed, trim, deadrise, wetted length);
   - slender-body oblique-impact theory for planing side forces in yaw ([Ocean Engineering 2015](https://www.sciencedirect.com/science/article/abs/pii/S002980181500089X)).

   On the back of an envelope, the buried rail is a very low aspect ratio lifting surface: slender-body lift, with a span of twice its immersion at the free surface. That gives 40–160 N per 0.1 rad of slip at 7 m/s for 5–10 cm of immersion, about the push along the deck Forsyth's angulation needs (roughly 100–300 N).
5. Twisting through the feet, standing back, and the hand all fall short. The hand gives 10 N·m at a light touch.

The probes are `src/dev/zz-angulation.test.ts` (trim, stance and hand sweeps added to `held`) and `src/dev/zz-angulation-turn.test.ts` (the deep U traced), left uncommitted in the session's worktree like the first.

## Rail grip, from the sources, and what Forsyth measured (2026-09-30)

The user's pick after the section above: rail grip, studied before it is built. The sources do not support it, and the angulation it was meant to give was never measured.

### A planing hull banked into its turn pushes along its own normal

Brown & Klosinski (1994, Davidson Laboratory) towed prismatic planing hulls (20° deadrise, free to heave) at a drift angle and a heel. Marleaux, Simonis & Abdel-Maksoud (2024, 35th Symposium on Naval Hydrodynamics, [PDF](https://d-nb.info/1348087765/34)) plot their data against a 2D+t model. At 5° of drift, the side force along the hull's own beam (body-fixed y″), as a share of the weight:

| Heel | 3° trim, F_nB 3 | 6° trim, F_nB 3 | 3° trim, F_nB 4 |
|---|---:|---:|---:|
| 10° away from the turn (the leading chine down) | 0.38 | 0.28 | 0.47 |
| level | 0.18 | 0.12 | 0.22 |
| 10° into the turn (the trailing chine down, as a carve) | 0.01 | 0.00 | 0.04 |

- A planing boat's steady turn is banked into it, with the bow inside the path (positive drift, positive heel; Katayama et al. 2006, as the paper cites). That is a carve's state, and its side force along the hull is about nothing.
- Its horizontal side force there (0.19 of the weight at 10°) is the planing lift tilted: sin 10° ≈ 0.17.
- A hull grips along its beam in two ways, and a carve uses neither:
  - the spray root rising on the leading side (strongest heeled away from the turn);
  - spray reattaching to the leading chine's wall ("side wetting").

  A surfboard, nearly flat with round rails, has less of the first to begin with.
- Surf Simply's rail suction was watched in trim (a front-footed glide) with ribbons, not measured in turns, and it gives no force.

So a pull per rail of 1 on still water is planing physics, and the model's is right. A rail grip sized to give 1.5 would have no source.

### Forsyth measured the rail and the yaw rate, not the pull

Forsyth et al. 2024 (Sci Rep 14:8734, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11021506/); a TraceUp GPS at 10 Hz and IMU at 200 Hz, flush in the deck) report each turn's magnitude, duration, speed, angular velocity and rail angle. They give no g-force and no body lean.

- The "1.41 g" and the "55° lean over a 42° rail" in these studies are our own arithmetic (`surf-gameplay-research.md`, tagged [D]): speed × yaw rate ÷ g, and atan of that.
- That holds only if the board's heading turns with its path on still water. A board that pivots, or rides moving water, turns its heading faster than its path.

### The model's turns on waves, measured both ways

The Canyon's practice sea (the ride report's settings: turns, the pocket reflex, ghosts), every standing step turning faster than 1 rad/s above 4 m/s.

| Hard-turn steps (yaw rate over 1 rad/s, over 4 m/s) | All (471) | Past 1.2 g by speed × yaw rate (276) |
|---|---:|---:|
| Speed × yaw rate ÷ g | 1.38 g | 1.71 g |
| The path's pull over ground (from the velocity's change) | 0.91 g | 1.14 g |
| The pull through the water (the velocity through the water's turn) | 0.92 g | 1.13 g |
| The heading off the path | 5.8° | 6.1° |
| Rail from the horizontal / from the water's surface | 32° / 33° | 34° / 34° |
| The surface's tilt | 5.5° | 5.2° |
| The board's upward acceleration | 0.06 g | 0.12 g |
| The body's bank from the vertical | 25° | 26° |

The same run's turn table (speed × yaw rate, as the ride report prints it): 9 bottom turns, 1.18 s, 83°, 2.2 rad/s peak at 8.5 m/s, "1.46 g", 46° rail. Speed kept into the next top turn 0.38 (4 pairs); the top turns began at 2.5 m/s. A first run of 3 minutes gave the same: 1.31 g by speed × yaw rate at a 33° rail, the body at 28°.

- **Speed × yaw rate reads 1.5 times the path's pull.** The heading swings about 6° about the path as the board pivots and its water moves. So the ride report's "Lateral g" and "Radius" columns, and the 1.41 g we derived for Forsyth, read the heading's turn, not the pull.
- **The board already out-pulls a level hull against the horizontal.** It pulls 0.91 g on a 32° rail while climbing at 0.06 g, where a hull on still, level water gives tan 32° × 1.06 ≈ 0.66 g. The face's tilt (about 5°) and its moving water (1.1 m/s) give the rest; there is no grip term. That is what the angulation was meant to add, and on waves the model has it.
- **The body leans less than its rail:** 25° over 32°, where 0.91 g would balance a 40° lean. The ankle holds it upright against its pull. This is the balance's slow lean (the entry study's 0.49 s time constant) in turns of about a second, not a missing hull force.

### Reading

1. **Don't build rail grip.** Planing hulls banked into their turn push along their own normal (Brown & Klosinski), and the model's still-water pull per rail of 1 is theirs. A grip term would have no source.
2. **The angulation target was our own arithmetic.** Forsyth et al. measured the rail and the yaw rate. Speed × yaw rate overstates a turning board's pull by about half, on the model's waves at least. Held to what Forsyth measured, the model's bottom turns on waves match: 2.2 against 1.9 rad/s, a 46° against a 42° rail, 1.2 against 0.96 s.
3. **Option A closes here.** What remains of the bottom turn:
   - the speed kept (0.38 against Forsyth's turn flow of 0.88–0.95): the top turns start at 2.5 m/s;
   - the body's lean, 15° short of its pull in hard turns on waves: the entry study's slow lean-in.
4. **The ride report's "Lateral g" and "Radius" columns should read the path's turn** (the velocity's change), not speed × yaw rate. `surf-gameplay-research.md`'s derived bottom-turn and cutback loads carry the same caveat.

The probe that measured the waves is a patch on `scripts/ride-report.ts`, kept in the session's scratchpad (`ride-report-angulation-probe.patch`).
