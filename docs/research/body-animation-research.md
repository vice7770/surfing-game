# The riding body: what the web has (2026-09-28)

The riding-body grilling (memory `riding-body-animation`) asked for examples from the web. This is the study behind the plan's eight steps: how surf and board-sport games animate a rider, the techniques for a fluid physics-driven body, real stance numbers, and a candidate reference set. Sources are cited inline. Anything unverified is marked.

## Surf games

**No surf game documents how it animates its surfer.**
- The evidence points to clips, with balance shown by meters.
- Kelly Slater's Pro Surfer (2002) has a balance meter in the tube and a hand drag as a trick ([GameSpot](https://www.gamespot.com/reviews/kelly-slaters-pro-surfer-review/1900-6084647/)).
- In Transworld Surf (2001) the rider dips a hand "to help maintain balance" ([GameSpot](https://www.gamespot.com/reviews/transworld-surf-review/1900-2826733/)).
- Barton Lynch Pro Surfing (2023) patched an "IK issue where feet occasionally pass through the board during pump and turns" ([Steam](https://store.steampowered.com/news/app/1776170)). That suggests clips plus leg IK onto the board.
- None of these drive the body from physics. Ours does.

## Board-sport precedents

- **Skate (EA).** "Animation is a target": the joints track a mocap pose from 100 % down to 0 % (ragdoll), and physics has the last word ([Game Developer](https://www.gamedeveloper.com/design/new-tricks-scott-blackwood-talks-i-skate-i-and-i-skate-2-i-)). This is our hybrid: a reference pose as the target, physics as the authority.
- **Shredders.** "Very few actual animations"; the rider is "pretty much always in a transition", built from procedural layers over poses ([PreMortem](https://premortem.games/2022/03/21/shredders-shows-that-indie-developers-can-do-realistic-sports-games/)).
- **Steep.** Mocap tricks, physics falls. They "reduced realism to feel realistic" ([Whitelines](https://whitelines.com/snowboard-culture/videos/ubisoft-steep-science-slams.html)).
- **Grail,** a procedural skateboarder ([devlog](https://upakai.itch.io/grail/devlog/734501/how-the-procedural-animation-of-the-skateboarder-works)), is nearly our rig:
  - body points with FABRIK IK, and "magnets" bending the elbows and knees;
  - legs from the hips to feet held on the board;
  - Verlet particles on the torso and hands for inertia, and a spring on the pelvis;
  - knobs set by the physics.

## Techniques for fluidity

- **Blending between fixed steps.** Draw the state blended between the last two physics steps by the time left over (Fiedler, [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)). Step 1, Task 2.
- **Inertialization.** Switch to the new pose at once, and carry the old one's offset and velocity as an offset that decays (Bollo, [GDC 2018](https://www.gdcvault.com/play/1025331/Inertialization-High-Performance-Animation-Transitions)).
- **Dead blending.** Extrapolate the old pose and cross-fade into the new one (Holden, [Dead Blending](https://theorangeduck.com/page/dead-blending)). Step 1, Task 3.
- **Critically damped springs,** tuned by half-life (Holden, [Spring-It-On](https://theorangeduck.com/page/spring-roll-call)), plus [perfect tracking](https://theorangeduck.com/page/perfect-tracking-springs) through glitches. Step 1, Task 4.
- **Second-order dynamics** for anticipation and overshoot ([t3ssel8r](https://www.youtube.com/watch?v=KPoeNZZ6H4s)). Step 4, secondary motion.
- **Poses blended over continuous parameters.** Verbs and Adverbs ([Rose, Cohen and Bodenheimer 1998](https://dl.acm.org/doi/10.1109/38.708559)); IK Rig ([Bereznyak, GDC 2016](https://www.gdcvault.com/play/1023279/IK-Rig-Procedural-Pose)). Step 3, the hybrid.
- **The head.** People keep the head steady in space as they walk, run and hop ([Pozzo et al. 1990](https://link.springer.com/article/10.1007/BF00230842)). Step 4.
- **Overgrowth.** Very few keyframes, physics first ([Rosen, GDC 2014](https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach)); the details are unverified.
- **Later, needing a mocap library:** motion matching ([Clavet, GDC 2016](https://gdcvault.com/play/1023280/Motion-Matching-and-The-Road)) and balance controllers ([SIMBICON](https://www.cs.sfu.ca/~kkyin/papers/Yin_SIG07.pdf), [DReCon](https://www.theorangeduck.com/media/uploads/other_stuff/DReCon.pdf)).

## Real stance numbers

**Measured:**

- **Riding on a river wave.** Weiss et al. 2025 ([doi](https://doi.org/10.1007/s11044-025-10071-3)) measured 7 surfers with IMUs and pose estimation:

  | Peak flexion | Rear | Front |
  |---|---|---|
  | Hip | 55.0° | 50.0° |
  | Knee | 51.1° | 44.7° |
  | Ankle | 21.1° | 18.3° |

  These angles count from straight, so a 51° knee is about 129° included. A river wave is less crouched than an ocean bottom turn.
- **Turns.** Forsyth et al. 2024 ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11021506/)). Turn flow was 0.90.

  | | Duration | Turn | Rate | Speed | Rail | Pitch |
  |---|---|---|---|---|---|---|
  | Bottom turn | 0.96 s | 101 ± 7° | 1.9 rad/s | 7.5 m/s | 39 ± 4° | — |
  | Cutback | 0.96 s | 156 ± 7° | 3.1 rad/s | 6.8 m/s | 76 ± 5° | 45° |
- **Bottom turn timing.** 1.05 ± 0.13 s, 4.7 per wave (Souza et al. 2012, [SciELO](https://www.scielo.br/j/rbcdh/a/B38W3W5PtHpF9MtwkX8G4xG/)).
- **The pop-up.** Borgonovo-Santos et al. 2021 ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7961430)):
  - 1.20 s in all: 0.71 s of push-up, then 0.48 s reaching the stance;
  - the feet land 0.63 ± 0.10 m apart, the only measured stance width;
  - the landing is 72 % on the front foot.
- **The trunk.** It leans to the inside of a turn. Trimming, the front foot sits over the board's centre of buoyancy (Moreira and Peixoto 2014, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4234763)).
- **Bottom-turn features.** 47 critical features, and the exit predicts whether a top turn or a cutback follows (Whitting et al. 2024, [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/sms.14755); the list is behind a paywall).
- **de Sousa 2022** (U. Lisboa) is not online. The user has a local copy.

**Coaching cues (not measured while riding):**
- **Stance** ([SurfDeeper](https://www.surfdeeper.com/skill/stance)):
  - feet about shoulder-width apart;
  - the back foot square to the stringer, the front foot at 30–45°;
  - the chest slightly open, the hands over their rails, "quiet hands".
- **Weight:**
  - 60/40 onto the front foot at rest, 70/30 into the bottom turn, 40/60 onto the back foot in top turns and cutbacks ([Cornish Wave](https://cornishwave.com/beginners-guide-to-surfing/the-importance-of-stance/));
  - 65/35 to 70/30 onto the back foot in the cutback ([Rapture](https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/cutback)).
- **Pumping.** About one pump a second, 55/45 alternating, arms pushing down on the extension ([Rapture](https://www.rapturecamps.com/learn-to-surf/surf-maneuvers/speed-generation)).
- **Rotation.** The head leads, then the lead shoulder, the trailing shoulder, the hips, the board. The lead arm reaches back toward the breaking wave.
- **The top turn.** Eyes on the lip, the trailing arm swinging, an arm over each rail ([Bali Surfing Camp](https://www.balisurfingcamp.com/blog/frontside-top-turn)).

## Paddling and swimming (step 8)

- **Stroke rate and board motion.** 35.9–53.6 strokes a minute per arm from 0.6 to 2.0 m/s; the board pitches about 12° nose up and rolls 27–45° per stroke (Nessler et al. 2019, [PDF](https://www.csusm.edu/surfresearch/documents/nessler-2019.pdf)).
- **Stroke shape.** About 970 mm long and 170 mm wide, about 2.3 s per stroke, the shoulder through 129–137° (Nessler et al. 2015, [PDF](https://www.csusm.edu/surfresearch/documents/nessler-et-al-2015-plos1.pdf)).
- **Carriage.** Chest down, low recovery; elite paddlers twist the upper back more (a [2025 IMU study](https://www.researchgate.net/publication/396707717_Monitoring_sprint-paddling_technique_in_elite_and_sub-elite_surfers_using_inertial_sensors)).
- **Freestyle swimming.** Body roll 57 ± 4°, and 66 ± 5° when breathing (Payton et al. 1999, [T&F](https://www.tandfonline.com/doi/abs/10.1080/026404199365551)).

## Candidate reference set (for the user's approval, step 2)

Titles are verified; camera angles are judged from thumbnails.

| # | Reference | Shows |
|---|---|---|
| 1 | Surfers of Bali, ["Snap In The Lip Over Shallow Reef"](https://www.youtube.com/shorts/xTgYU5ShueI) | trim, compress, extend, snap |
| 2 | SURFER, [Surfing 201 with Josh Kerr](https://www.youtube.com/watch?v=IEmH9lRgPsU) | bottom-turn phases, 0:49 and 2:40 |
| 3 | [Pat Gudauskas](https://www.youtube.com/watch?v=rhCoXhDLkO4) | bottom turn 2:24, hand drag 3:21 |
| 4 | Surfline, [Tom Whitaker](https://www.youtube.com/watch?v=lfxVAZGqCXY) | pro bottom turns from 3:08 |
| 5 | Surfline, [Timmy Reyes](https://www.youtube.com/watch?v=nZqUTSrVELs) | carve to snap |
| 6 | Surfline, [Damien Hobgood](https://www.youtube.com/watch?v=ay3Q4_Gtskk) | backside snap |
| 7 | Surfline, [Taylor Knox](https://www.youtube.com/watch?v=TmiotynMuvc) | cutback |
| 8 | [Kale Brock](https://www.youtube.com/watch?v=JytkE4cyXCo) | cutback phases, 1:15, 3:15 and 5:15 |
| 9 | Surfline, [Mick Fanning, Generating Speed](https://www.youtube.com/watch?v=FEUM4fCde40) | trim and pumping |
| 10 | [Barefoot Surf](https://www.youtube.com/watch?v=9rz-ucDwjVU) and [Swell Surf Camp](https://swellsurfcamp.com/surf-technique-1-the-pop-up/) | the pop-up |
| 11 | Weiss et al. 2025, Figs 6–7 | a measured skeleton in turns |
| 12 | [Rob Case on Kelly Slater's stroke](https://www.youtube.com/watch?v=bwFBojLeUt8) | paddling (step 8) |
| 13 | [Barefoot Surf](https://www.youtube.com/watch?v=yEI8IVZV46s) | duck-dive (step 8) |

There is no clean clip of a near fall; heat footage or our own playtests are the likely source.
