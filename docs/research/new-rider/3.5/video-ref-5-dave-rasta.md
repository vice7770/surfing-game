# Video reference 5 ("Dave Rasta flowing."): what the rider's body does, on the measured depth ladder

Source: https://www.youtube.com/shorts/rNDI0GcDDYU, title "Dave Rasta flowing." (uploader @danscotttt), 12.24 s. Read 2026-11-17 by screenshotting the browser pane (`which yt-dlp ffmpeg`: neither exists; checked). The fifth reference the owner sent; their standing instruction is the rider's **movement, not the wave**, so the wave, spray and barrel are not described. The rider's name comes from the title only; I did not verify it.

## Method and limits (read first)

- About 60 stills via `video.currentTime`, each after a 1 s wait: every 0.5 s from 0 to 12 s, plus 0.25 s steps at 0.25, 0.75, 1.75, 2.25, 2.75, 3.25, 3.75 and 9.25, plus 0.5 s **zoom crops of the rider** at 0.5-2.5, 3, 4, 5, 5.5, 6-9, 9.25-12. The clip was fully buffered.
- **Source stream is 360x640** (`videoWidth`/`videoHeight`, portrait; a Short, upscaled by the player, so zooming adds no detail). **The rider is roughly 80-120 source pixels tall** (largest at 0.5-2.0 and 9.5-12, smaller at 5-9). That is **about +-15 degrees on any joint and +-10 points on any hip fraction**. Every figure below is an estimate from pixels; **I say it once here and it applies to every number.**
- **Hip percentages** are hip height as a fraction of **straight-legged standing hip height**, the denominator of `3.5/stance-frame.md`. I got it by taking head-to-hip length in the frame as about 0.47 of standing height, then hip-above-foot over 0.53 of that. The trunk is foreshortened and pitched in most frames, which **pushes the true percentage lower than I report**, not higher. The bands are good to roughly one rung. **I never match a stance to the centimetre.** The conversion is good to about +-0.1 m on a ladder with 0.45 m of travel.
- **Slow-motion factor: I could not determine it.** `playbackRate` is 1; the title and page say nothing; the source plays at about 24 frames/s; the spray and the rider's limb speeds look natural to me, but there is no fixed-size object moving a known distance to prove it. **Every duration is video-clock seconds, "probably real time, unconfirmed".** This matters more than usual here, because the answer to thin spot 1 rests on durations: see the sensitivity line there.
- **Camera:** a long lens, probably a drone or a pole/boat, above and beside the rider at 0-2.5 s (side-on, looking down), then **behind and above him** from about 2.5 to 9 s, then closer, beside and behind again at 9.25-12. Behind-view is good for arms, trunk lean and stance width, poor for knee flexion.
- **One ride or a montage? Unresolved, probably more than one wave.** The rider (red top, dark shorts) and the board (white, blue outline stripe) are the same throughout. But the camera angle, the water colour and the framing change at least at **2.5-3.0** and **9.0-9.25**, and the uploader is a compiler of clips. I could not find a hard cut (an attempted frame-difference scan was ruined by the hidden pane throttling the player and by the camera pans), so I treat the clip as **three segments, S1 = 0-2.5, S2 = 2.5-9.0, S3 = 9.25-12.2, and make no claim that they are the same ride**. Conclusions are per segment and per turn.
- Sampling is 0.25-0.5 s. A spike shorter than that could have been missed. **A hold, though, cannot hide between my frames: it shows in consecutive frames.**

## The two thin spots, answered first

**1. Does a rider HOLD a depth below ~65 % for more than a second? In this clip, yes, three times.**

| Segment | Low period (video clock) | Duration | Hips, % of straight-legged standing (est.) | Rung |
|---|---|---|---|---|
| S1 turn | 0.5 to about 2.25 (0.75-1.75 the deepest) | **about 1.75 s** | 40-55 % at 0.75-1.75; 50-65 % at 0.5 and 2.0-2.25 | Compress, reaching into the tuck band at its deepest |
| S2 turn | 5.0 to about 7.0 | **about 2 s** | 55 % at 5.0; 45-55 % at 5.5-7.0 | Compress / tuck boundary |
| S3 turn | 9.25 to 12.2 (**clip end, release never seen**) | **at least 2.9 s** | 55-60 % at 9.25-9.5; 45-55 % from 10 to 12 | Compress, touching the tuck band |

In all three the depth is **not a spike**: the hips stay low across 4-7 consecutive sampled frames while the board turns underneath, and the rider changes shape inside the low (trunk twist, arm swap, board edge changing) without coming up. **This is the first counter-example to "no held crouch beyond ~1 s anywhere readable."**

Why I trust it and where it is weak:

- Trust: seven consecutive frames at 0.25-0.5 s (10.0 to 12.0 and 9.25-9.5) with the same low, knees well bent, hips at or below the level of the board's rail seen from behind. No frame of release inside S3.
- **Sensitivity to the unknown slow-motion factor.** If the footage is real time, the holds are 1.75 / 2 / at least 2.9 s. If it were slowed 2x, they would be about 0.9 / 1 / at least 1.5 s, which is still at or above the project's one-second line. **Only a slow-down of about 3x or more would turn them back into spikes**, and nothing I saw suggests that (no floaty spray, no sustained slow-motion look in the limbs), but I cannot prove it.
- Weak: the depth band. Behind-view and a 100 px rider make 45 and 60 % hard to tell apart. **What is solid is "well below the Tall band (75-95 %) and not upright, for seconds"**, which is Compress or deeper. It is **not** the 66 % Crouch-as-shipped gap: this rider is clearly below it.
- Caution: the earlier four clips are mostly tube and barrel riding at pro level; this one reads as a free-surfing session on a small to medium open-face wave (I am not describing the wave; only noting that it differs in what is being asked of the rider). A held low through a long carve is plausibly what a speed-generating turn on an open face looks like, and **a held Compress in the game is not contradicted by it**.

**2. Does the deep spike arrive at TURN ENTRY? Yes, in 3 of 3 turns, but here it also stays through peak and exit.**

| Turn | Tall before it? | Low arrives | Where the low sits in the turn |
|---|---|---|---|
| S1 (0.25-2.75) | Yes: 0.25 tall-ish and tail-weighted (about 70-75 %) | **0.5, at entry** (about 0.25 s after the tall frame) | entry, then **peak and into the exit** (still 55-65 % at 2.0-2.25); up to 70-85 % by 2.75 |
| S2 (4.5-8.0) | Mostly bent-forward trim, 70-75 % at 3.5-4.5 | **5.0 at entry**, deepest 5.5-6.0 | entry, **peak** (hand on the rail), partly the exit (6.5-7.0 still 50-60 %); up to 85-90 % by 8.0 |
| S3 (9.0-12.2) | 9.0 about 75 % (board railed, one arm cocked) | **9.25-9.5 at entry** | entry, **peak** and every later frame; **exit not seen** |

Counts: **entry 3 of 3; peak 3 of 3; exit 2 of 3 (S1, S2) with the third not visible.** The tall-before-it, low-at-entry shape is **3 of 3**, with the low then sustained rather than released. That is a different shape from the earlier clips' tall -> brief low -> tall; it is closer to a **tall -> held low -> tall cycle on a 2-3 s time scale**.

## Part A: what the body does

Stance through the ride (video clock; all figures estimates; denominator = straight-legged standing hip height):

| Time | What I see | Hips, % of straight-legged standing (est.) | Rung |
|---|---|---|---|
| 0.0-0.25 | S1 entry. Standing, trunk pitched, weight on the tail, back to the camera, arms slightly out and low | 70-75 % | Tall (low edge) |
| 0.5 | **Drop.** Chest forward over the front thigh, rear knee deeply bent, lead hand reaching toward the board's rail, board turning onto its rail | about 50-60 % | Compress |
| 0.75-1.75 | **Held deep position.** Seated-looking: thighs near horizontal, hips just above the deck, trunk tilted back and rotated; **lead hand on or just above the rail/board, rear arm thrown up with the fist at about head height or above**; spray at the tail, board edged | 40-55 % | Compress, into the tuck band |
| 2.0-2.25 | Still low but rising: hips higher, rear arm still up and back, lead hand dropping away | 55-65 % | Compress |
| 2.5-2.75 | Rising, knees bent, the rear arm lowers to shoulder height | 65-75 % | Crouch-gap to Tall |
| 3.0-4.5 | S2. **Standing, knees bent, trunk pitched forward**, both hands out low in front of the hips, one slightly forward | 70-80 % | Tall (low edge) |
| 5.0 | Lower: back knee deep, lead hand reaching to the board | 55 % | Compress |
| 5.5-6.0 | **Deepest of S2.** Hips below the level of the shoulders by a wide margin, **both hands down at the board**, head turned up the face | 45-55 % | Compress / tuck boundary |
| 6.5-7.0 | Hips still low, trunk leaning hard to the inside of the turn, lead hand trailing out low | 50-60 % | Compress |
| 7.5 | Extended: laid out toward the wave, both arms spread wide and about level with the hips-to-shoulders | 65-75 % | Crouch-gap |
| 8.0-8.5 | **Standing tall, near-straight legs, arms spread out sideways at about shoulder height.** Back to the camera | 85-90 % | Tall |
| 9.0 | S3 entry: upright, one hand cocked at head height, board on its rail | about 75 % | Tall (low edge) |
| 9.25-9.5 | Dropping: hips going down, rear arm up and back (fist or hand about shoulder-to-head height) | 55-60 % | Compress |
| 10.0-10.5 | **Held:** wide stance, trunk twisted toward the wave, lead hand down near the front knee or hip, rear arm cocked up | about 50 % | Compress / tuck boundary |
| 11.0-12.0 | **Held:** the deepest of the clip's S3: hips low, knees well bent, lead hand to the knee or the rail, rear arm trailing | 45-55 % | Compress / tuck boundary |

**Where the rider spends the clip** (by sampled frames, and so by time at 0.25-0.5 s per frame): about **10 of 25 half-second slots in the Compress band or deeper (45-65 %)**; **about 10 in the 65-80 % gap-to-Tall zone**; **only about 3 (8.0, 8.5 and part of 7.5) clearly Tall (85-90 %)**. This is a rider who lives low and rises only briefly. **No frame reads above about 90 %.**

**No clip-frame shows a rider at the Crouch-as-shipped 66 % rung as a state.** The rider passes through 65-75 % on the way up and down (2.5-2.75, 7.5) for about 0.5 s each time, but he never stays there. That repeats the earlier finding: the game's shipped Crouch depth is a place the footage only passes through.

Each turn in four beats (estimates):

- **S1, 0.25-2.75, about 2.5 s:** entry 0.25, standing and tail-weighted, back toward the camera; load 0.5, a drop onto the front thigh with the lead hand toward the rail; peak 0.75-1.75, the deep, rotated, seated-looking position with the board edged and the rear arm thrown up; exit 2.0-2.75, hips rise while the rear arm is still up. **The weight goes to the rear foot and the tail throughout**: the hips are over or behind the rear foot in 0.75-1.75, which is the fore-aft axis the game does not model. **The upper body leads**: the chest and shoulders are rotated toward the face before the board is on its rail (0.5), and the shoulders stay ahead of the hips through the peak.
- **S2, 4.5-8.0, about 3.5 s:** entry 4.5-5.0, a forward pitch with the hands going down; load 5.5-6.0, hips drop and both hands go to the board; peak 6.0-7.0, held low and leaning inside; exit 7.5-8.0, the arms swing wide and the legs straighten to a tall stance. **The hands reach the board before the hips reach their lowest** (5.0 hand low, 5.5-6.0 hips lowest). From behind I cannot say whether the weight is fore or aft.
- **S3, 9.0-12.2, at least 3.2 s:** entry 9.0-9.25, the drop with the rear arm up; load 9.5-10, wide stance, trunk twisted; peak 10.5-12, held, lead hand to the knee or rail; **exit not in the clip** (the clip ends at depth). The upper body is rotated toward the open face ahead of the hips by an estimated 30-45 degrees at 10-11.5.
- **Repeated, counted.** Held low periods of at least 1.5 s at hips below 65 %: **3 of 3 turns**. Tall (85-90 %) frames between turns: **1 occurrence (8.0-8.5)**. Fast spike shorter than 0.5 s: **0** (this clip has none). A rear arm thrown up with a fist near head height during the low: **3 of 3 turns** (1.0-2.25, 9.25-10.5, and arm raised at about 11-11.5).

**The arms.**

- **Height and spread at the load:** **asymmetric, not spread and not both drawn in.** At the loaded, low part of every turn one hand (the lead hand, the one toward the wave) is **down at the knee, the rail or the board**, and the other (the rear hand) is **raised, at about head height or above, with the elbow bent** (1.0-2.25; 9.25-10.5; the hand-down half is also seen at 5.0-6.0 and 11-12 without the raised one being visible from behind).
- **When both arms are spread level**, it is on the **tall, between-turn frames**: 2.75-3.25 (arms out and low), 7.5 (both spread about level) and 8.0-8.5 (both at shoulder height, fully spread). **Not at the peak of a turn.**
- **At the instant the board changes direction** (0.5-0.75, 5.0-5.5, 9.0-9.25): **the lead hand is reaching down toward the rail and the rear arm is going up and back.** Not both out, not both in.
- **Do they track the trunk?** The trunk and the lead arm go down together; the **rear arm moves against the trunk** (up while the body goes down), the one place in any of the five clips I have seen an arm moving opposite to the body. It reads as a counter-rotation and balance device.

## Part B: the mapping to the game's vocabulary

What the game has (code and `docs/research/new-rider/3.5/stance-frame.md`): Tall (hip 89 %, leg depth 0), Crouch as shipped (66 %, 0.195 m), Compress (55 %, 0.30 m, held), Snap/tube tuck (`?snapDepth=deep`, 0.45 m), a fore-aft trim input, a rotation stick, a hand drag.

| # | What the rider does (clip time) | Game stance or move | Have it? |
|---|---|---|---|
| 1 | Standing, knees bent, trunk forward, hips 70-80 % for 1-1.5 s between turns (3.0-4.5) | Tall (low edge) | **Partly.** Tall exists at 89 %; this rider's "resting" stance is **10-15 points lower** and pitched forward. |
| 2 | Tall, arms fully spread, hips 85-90 %, for about 1 s (8.0-8.5) | Tall / trim | **Yes**, but it is **1 of the clip's 25 slots**: the rider is rarely here. |
| 3 | **Held deep position, hips 45-60 %, 1.75-2.9+ s, through the turn** (0.5-2.25; 5.0-7.0; 9.25-12.2) | Compress (held) | **Yes for depth and for being held.** The game's Compress (55 %) is in the band. **This is the first clip that supports a held Compress rather than contradicting it.** |
| 4 | The deepest part of that hold touching the tuck band (40-50 %: 0.75-1.75, 5.5-6.0, 11-12), **while still turning on the face, not in a tube** | `?snapDepth=deep` | **Partly.** The depth exists as a Snap option; **in this clip it is used in the middle of a held carve**, not as a 0.25-0.7 s snap. |
| 5 | **Tall -> low (at entry) -> held -> tall** on a 2-3 s scale, 3 times | none | **Not at all** as a turn-timed sequence (Kirra gap 1 again, with a longer time scale). |
| 6 | **Lead hand to the rail, board or knee while the rear arm goes up and back** (1.0-2.25, 5.0-6.0, 9.25-12) | hand drag | **Partly.** A hand drag exists; **a stance-tied arm pose with an opposed rear arm does not**. |
| 7 | **Spread-arms balance** on the tall frames only (2.75-3.25, 7.5-8.5) | arm rig | **Partly.** Spread arms exist; the **hand-down/hand-up pairing during loads** is **not at all**. |
| 8 | Weight on the tail and the hips behind the rear foot in the held low (0.75-1.75, seated look) | W/S trim, Snap's tail load | **Partly.** The input exists; the **fore-aft hip axis as a body shape does not** (Kirra gap 2). |
| 9 | Shoulders rotated 30-45 degrees ahead of the hips through the peak (0.5, 10-11.5) | rotation stick | **Partly.** Body yaw was dropped, so **no upper-body lead**. |
| 10 | The board on its rail with spray at the tail during the low (0.75, 1.5, 9.5-10.5) | carve / cutback / snap | **Have it as moves**; **the matching body does not exist**. |
| 11 | The whole turn lasts 2.5-3.5 s of video clock | bottom turn (measured 0.96 s real) | **Not comparable until the slow-motion factor is known.** At real time these are carved turns of 2.5-3.5 s. |
| 12 | Drop-in, tube ride, pump | -- | **Not in the clip.** No take-off, no tube. **Pumping: no rhythm seen** (the rider goes low once per turn, not repeatedly). |

**The "not at all" rows are 5 and the pairing in 7.** Row 5 (a held cycle) is a gap already named by Kirra; here it is on a longer scale. The arm pairing in row 7 is new for the game: **a lead hand down + a rear hand up at the peak of a held low**, which no stance in the game produces.

## Against the four existing reads (lead with disagreement)

1. **DISAGREES with all four on "no held crouch beyond about 1 s."** Kirra (first 50 s), Pupo, Nias and Kirra's remainder showed spikes of 0.25-0.7 s with the rider upright between turns (Pupo's lows were held 3-4 s on the slowed read, so that one is partly consistent). This clip shows **three holds of 1.75-2.9+ s at 45-60 %**, in three different turns. Possible reasons: this is a different rider and style, **the earlier clips were wave/tube clips and this one is a carving clip**, or **the footage here is real time and the earlier ones were slowed in ways that were not noticed (Kirra's was 3-4x, an unchecked one would shorten the spikes in real terms but not lengthen them)**. **Do not conclude from this single clip that every rider holds.** It is one rider and **at most three turns** (and one of them cut off by the end of the clip). It is, however, the counter-example the brief asked for, **and it changes the evidence from "none" to "one rider, three of three turns."**
2. **DISAGREES with Nias (both arms low and drawn in at the deepest points).** Here the arms at the deepest points are **asymmetric**, one down and one up. **AGREES in part with Pupo and Kirra's first 50 s** only on the tall frames (spread level, 8.0-8.5, 7.5, 2.75-3.25). **AGREES with Kirra's remainder** on the **lead hand dropping to the rail or the knee** (here 3 of 3 turns). **DISAGREES with Kirra's remainder** on the other arm: Kirra's trails **low and back**; here it goes **up**, with the fist at about head height or above. So the answer to the open question is: **neither "spread wide" nor "both in": a lead hand reaching down plus a rear arm raised, with spread arms only between turns.**
3. **AGREES with every clip: the deep position arrives at entry** (3 of 3 here; tall before it in 3 of 3). **DIFFERS** in that it does not release: the low continues through peak and, in 2 of 3 turns, into the exit.
4. **AGREES with Kirra (gap 2): hips over or behind the rear foot** in the held low of S1 (0.75-1.75), seen from the side. Seen from behind in S2 and S3 so cannot confirm there. **Weak: one segment.**
5. **AGREES (weakly) with Nias: the upper body leads.** Shoulders ahead of the hips by 30-45 degrees at 0.5 and 10-11.5.
6. **The earlier docs' metre figures are not used here.** Three of them compared a hip fraction to `STANCE_TABLE`'s 0.65 m and 0.55 m, which are whole-body centre-of-mass heights, not hips. I report hip percentages and name the rung; **I did not set a video fraction beside a game metre anywhere in this document.**

## What I could NOT see

- **The slow-motion factor.** Not stated; I believe real time and cannot prove it. **All durations depend on it.**
- **Whether it is one ride.** Framing changes at 2.5-3.0 and 9.0-9.25; probably more than one wave.
- **Knee angles from behind.** S2 (2.5-9.0) and most of S3 are rear views. The hip percentages there come from the hip-to-foot height in the frame, not from knee flexion, and I did **not** cross-check them with a knee angle. The earlier note that a knee-angle route and the percentage route disagree by 0.1 m applies.
- **What is between my frames.** I cannot rule out that the deepest points are deeper than I sampled, or that a tall dip sits between two low frames. For the held periods, **consecutive low frames make that unlikely**, but not impossible at 0.5 s steps in S2.
- **The exit of S3.** The clip ends while the rider is still low.
- **Foot placement** and whether the rear foot is on the tail pad. The board is visible from above at S1 and S3 but his feet are not clearly resolvable in S3.
- **Face and gaze.** Hair and the camera angle hide the face; I cannot judge where he is looking.
- **The take-off and any tube.** Not in the clip.
