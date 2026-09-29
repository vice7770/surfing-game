# The carve's drag: a study

On the user's go-ahead (2026-09-29), after the bottom-turn entry study found that the game's turns lose their speed, not their strength (turn flow 0.45 against Forsyth et al. 2024's 0.88–0.95). Measured before any change: steady carves under a held rider towed on flat water (the carve lab's `HeldRider`), free carves with and without fins, and the energy ledger of the autopilot's bottom turns on the Canyon's practice wave.

## Straight glide against planing theory

A held rider standing upright (80 kg with the board), towed along the heading on flat water. The last 0.5 s of 1.0 s held. Savitsky's (1964) flat plate is 0.5 m wide (the board's widest) and carries the same load. The board's tail is narrower, so the plate is its best case.

| Speed | Lift / drag | Pressure drag | Friction | Fins | Pressure's angle to the flow | Savitsky, λ 2–3: trim, lift / drag |
|---:|---:|---:|---:|---:|---:|---|
| 5 m/s | 3.8 | 162 N | 27 N | 5 N | 14.7° | 5.5–8.6°, 5.6–7.3 |
| 7 m/s | 5.4 | 76 N | 53 N | 10 N | 7.2° | 3.7–5.3°, 6.9–7.2 |
| 9 m/s | 5.3 | 61 N | 63 N | 16 N | 5.4° | 2.6–3.5°, 6.1–6.9 |

- **Planing (7–9 m/s):** the model is within 10–25% of the flat plate. A 0.4 m wetted beam in Savitsky trims 5.9° at 7 m/s for a lift-to-drag ratio of about 6.
- **At 5 m/s the board barely planes.** Buoyancy carries 134 of 743 N, the bottom meets the flow at 15°, and the drag is 194 N.

## Carves: the hull turns, the fins hold

| Held carve, 7 m/s | Rail | Pull | Drag | Lift / drag | Fins' share of the pull | Fins' attack |
|---|---:|---:|---:|---:|---:|---|
| straight | 0° | 0 g | 138 N | 5.4 | — | ±3° (their toe-in) |
| steer 0.3 | 11° | 0.18 g | 141 N | 5.3 | 9% | ±3° |
| steer 0.6 | 22° | 0.41 g | 143 N | 5.3 | 7% | ±3° |
| crouched + Compress, steer 1 | 33° | 0.67 g | 217 N | 4.2 | 4% | ±3° |

- The fins' attack is their toe-in: the flow at the tail runs along the board. The rolled bottom supplies 93–97% of the pull.
- **Without fins the board spins out.** A free rider at 7–9 m/s slips 15–42° (1° with fins), and falls at 9 m/s at full steer. So the fins do hold the tail, as on a real board, while the rolled hull carries the load, as a rail does.
- **At a hard turn's load the drag is planing theory's.** 1.68 body weights at 5.4 m/s (the deep U at 1.0 s) cost about 230 N. Savitsky's plate carrying the same load drags about 267 N: 10° of trim at λ 3, 0.45 m wide.

## On the wave: the autopilot's bottom turns

The Canyon's practice sea, seed 1, 3 minutes. The autopilot rides S-turns, allowed 3 s per turn. The energy of each bottom turn:

| Turn | Speed | Face (share of its height) | ΔKE | ΔPE | Hull pressure | Friction | Fins | Rider's body |
|---|---|---|---:|---:|---:|---:|---:|---:|
| 134° in 2.67 s | 10.5 → 6.6 m/s | 0.34 → 0.03 | −2,738 J | −562 J | −2,026 J | −1,393 J | −371 J | −133 J |
| 131° in 2.60 s | 10.3 → 6.7 m/s | 0.34 → 0.08 | −2,969 J | −626 J | −2,078 J | −1,516 J | −385 J | −149 J |
| 121° in 2.47 s | 10.9 → 7.0 m/s | 0.16 → 0.04 | −3,189 J | −288 J | −1,778 J | −1,604 J | −374 J | −27 J |

Mean power: pressure −760 W, friction −585 W, fins −146 W, rails −5 W, the rider's body −39 W; the water's added mass and radiation +75 W.

- **The turns are wide arcs on the flats.** They start at a third of the face and end near the trough. They lose height as well as speed, and the wave feeds nothing: every water term is a loss.
- **They are slow because of the lean cap.** At 10.5 m/s the body's 50° cap (RAIL_RANGE) allows at most 1.19 g of pull, about 1.1 rad/s. These turns averaged 0.9 rad/s.
  - Forsyth's bottom turns pull 1.41 g at 7.3 m/s: a coordinated lean of 55° over a 42° rail.
  - The body leaning about 13° further than the board is angulation. The model's feet can give up to 14° of it (ANKLE_REST_RANGE).
- **The drag per unit load is the flat plate's.** The hull's pressure drag averaged about 89 N at 1.26 g. Savitsky's plate gives 76 N.
- **Skin friction is large at these speeds** (about 64 N), as it is for the plate.

## A higher lean cap, tried

A free rider on flat water at full steer for 1.5 s, with the body's cap (RAIL_RANGE) and the turn radius the lean may ask for (TURN_RADIUS) raised:

| Cap, radius | 7 m/s | 9 m/s | 10.5 m/s |
|---|---|---|---|
| 50°, 4.5 m (now) | 99°, kept 52%, rail max 47° | 85°, 69%, rail max 50° | 67°, 74%, rail max 50° |
| 55°, 4.5 m | 99°, 52% | 86°, 67%, rail max 55° | 73°, 73%, rail max 53° |
| 60°, 4.5 m | 99°, 52% | 86°, 67%, rail max 58° | 85°, 71%, rail max 60° |
| 55°, 3.8 m (Forsyth's radius) | 99°, 50% | 86°, 70%, rail max 63° | 73°, 73% |
| 60°, 3.8 m | 99°, 50% | 89°, 66%, rail max 76° | 86°, 71%, rail max 61° |

- Within a turn's first 1.5 s the cap hardly matters: the lean-in (the balance's 0.49 s time constant) uses most of it.
- **The rail follows the body past its bite (48°) to 58–76°.** The planing board rights about the rider's load line, so the body's extra lean rolls the board with it. The model does not angulate: the body does not lean further than the board, where Forsyth's surfers lean about 13° further.

## Reading

1. **The hull's drag, straight and carving, is planing theory's** within 10–25%. It is not a bug. A real board carving 1.4 g on still water loses its speed as fast.
2. **The fins hold the tail** and carry little of the pull, as a rail-turning board's do.
3. **The game's bottom turns lose their speed because they are long and wide:** 2.5 s arcs down onto the flats at 10 m/s, where the wave gives nothing back. Forsyth's surfers turn in about 1 s. Surf coaching places the bottom turn at the base of the face, turning back up into the pocket; the game's turns end at the trough (3–8% of the face).
4. **The turn is long for two reasons.**
   - The lean-in is slow (the entry study). Faster, it breaks rail changes and the wobble.
   - At speed the lean is capped at 50° (1.19 g), and raising the cap only rolls the rail past its bite, because the model does not angulate.
5. **So speed is kept by a quicker, tighter turn made higher on the wave, not by less drag.**

## What next (for the user's choice)

- **A. Angulation:** the body leaning 10–15° further than the rail in a hard carve, as Forsyth's 55° lean over a 42° rail.
  - This is the physics a quicker, harder turn needs without the rail bogging, and it is the ankle-and-knee coupling the turn redesign built.
  - It needs a balance that holds the rail at its bite while the body leans past it. That is a redesign on the roll model, near the don't-retry list (Mode B).
- **B. Where the autopilot turns:** start its bottom turn higher on the face, so the recordings and reports turn where surfers do. This is a dev tool change; players choose their own line.
- **C. Keep the physics as it is:** the drag is right, and the gap is technique and turn speed.
