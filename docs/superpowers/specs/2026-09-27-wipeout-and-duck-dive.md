# Wipeout and duck-dive: specification

Status: **agreed** in a grilling session with the user on 2026-09-27 (two rounds, Q1–Q21, every recommendation accepted, confirmed "confirm, go ahead with the plan"). Part A merged (PR #47); Part B built on `claude/wipeout-duck-dive-b` (2026-09-27), its hold-down check met; both await the user's playtest. Checks and open findings are on the roadmap's P11 entry and in the duck-dive and hold-down reports. It is a slice of the [gameplay milestone spec](2026-09-26-gameplay-milestone.md)'s P11 Lineup, taken ahead of P10's end: the leash, the swim back, the duck-dive, and then aeration, hold-downs and breath. The milestone's principles still hold: physical inputs, not scripted moves; outcomes are validation checks, never tuned into passing; body limits are provisional design parameters citing the [research survey](../../research/surf-gameplay-research.md); performance is never a gate.

## Where it starts

- After a fall, a seven-point swimmer (`DetachedSurfer`) takes over. Space strokes and the arrows steer while the water around it is calm. Enter within reach grabs the board (`BoardRecovery`) and climbs back on prone, keeping the pair's momentum, but only from behind the board, facing its nose, and never onto an upside-down board. R relaunches in the lineup.
- There is no leash: the board drifts off on its own.
- There is no duck-dive, no breath, no aeration and no hold-down. The only broken-water effect on bodies is the surface roller's shoreward push, brought forward from P11 by the riding-the-wave work.

## Scope

- **Part A:** the leash, swimming and getting back on the board, then the duck-dive.
- **Part B:** aeration, turbulence (hold-downs) and breath.
- **Left in P11 for later:** the sliding window, reading sets, Next set.
- **Order and branch:** its own branch and worktree, in parallel with Compress, re-catch and the Reef. It does not touch the standing rider.

## Part A

### Leash

- Always worn: 6 ft (1.83 m) of urethane from the back-foot ankle (the right ankle regular, the left goofy once that setting lands) to the tail plug.
- It is slack until stretched, then stretches about 30–50 % before its tension climbs steeply. Stiffness, damping and the snap force are provisional design parameters citing the survey's leash section (§6).
- It snaps above about 1.2 kN of tension. The survey's drag estimate for a bore on a tethered board (0.6 kN edge-on, up to 3 kN flat-on at 4 m/s) makes snaps in big whitewater plausible, not routine.
- The stretched leash springs the board back toward the rider (recoil).
- When it snaps, the HUD says "Leash snapped", the board drifts free, and R relaunches with a new leash.

### Swimming and getting back on

- Swimming stays as it is: Space strokes, the arrows steer, in calm enough water.
- **Holding Enter with the board out of reach pulls the leash in, hand over hand:** the board comes toward the rider and the rider drifts toward the board. Swimming works too.
- **Enter within reach grabs from any side.** The hand forces turn the board toward the rider's heading and roll it upright when it is upside down (forces only, no teleport), then the rider climbs on prone, keeping the pair's linear momentum as today.
- **The board and the swimmer collide physically.** A knock shoves the swimmer and plays a sound. There is no injury.

### Duck-dive

- A new rebindable action, **Duck-dive**, live lying down and while swimming: S/↓ on the keyboard (ramped over 0.2 s like every key), LT on a gamepad (analog; LT is free lying down because Crouch uses it only standing), and D-pad down.
- Held while prone: the arms push the nose under through the hand contacts, and the knee follows on the tail about 0.3 s later. The physics decides how deep the board goes; harder (analog) pushes deeper. Releasing lets the board float up and the rider surface with it. Timing (starting 1–2 body lengths before the whitewater) and paddle speed are the skill.
- The milestone spec's number: about 234 N net push to sink the reference board (25.75 L).
- **While swimming**, the same action takes a breath and dives; releasing floats up.
- **While holding the board**, it lets go and dives; the leash keeps the board.
- No bail (throwing the board) and no turtle roll: both are backlog.
- No stamina here. Duck-dives, hard swimming and swimming up join P10's stamina model when it lands.

### Teaching

- One line on P8's Controls screen.
- One-time hints that retire after the first success: "Hold S to duck-dive" the first time whitewater comes at a prone rider, and "Hold Enter to pull the leash" after the first wipeout.
- A Surf School lesson, **Duck-dive**: the rider starts on the inside with whitewater coming, and passes by coming up behind it without being pushed back more than a few metres.

### Looks and sound

- Poses written in code from the physics, like the rest of the rig: the swim stroke, the dive, and the duck-dive (arms straight on the rails, knee on the tail, head down). No Mixamo.
- The leash is drawn as a cord from ankle to tail: sagging when slack, straight when taut.
- Synth sounds: the leash snap, the board knock, the duck-dive plunge.

### Online

The swimmer, the loose board, the leash and the duck-dive go into the rider snapshot, so other players see them. Collisions between players' boards and swimmers stay in N1 Part B.

### Part A is done when

- a strong push sinks the reference board 0.5–1 m (survey §5);
- a well-timed duck-dive under a 1–1.5 m bore is pushed shoreward much less than a rider who stays on top, a late or early one does worse, and it is weaker in shallow inside water (survey §5);
- the leash snaps above about 1.2 kN and holds below it;
- a rider can reel the board in and climb on from any side, keeping momentum;
- and the user's playtest agrees.

A failing check is investigated, never tuned into passing.

## Part B

- **Aeration:** broken water holds 12–18 % air (Blenkinsopp & Chaplin), which makes it lighter than a surfer with a breath held, so a body sinks while the foam lasts. It changes what bodies sample, not the solver.
- **Turbulence:** a field of eddies scaled by the solver's breaking dissipation pushes down and spins the body, and fades over about one wave period. It is physical flow the bodies sample, not a scripted tumble.
- **Breath:** about 60–70 s at rest, draining faster with effort (Guimard et al. 2021). Underwater, the Duck-dive action dives, Space swims up at a higher breath cost, and releasing relaxes and floats.
- **Feedback:** body cues, sound muffled while the head is under, and the screen edges darkening as breath runs low. An optional breath meter, like the balance meter: on by default in Practice, off in Natural Sets.
- **Running out** ends the ride with "Held down too long" and a rescue to the lineup.
- **Done when** hold-downs in 1–2 m plunging surf mostly last 5–15 s (survey §6), with back-to-back set waves compounding, and the user's playtest agrees.

## Unchanged

- The camera always stays above the water. An underwater view is a graphics item for the backlog.
- R stays the quick retry in both modes. A setting that makes a Natural Sets wipeout mean swimming or paddling back out comes after the user has played this.

## Backlog from this spec

Bail, the turtle roll, the underwater camera, and the forced paddle-out setting.
