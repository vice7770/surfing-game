# Advisor ruling 27: the board in the water, and what to fix first

Advisor: this session (Opus 5.5, max effort), 2026-11-12. Read: `README.md` in this folder (the board study, Opus agent, effort high) and its probe tables. No run.

Tags: [M] measured by the study's probes; [S] sourced; [R] reasoned; [P] provisional.

## What the study found

- **The board already sinks like a real planing hull** [M]: 21 cm deep at 5 m/s, 11 cm at 7, 6 cm at 9, 2 cm at 12; 26 cm lying; the low rail 35 to 41 cm under in a held carve. A Savitsky calculation for this board gives about the same [R]. So the owner's "floor" feel does not come mainly from how deep the board sits.
- **The real fault: on steep water the standing rider's contact makes energy** [M]:
  - Above about 26° going up the face, or 30 to 38° going down, the legs' net power jumps to 4 to 23 kW. A human makes a few kW at the peak of a jump, and much less held [S: jump peak-power equations, e.g. Sayers 1999, about 4 kW for a 73 kg athlete].
  - The board is then thrown at 17 to 58 g, and the rider falls in 0.05 to 0.18 s.
  - The study's reading of the code: the body never pitches with the face (`AttachedRider.ts` 3453–3454). When the contact cannot be met, the light board alone receives a push sized for board plus rider (`BoardBody.ts` 1214–1235, `finish` 3328–3335).
- **The tube's wall is steeper than where the contact breaks**: its buoyancy normals go up to 60°. That is the strongest suspect yet for the owner's "falls when touching the tube part".
- **Water rising under the board kicks it** [M]: about 0.7 body weights per m/s of rise. The wall's added-mass rule (on with `wallBody=stream`) roughly doubles that, and it uses the flow's change along the board's path, not the water's own acceleration [R from the code].
- **The body stands plumb in pitch**, so on a drop the board runs 15 to 18° nose-high and slow [M]. That is part of the owner's "the surfer will be more straight".
- **Speed** [M]: the hull's drag matches Savitsky at 12 m/s and is about 1.5 times higher at 7 m/s. The high speeds come from `CARVE_CARRY` (+0.11 to 0.20 g, as large as all the hull drag) and from Canyon B's 12.5 m/s peel, not from a slippery hull.
- **Two-way coupling (the water denting under the board)** is real, but changes the forces little on 1 m cells [R]. It is for the look, and it comes last.

## Order

1. **A-lite (first, a few days): stop the leak.** When the contact cannot be met, the board must not receive the pair's push. Cap the legs' net power at a human limit. This is a bug fix grounded in energy: no muscle makes 9 to 23 kW. **It is also a precondition for C2.** The library wave's wall is steeper than the sea's, so without this fix the steeper wall would throw riders more often.
2. **B (1 to 2 days): the wall's added mass from the water's own acceleration**, not from the flow's change along the board's path. `?tubeInertia=old` already exists for A/B.
3. **A (2 to 4 weeks): a two-body standing rider with power-limited legs.** The body pitches with the face and the knees take the shocks. This is the faithful route, and it may let `CARVE_CARRY` go.
4. **C (last, about a week): two-way pressure coupling,** for the wake and the dent.

## A-lite spec

- **Switch:** `?legPower=cap` (off by default). Rooms stay on the default.
- **Rule 1.** When `contact.feasible` is false, do not hand the board the coupled solve's push. The board keeps only its own water forces and what the legs can actually transmit.
- **Rule 2.** Cap the contact's net positive power. Instant: 60 W/kg of rider mass (about 4.4 kW at 73 kg). Over any 0.5 s: 20 W/kg (about 1.5 kW) [P]. Absorbing energy (negative power) is not capped.

### Bars, from this folder's probes

- **L1:** legs' net power at most the cap at every face angle from 20 to 50°, going up and down, at 6 m/s, placed and tilted in.
- **L2:** no board acceleration over 5 g from the contact.
- **L3:** where the rider was thrown, the outcome becomes a stall or a slide: no fall within 0.2 s. Report the fall times.
- **L4:** flat glide, carve, paddling and pop-up rows unchanged within 5 % (draft, drag, slip).
- **L5:** with the switch off, byte-identical (Canyon hashes, suite).
- The bump kicks are reported, not barred (that is B).

### Stop rule and must-nots

- **Stop rule:** one build. One retune of the cap (instant 40 to 80 W/kg) if L3 fails. If the leak persists, hand back with the step traces.
- **Must-nots:** no hidden motors and no forces without a body; do not change gravity, the hull forces or the stance map's targets; no rider sessions as evidence (the owner rides).

## Correction

The speeds quoted to the owner (mean top speed 33.4 km/h, highest 45 km/h) are from Farley, Harris and Kilding 2012 (J Strength Cond Res 26(7):1887–96, PMID 21986691). PMID 29912078 is the 2018 follow-up (24.8 km/h at one point break).
