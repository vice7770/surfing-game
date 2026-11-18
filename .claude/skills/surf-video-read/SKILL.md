---
name: surf-video-read
description: Read a surfing video (YouTube, Shorts, any page that plays in a browser) frame by frame and map what the rider's BODY does onto Breakline's own stances and moves, producing a reference document in docs/research/new-rider/. Use this whenever the owner shares a surf clip, says a video shows the movement they want, asks what a surfer is doing in a video, or asks to compare real surfing against the game's rider — and also when any task needs real-surfing movement evidence and the only source is footage. Claude cannot watch video; this skill is how it gets pixels anyway.
---

# Reading a surf video

Surfing biomechanics barely exists as a published field. Twice now, a clip or photograph the owner chose has beaten the literature outright and corrected numbers this project had already published. **A reference the owner picked is evidence, and it is often the best evidence available.** This skill exists because that evidence is locked inside video, which Claude cannot watch.

## What these reads are FOR — the standing purpose, which outranks any question of the day

**The owner's own words, 2026-11-17:** *"What i really want from this videos is for you to study surf movements to improve the riding engine."*

**So the product is a general understanding of how surfers move, not an answer to whatever is currently open.** Read the whole body through the whole section, broadly and **without a thesis.**

This needs saying because it has already gone wrong: a brief once made the day's hot question (foam contact) the read's item 1, and the owner corrected it — *"the video is not focusing on the foam, Even tho that is important."* **A clip is not a test fixture for this week's hypothesis.** If a read happens to settle an open question, that is a **by-product**, and it is reported as one.

**What the engine most lacks is not the list of positions but the movement between them**, so give the frame budget to the ordinary business of riding:

- **how the body gets from one position to the next** — the transitions, not just the poses it visits
- **what leads and what follows**: hips, shoulders, head, arms, and in what order
- **what the legs do through a turn, and what the upper body is doing at the same moment**
- **weight fore and aft along the board**, not only up and down
- **how a move starts and how it ends**, including the unglamorous parts — trimming, waiting, adjusting, recovering
- **anything repeated, with counts.** A thing done five times is worth more than one spectacular moment.

**Let the mapping table's rows come from what is actually on screen**, not from a list of questions someone handed you. The **"not at all"** rows are how this work reaches the engine.

## Who runs this

Dispatch an agent with **`model: "sonnet"` and no `effort` parameter** (so it runs at its default). Reading stills and filling a table is not hard reasoning; it is patience and honesty. A cheap model doing twenty screenshots carefully beats an expensive one doing five and inferring the rest — and the expensive one is needed elsewhere.

## Getting pixels out of a video

There is no `yt-dlp` and no `ffmpeg` on this machine. **Check before assuming otherwise** — if they are installed, frame extraction is better and faster, so use it.

Otherwise: **the browser pane renders video, and a screenshot of the browser is an image an agent can read.**

1. Open the URL with `mcp__Claude_Browser__navigate` or `preview_start`.
2. Skip any ad. A Short needs no seeking; a long video does.
3. Seek to fixed times and take `computer {action: "screenshot"}` at each. **Two to four second steps**, fifteen to twenty-five frames, is enough for a fifty-second window.
4. Where the rider is small, add `computer {action: "zoom", region: [x0,y0,x1,y1]}` crops at the few moments that matter.
5. **If it will not play, say so and stop.** Guessing from the title is worse than returning nothing, because a guess gets quoted later as a measurement.

### The stale-frame trap, and the two defences that actually work

**The browser pane falls to `document.hidden`, which freezes painting — and then a screenshot silently returns the PREVIOUS frame.** This is not fixed by waiting a second after the seek; video 6's read found it survives that, and an earlier read had to discard its whole first batch to it. **A stale frame is the worst possible failure here, because it looks exactly like data.**

Two defences, both proven:

- **Print the reached `currentTime` and a frame counter into the canvas**, so staleness is self-evident in the image you are reading rather than invisible.
- **Take two screenshots per draw and read the second.**

Closing the artifact pane restored painting once. Posting canvas PNGs to a local HTTP sink would bypass the problem entirely, but the pane blocks localhost with `ERR_BLOCKED_BY_CLIENT`.

**And the version of this that bites hardest: TWO READS IN ONE TAB.** The browser pane is shared across agents, and a fresh pane has exactly **one** tab. On 2026-11-17 two video reads ran at once and `tabs_context` showed a single tab — **so each was seeking `currentTime` in a tab the other was navigating, and a screenshot could return the other clip's frame.** Nothing in the image says which video it came from.

**So every read claims its own tab:** call `tabs_create` first, keep the `tabId`, and **pass it explicitly on every call afterwards** — `navigate`, `javascript_tool`, `computer`, `read_page`, all of them. **Omitting `tabId` targets whatever tab is active, which may be another agent's.** Say in the report which `tabId` was used. **Discard any frame you cannot prove came from your own clip at the timestamp you intended** — a thin honest read beats a fuller one built on someone else's video.

### Get the high-resolution stream — it is worth more than any other single step

**The pane serves 360×640 until you enlarge the viewport AND RELOAD. Then it serves 1080×1920.** Enlarging alone does nothing — video 7 found this, and the difference is a rider **620 px tall instead of 55–120**, which is what made the trunk-versus-legs finding visible at all. **Do this before taking a single measurement frame.**

**And a `wait` of about 0.55 s between the draw and the screenshot made single screenshots reliable** where a 1 s wait alone had not. The canvas stamp still goes in — video 7's stale-frame trap fired **four times** and the stamp caught every one.

### Three more things that will stop you dead if you do not know them

- **A consent gate now stands in front of YouTube.** Answer it — **`Reject all`**, which is the privacy-preserving option — **before any `<video>` element exists at all.** Until then there is nothing to seek.
- **The pane can return a PARTIALLY DRAWN canvas**, and this is a *different* failure from the stale video frame: a montage the page had finished drawing came back with half its tiles missing, twice. **The timestamp stamp cannot catch it**, because the stamp is correct — only the picture is incomplete. Fix: a **2.2–2.5 s wait**, or take a second screenshot and compare.
- **Two tools are worth building before you measure a dark-wetsuit clip**, because video 8 was unreadable without them: an **auto-crop that finds a black wetsuit against water** (it located the rider in **128 of 140** frames) and a **silhouette edge outline**. No leg in that clip was readable otherwise. Video 9 added a **redness-based finder** (maroon top or bare skin against teal water) and a **`seeked` + `requestVideoFrameCallback` seek with mediaTime verification and retry**, which removed the stale-frame problem outright at 1440p.
- **☠️☠️ `javascript_tool` HAS A ~45 s CEILING, AND A TIMED-OUT SCRIPT KEEPS RUNNING.** Video 10's 164-seek loop timed out and then spent **two minutes seeking the video underneath its own measurement calls** — one frame returned `mediaTime = 30` while the canvas stamped `currentTime = 53.85`. **The stamp caught it; without the stamp it would have been data.** **Rule: chunk every loop under ~40 s, and discard any frame whose stamp disagrees with the mediaTime its seek returned.**
- **MEASURE THE STREAM'S OWN FRAME GRID before choosing a step** — seek on a 0.01 s grid and hash the picture. Video 10 is a true **25 fps**, so sampling at 1/30 s produces duplicates that look like a still rider. Video 8 was 60 fps, video 9 was 30. **Do not assume.**
- **Quality is PER-VIDEO.** Video 10 publishes **no 1440p or 2160p at all** — 1080p was its ceiling — so video 9's quality ladder is not a general route. **Three clips in a row had three different ceilings.** Ask the player what it has.
- **☠️ `computer zoom` BUYS NO RESOLUTION.** Its own result says it is **"cropped from a screenshot, not magnified"** — so zooming cannot rescue a rider who is too small in the source. Clip 11 tried five magnifications and got nothing. **Fix the source resolution or accept the refusal.**
- **A RUNAWAY `javascript_tool` LOOP IS KILLED CLEANLY BY RELOADING THE PAGE.** The ~45 s timeout leaves the script running and seeking underneath your measurement calls; clip 11 hit it and a **page reload** was the clean stop.
- **`requestVideoFrameCallback` NEVER FIRES WHILE THE PANE IS HIDDEN.** Clip 11 had to replace it with **poll-based seeking**. So the seek method that removed the stale-frame problem at 1440p only works with the pane shown — check `tabs_context` before relying on it.
- **BOTH CUT DETECTORS ARE BLIND when every shot would share the same rider, board, beach and light.** Luminance signatures and colour finders both failed on clip 11. **Only a whole-frame sheet at ≤0.1 s steps settles whether a clip is one ride** — and clip 11 called itself a montage **twice** from 0.3–0.5 s thumbnails before four independent checks proved it was one continuous 11.78 s ride. **Do not pronounce on cuts from a coarse sheet.**
- **Do not rebuild an automated trunk tracer.** Clip 11 built one at 60 Hz, **validated it against hand measurement, found it read 9° where the hand read 39–43°, and discarded it.** Nothing from it is quoted. Hand-measure the trunk and state the ±.
- **Canvas→screenshot scale is 0.784 at a 1280×1000 viewport**, not 0.625, and the whole 1020×760 canvas is visible there.
- **☠️ AN AUTO-CROP THAT FOLLOWS THE RIDER NORMALISES HIS APPARENT SIZE, AND IT WILL LIE TO YOU ABOUT HEIGHT.** **The structural fix, from video 10: use FIXED-SIZE source crops centred on the finder** — then the size trap cannot happen at all. Absolute landmarks still only come off single gridded frames. Video 9's crop varied the rider's apparent scale by **±15 % between tiles** and **produced a false "big extension" reading** before it was caught. **Never judge height or depth from a strip of auto-cropped tiles.** Crop to find the rider; measure on a fixed frame.
- **Go beyond 1080p with the player's own API, but not to the top.** `setPlaybackQualityRange` reaches **1440p and 2160p** on long-form video, where "enlarge the viewport and reload" stops at 1080p. **2160p is the wrong choice — the pane dropped to ~1 fps and produced real stale frames. 1440p was reliable.** Note that a long-form watch page may have **no consent gate** at all, unlike a Short.
- **The pane returns an 800×600 screenshot whatever the viewport is**, so a **1020×760** overlay canvas is the largest that fits inside it. **Tiles that look "undrawn" may simply be outside the screenshot — and that looks identical to the composited-canvas failure above.** Check which one you have before blaming the page.

### ⭐ MEASURE LEG DEPTH BY THE LEG CHAIN, NOT BY A WAISTBAND SCALE

**Video 8 abandoned the shoulder-to-waistband scale above and was right to.** A full black wetsuit has no waistband, and on the same frame the trunk scale **over-read the leg by about 50 %.**

**Use `|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)`.** It needs no stature estimate, it **maps straight onto the game's own leg spring**, and it degrades honestly: **it is an upper bound**, because a knee you cannot see reads as 100 %. Say so when you quote it.

**And measure the two legs separately.** Video 8 found them at **97 % / 86 %** in one frame and **88 % / 76 %** in another. **The game has one leg spring; a rider has two legs at different extensions.**

#### ⚠️ BUT THE LEG CHAIN IS SATURATED IN BROADSIDE FOOTAGE — know this before you quote it

**Video 9 found the mechanism, and it is geometric, not a resolution problem.** A surfer's knee bends **along the board**; the board lies **across the image**; so the bend projects onto the hip–ankle line and **largely disappears.** Video 9's leg chain read **96–100 % on every frame, including a rider folded over his own board**, while a vertical ruler (hip ÷ head-length) read **~30–66 %** on the same frames. **The two rulers disagree by about 30 points, and that round refused to reconcile them or name a rung for any frame. That was the right call.**

> **So "every rider stays in the Tall band" is UNTESTED wherever it rests on a leg chain in broadside footage — which is clips 7, 8 and 9.**

**This is not a reason to go back to the waistband scale** (it fails on wetsuits and over-read the leg by 50 %). It is a reason to:
**⚠️ AND VIDEO 10 BOUNDS THE REPLACEMENT RULER TOO — it is safe for a LEVEL lens and UNSAFE for a RAISED one.** On its drone footage, apparent stature read **4.96 head-lengths at a 45° fold and 4.96 nearly upright, 0.4 s apart** — identical across a posture change anyone can see — **because a raised camera turns a forward fold into a sideways translation rather than a vertical shrink.** That round named **no rung for any frame** and said nothing in its document may be quoted as a depth. **So: check the lens height before trusting head-lengths at all.**

**A drone does not fix the saturation problem; it SWAPS it.** Video 10 was shot down the line from above and its leg chain was readable on **only 2 of 7 frames attempted** — and both were frames where the rider was visibly extended, because **boardshorts cover the knee exactly when the thigh goes horizontal, and spray covers the ankle.** It neither confirmed nor refuted the saturation claim.

> **THE FOOTAGE ASK, CORRECTED TWICE. It now reads: water-level, side-on, a rider whose knees are not inside his boardshorts, AND THE RIDER AT ≥900 SOURCE PIXELS.**

**Video 11 added the last clause the hard way.** It delivered two thirds of the ask — **bare legs, knees never covered, near side-on** — and the leg chain **still refused on all 8 frames it attempted, at five magnifications from 1.9× to 3.0×, with a silhouette outline.** The cause was new again: **at 1080p the rider was 440–520 px, his thigh ~110 px, and the two legs overlapped in projection.**

> **Three refusals now, three distinct causes: projection saturation (clips 7–9), a raised lens plus boardshorts (clip 10), and resolution plus limb overlap (clip 11). Assume the leg chain will fail and plan a second ruler.**

**And ⚠️ THE BACKUP RULER IS NOW UNSAFE ON ANY RAISED LENS, NOT JUST A DRONE.** Clip 11's apparent stature read **7.6 head-lengths at t = 0.500 and 7.5 at t = 7.000** — two postures anyone can see differ — on a **long lens panning from above the rider's head**, not a drone. **Second camera, same failure.** **Check the horizon's row against the rider's rows: if the lens sits above him, head-lengths are not a depth.**

- **quote the leg chain as saturated, not merely as an upper bound**;
- **report a second, independent ruler** — **apparent stature in head-lengths** needs no hip landmark at all and is the most robust thing available (video 9: **4.86–6.24 head-lengths = 63–81 % of standing**, moving 17 points in 0.27 s);
- **say when the two rulers disagree, and name no rung rather than picking one**;
- and **ask the owner for footage shot from the water or down the line** rather than from the beach, because the projection is what hides the knee.

### What the error bar actually is

A 854×480 source puts the rider at 40–90 px, which is **±15° on any joint angle at best**. **But above roughly 200 px the resolution stops being the binding constraint and the HIP LANDMARK becomes it:** a boardshorts waistband sits at about **0.60 of stature** where the trochanter is at **0.53**, so **every hip figure carries ±10–15 points however sharp the image.** Read depth from a **shoulder-to-waistband** scale (robust to head tilt) and cross-check against a head-to-hip scale; **where the two disagree, report the disagreement instead of picking a winner.**

**A camera behind and above the rider foreshortens a folded trunk and over-reads depth by up to 10 points.** If that bias decides whether a low reaches a rung, **say the number is undecidable rather than naming the rung.**

**And if the image will not support a measurement, do not report one.** Video 6 deliberately reported **no knee angles at all** rather than guess them, which is the right call and costs nothing.

## What to report

### Part A — what the body does

- **Stance through the ride.** Knee angle and hip height as a fraction of standing height, and **when** each occurs. Note that a tube and an open-face turn are different stances in the same clip.

  ### ⭐ REPORT LEG DEPTH AND TRUNK FOLD SEPARATELY. They are different channels and conflating them has already corrupted this series.

  **Video 7, read at 1080p with the rider 620 px, found that three of its four "crouches" measured 75–85 % — the low edge of Tall — because the depth was in the TRUNK, not the legs.** Clip 6 brushed the same thing at 65–75 %. **So some middle-band numbers in the six earlier reads may be a folded trunk over long legs, read as a crouch — measuring the wrong joint.**

  **There are at least THREE independent body channels in the footage, and the game has ONE (leg depth):**

  1. **leg depth** — the hips' height, which is what the game's stance ladder sets
  2. **trunk fold** — the trunk's angle from vertical, which moves on its own clock
  3. **arm carriage** — height and spread, **also independent**: video 7 found four carriages inside the Tall band, with the **narrowest, lowest arms at its single deepest leg position**. *Both* "tall ⇒ arms spread" and "deep ⇒ arms spread" are refuted.

  Plus a fourth the game does not model at all: **the fore-aft hip axis.** Video 7 had **0 steps in 13 s and the rear foot never off the pad**, while the hips travelled aft toward the rear foot and the shoulders went forward over the front — **so fore-aft is worked by the hips, not by footwork.**

  **Give each channel its own number at each moment.** A single "how low is he" figure throws away two thirds of what the clip is telling us, and it is why every stance in the game reads as a pose.

  **Say which standing height you divided by, every time: it means STRAIGHT-LEGGED standing hip height, and nothing else.** Riders are never straight-legged on a board, so your 100 % is a pose you will not see in the clip — that is correct and expected, and a reader who assumes otherwise is off by up to 20 points, which is more than the gap between two of the game's own stances.

  **And never compare your fraction to one of the game's metres without converting.** This has already happened three times: `video-ref-2.md`, `video-ref-3.md` and `kirra-reference-50-196s.md` all set a hip fraction against `STANCE_TABLE`'s 0.65 m and 0.55 m, which are **whole-body centre-of-mass heights above the feet**, not hips — the CoM sits 6–7 cm above the pelvis in every stance, a quarter of Compress's whole travel. The hip numbers and the conversion are in `docs/research/new-rider/3.5/stance-frame.md`; **read it before you put a game number next to a video number.**
- **Each turn, in four beats**: entry, load, peak, exit. Where the weight goes, what the shoulders and hips do relative to the board, whether the upper body leads or follows.
- **The arms.** Height, spread, and whether they track the trunk or move independently.
- **Timing**, read off the player's own clock. **Find the slow-motion factor or say you could not** — "a turn takes 3–4 video seconds" is not comparable to a real bottom turn's 0.96 s, and conflating them has already happened here.
- **Anything repeated.** A thing done five times is worth more than one spectacular moment. Say how many times.

### Part B — the mapping

This is the point. For every movement observed, say **which of the game's own things it is, or that the game has no name for it.**

Read the code and `docs/research/new-rider/` for what actually exists before mapping onto it. Do not assume a name exists because it is a surfing word.

- **Stances**: Tall/standing, Crouch, Compress, Snap.
- **Moves**: trim, drop-in, bottom turn, carve, cutback, snap, pump, tube ride.

A table with three columns: *what the rider does* → *which game stance or move* → *have it / partly / not at all*.

**For depth, the mapping is now arithmetic rather than judgement — use this ladder.** It was measured in `docs/research/new-rider/3.5/stance-frame.md`; the denominator is the game's own **straight-legged** standing hip height, **0.88 m**, which is the frame that makes the game's resting stance land inside the footage's own resting band.

| hips, as % of straight-legged standing | the game's stance | leg depth |
|---|---|---|
| **75–95 %** | **Tall** (reads 89 %) | 0 |
| 66 % | **Crouch as it ships — and NO clip has ever shown a rider here.** Say so if your rider is in this gap. | 0.195 m |
| **55–65 %** | **Compress** (reads 55 %) — the footage's *sustained, holdable* crouch | 0.30 m |
| **35–50 %** | **the tube tuck**, shipped as `?snapDepth=deep` — the footage's *0.25–0.7 s spikes* | 0.45 m |

So: give the hip percentage, then name the rung. **The band a rider sits in matters more than the exact number** — the conversion is good to about ±0.1 m on a ladder whose entire travel is 0.45 m, so **never report a stance match to the centimetre.**

Two things worth checking in any new clip, because the evidence so far is thin on both: whether a rider **holds** a depth below ~65 % for more than a second (across four clips and five-plus riders, **none has**), and whether the deep spike arrives **at turn entry** (it has, in every readable turn so far).

**The rows that say "not at all" are the valuable ones.** They are the gaps, and they are why this skill exists. The Kirra clip produced two: a **tall → low → tall cycle** inside a turn, and the hips moving **fore-aft over the tail** — an axis the game does not model at all.

### Part C — what you could not see

Not an afterthought. Camera angle, motion blur, occlusion, a montage of several rides, a turn that happened between two sampled frames. **"The camera is behind him so I cannot judge his knee angle" is a useful sentence; a guess dressed as an observation is not.**

Say the source resolution and roughly how tall the rider is in pixels, so a later reader knows what the numbers are worth.

## The discipline that makes it usable

Every figure from pixels is an estimate — **say so on every one**, not once at the top. This project has had twenty-eight real numbers turn out to be in the wrong frame; a reference document that does not mark its own uncertainty becomes a source of more.

**Check new readings against the ones already on file, and lead with disagreement.** Prior readings live in `docs/research/new-rider/3.4/kirra-reference.md` and `docs/research/tube-spray-reference-2026-11-14/`. Agreement is mildly reassuring; **disagreement is information**, and it may mean one clip is unusual, or that a conclusion drawn from the other was about that clip rather than about surfing.

**Ignore what the owner said to ignore.** They have twice said the wave, the barrel and the spray are not what they are asking about. Describing them anyway buries the part they wanted.

## Output

A document at `docs/research/new-rider/<area>/<name>.md`, on its own branch, as a PR. **No `src/` change** — this is evidence, not a fix. Run `git diff --stat origin/main HEAD` before pushing and check the deletions column reads 0.
