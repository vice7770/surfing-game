# Video reference 3 ("3 feet Nias Glass"): what the rider's body does, and what it maps to in the game

Source: https://www.youtube.com/shorts/GD8vS7_faSo, "3 feet Nias Glass #shorts" (@SurfRawFiles), 16.36 s. Read 2026-11-17 by screenshotting the browser pane (no `ffmpeg`/`yt-dlp`; checked). This is the **first clip the owner ever sent**, and it had not been read before. Their words: *"this wave is very similar to canyon waves Im testing on. The surfer movement is a good example, but the surfer is around 2 seconds turning, I would say not compressing but more like crouching. The compress should be more down and sharper turn."* The wave, spray and barrel are not described (owner's instruction).

## Method and limits (read first)

- 33 stills, seeking `video.currentTime` (video clock) at 0.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.7, 16 s, each after a 1 s wait. The whole clip was buffered. The rider is only on screen from about 2.3 s.
- **Source stream is 480x854** (`videoWidth`/`videoHeight`, portrait). The rider is **about 55-95 source pixels tall** (estimate: smaller at the start, largest at 12.5-13.5, standing). The crops are not magnified, so that is all the detail there is. **Every angle and fraction below is an estimate from pixels, good to about +-15 degrees on a knee and +-10 points on a hip-height fraction at best.** I say it once here and it applies to every number.
- **Camera: a drone, high and behind/beside the rider, looking down at roughly 30-60 degrees.** This is the worst angle for knee flexion (thighs are foreshortened) and good for arms, trunk twist and board direction. Where I give a knee angle it is read from the shin-thigh outline and is weaker than in the Kirra clip.
- **Slow-motion factor: none stated, and I could not verify it.** Title and page do not say slowed, `playbackRate` is 1. The rider's speed along the face and the spray look like real time to me, but I have no clock in the footage to prove it (no fixed-size object moving a known distance). **Treat every duration as "probably real time, unconfirmed".** Durations here are therefore possibly comparable to the game's real seconds (the measured real bottom turn is 0.96 s); the Kirra clip's 3-4 s were slowed and are not comparable to anything.
- **One ride, probably.** The camera follows the rider smoothly; the only obvious jump is 11.5 -> 12.5 (the rider is in foam at 11.5-12 and at 12.5 stands tall at a different spot on a different-looking section). I could not tell whether that is a cut or a long turn between frames. I treat 2.3-11.5 and 12.5-16 as two sections.
- Sampling is 0.25-1 s. A rider's low point can last less than that; **any depth that lasts under 0.5 s may have been missed or caught at a random phase.**

## Part A: what the body does

Stance and depth through the ride (video clock; all figures estimates):

| Time | What I see | Knee angle (est.) | Hip height, fraction of standing (est.) |
|---|---|---|---|
| 2.5-3.5 | Take-off: popping up from the board, wave face; body pitched forward, partly hidden in spray | not readable | not readable |
| 4.0 | Stood, side-on, **almost upright**, board flat, arms slightly out, low at the waist | about 150-160 | about 85-90 % |
| 4.5-5.5 | Same: **upright, knees only slightly bent**, arms level at hip-waist height, trunk slightly forward; board runs a long diagonal trim | about 150-165 | about 85-90 % |
| 6.0 | **The deepest of the ride.** Almost kneeling: rear knee close to the deck, front knee bent hard, trunk pitched forward, both hands low and forward toward the board. Board on its rail, spray off the rail | front about 70-90, rear about 40-70 (very uncertain from above) | about 40-50 % |
| 6.5 | Up again, knees open, trunk a little back, one arm out | about 130-150 | about 75-85 % |
| 7.5-8.0 | Going left, board flat, spray trail from the previous turn. Upright, knees a little bent, **arms slightly out and low** | about 150-160 | about 85-90 % |
| 8.25-8.5 | **Second deep point.** Board almost horizontal, nose left. Trunk folded near-horizontal over the board, both arms down ahead of the body, hips low and over the board's back half. Looks like a deep "bottom of the turn" before the lip | not readable (hips tucked) | about 35-50 % |
| 8.75 | Board near **vertical** up the face, spray fan off the tail, trunk twisted, arms down/back | about 110-130 | about 55-65 % |
| 9.0-9.25 | Coming back down: board on a steep diagonal, back knee bent more than front, chest toward the open face | about 120-140 | about 65-75 % |
| 9.75-10.0 | Diagonal carve, wide stance, trunk leaning inside the turn, one arm out sideways and low, one back | about 120-140 | about 65-75 % |
| 10.25 | A little taller, upright, arms both out about waist level | about 140-155 | about 80-85 % |
| 10.5-11.0 | **Crouch on the tail** into the foam: hips low and back, back knee and front knee bent, hands near the front knee | about 100-115 | about 55-65 % |
| 11.5-12 | Deepest of this section, low into foam, trunk pitched forward, face hidden | about 80-110 (guess) | about 45-55 % |
| 12.5-13.5 | **Tall.** Wide stance, near-straight legs, trunk upright, lead arm out wide at shoulder height | about 150-165 | about 85-95 % |
| 14.5 | Carving on a spray fan: upright-forward, rear arm back, lead arm out | about 130-150 | about 75-85 % |
| 15.0-15.7 | Tall, trimming; weight on the rear leg, other arm hanging, board turning away | about 150-165 | about 85-95 % |

Answer to "crouch or compress": **neither, as a held state.** The rider is mostly **upright or lightly bent (hips 75-95 % of standing)**. The depth is **not held** through a turn: it **pulses** to a crouch (hips 55-65 %) for roughly 0.5-1 s and **twice** to something clearly deeper than a crouch (hips 35-50 %, near-kneeling or folded over the board) at 6.0 and 8.25-8.5, each seen in **one or two consecutive frames** (so about 0.25-0.5 s as sampled). A third, shallower low occurs in the foam at 11-12. **So the owner's "crouching, not compressing" is right for most of the ride and wrong at the two deepest points**, where the rider is deeper than the game's crouch (0.65 m centre of mass) and at or below the Compress depth (0.55 m). What the owner may be reading as "crouch" is the brief, fast dip to that depth, not a held position.

Each turn in four beats (read from the three I could follow). Estimates throughout:

- **Turn A, 5.5-6.5 (bottom turn into a rail carve), about 1 s.** Entry: upright, arms low and out (5.5). Load: drops sharply to the near-kneeling position (6.0), both arms forward and low, weight over the board centre/front. Peak: board on its rail with a spray plume at 6.0 (just after). Exit: rises to 75-85 % by 6.5, trunk back, arm out. The upper body appears to **drop first and the board edge afterwards** (board still flat in the 5.5 frame, railed at 6.0) but I cannot see the order inside the 0.5 s gap.
- **Turn B, 8.0-9.5 (a cutback/ top turn on the lip), about 1.5 s.** Entry: upright and relaxed (8.0). Load: **folds low over the board** (8.25-8.5) with arms down. Peak: board vertical up the face (8.75), trunk twisted, hips below shoulders, arms low. Exit: back down the face at 9.0-9.25 with the chest open to the face, knees bending the other way. This is the **tall -> low -> tall cycle**, but with the low point **before** the lip, not at the bottom.
- **Turn C, 9.5-11.5 (carve down into a tail-weighted bottom turn into foam), about 2 s.** Entry 9.5-9.75 (leaning, knees 120-140). Load: wide low stance at 10.0, rising slightly at 10.25, then **drops again** to a tail crouch at 10.5-11.0, hands near the front knee. Peak: 11.5-12, deepest of the section, board in foam. Exit: **not seen** (rider is in whitewater at 12; the next frame at 12.5 is tall). This is the one that matches the owner's "about two seconds" best: **about 2 s of video clock (9.5 to 11.5), or 2.5 s if the 12.5 tall frame is its exit.**
- **Repeated (counted).** Tall-or-near-upright stance between turns: **5 times** (4.0-5.5, 7.5-8.0, 10.25, 12.5-13.5, 15.0-15.7). Sharp drop to hips <= 50 %: **3 times** (6.0, 8.25-8.5, 11.5-12). A **sustained** crouch of more than 1 s: **never**. The longest low period is 10.5 -> 12, about 1.5 s with an interruption.

Does the upper body lead or follow? In 8.75 and 9.0-9.25 the trunk and arms are rotated further toward the open face than the hips (shoulders ahead of the hips by an estimated 30-45 degrees), so I read **upper body leading** in those frames. At 6.0 and 11.5 I cannot see enough.

Arms (estimates):

- **Height:** below shoulder height in **every** frame. **Never overhead**, not even in the vertical 8.75 hit. Waist to chest level when spread (4-5.5, 10.25, 12.5-14.5), hip or knee level when low (6.0, 8.25-8.5).
- **Spread:** modest, roughly one arm length each side when upright (4-5.5, 7.5-8.0, 12.5-13.5); in the low frames both arms go forward and down toward the board.
- **Tracking:** at 6.0 and 8.25 both arms move **with the trunk** (they go down when the body folds). At 12.5-15.7 and 9.75-10.25 **one arm leads and one trails, both level with the shoulders** (lead arm in the turn direction). I did not see the arms move independently of the trunk (no arm swing against it).
- **At the moment the board changes direction** (6.0 and 8.5-8.75): **both arms are low and forward, not out.** They are pulled in toward the body, not thrown out. This is the opposite of the "spread arms at the turn" in the Kirra clip and the Pupo clip.

## Part B: the mapping to the game's vocabulary

What the game has (from `docs/research/new-rider/design.md`, `video-ref-2.md` and the code it cites): stances Tall/normal, Crouch (0.65 m centre of mass), Compress and Snap (0.55 m), a tube tuck (0.40 m); a fore-aft W/S trim, a rotation stick, a hand drag; moves named only after the fact (`bottom turn`, `top turn`, `snap`, `cutback`), a pump lesson; take-off and tube riding as separate modes. Compress's knee is about 66 degrees on the Kirra doc's scale and it is **held**.

| # | What the rider does (clip time) | Game stance or move | Have it? |
|---|---|---|---|
| 1 | Upright, knees slightly bent, hips 85-95 %, arms at hip height, for 1-3 s between turns (4-5.5, 7.5-8, 12.5-15.7) | Tall / trim | **Yes.** The game's Tall is this; riders also spend most of the ride here. |
| 2 | A **fast dip** to hips 35-50 % (kneeling/folded) lasting about 0.25-0.5 s at the start of a turn, then straight back up (6.0, 8.25-8.5) | Compress (depth) | **Partly.** The depth exists; the **brief, self-releasing** shape does not (our Compress is held). This is the most important row: it is the owner's "more down and sharper". |
| 3 | A mid-depth crouch (hips 55-65 %) of 0.5-1 s on the tail in the foam (10.5-11) | Crouch | **Yes**, as depth; **partly** for duration and tail-weighting. |
| 4 | Tall -> deep -> tall **inside** one turn, in about 1-1.5 s (6.0; 8.0-9.5) | none | **Not at all.** Confirms the Kirra gap: no turn-timed cycle. Here the cycle is shorter than Kirra's slowed 3-4 s. |
| 5 | Both arms **down and forward**, pulled in at the deepest point (6.0, 8.25-8.5), and one arm leading level with the shoulders when upright | arm rig | **Partly.** Arm positions exist; **no mapping from stance to arms.** The arms here go in when the body goes down. |
| 6 | Hips low and over the board's back half at 8.25-8.5 and in the foam at 10.5-11.5 | W/S trim, Snap's tail load | **Partly.** The input exists; the stance that goes with it does not (Kirra gap 2). From above I cannot tell if the hips are over the tail or the centre. |
| 7 | Board vertical up the lip with the trunk twisted and arms low (8.75) | top turn / snap | **Not at all** as a body: the manoeuvre is named after, no stance or arm control (Kirra gap 3). |
| 8 | Shoulders rotated ahead of hips by about 30-45 degrees, coming down the face (9.0-9.25) | rotation stick | **Partly.** Body yaw was dropped; so no upper-body lead. |
| 9 | Head turned to the direction of travel (visible at 8.75, 9.75-10, 14.5; face too small to be sure) | none | **Not at all** (Kirra gap 4). Low confidence on this clip. |
| 10 | A long diagonal trim (4.5-6) before the first turn | trim | **Yes.** |
| 11 | Pumping, a rhythmic tall/low oscillation | pump | **Not seen.** The dips are 3 in 10 s, not a rhythm. |

## Against the existing two references (lead with disagreement)

1. **DISAGREES with Kirra and Pupo on the arms at the turn.** Both earlier clips had arms spread wide and level at the loaded part of the turn. Here, at the two deepest moments (6.0, 8.25-8.5), **both arms are low and drawn in toward the board**, and they only go out level after the turn (9.75-10.25, 12.5-14.5). Possible reasons: a smaller wave (3 ft) and a lower speed; a longboard-ish/thicker board (the board looks short but wide, about 1.9-2.0 m - unconfirmed); the drone angle hiding arm spread; or this rider's style. **Do not assume spread arms is the rule at the peak.**
2. **DISAGREES with Pupo (and partly Kirra) on depth.** Pupo's lows were hips 50-65 %, knees 80-105, held 3-4 s; Kirra's were hips 50-60 %, held for the whole tube. Here the deepest points are **deeper (35-50 %)** but **held for under half a second**, and the **resting stance is tall (85-95 %)**, not a crouch. **The deep position in this clip is a spike, not a state.** If a conclusion about "how long a rider stays low" was drawn from the other two, it was about those riders.
3. **Confirms, with a different shape: tall -> low -> tall inside a turn.** Seen 2 times here (turns A and B) and once partly (C). It is **much faster** than in the slowed Kirra clip (1-1.5 s here against 3-4 slowed seconds), and the low is at the **start** of the turn, not at the bottom of it. Pupo's clip showed the low at the start with a rise only on the way up: this clip agrees with Pupo on the order.
4. **Confirms (weakly): hips back over the tail.** Visible in the foam turn (10.5-11.5). From the drone angle I cannot separate hips over the tail from hips low over the centre at 6.0 and 8.25-8.5. **Do not count this as a second independent confirmation.**
5. **Confirms: a lip manoeuvre with no stance and no arm control** (8.75, arms low, trunk twisted, board vertical). The game has no body for it.
6. **Cannot confirm or contradict: head/gaze.** The face is a few pixels wide from this angle. All I can say is that the head is turned with the trunk when I can see it.

## What the owner's reading gets right and wrong (hypothesis test)

- **"Not compressing but crouching": half right.** The long stance is not a crouch at all (it is upright). The turn-start dips reach **below** the game's crouch and into the **Compress** depth.
- **"Compress should be more down and sharper": consistent.** The real dips are deeper and quicker than a held Compress, and they release straight away.
- **"Around two seconds turning": right for turn C (about 2 s), too long for turns A (about 1 s) and B (about 1.5 s).** All durations are video-clock seconds; real-time unconfirmed, and 2 s is **twice** the measured real bottom-turn time of 0.96 s. If the clip is real-time, the owner's "2 seconds" is a long, carved bottom turn, not the 0.96 s bottom turn the game measures.

## What I could NOT see

- **Knee flexion in most frames.** The drone is above and behind; thigh foreshortening makes knee angles weak (+-15 at best, worse here). The "kneeling" at 6.0 might be a deep crouch with the camera hiding the rear knee's height.
- **Whether the rear knee touches the deck at 6.0 and 8.25-8.5.**
- **Anything between my frames.** The dips are shorter than my 0.25-0.5 s sampling at the deepest points; the true low may be deeper or longer. The order of hips, shoulders and board is unreadable inside a 0.5 s gap.
- **The slow-motion factor** (none stated; real-time is a belief, not a check).
- **Foot placement** on the board.
- **The exit of turn C and whether 11.5 -> 12.5 is a cut.**
- **Face and gaze.**
- **Left/right lean and rail angle** at the lowest moments (camera is above).
- **The take-off** (2.5-3.5): the rider is mostly hidden in spray.
