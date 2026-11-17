# Video reference 2 (Samuel Pupo, "Carving, Kirra"): what the rider's body does, and what it maps to in the game

Source: https://www.youtube.com/shorts/JBgWB825c-g, "Samuel Pupo | Carving, Kirra. #surf", 14.64 s long. Read 2026-11-17 by screenshotting the browser pane (no `ffmpeg`/`yt-dlp`, nobody here can watch video). The owner's standing instruction: they care about the movement, not the wave; the wave, barrel and spray are not described here. The method is the Kirra doc's (`kirra-reference.md`).

## Method and limits (read first)

- 33 stills, seeking `video.currentTime` (video clock) at 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.25, 4.7, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 11.5, 12, 13 and 14.3 s, each after a 1 s wait (without the wait the player shows a stale frame; my first batch did and I discarded it). Whole clip buffered, so every seek was exact.
- **Source stream is 360x640** (`videoWidth`/`videoHeight`). The rider is roughly **100-190 source pixels tall** depending on the shot (about twice the Kirra doc's 40-90 px). Better than Kirra, still low: **every angle and fraction below is an estimate from pixels, good to about +-15 degrees at best, and hip heights to about +-10 points.** I say "estimate" once here and it applies to every number below.
- **Slow-motion factor: none stated.** The title and page do not say "slowed", `playbackRate` is 1, and the spray and body motion look like real speed to me. I **cannot verify** that; treat durations as probably real time but unconfirmed. (The Kirra clip was explicitly slowed, so the two clips' durations are not comparable even so.)
- **It is an edit, not one take.** The camera changes between 3.5 and 4.25 s (from a low, wide side/back view to a close, high one) and there are probably two or three rides: 0-4 s, about 4.5-9 s, and about 9.5-14.3 s. I cannot prove they are different rides or the same one; I treat them as separate turns.
- The camera is mostly behind or beside the rider and above, so **left/right lean and rail angle are largely invisible**, and when his back is to the camera I cannot read his knees at all.

## Part A: what the body does

Stance and depth by segment (video clock):

| Time | What I see | Knee (est.) | Hip height as fraction of standing (est.) |
|---|---|---|---|
| 0-1 | Side view, close, board flat and fast. Crouched, trunk pitched forward about 35-45 degrees, front arm reaching down toward the board, back leg bent. | 100-120 | 60-70 % |
| 1.5-2.5 | Board on its rail, spray off the tail. Low, trunk pitched about 45 degrees, arms spread: front arm down-forward, rear arm back. Back to camera at 2.5, knees not readable. | about 100-110 where I can see them | 60-65 % |
| 3-3.5 | Heavily forward-leaning over the board, board nose high on the left, back leg more extended than the front, big tail spray. | front knee about 110-120 | 60-70 % |
| 4-4.7 | New framing. Body more upright, knees opening as the board climbs, back arm wide. | about 130-150 | 75-85 % |
| 5-5.5 | On the lip. Board near vertical or turned across the face, lead arm raised overhead, trunk twisted toward the face. | not readable (hips tucked, back to camera) | not readable |
| 6.5-7.5 | Board horizontal along the lip. Body arched over it: chest forward and out, lead arm straight up, trailing arm hanging down toward the board's nose. One leg extended forward on the deck. | about 120-150 on the extended leg, other not visible | about 70-80 % |
| 8.5-9.5 | Coming back down the face. Both arms spread wide and level (one forward, one back), shoulders rotated further than the hips, knees about 110-130. | 110-130 | 65-75 % |
| 10-11.5 | The lowest part: bottom of a turn into a carve. Trunk pitched forward about 45-55 degrees, hips low and slightly behind the back foot, both hands near the front shin/knee, head up. | about 80-100 (deepest I see) | 50-60 % |
| 12-14.3 | Held low through a carve, board flat to railed, hands low by the front shin and board, torso pitched about 50 degrees. | about 85-105 | 55-65 % |

Turn shape (what the body does in each of the turns I could read):

- **Entry:** the trunk is already forward and the rider is already low. I do not see a rise before the load in the 0-4 s and 10-14 s sections; the deepest frames come at the start of those sections. (In 4-5 s he does rise as the board climbs, so the "tall" appears **on the way up the face**, not before the bottom.)
- **Load:** low, trunk forward 45-55 degrees, hands low and close to the front leg, back foot on the tail with spray off it (the spray tells me the tail is loaded; the shoulder/hip order I cannot read).
- **Peak:** in the carves, a low, wide stance with the trunk leaned toward the inside of the turn; at the lip (5-8 s) a **stretched, arched body** with one arm overhead and the other hanging.
- **Exit:** at 4-4.7 s he opens out of the low position; I do not have a frame that shows the exit of the 10-14 s section (the clip ends in the low carve).

Arms: **always visible and always large**. Spread wide and level (waist to shoulder height) in carves and while coming down; **one arm overhead at the lip (5-7.5 s)**; both hands low by the shin/knee in the deepest crouch (10-14 s). In the low carve the hand is near the board and near the water; I **cannot tell whether it touches**.

Timing (video clock, slow-motion unconfirmed): a low-to-open-to-low cycle of the three sections takes roughly 4-5 s each; the low hold at 10-14.3 s lasts at least 3-4 s with a depth change of only about 10 points; the lip section is about 3-4 s (5-8.5 s). Between my 0.5-1 s frames a lot can happen (the arm positions change completely between 4.7 and 5.5 s), so I cannot give a transition time.

Repeated: low with forward trunk and low hands appears in **all three sections** (0-3.5, 8.5-9.5, 10-14.3); a lead arm overhead appears twice at the lip. No repeated pumping rhythm: I see no up-down oscillation in the carves.

## Part B: the mapping to the game's vocabulary

What the game has (read in `src/ui/RideHud.ts`, `src/ui/strings.ts`, `src/game/rideAnalysis.ts`, `src/physics/AttachedRider.ts`, `docs/research/new-rider/design.md`): stances normal / crouch / compress / snap (`StanceLevel`), a **trim** input (W/S) that is a **fore-aft weight** target, a rotation stick, a hand (drag) input, manoeuvres **named** by analysis only after the fact (`bottom turn`, `top turn`, `snap`, `cutback`), a pump lesson (crouch and stand in rhythm), take-off/landing and tube riding as separate modes. Design stance depths: Tall 0.85 m centre of mass, crouch 0.65, Compress/Snap 0.55, tube tuck 0.40 (stance room table in `design.md`). Compress's knee angle is about 66 degrees on the Kirra doc's scale.

"Do we have it" means: yes = in the game, partly = a related input or force exists but not this shape, not at all = no name and no mechanism I could find.

| # | What the rider does (clip time) | Game stance or move | Have it? |
|---|---|---|---|
| 1 | Low crouch at the start of a bottom turn, knees about 80-120, trunk 40-55 degrees forward, hands low by the front shin (0-3, 9.5-14) | Crouch / Compress; bottom turn | **Partly.** The stance exists, but Compress is deeper (about 66) than anything here (about 80-100 at the lowest) and is held; here it is shallower and passed through. |
| 2 | Opens up on the way up the face, knees to about 130-150, arms wide (4-4.7) | Tall / the leg extension out of a crouch | **Partly.** The extension (`LEG_EXTENSION`, legs-extend projection) exists; no turn-timed rise to carry it. |
| 3 | Stays low through a long carve with only about 10 points of hip-height change (11-14.3) | Crouch held / Compress held | **Yes** as a held crouch; the clip's depth is shallower than ours. |
| 4 | Hips low and slightly behind the back foot at the deepest frames, spray off the tail (10-11.5) | Weight back on the trim; Snap's tail weight | **Partly.** The fore-aft weight is a trim/CoP target (and Snap's tail load); the body's visible fall back over the tail as part of the turn is not a stance. |
| 5 | Both arms spread wide and level, tracking the trunk (1.5-2, 8.5-9.5) | Arm rig (`stanceReach=keep`) | **Partly.** Spread arms exist; the clip shows them a part of every turn, large and level. |
| 6 | One arm straight overhead, one hanging, body arched across the lip (5-7.5) | Top turn / snap | **Not at all for the body.** The manoeuvres are named afterwards; the arch with the overhead arm has no stance and no arm control. |
| 7 | Board horizontal along the lip with the rider draped over it, one leg extended forward (6.5-7.5) | Snap (stance) | **Partly.** Snap is a tail-weighted stance; the **asymmetric legs** (one extended, one bent) I see here are not a stance (the agile legs are opt-in). |
| 8 | Coming down the lip into the next bottom turn, shoulders rotated further than hips (8.5-9.5) | Bottom turn entry; rotation stick | **Partly.** Rotation stick exists; the order (shoulders lead) I cannot confirm and body yaw was dropped. |
| 9 | Hand near the front shin/board/water in the deepest carve (10-14) | Hand input (drag) | **Partly.** Hand drag exists; I cannot tell whether it touched. |
| 10 | The cycle bottom turn (low) -> up the face (open) -> lip (stretched) -> back down (low) in about 4-5 s | Bottom turn -> top turn -> bottom turn | **Partly.** The four names exist; no stance cycle ties them together (a held Compress is all the game has for the lows). |
| 11 | No repeated pumping | Pump | **Not shown by this clip.** Nothing to map. |
| 12 | Head up and looking down the line in every frame where I can see his face | none | **Not at all.** No gaze/head role in the stance or rig that I found. |
| 13 | Rising tall only on the way up the face, not before the bottom turn (4-4.7) | tall -> low -> tall cycle | **Disagrees with Kirra, see below.** |

## Against the two Kirra findings

1. **Tall -> low -> tall, hips back over the tail (vertical axis modelled, fore-aft not).** Mixed. **Agrees on the low-to-open cycle** (low at 0-3.5 and 10-14, open at 4-4.7, stretched at the lip) and on **the hips low and slightly behind the back foot** at the deepest frames (10-11.5). **Disagrees on the shape: I do not see a rise before the load** in the bottom-turn sections; the lowest frames are at the start of each section. **Also a precision on the game side:** the fore-aft axis is not absent from the game; the W/S trim is a fore-aft weight target and Snap puts the weight on the tail (from the code and strings). What the game lacks is the **visible hips-back stance tied to the turn's load**, not the input. I did not look at the rig to check how the pelvis is drawn.
2. **Depths shallower than Compress (about 66 on that scale).** **Partly disagrees.** The deepest frames here are about 80-100 (11-14.3), deeper than Kirra's 90-120, though each estimate carries +-15, so the two are not clearly different. Compress at about 66 is still deeper than anything I read, but the gap is **smaller (about 15-35 degrees)** than the Kirra clip suggested, and it is held while the rider here passes through. Tall here (130-150) matches Kirra's.
3. **New, not in Kirra: large arm swings.** The Kirra doc said arms stay at or below shoulder height until the final hit. Here the lead arm goes **overhead** twice and arms are wide and level through the carves. That is a gap with no mapping (row 6).

## What I could NOT see

- Left/right lean and rail angle: the camera is behind or above, the quantity the track turns on.
- Knee angles in any frame with his back to the camera (2.5, 5, 5.5, 6.5) and the trailing knee at the lip (6.5-7.5).
- Whether the shoulders or the hips lead in a turn, and any transition time: a frame every 0.5-1 s, and the arm positions change completely between neighbouring frames.
- Foot placement on the board (the feet are small, spray-covered or hidden).
- Whether the hand touches the water in the low carve (10-14.3).
- Whether the three sections are one ride or three; the frame at 4.25 s is a new camera.
- Whether the footage is real speed; I believe so, I did not find it stated.
- The exit of the last low carve (the clip ends at 14.64 s).
- The wave, barrel and spray are not described, by instruction.
