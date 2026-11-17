---
name: surf-video-read
description: Read a surfing video (YouTube, Shorts, any page that plays in a browser) frame by frame and map what the rider's BODY does onto Breakline's own stances and moves, producing a reference document in docs/research/new-rider/. Use this whenever the owner shares a surf clip, says a video shows the movement they want, asks what a surfer is doing in a video, or asks to compare real surfing against the game's rider — and also when any task needs real-surfing movement evidence and the only source is footage. Claude cannot watch video; this skill is how it gets pixels anyway.
---

# Reading a surf video

Surfing biomechanics barely exists as a published field. Twice now, a clip or photograph the owner chose has beaten the literature outright and corrected numbers this project had already published. **A reference the owner picked is evidence, and it is often the best evidence available.** This skill exists because that evidence is locked inside video, which Claude cannot watch.

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

A real constraint worth planning around: a 854×480 source puts the rider at 40–90 px tall, which is **±15° on any joint angle at best**.

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
