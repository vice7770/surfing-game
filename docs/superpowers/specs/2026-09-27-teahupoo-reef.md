# Teahupo'o Reef: specification

Status: **agreed** in a grilling session with the user on 2026-09-27 (four rounds, Q1–Q25, every recommendation accepted). This is the spec the Reef plans argue from. The [gameplay milestone spec](2026-09-26-gameplay-milestone.md)'s principles still hold: physical inputs, not scripted moves; the player gives intent and the rider's reflexes balance; outcomes are validation checks, never tuned into passing; performance is measured, never a gate.

## The picture of right

The user wants "big strong heavy tubes": Teahupo'o's style of wave, with big bodies of water and strong tubes. The reference is SURFER's short "The locals of Teahupo'o doing what they do best" ([YouTube](https://www.youtube.com/shorts/1mXQaSA3-rE)).

What makes Teahupo'o ([The Conversation, 2024](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301)):
- the bed rises from deep water a couple of hundred metres offshore, so the swell shoals very quickly and arrives with little time to refract;
- a flatter shelf at about 10 m lets the wave stand up with a steep face before it breaks where the reef rises again;
- the forereef is very steep, about 1:2.29, as built in a physical model of Teahupo'o's reef ([Applied Ocean Research, 2025](https://www.sciencedirect.com/science/article/pii/S0141118725002354));
- a deep channel beside the shelf, where the wave does not break, lets it peel one way (a left) before it closes on the shallow reef.

## Starting point

- **Today's Reef** is an A-frame: a 1 m shelf over a 10 m channel, its edge sloping 0.15 over 80 m (`REEF` in [Bathymetry.ts](../../../src/wave/Bathymetry.ts)). It closes out (median peel 13°). At the Wave Lab defaults its tubes run a median 1.14 m long, with openings to 1.2 m at the 90th percentile ([tube report](../../research/tube-report.md)).
- **Why every reef closed out:** the tank's offshore floor is 10 m (`OFFSHORE_DEPTH.reef`). A 12–14 s swell feels that bed all the way in and refracts until its crests lie along the contours before it breaks. P7 tried edges of 21.8–50°, single arms, channels and swell directions from −30° to 25°, and reached median peels of 5–24° ([P7 record](../plans/2026-09-26-p7-barrels.md), [rideability report](../../research/rideability-report.md)).
- **The overturn** comes from Pick & Feddersen's (2026) fits ([Overturn.ts](../../../src/wave/Overturn.ts)), which cover planar beds of 1:100 to 1:10 and incoming waves of 0.2–0.6 of the depth. A Teahupo'o ledge is steeper than 1:10, and its breaking wave is taller than the water over the reef: outside their data.
- **Mead & Black (2001)** relate breaking intensity, the vortex's length over its width, to the orthogonal seabed gradient on real surf breaks: Y = 0.065X + 0.821 ([Predicting the breaking intensity of surfing waves](https://www.researchgate.net/publication/228605528_Predicting_the_breaking_intensity_of_surfing_waves), J. Coastal Research SI 29). Steeper beds give rounder tubes. The research doc confirms X's units and the gradients their data covers.
- **Riding** is tuned on 1–1.5 m faces (the Canyon reference wave). On bigger waves about half of the early pop-ups fall (PR #43's open item).
- **The board meets the seabed** with foam-on-sand friction and a vertical normal (`BoardBody`).
- **Tube riding** is P12, in the backlog after P11 ([gameplay milestone](2026-09-26-gameplay-milestone.md#p12--tube)). The tube visual pass was stopped on 2026-09-26; this spec resumes it.

## Decisions

### The spot

1. **The Teahupo'o-style wave replaces the A-frame Reef** in place. The tile stays **"Reef"**, with a new line: "Heavy left slab over shallow coral". Its menu icon is redrawn as a left slab.
2. **It is a left.** Regular riders go backside. No mirror setting for now.
3. **What must read as Teahupo'o, in priority order:**
   1. a thick lip, nearly as thick as the wave is tall (a slab);
   2. a round tube a rider can stand in;
   3. a fast but makeable left peel;
   4. the step: the trough drains below sea level and the reef almost shows;
   5. the spit;
   6. size;
   7. deep blue water and the channel.

### The sea

4. **Sizes, for the Reef only:**

   | Swell | Faces |
   |---|---|
   | Practice | ~1.5–2 m |
   | Small | 2–3 m |
   | Medium | 3–4 m |
   | Big | 5–6 m |

   - They are buoy values, read through the wave sizes spec's (`2026-09-27-wave-sizes.md`, on `claude/wave-sizes`) deep-water input and checked with its surf meter.
   - The Reef has its own Practice swell. The wave sizes spec's "Practice keeps its groundswell exactly" exception covers the Canyon (the riding reference and Surf School's recording), not the Reef.
   - "Code Red" (8 m and up) and tow-in go to the Backlog, until riding holds on 5 m faces.
5. **The bed follows Teahupo'o's published profile**, fitted into the tank:
   - deep water offshore;
   - the 1:2.29 forereef;
   - the ~10 m shelf;
   - the reef rising to under 1 m;
   - a deep channel at the end the left peels toward.

   The whole Reef bed is this work's, inner and outer (see Coordination). The tank is about 30 m deep offshore for the Reef, which cuts the solver's stable step by about √3 (≈1.7× the step cost on the Reef). Accepted: performance is never a gate.
6. **The Reef always runs stage 2** (Madsen–Sørensen). Stage 1 steepens waves far too early in 30 m water. A machine that cannot keep up runs the Reef slower than real time, as Surf School does.

### The physics of the tube

7. **Honest, from sources.** The thick lip and the round tube come out of the bed and the wave, from sourced slab data: Mead & Black's vortex ratio against the seabed gradient, and lab studies of waves breaking over steps and reefs, found by the research doc. The current fits are not stretched past their range, and nothing is shaped by hand. Where the sources run out, a value is marked provisional, as P7 did. Tubes still "happen or not depending on the conditions" (the user's rule from P7, [record](../plans/2026-09-26-p7-barrels.md)): the carved sub-grid void stays; the solver's water is untouched.
8. **Faithful difficulty.** The wave is fast, and many waves are made only by getting through the tube; some close out. The Practice swell is the friendlier version. The peel is always judged together with the catch and ride reports: a bank that peels but dumps every wave is not a surfable wave (the Point's lesson).
9. **The reef is solid.** The board and the body meet rock and coral: harder and grippier than sand, with the bed's own sloping normal. "Hit the reef" becomes a ride-end reason. Hold-downs and injuries stay in P11.

### The look and the sound

10. **Rich only.** Classic gets the new wave but keeps its look.
    - a thick lip that glows blue-green where light comes through it;
    - the step, where the trough drains;
    - spit;
    - a visible coral reef under the clear water, showing where the trough drains. Its textures are CC0 and are downloaded only with the user's approval;
    - the peel collapsing as one section, which also fixes the open spikes a metre wide where neighbouring columns collapse at different stages (G9's carve teeth).
11. **Sound**, with the existing synthesised sounds (recordings only if the user approves downloading them):
    - the lip's impact gets louder and deeper with the lip's size and fall;
    - with tube riding, a muffled roar inside the tube.
12. **Scenery** (boats in the channel, Tahiti's mountains, a crowd) goes to the Backlog. The channel exists as bed.

### Tube riding (P12, brought forward)

13. **P12 comes ahead of P11** and ahead of the rest of the stances order (`2026-09-27-stances.md`, on `claude/stances`), on the Reef, as the gameplay milestone specced it:
    - pulling in and racing out emerge from the line, the stall and the speed;
    - rail grab (Q) adds a hand contact that lowers the centre of mass and adds roll authority;
    - hand drag (E) holds a line;
    - the crouch sets the clearance under the lip;
    - the tube camera switches automatically, while the rider is covered, to a low view just behind the rider looking out through the tube's opening, and back when uncovered. C still cycles, and a setting turns the auto-switch off;
    - rail grab is rebindable, with a gamepad button and a touch button chosen in the plan.
14. **The pig-dog is not a move.** The backside tube stance comes from Crouch, Compress and rail grab together.
15. **The tube closes on you.** The foam ball's push and the spit's blast act on the rider. The rest of whitewater's forces on bodies stay in the Backlog.
16. **Feedback, no score.** The ride-end card and the Logbook show the time covered and how the tube ended: made it, clipped by the lip, or closed on.
17. **Surf School gets a Tube lesson** on a recorded Reef wave, the last piece of the tube-riding part.
18. **Take-offs are paddled.** Late, steep take-offs on 2–6 m faces are part of the tube-riding work.

## Coordination with Wave sizes

The wave sizes spec (`2026-09-27-wave-sizes.md`, another session's, on `claude/wave-sizes`, 2026-09-27) deepens every spot's outer zone and sizes the tank to the swell. The user decided (Q15):
- **this work owns the whole Reef bed**, inner and outer; wave sizes leaves the Reef's bed as it is today and reports the Reef in its size report without gating it;
- wave sizes supplies the machinery: deep-water buoy input with shoaling, the swell-sized tank (edge depth, relaxation zone, fine zone, Madsen–Sørensen boundary wave numbers), the surf meter and the readouts;
- this work starts now on research and a bed prototype, and builds the final bed on wave sizes' tank part once it merges.

The wave sizes session was told on 2026-09-27.

## Judging

### The wave (Parts A–C)

Reported, not gated, then the user's look:
1. **A report against the sources**, per swell size:
   - the tube's length over its width against Mead & Black's vortex ratio for the bed's gradient;
   - the lip's thickness and the tube's size as shares of the wave's height;
   - the peel angle and the share of close-outs;
   - the catch and ride reports beside them;
   - the faces against the size targets (decision 4).
2. **A filmed clip** set beside the reference video.
3. **The user's look** in the Wave Lab.

### Tube riding (Part D)

With the autopilot on the Reef's Small swell:
- it is covered on at least half of its stood rides;
- the median time covered is at least 1.5 s;
- it comes out of at least one tube in four;
- every ride end has an honest reason.

These numbers are provisional until checked against real tube-ride durations (pro footage, heat data) in the research doc. Then the user's playtest, which has the final say.

## Delivery

Spec → plan → PRs. Each part is opened as a PR and left for the user to merge.
- **Part A · the Reef bed and its peel:**
  - a research doc: Teahupo'o's profile, Mead & Black, lab studies of waves over steps and reefs, real tube-ride durations;
  - the new bed on wave sizes' deep tank;
  - the peel, catch and ride reports.
- **Part B · slab tube physics:** the thick lip and the round tube from the sources, and the tube report against them.
- **Part C · the look, the sound and a solid reef:**
  - the Rich look: the lip's glow, the step, the coral, the spit;
  - the section collapsing as one;
  - the impact sound;
  - reef contact and "hit the reef";
  - the film beside the reference, then the user's look.
- **Part D · tube riding (P12):**
  - rail grab and the tube camera;
  - the foam ball and spit on the rider;
  - tube time and outcome on the end card and in the Logbook;
  - the inside-tube sound;
  - the Surf School Tube lesson.

**Order:** A, B and C start now; A's final bed waits for wave sizes' tank part. D starts once Compress and the Regular/Goofy setting (steps 1–2 of the stances order) and the take-off (PR #43) have merged.

## Risks

- **The solver on a 1:2.29 face.** Stage 2 has only run on mild beds. A trough draining a shallow reef has already shrunk the stable step fivefold within a quarter second (the spin-up re-checks its CFL bound every step for that reason), and a lip collapsing onto a crest once ran the practice Reef's solver away. The bed prototype is checked for stability, and for GPU parity with `/gpu-check.html?spot=reef`, before anything is built on it.
- **Sources for slabs may run out** above the ranges they measured. The values past them are marked provisional, never quietly extrapolated.
- **Multiplayer:** online rooms on the Reef get the new wave; the room's host runs the heavier sea.

## Out of scope (Backlog)

- "Code Red" swells (8 m and up) and tow-in;
- scenery: boats, mountains, a crowd;
- hold-downs and injuries (P11);
- whitewater forces on bodies beyond the foam ball and the spit;
- a mirrored (right-hand) Reef.

## Sources

- The Conversation (2024), [Anatomy of a wave: what makes the Olympic surf break at Teahupo'o unique](https://theconversation.com/anatomy-of-a-wave-what-makes-the-olympic-surf-break-at-teahupoo-unique-and-so-challenging-235301).
- [Extreme wave transformation and runup on a beach fronted by a very steep forereef profile](https://www.sciencedirect.com/science/article/pii/S0141118725002354) Applied Ocean Research (2025): a physical model of Teahupo'o's reef, forereef 1:2.29.
- Mead, S. & Black, K. (2001), [Predicting the breaking intensity of surfing waves](https://www.researchgate.net/publication/228605528_Predicting_the_breaking_intensity_of_surfing_waves), J. Coastal Research SI 29.
- Pick, S. & Feddersen, F. (2026), J. Fluid Mech. 1040 A8 (the overturn fits in use).
