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

### What the error bar actually is

A 854×480 source puts the rider at 40–90 px, which is **±15° on any joint angle at best**. **But above roughly 200 px the resolution stops being the binding constraint and the HIP LANDMARK becomes it:** a boardshorts waistband sits at about **0.60 of stature** where the trochanter is at **0.53**, so **every hip figure carries ±10–15 points however sharp the image.** Read depth from a **shoulder-to-waistband** scale (robust to head tilt) and cross-check against a head-to-hip scale; **where the two disagree, report the disagreement instead of picking a winner.**

**A camera behind and above the rider foreshortens a folded trunk and over-reads depth by up to 10 points.** If that bias decides whether a low reaches a rung, **say the number is undecidable rather than naming the rung.**

**And if the image will not support a measurement, do not report one.** Video 6 deliberately reported **no knee angles at all** rather than guess them, which is the right call and costs nothing.

## What to report

### Part A — what the body does

- **Stance through the ride.** Knee angle and hip height as a fraction of standing height, and **when** each occurs. Note that a tube and an open-face turn are different stances in the same clip.

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
