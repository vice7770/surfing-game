# Kirra reference clip, the unread remainder (50 s to 195.6 s): what the riders' bodies do

Source: https://www.youtube.com/watch?v=3nfW6OLiyYw, "Kelly Slater's Iconic session at Kirra | Slowed Down", 195.6 s. The first 50 s are in `kirra-reference.md` (not edited, not re-read here). Read 2026-11-17. The owner chose the clip as the movement target and said to ignore the wave, barrel and spray; none of those are described below.

## Answers to the three open disagreements (lead)

Every number is an estimate from pixels (est.), every duration is in SLOWED seconds unless it says "real".

1. **Arms at the loaded part of a turn: it depends on the manoeuvre, and the deepest moments agree with Nias, not with the first 50 s.** At the deepest points of the open-face turns (182, 187, 191, 192 s) the **lead hand is low, near the front knee or the board's rail, and the other arm trails low and back**; it is not "both drawn in" (one hand reaches out toward the board) and it is not spread wide and level. Arms go **out and roughly level at shoulder height only when the rider is upright or mid-carve** (143, 184, 190, 195 s). In about 14 turn frames, an arm clearly **above shoulder height: 1 (186 s, rear arm, uncertain)**. So "arms wide and level at the turn" (Kirra first 50 s, Pupo) is true of the *upright part*; the *loaded low part* has arms low. This clip therefore contradicts the first 50 s of its own source only partly: the first 50 s described arms wide while crouched at 38.5-41.7 s; here I see them low when crouched. Different riders, so not a rebuttal.
2. **Depth is pulsed, not held, in every open-face turn I could read; I could not test a long tube hold.** Dips to hips about 45-60 % (est.) last **about 1-2 slowed s each** (1 s sampling), then the rider is back at 75-85 %. Counted: **shot A (57-64 s) 3 dips, shot C (182-195 s) 3 dips, tube shot (129-140 s) 2-3 low samples, never more than 2 consecutive 1 s samples low.** No crouch held over 2 slowed s in any rider. At the slowing factor below (about 3-4x, **unverified**) 1-2 slowed s is **about 0.25-0.7 real s**, i.e. the same size as Nias's 0.25-0.5 s spikes. The first 50 s's "crouch held 15+ slowed s in the tube" is **not reproduced and not refuted**: no tube shot here is that long (longest continuous rider shot is 57-65 s, 8 s).
3. **Where the low comes: at the start of the turn through the spray peak, with tall on both sides.** Shot C: 184 s tall-ish with arm out, **186 s low as the board goes on its rail**, 187-188 s still low as the spray fan is thrown, 190 s up and arm out. Again 191-192 s low as the tail throws spray, 195 s tall. **3 of 3 turns I could sample have the low at entry-to-peak and the rise at exit**, with a tall frame before the low in 2 of them (184, 190). This agrees with Nias and Pupo on order, and with the first 50 s's "tall, then low, then up" (that doc also had tall first).

Plus: **the "one rider" premise is wrong.** This 195 s is a montage of **at least 5 different surfers** (see Cuts). The description says "also featuring Dave Rastovich and Joel Parkinson". I do not name who is who. Nothing here should be quoted as "Kelly Slater does X" without checking the frame.

## Method and limits (read first)

- No `yt-dlp` or `ffmpeg` on this machine (checked). I seeked `video.currentTime` in the browser pane, waited for the `seeked` event plus 1 s (no stale frames), and screenshotted. About 85 frames: 3-4 s steps over 50-195 s, then 1-1.5 s steps in the four close shots. Two ads (84 s, 30 s) were waited out first.
- **Source stream 854x480** (`videoWidth`/`videoHeight`). The pane shows it at about the same size, so no extra pixels. The `zoom` action only crops, it does not magnify, so it added nothing.
- **Rider height in the source: close shots (57-65, 129-146, 163-195 s) about 90-110 px; wide shots (79-125 s) about 25-45 px, unreadable.** Joint angles good to **+-15 degrees at best, hip heights to about +-10 points**, worse from behind (163, 171, 195). "est." applies to every figure below even where I drop the word.
- **Slow-motion factor: the page says 72 fps / 96 fps 4K** ("Slowed Down - 72fps / 96fps 4K", video description). The stream's frame times fall on multiples of 1/24 s (188.4583 s = frame 4523 at 24 fps), so playback is **probably 24 fps**, giving **3x (72 fps shots) or 4x (96 fps shots)**. I could **not** tell which shot is which, so **real time = slowed time / 3 to / 4, unverified**. `playbackRate` is 1. I could not measure it from the footage.
- Sampling 1 s apart in slowed time is 0.25-0.33 s real. **A dip shorter than that can be missed.** The pane ran at about 1 frame/s while hidden, so I did not try to play the clip.

## Cuts (montage; never read two shots as one ride)

| Slowed time | What it is |
|---|---|
| 50-53 | Rider small in foam, crouched with arms forward; wave dominates. Unreadable beyond that. |
| 55 | Rider diving forward in foam, arms ahead (a fall or a duck). |
| **57-65 (shot A)** | One continuous close side/three-quarter shot, bare-chested rider, about 8 s. **Best clip for a held-or-pulsed answer.** Ends at 65 s with the board alone entering the tube. |
| 67-73 | Empty wave and foam; 73: rider mostly hidden in whitewater. |
| 76 | New shot: rider upright, one arm out, about 55 px tall. |
| 79-91 | Wide shot, small peaks, a dark-clothed rider 25-30 px tall (82, 85, 88, 91). Not readable. |
| 94-103 | Through pine branches, rider 20-25 px. Not readable. |
| 106-125 | Wide trim along a wall, branches in front; rider 25-35 px. Not readable. |
| 128-132 | Close shot; **129.7-130.5 s** rider crouched, then hidden. A cut by 131-132 to a wide view of a rider on the face. |
| 133-137 | Rider (bare, orange-red board end) at the lip/tube mouth, 25-35 px; 137: nearly hidden. |
| **139-144 (shot B)** | Side-on, rider 90-100 px, tube mouth to open face. Good for stance. |
| 146 | **Cut**: red board, rider at the top of the face, a different shot. |
| 149-153 | Rider low at the foam base (149: crouch, hand near front knee), then upright at 153. 25-45 px. |
| 157-161 | Foam and a wipeout-looking rider (157), a rider mostly hidden (161). |
| **163-164** | **A different surfer**: orange board, bare chest, standing tall in the tube with **both hands up at the head at 163 s** (a relaxed pose, not a control). |
| **167-195 (shot C)** | **A long-haired rider in a red rash vest**, a series of turns, with jet skis in frame (a heat or a photo session). 167-172 and 182-195 are readable; 174-180 are foam-only or another surfer (180: pinkish top, crouched in spray). |

## Part A: what the body does (all est., slowed seconds)

### Shot A, 57-64 s, bare-chested rider, side-on (stance through ~8 s)

| Time | What I see | Knee (est.) | Hips, fraction of standing (est.) | Arms |
|---|---|---|---|---|
| 57 | Crouched, trunk pitched forward, weight forward | about 100-115 | about 60-65 % | low, forward of the thighs |
| 58 | Taller, trunk upright, board spraying | about 130-140 | about 80-85 % | one arm forward and low |
| 59 | Standing, arms hanging | about 130-145 | about 80 % | both low at the sides |
| 60 | Dropping | about 110-120 | about 65-70 % | one hand at the front knee |
| 61 | **Low point**, hand near the knee | about 95-110 | about 55-60 % | low |
| 62 | Up, weight on the back leg, leaning | about 130-145 | about 75-80 % | rear arm back, lead low |
| 63 | Mid | about 130 | about 75 % | one arm out and level |
| 64 | **Second low**, rear leg bent hard | about 90-110 | about 55 % | low, near the front knee |

Reading: **3 dips (57, 60-61, 64)**, each **1-2 slowed s** (about 0.25-0.7 real s if 3-4x), between standing frames at 75-85 %. Never held over 2 slowed s.

### Shot B, 129-146 s (tube mouth to open face), est.

- 129.7: crouched, knees about 100, hips about 60 %, trunk forward, arms low and forward. 130.5: lower and hunched, hips about 50 % (hidden in spray).
- 139: crouched, hips about 65 %, arms low. 140: hand near the front knee, hips about 60-65 %. **141.7: up**, hips about 80 %, arms out and back. 143: hips about 80-85 %, knees about 140, the lead arm up to shoulder height. 144: hips about 85-90 %, nearly straight legs, arms hanging.
- So in 139-144 (5 s) one low period of **at most 2 s**, then 3 s tall. Rise from low to tall took **under 1.7 s** (between 140 and 141.7).
- 146 (new shot): knees about 120, trunk leaning in, front arm out at about shoulder height, a top turn near the foam.

### Shot C, 167-195 s, the red-rash rider (a series of turns)

| Time | What I see | Hips (est.) | Arms |
|---|---|---|---|
| 168 | Layback carve, trunk leaning back, hips bent | about 70-75 % | lead arm out and back, level |
| 170 | Turn on the rail, trunk toward the wave | about 70 % | one back, one out and low |
| 171-172 | Seen from behind, tall-ish | about 75-80 % | both bent, low, elbows out |
| 182 | **Low**, trunk over the front thigh | about 50-55 % | hand toward the front knee |
| 183 | Rising, still bent | about 65 % | arms low and forward |
| 184 | Carve, upright-ish | about 75 % | lead arm out and level |
| 186 | **Low** at the start of the spray, board flat to railed | about 55 % | rear arm up near head height (uncertain), lead low |
| 187 | **Low**, hand to the board | about 50 % | lead hand on or near the rail |
| 188 | Big spray fan, still bent | about 60 % | lead arm level at the chest, rear arm wide |
| 190 | Up | about 75 % | lead arm out and level |
| 191 | **Low**, hand down toward the board | about 45-50 % | lead hand low, rear trailing |
| 192 | **Lowest**, forward over the board | about 45 % | lead hand down to the board, rear back |
| 195 | **Tall**, from behind | about 80 % | both out, level at about shoulder |

**Turns in four beats** (the 184-190 turn and the 191-195 turn, est.):
- Entry (184, 190): upright-ish, hips 75 %, lead arm out and level.
- Load (186, 191): drops to 45-55 % within about 1 slowed s; the lead hand goes toward the board or knee.
- Peak (187-188, 192): still low (50-60 %), board on its rail, spray off the tail.
- Exit (190, 195): back to 75-80 % in about 1-2 slowed s, arms back out level.
- Cycle length tall to low to tall: **about 4-5 slowed s per cycle** (184 to 190 is 6 s; 188 to 195 is 7 s with a dip in the middle): **about 1-1.5 real s at 3-4x (unverified)**.
- Upper body leading: at 168 and 171 the trunk is turned toward the wave ahead of the hips (my estimate, maybe 30-40 degrees, from behind and so low confidence). I cannot read the order of hips, shoulders and board inside 1 s.

### Repeated counts

- Dips to hips <= 60 % (est.): **A 3, B 2, C 3 = 8 in about 30 slowed s of readable footage**; none longer than 2 consecutive 1 s samples.
- Upright/tall frames (hips >= 75 %): at least 6 between dips.
- Hand reaching toward the board or knee at the low: **5 of 6 low frames in shot C** (182, 187, 191, 192, and 186 partly) and 3 of 3 in shot A.
- Arms above shoulder height in turn frames: **1 uncertain in about 20**.

## Part B: mapping to the game's vocabulary

The game's vocabulary, from `kirra-reference.md`, `video-ref-2.md` and `video-ref-3.md`: stances Tall, Crouch (0.65 m centre of mass), Compress and Snap (0.55 m, **held**), a tube tuck (0.40 m); a fore-aft W/S trim, a rotation stick, a hand drag; moves named only after the fact (`bottom turn`, `top turn`, `snap`, `cutback`), a pump lesson. I did not re-read the rider code; I only used the three earlier docs' account of it.

| # | What the rider does (clip time, est.) | Game stance or move | Have it? |
|---|---|---|---|
| 1 | Upright, knees slightly bent, hips 75-90 %, 2-4 slowed s between dips (59, 143-144, 195) | Tall / trim | **Have it.** |
| 2 | A dip to hips 45-60 % lasting 1-2 slowed s (about 0.25-0.7 real), then released (57, 60-61, 64; 182, 186-187, 191-192) | Compress (depth) | **Partly.** Depth exists; the **self-releasing** pulse does not (Compress is held). Third clip in a row where this is the finding. |
| 3 | Tall to low to tall inside one turn, about 4-5 slowed s per cycle (184-190) | none | **Not at all.** |
| 4 | Lead hand down to the board's rail or the front knee at the deepest point (187, 191, 192) | hand drag | **Partly.** The input exists; **nothing ties it to the stance** (the arms are not a function of the dip). |
| 5 | Arms out and level when upright or mid-carve (184, 190, 195, 143) | arm rig | **Partly.** Only as a fixed pose. |
| 6 | Arms **low** at the deepest point, **level** after: a stance-dependent arm height | none | **Not at all.** Same gap as Nias. |
| 7 | Hips low and back over the tail while the spray fan is thrown (187-188, 192) | W/S trim, Snap's tail load | **Partly.** Input exists; stance and arms do not follow it. Fore-aft axis from a side/three-quarter view is only partly readable. |
| 8 | Layback carve, trunk leaning back and in, lead arm trailing back (168, 188) | carve | **Partly.** No body lean for it. |
| 9 | A top turn to the lip with the board near vertical (146, 85 wide) | top turn / snap | **Not at all** as a body (no stance, no arm control). Too small to read the hips. |
| 10 | Trunk turned ahead of the hips (168, 171) | rotation stick | **Partly.** Body yaw was dropped. Low confidence. |
| 11 | Pump | pump | **Not seen** in readable shots. |
| 12 | A rider standing tall with both hands at the head in a tube (163) | tube ride | **Not mapped.** It is a relaxed pose, not control; mentioned only because it is the opposite of a tube tuck. |
| 13 | Dive or fall in foam (55, 157) | wipeout | **Not examined.** |

## Part C: what I could not see

- **Head or gaze: not readable.** The face is 5-8 px wide in every close shot and the long-haired rider is seen from behind in 171-172 and 195. I cannot say whether the head leads the turn. The head sits close to the trunk line in the low frames (no visible lead).
- **Hips over the tail vs. over the board**: a side view would show it; here the rider is three-quarter or from behind, with spray hiding the board. Inconclusive for the fore-aft gap.
- **The slow-motion factor per shot**: only a range (3-4x) from the description plus a 24 fps guess.
- **Anything between my frames.** 1 s steps in slowed time. A dip shorter than 1 s is missed. I did not step at 0.25 s anywhere.
- **Wide shots (79-125 s)** are 25-45 px: no stance can be read. I did not count them.
- **Who is who.** At least 5 surfers; I did not identify any. Shot A and B riders look like one bare-chested, bald or shaved-head surfer; the first-50-s riders may be the same, I cannot confirm.
- **Rail angle, foot placement, left-right lean** from behind or three-quarter views.
- **Knee angles from behind (171-172, 195)** are weak, +-20 degrees or worse.
- **The tube's long hold**: no continuous tube shot long enough to test the first 50 s's 15 s crouch.
- The pane ran hidden at about 1 fps for any playback, so the frame rate is inferred from frame timestamps only.

## Does this contradict the first 50 s?

- **Arms: partly.** First 50 s: arms wide and level at the crouched turn. Here: low at the crouch, wide when upright. A different rider each time; I would not generalise either.
- **Held vs. pulsed: not refuted and not confirmed**, because no equally long continuous tube shot exists here. Everything else (turns) is pulsed, same as Nias and Pupo.
- **Tall, low, tall: confirmed**, 3 more cycles, in about 4-5 slowed s each. The first 50 s's "3-4 slowed s per turn" is of the same order, so the 3-4x factor would put a turn at about 1 real s, near the game's measured 0.96 s bottom turn. That is a hypothesis, not a measurement.
