# Angulation: first measurements

On the user's choice of option A after the carve-drag study (2026-09-29): the body leaning past the rail in a hard carve, as Forsyth et al. 2024's surfers do (a 55° lean over a 42° rail at 1.41 g). Measured on the carve lab's plant, a held rider (`HeldRider`) towed along its heading on flat water. The last 0.5 s of 1.5 s held are read. Work stopped here when the user took it on locally.

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
