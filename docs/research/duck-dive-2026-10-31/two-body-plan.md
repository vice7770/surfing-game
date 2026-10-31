# Plan: the two-body ducking rider (duck-dive-l3, 2026-10-31)

**Status: a plan for the owner, nothing built.** The measurements in `README.md` show the rigid rider still capsizing.

## The problem in one paragraph

Lying prone, the reference board (25.8 L) is already fully under water, its buoyancy acting about 6 cm below its centre of mass (the 2026-09-28 analysis). Today's rider is one rigid body welded to the deck. When it presses, it lifts its own centre of mass about 0.24 m and loads the board through it, mid-board and never on the hands.

So the press tips the board nose-up (9° to 13°, measured again today) rather than nose-down. The pair is then an inverted pendulum with no waterplane to right it: the rider perched on top of a submerged board. It rolls over 1.1 s into a dive from paddling speed (today; 1.5 s in September), and after the bore in every 3 s hold.

A real duck-dive is the other way up:
- the hands drive the nose down at arm's length;
- the body follows the board into the water, where it is close to neutrally buoyant;
- the knee or foot then sinks the tail.

The body hangs under and behind the board, a hanging pendulum rather than an inverted one. No posture, gain or damping on the rigid rider fixes that: legs trailing, an upward-dog press, a hug knee, shape-change momentum and a low knee were all tried in September and none held. It needs the body to be its own body.

## What the owner gets

- **The dive:** pushing down the board's nose, then the knee on the tail, the body following it under. The board goes 0.5–1 m deep (the survey's coaching figure), nose first.
- **Through the dive:** the board kept while the broken wave passes over, then floating up and back on the deck.
- **The release:** letting go early, late or at the wrong angle gets the physical consequence: pushed back, losing the board, or coming up beside it on the leash. No scripted outcome.
- **Big boards:** a 50 L board barely goes under (about 460 N net to push against the arms' 250 N or so), so the turtle roll stays the longboard's way (backlog).

## Design

1. **The ducking body is the swimmer's.** `DetachedSurfer` already is a seven-node position-based body:
   - its parts' masses and volumes;
   - buoyancy, drag and the aerated water's lift per node;
   - the bed and the lip.

   The dive hands the rider over to it, as a fall does today. The rider starts from the prone pose's part centres (`AttachedRiderState.parts`, already used for falls) and returns to `AttachedRider` once it is back on the deck.
2. **Joined at the hands.**
   - Each arm node is held to a grip point on its rail, about 0.3 m ahead of the board's middle, by a stiff distance constraint (XPBD compliance; Macklin, Müller & Chentanez 2016).
   - The constraint's correction is applied as equal and opposite impulses to the board through `BoardContactBody.applyImpulse`, the seam the swimmer's board contacts already use.
   - The grip is lost above a force limit: today's ducking grip, 1 body weight.
3. **The arms' push** is a muscle along the arm, from shoulder to hand.
   - It extends the elbows toward a target length with a bounded force: about 250 N in total, the survey's figure for the net buoyancy of a 25.75 L board, eased in by `MinimumJerkTrack` as the stages are today.
   - The board sees it at the hands, ahead of its centre of mass, so the nose goes down first.
   - The body sees the reaction at the shoulders, so it goes up and forward until the water holds it.
4. **The knee and the hips.**
   - One-sided contacts (the swimmer's existing board contact) between the leg and pelvis nodes and the deck.
   - The knee stage pushes the leg node onto the tail about 0.3 s after the press (today's timing) with its own bounded force.
   - The hips may rest on the deck or float free.
5. **Water.**
   - The body is roughly neutral: human density about 0.98–1.0 with the lungs full (Pendergast et al. 2015). The swimmer's node volumes give that already.
   - The submerged board gets what the September notes found missing:
     - a flat plate's face-on drag, C_d about 1.17–1.2 (Hoerner 1965), against the planing hull's 0.46;
     - the added mass and added roll inertia of a plate, ρπb²L/4 per unit length about the long axis (Newman 1977).

     These matter for the board's pitch and roll whatever the rider is.
6. **Leaving the dive.**
   - On release, the push eases off and the body's buoyancy and the board's together bring the pair up.
   - Once the deck is within reach and the body is over it, the rider re-attaches prone. This uses the climb's checks from #166: hands on, the board under the chest.
   - A lost grip leaves the swimmer on the leash, as a fall does.
7. **Drawn and sent.**
   - The ducking pose is the swimmer's node pose with the arms locked to the rails, drawn by the existing detached-body path.
   - The online snapshot already carries the swimmer and the board.

## Plan of work

**Step 1. The submerged board's hydrodynamics.**
- **What:** plate drag and added mass/inertia when the hull is fully wetted (`BoardBody`).
- **Test:** a free submerged board's roll and pitch decay against Newman's added inertia; the rest of the riding is unchanged (stance-ladder, catch and Compress probes within noise).

**Step 2. The grip constraint between swimmer and board.**
- **What:** a grip constraint in `DetachedSurfer` (hands to rail points, two-way, with a breaking force), behind a switch.
- **Test:**
  - a hanging test: a still board held by a swimmer stays together, momentum conserved across the pair;
  - the grip breaks at its limit.

**Step 3. The arm push and the knee.**
- **What:** the arm push and the knee contact, on the existing stage tracks.
- **Test:**
  - flat water: the nose goes down first (the open `it.fails` "the arms sink the nose first");
  - 0.5–1 m deep (the open survey check);
  - a 50 L board under half the reference's depth (the open check);
  - from paddling speed, the board kept through a 3 s hold.

**Step 4. Hand-over and hand-back.**
- **What:** AttachedRider ↔ ducking body (start pose, momentum, the climb back on), and the lesson and hints unchanged.
- **Test:** releases at every phase come back to prone or to a clean swim, with no pops (the part centres continuous).

**Step 5. Under the broken water.**
- **What:** the test bore and the Canyon report re-run.
- **Test (the survey §5 checks):**
  - on time much less set back than on top, with the board kept;
  - early and late worse;
  - weaker inside;
  - in the Canyon's real whitewater, the board kept more often than on top.

**Step 6. Drawn and online.**
- **What:** the ducking pose, the snapshot and remote players.
- **Test:** pose-codec round trip; a strip of the dive from the side.

Each step comes with its switch (`?duckBody=old`), its probes and its report, as usual. No tuning into passing: a check that fails is investigated.

## Risks

- **Coupling stiffness:** a position-based grip on a rigid board can jitter or inject energy at 60 Hz.
  - Mitigation: XPBD compliance, substeps (the board already substeps), and a hanging-pair energy test.
- **The hand-back:** re-attaching mid-wave can pop the board.
  - Mitigation: reuse #166's climb conditions, and let the dive end as a swim when they fail.
- **Gameplay feel:** a physical dive can fail where the parked one at least kept you on in still water.
  - Mitigation: the probes report timing windows. The owner plays it before any merge.
- **The submerged-board change** affects falls and wipeouts too (boards tumbling under whitewater).
  - Mitigation: step 1 alone first, with the wipeout and hold-down reports re-run.
- **Cost:** the swimmer's step plus constraints for the dive's few seconds is less than the swim it replaces. Measure it on the M1.

## Sources

- The gameplay survey §5 (`docs/research/surf-gameplay-research.md`):
  - coaching sources: the nose 40–60 cm down, starting 1–2 body lengths out;
  - a 25.75 L board's 234 N net buoyancy;
  - turbulence and void fraction (Ting & Kirby 1995/96; Nadaoka et al. 1989; Blenkinsopp & Chaplin 2007/11).
- Pendergast DR et al. (2015), *Human physiology in an aquatic environment*, Compr Physiol 5:1705–1750: body density and static lift in water.
- Hoerner SF (1965), *Fluid-Dynamic Drag*: flat plate normal to the flow, C_d ≈ 1.17–1.2.
- Newman JN (1977), *Marine Hydrodynamics*, MIT Press: added mass of a flat plate (strip theory).
- Macklin M, Müller M, Chentanez N (2016), *XPBD: position-based simulation of compliant constrained dynamics*, MIG '16.
- The September work: `docs/research/duck-dive-report.md`; the open checks in `src/physics/duckDive.test.ts`; the memory of what was tried (eased stages kept; posture, momentum and upward-dog not).
