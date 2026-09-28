# Padang Padang and the swept-surface barrel: specification

Status: **agreed** in a grilling session with the user on 2026-09-28 (two rounds, Q1–Q16, every recommendation accepted). One question is still open: where Part B's overturn profiles come from (see Open question). This is the spec the Padang Padang plans argue from.

The [gameplay milestone spec](2026-09-26-gameplay-milestone.md)'s principles still hold:
- physical inputs, not scripted moves;
- outcomes are validation checks, never tuned into passing;
- performance is measured, never a gate.

The user's rules from the [Teahupo'o Reef spec](2026-09-27-teahupoo-reef.md) hold too:
- every value is sourced or marked **provisional**, and nothing is hand-shaped;
- one water for drawing and contact;
- Classic's look unchanged.

**Advisor.** The "Water physics research" session advises on every shape and condition value. Its findings are in the Claude Doc "Wave Physics Research" (Padang Padang, Correct shape, Tubes, Breaking, Graphics tabs). The advice taken is reported in each plan and PR.

## The picture of right

Padang Padang is a left-hand reef break on the west coast of Bali's Bukit peninsula: a fast, hollow left over a shallow, very sharp coral shelf. The user asked for it on 2026-09-28, as the showcase for the new barrel.

- **The reef:** very shallow, very sharp coral. The swell arrives from deep water and meets it abruptly. A deep channel with a strong rip ends the ride ([balisurfingcamp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts)).
- **The ride:** a left of 50–150 m, with two to four barrel sections ([balisurfingcamp](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts), [Mondo Surf](https://www.mondo.surf/surf-spot/padang-padang/guide/11668)).
- **Swell:** south-south-west to south-west groundswell, periods often over 16 s. It works from about 4 ft and is best at 6–10 ft, when the guides call it "double to triple overhead".
- **Wind:** the south-east trade blows offshore in the dry season, April–October.
- **Tide:** low tide gives the biggest top-to-bottom barrels, mid tide is also good, high tide is surfable.
- **The tube:** Mead & Black (2001, J. Coastal Res. SI 29, [Table 6.1](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf)) fitted three photos of Padang Padang:
  - vortex ratios (length over width) of 1.97, 2.14 and 2.02: their "very hollow" class (1.91–2.2), shared with Backdoor. Pipeline (1.56–1.92) is one class rounder;
  - vortex angles of 29°, 33° and 41°;
  - the third photo gives sizes: about 0.78 H long and 0.4 H wide.
- **The slope, inferred:** inverting their fit Y = 0.065X + 0.821 gives an orthogonal gradient of about 1:18–1:20. X is the gradient as 1:X, averaged along the wave's path over the breaking depth ± 2–3 m. No survey confirms it.
- **The peel:** fast but makeable for advanced and professional riders: at least 27–29° (`PEEL_SKILL_MINIMUM`, Hutt, Black & Mead 2001).
- **Inside the sourced physics.** Its slope lies inside Pick & Feddersen's (2026) overturn fits (planar slopes to about 1:10), which Teahupo'o's 1:2.29 does not. That is why Padang Padang is the barrel's testbed.

## Starting point

- **The Reef is the template.** Its Part A (PR #54) built:
  - a sourced bed with a sweep for its unsourced values;
  - a peel predictor (`ledgePeel`), and a peel meter that measures along the break line;
  - its own swells, Practice and tile;
  - stage 2 always, and the peel, catch and ride reports judged together.

  Its sources doc (`docs/research/teahupoo-reef-sources.md`) and report (`docs/research/teahupoo-reef-report.md`) are the model for Padang Padang's.
- **Phase matching limits the peel.** Along a straight reef edge with uniform water seaward of it, the break point runs at c / sin φ, and that ratio is the same everywhere across the bed (Snell). So the water seaward of the reef edge sets the slowest possible peel. In 30 m of water under a 16 s swell, c ≈ 15 m/s, so a straight edge cannot peel slower than that, which gives α ≤ 22° for a 3.5 m breaking depth. Reaching 27–29° needs either shallower water seaward of the edge (as Teahupo'o's 10 m shelf does) or an edge that is not straight.
- **Today's tubes:** a plunging 1 m column throws one strip of 8 water parcels (`PlungingLip.ts`), sized from Pick & Feddersen's fits (`Overturn.ts`). Under it, a void is carved into the height field (`tubeCarve.ts` on the GPU, `tubeTable.ts` between worker and page). The strip is drawn as its own sheet (`LipSheetMesh.ts`, `richLip.ts`). The advisor's Tubes tab lists what reads wrong:
  - no wall under the lip;
  - no body in the lip;
  - each column on its own clock, which gives the teeth.
- **The Reef session's Part B** (branch `claude/teahupoo-reef-b`, not merged) adds `reefOverturn`:
  - a break over a submerged crest takes Mead & Black's roundness for the gradient it climbs (`orthogonalGradient`, a 2.5 m band);
  - inside Pick & Feddersen's fits, their void area, jet and tilt are kept;
  - beyond the fits, where Teahupo'o's ledge lies, it uses provisional slab constants.

  That branch also levels the bed across the open along-shore edges, where a ledge crossing an edge ran the Big swell to NaN (on main too). It also arms breaking onsets for a joiner handed a sea, so lips match online.

## Decisions

### The spot

1. **A new, fifth spot, "Padang Padang"** (id `padang`), after the Canyon. Its blurb is "Hollow left over sharp coral, Bali", and its sketch shows a reef shelf angled to the swell with a channel at the end. None of the four existing spots changes. The Canyon stays the default spot for new players.
2. **It appears everywhere but Surf School:** the Surf screen, the Wave Lab's spot list, online rooms, the Logbook's bests and the menu's background waves. Surf School's lessons stay on the Canyon's recorded wave. Picking Padang Padang keeps the player's last conditions, as the other spots do.
3. **It is a left.** Regular riders go backside, and there is no mirror setting.

### The sea

4. **Sizes, from the real range.** The guides' feet are read as the Hawaiian scale (face ≈ 2 × the number, Caldwell & Aucan 2007). That reading is inferred, not stated: it is the one consistent with "double to triple overhead". So the targets rest on the face descriptions.

   | Swell | Faces (H1/3–H1/10 at the take-off) |
   |---|---|
   | Practice | 2–2.5 m, where it starts to work |
   | Small | 2.5–3.5 m |
   | Medium | 3.5–4.5 m |
   | Big | 4.5–6 m |

   - Padang Padang has its own long-period swells, south-south-west to south-west at 16–18 s, and its own Practice, under the 4 m buoy cap.
   - All values are provisional until the size report checks them.
   - **Practice is checked first.** "Works from 4 ft" is about 2.4 m faces, so a 2–2.5 m Practice sits at the edge. If the peel and catch reports show it doesn't break cleanly, Practice becomes 2.4–3 m, or the user is told plainly that Practice Padang is marginal, which is true to life.
5. **Its own tides**, from Bali's range. The Benoa gauge measured highest ranges of 2.46 m (December 2020) and 2.3 m (2022) ([IOP Conf. Ser. EES 1350, 012016, 2024](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016)). That is about ±1.2 m at springs, twice the shared ±0.6 m. The advisor's provisional ruling, against mean sea level:
   - Low −0.8 m, a normal low, where the best barrels are;
   - Mid 0;
   - High +0.9 m.

   The reef crest still carries water at −0.8 m and nearly dries at the lowest springs (−1.2 m). Its depth is provisional until the bed has a source.
6. **Its own winds.** Offshore is the dry season's south-east trade and Onshore the wet season's westerly monsoon. Both speeds are sourced and provisional. Offshore wind matters to barrels: it roughly doubles the tube's area (Feddersen et al. 2023).
7. **Stage 2 always**, like the Reef. A machine that can't keep up runs Padang Padang slower than real time, as the Reef and Surf School do. The step cost is measured, never a gate.

### The bed

8. **Sourced where possible; a sweep for the rest.** The inputs are:
   - Mead & Black's inferred orthogonal gradient of about 1:18–1:20;
   - their reef components (ramp, platform, wedge, focus, ledge, ridge, pinnacle), if their 2001 bathymetric-classification paper (J. Coastal Res. SI 29: 5–20) lists Padang Padang;
   - the reef's and the channel's orientation to the swell, from a map or satellite source;
   - the 50–150 m ride.

   A sweep picks the values no source gives (for example the edge's angle, the crest's depth, the shelf's width and depth) to hit the sourced targets:
   - the tube's ratio;
   - a peel of at least 27–29° that riders can make, judged with the catch and ride reports;
   - a 50–150 m ride.

   Every picked value is marked **provisional**. The "two to four barrel sections" need the reef to vary along its length, and no source describes that yet, so they are reported, not designed for.
9. **The reef edge stays off the window's open along-shore edges,** or the bed takes the Reef session's levelling fix once it merges.

### The look (Part A)

10. **No shader changes in Part A.** Padang Padang gets its own sourced water values in both looks: clear tropical water over a coral bed. The four existing spots stay byte-identical in both looks.
11. **The Reef's Part C pieces are reused, not rebuilt:** the visible coral (Rich only) and solid reef contact with "hit the reef". Padang Padang takes them when they land. Until then its board meets the bed as it does today.
12. **Scenery goes to the Backlog:** the cliffs, the cave stairs, the rocks and the crowd.

### Part B: the swept-surface barrel

13. **One surface replaces the lip strips and the carved void** (the user's decision, 2026-09-28). It is swept along the crest from simulated 2D overturn profiles, and it is both drawn and collided. The design is the advisor's (Tubes tab):
    1. The solver stays the clock and the mass ledger. The jet's water still leaves it and returns to it.
    2. The breaking front is tracked as one line (Thürey et al. 2007), with a **slice clock**: the time since each point's face went vertical. Neighbouring slices stay within one step of each other, the "soft update" of Mihalef et al. (2004). That removes the teeth.
    3. Each slice looks up a 2D overturn sequence in an offline **profile library** of simulated breakers.
       - It is picked by the bed's slope over half a wavelength offshore (O'Dea et al. 2021), the wave's height and the depth.
       - It is scaled to the solver's H.
       - The onset uses crest speed: B = U/C forms the face at about 0.85 and throws the lip at 1.0 (Derakhti et al. 2020; about 0.75 on these equations, Bacigaluppi et al. 2019).
    4. The profiles are swept into one mesh (face, lip and cavity), blended into the solver's water behind the crest and ahead of the toe.
    5. The rider collides with the same surface, in wave-attached coordinates, as *Surf's Up* kept its boards on its wave (Bredow et al. 2007).
    6. Parcels are kept only for the pour, the splash-up and the spray, launched from a **crash curve** along the landing line.

    Precedents: Mihalef et al. (2004), Sony's *Surf's Up* (2007), and *True Surf* (Meta Quest, 2025).
14. **What Part B includes:**
    - the slice clock and the crest-speed onset;
    - a library that runs from a small spilling curl to a heavy plunge (one continuum, New et al. 1985), so spilling waves also curl a little;
    - the swept mesh, blended into the solver's water;
    - the rider's contact with that mesh;
    - parcels for the pour, splash-up and spray, from the crash curve;
    - lip-landing sounds from the crash curve;
    - online, a player joining late receives the slice clocks with the rest of the sea.

    Out, because they are the next items in the user's order: the roller with body, foam that ages, and the look of the spray.
15. **Classic draws the swept surface too, with its existing shading.** The surface is physics: the rider collides with it and it must match between players online, so both looks draw the same surface. Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical.
16. **Two shading changes, Rich only,** because the barrel must read as water in the showcase:
    - a lip glow from a lengthened light path (exp(−σ·k·d), k ≈ 5–20 standing in for scattering, glowing toward the sun only when it is behind the lip);
    - a dark throat: the sky light and reflections under the lip dimmed by how much sky each vertex sees, with the tube's mouth mirrored on the inner face.

    The Reef session has dropped its lip-glow work, and the swept surface replaces `richLip` anyway.
17. **Rollout: Padang Padang first, behind a per-spot switch.** The other spots switch, the Reef included, once Padang Padang passes its checks and the user's look. The old lip, void and carve code is deleted in that last PR. Until then the Reef's tube riding (its Part D) keeps working on today's tube.
18. **This session owns Part B**, after Part A. Part B's offline profile work starts while Part A's long reports run on the M1.

## The tube until Part B

Until the swept surface lands, Padang Padang's breaks use today's lip and void.
- **On main today,** a steep break over a submerged crest plunges with Pick & Feddersen's overturn.
- **Once the Reef session's `reefOverturn` merges,** Padang Padang's breaks take it: over its shelf they are breaks over a submerged crest. Inside Pick & Feddersen's fits, which Padang Padang's slope stays within, it keeps their void area, jet and tilt, and takes only the roundness from Mead & Black. That is the advisor's rule for Padang Padang. The Reef's provisional slab constants apply only beyond the fits.
- **An honest caveat:** Padang Padang's gradient was itself inferred from Mead & Black's fit to its tubes. So a Mead & Black roundness measured against their Padang Padang ratios checks the bed's gradient, not the physics. Part B's own simulated profiles give an independent check.

## Coordination

- **The Reef session ("Waves, tubing, and Reef section")** owns the Reef, its bed, its tube rules and tube riding (its Part D). Interfaces to agree with it directly:
  - how the swept surface reads the Reef's overturn and gradient (`reefOverturn`, `orthogonalGradient`, `LipThrowEvent`);
  - what Part D's tube riding needs from the contact:
    - water or air at a point, with the surface's height, normal and velocity;
    - whether the rider is covered, and the clearance under the lip;
    - the tube's state at the rider's slice (open, closing, closed);
    - the crash curve, for the foam ball's push and the spit's blast;
  - the two solver fixes on `claude/teahupoo-reef-b` (edge levelling, handover onsets), taken once they merge.
- **Wave sizes** supplies the tank machinery (`tankLayout`, the deep-water buoy input, the surf readout, the size report). Its side feed (`claude/side-feed`) is still to merge. Padang Padang's final size calibration waits for it, as the Reef's did.
- **The advisor** is consulted before any shape or condition value is settled.

## Judging

### Part A · the spot

These are reported, not gated, then the user looks at it in the Wave Lab:
1. the peel angle and speed, and the share of close-outs, beside the catch and ride reports;
2. faces against each swell's targets (the size report), Practice first;
3. today's tube against Mead & Black's Padang Padang ratio of 1.97–2.14. It is expected a little narrower on Pick & Feddersen alone (width over length 0.41–0.45 against about 0.5). It becomes Part B's "before";
4. the ride's length against 50–150 m, and the barrel sections counted;
5. stability on the Big swell at the lowest spring tide (−1.2 m), where the crest nearly dries.

**Stop rule:** if no bed candidate reaches the peel and catch bands, or none runs stably, stop and bring the user the options, with the evidence.

### Part B · the swept barrel

These are reported, not gated, then the user's look. The other spots switch after that.
1. **The advisor's Correct-shape checklist:**
   - onset at 0.85 and throw at 1.0 of crest speed;
   - the jet leaving at 1.1–1.3 times the crest's speed and falling close to free fall (Erinin et al. 2023; Drazen et al. 2008);
   - the lip's thickness against Pick & Feddersen (about 0.12 H at 1:20);
   - the tube's back wall is the vertical face;
   - an open curl over 3–10 m of crest, and a closed void 1.5–5 m behind it that reshapes within 0.5 s (O'Dea et al. 2021);
   - no teeth: neighbouring slices stay within one clock step.
2. **Padang Padang's tube** against Mead & Black: a ratio of 1.97–2.14 and a tilt of 29–41°.
3. **Drawing and contact agree:** a test checks that the rider hits the surface that is drawn.
4. **A film** from the chase camera and from inside the tube, beside a public clip of Padang Padang at 6–10 ft that the user approves (for example a Rip Curl Cup heat).
5. **Cost,** measured on the M1 Air, and on the M4 Pro when the user runs it.
6. **Before each other spot switches,** its catch and ride reports are compared with today's.

## Open question

**Where the profiles come from.** Either published simulations are digitised (faster, fewer bed shapes), or we run our own offline 2D simulations on the game's beds (exact, more work). The user raised this in the doc's Overview. It is put to them, with the advisor's research, before Part B's plan. It doesn't affect Part A.

## Delivery

Spec → plan → PRs. Each PR is left for the user to merge.
- **Part A · the spot** (one PR):
  - a sources doc (`docs/research/padang-padang-sources.md`): the break, its swell, tide and winds, Mead & Black, the bed's components and orientation, the size conversion, with rulings;
  - the bed and its sweep;
  - its swells, tides, winds, water values and tile, and the fifth spot everywhere it appears;
  - the reports (`docs/research/padang-padang-report.md`).
- **Part B · the swept barrel** (a series of PRs, each behind Padang Padang's switch, so main always works):
  1. the profile library;
  2. the slice clock and onset;
  3. the drawn mesh;
  4. the contact;
  5. the crash curve, parcels and sound;
  6. the shading;
  7. the switch for every spot and the deletion of the old code.

  Part B's plan follows the open question's answer.

## Risks

- **The peel.** A straight reef edge in deep water peels too fast (see Starting point). The bed may need shallower water seaward of the edge, or a curved edge. If only a hand-shaped bend reaches the band, that goes to the user under the stop rule.
- **Low tide on a shallow shelf.** A draining trough once ran the Reef's backwash to 112 m/s. Padang Padang's lowest springs are guarded by a stability test.
- **Practice may be marginal** (decision 4).
- **Part B's seam** between the swept surface and the solver's water, and the rider's contact moving from height samples to profile tests (the advisor's risks).
- **The library's range.** It must cover everything from a small spilling curl to a heavy plunge, including the Reef's slab, beyond Pick & Feddersen's fits.
- **The M1's load.** Reports take 10–35 min each here (the wave sizes record), so runs go in parallel by spot and height.

## Out of scope (Backlog)

- Scenery: the cliffs, the cave stairs, the rocks, the crowd.
- A mirrored (right-hand) Padang Padang, and Padang Padang's right.
- Surf School lessons on Padang Padang.
- The roller with body, foam that ages and the look of the spray (the next items in the user's order).
- Tube riding itself: it is the Reef's Part D, and Padang Padang gets it when it lands.

## Sources

- [Bali Surfing Camp, "Padang Padang Lefts"](https://www.balisurfingcamp.com/surf-spots/uluwatu-area/padang-padang-lefts).
- [Mondo Surf, Padang Padang guide](https://www.mondo.surf/surf-spot/padang-padang/guide/11668).
- Mead, S. & Black, K. (2001), [Predicting the breaking intensity of surfing waves](http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf), J. Coastal Research SI 29, Table 6.1.
- Mead, S. & Black, K. (2001), Field studies leading to the bathymetric classification of world-class surfing breaks, J. Coastal Research SI 29: 5–20 (to be read for Part A).
- Hutt, J., Black, K. & Mead, S. (2001), Classification of surf breaks in relation to surfing skill, J. Coastal Research SI 29.
- Caldwell, P. & Aucan, J. (2007), the Hawaiian surf scale (see `docs/research/surf-size-sources.md`).
- [Benoa tides, IOP Conf. Ser. Earth Environ. Sci. 1350, 012016 (2024)](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016).
- Pick, S. & Feddersen, F. (2026), J. Fluid Mech. 1040 A8 (the overturn fits).
- Feddersen, F. et al. (2023), wind effects on wave shape, J. Fluid Mech.
- O'Dea, A. et al. (2021), overturning geometry in the field.
- Derakhti, M. et al. (2020), breaking onset by crest speed; Bacigaluppi, P. et al. (2019), its Boussinesq threshold.
- Thürey, N. et al. (2007), real-time breaking waves for shallow water simulations; Mihalef, V. et al. (2004), animation and control of breaking waves.
- Bredow, R. et al. (2007), Making waves for *Surf's Up*; *True Surf* (Meta, 2025).
- New, A. et al. (1985), computations of overturning waves.
- Erinin, M. et al. (2023) and Drazen, D. et al. (2008), plunging jets.

The advisor's doc links each of these.
