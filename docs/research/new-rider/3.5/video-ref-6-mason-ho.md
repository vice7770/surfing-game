# Video reference 6 ("Mason Ho's pre-surf routine.."): the part after 11 s, on the measured depth ladder

Source: https://www.youtube.com/shorts/sjYBGrL1Q_U, title *"Mason Ho's pre-surf routine.."* (uploader **@ripcurl**), **25.98 s**.
Read 2026-11-17 by screenshotting the browser pane (`which yt-dlp ffmpeg ffprobe youtube-dl`: **none of the four exists**;
checked, as the skill asks). The **sixth** reference the owner has sent. Their standing instruction is the rider's
**movement, not the wave**, so the wave, the foam and the spray are not described except where they hide the rider.
The rider's name comes from the title only; I did not verify it.

**Scope, as the owner set it mid-read: only the footage after 11.0 s counts.** Everything before that is a beach
sequence (arm swings, stretching, walking to the water) and I report nothing from it, with the single exception the
brief allows — **where the cut is** (§0.1). Frames I had already taken before the scope narrowed were discarded, not
reported.

---

## 0. The answer first

**0.1 — There is a hard cut just before the window, so the post-11 s footage is its own shot.** At **10.2 s** the
rider is still on the sand holding the board; at **10.7 s** we are in the water on a long lens, with **at least four
people** in frame (a surfer in a blue helmet, one in a white long-sleeve, one more, and our rider on the yellow
board). **So the cut sits between 10.2 and 10.7 s**, and everything the owner asked for begins with the paddle-in.
Good news for the read: what follows is one shot, one rider, one board.

**0.2 — This is a ONE-TURN read, and the turn is a bottom turn off a take-off.** I say that plainly rather than
padding it. Within 11.0–25.98 s the rider is **visible and readable for about 2.9 s in total**:

| window | what it is | readable? |
|---|---|---|
| 11.0–11.10 | paddling, prone | yes |
| 11.10–11.32 | **pop-up** | yes |
| 11.32–11.95 | **the drop** down the face, body folded | yes |
| 11.95–12.35 | **the bottom turn** — the clip's only direction change | yes |
| 12.35–12.85 | trim across the face, tall, arms spread | yes |
| 12.85–12.95 | braced forward as the foam lands on him | yes |
| **12.95–16.30** | **rider not visible at all** — whitewater, 3.35 s | **no** |
| 16.30–16.60 | torso emerging from the foam, board under him | partly |
| 16.60–17.55 | riding the clean shoulder: climb, then trim | yes |
| 17.6–17.9 | lost in spray; a low/prone shape on the board | no |
| 18.0–25.98 | open water. **No readable rider for the last 8 s** (a small figure at ~20.0 and a dot at ~24.0) | no |

**0.3 — The main product: every low after 11 s.** There are three, and **none of them is a Compress-depth low and
none is held.**

| # | window (video clock) | duration | hips, % of straight-legged standing (est.) | rung | where it starts | released before the move ends? | which manoeuvre |
|---|---|---|---|---|---|---|---|
| **L1** | **11.32 → 11.95** | **≈ 0.63 s** | **65–75 %** read; **55–75 %** once the camera bias is allowed for (§3.3). Deepest 11.6–11.9 | **Crouch gap (66 %)**, bottom edge possibly touching **Compress** | **Before the turn.** It is the end of the pop-up and the body position through the drop | **Yes — and released *into* the turn, not out of it.** He is already extending when the board starts to turn | **take-off + drop** (not a turn) |
| **L2** | **12.85 → 12.95** | **≈ 0.10–0.15 s**, end not seen | **65–75 %** | **Crouch gap** | not in a turn at all — the board is running straight when the foam reaches him | **not seen** (he is engulfed at 12.95) | **a brace / absorption**, no game name |
| **L3** | **17.40 → 17.55** | **≈ 0.15 s**, end not seen | **75–80 %** | **Tall, low edge** | mid-trim, with **no direction change at all** | **not seen** (spray) | **trim** — a weight settle, not a turn |

**Counts for the window: lows below 65 % — 0 sustained. Lows below 55 % — 0. Lows below 50 % — 0. Held lows
(> 1 s below 65 %) — 0. Fast dips (0.25–0.7 s below 55 %) — 0.** The clip's single deepest moment is the drop, and
it is shallower than every deep spike in clips 1–4 and every held low in clip 5.

**0.4 — So on the round's live question, this clip is a ZERO, not a vote.** It contains neither a held low nor a dip,
so **it cannot separate them**, and I will not pretend otherwise. What it *does* contribute is a **negative control**,
and that turns out to be worth something: see §4.

**0.5 — Slow-motion factor: the footage is NOT slowed, and I can bound it.** `playbackRate` is 1; the title and page
say nothing. The physical check is the **pop-up**: prone at 11.117, chest up at 11.183, **on his feet at 11.317** —
**0.20 s** from the push to standing, **0.27 s** from the last prone frame. Published pop-ups run **0.4–0.7 s** even
for strong surfers. **A 2× slowdown would require a real pop-up of ≤ 0.13 s, which is not plausible**, so **≥ 2× is
ruled out**. The bottom turn reads **0.35–0.40 s** against the two measured real-world populations' **0.96 ± 0.04 s**
and **0.8 ± 0.03 s** — again, far too *short* to be slowed footage. **Best reading: real time, possibly very slightly
sped up.** This is the first clip in the series with a positive, physical slow-motion bound rather than a belief.
(A frame-cadence test — hashing decoded pixels at 1/60 and 1/240 s steps to find the encoded frame rate — was run and
**failed its own control**: the same timestamp sampled three times gave two different hashes, so the seek/decode is
not deterministic at that granularity and the cadence result must be thrown away. It is not evidence either way.)

**0.6 — The arm question: this clip shows THREE arm patterns in 2.9 s, and the thing that switches them is the
manoeuvre, not the leg depth.** The rider is in the Tall band both at 12.35–12.85 and at 16.75–17.55, and his arms
are completely different in the two. Details and counts in §2.3.

---

## 1. Method and limits (read before any number)

- **Resolution — and a correction to how this series has been read.** The stream served **360×640** while the browser
  pane was small, and **720×1280** once the pane was enlarged. **Every measurement in this document comes from the
  720×1280 stream**; the low-resolution survey frames were used only to find the rider and were not measured.
  **The rider is 200–300 source pixels tall** in the readable window (≈ 250 px at 12.50 and at 17.25; ≈ 200 px folded
  at 11.50). That is **2–4× the 55–120 px of clips 1–5**, so this is the sharpest footage the series has had.
- **But the resolution is no longer the binding error.** The limit is now the **hip landmark**: on a bare-chested
  surfer the only visible marker is the **waistband of the boardshorts**, which sits at the natural waist
  (≈ 0.60 of stature), while the hip joint the ladder means is the greater trochanter (≈ 0.53). I correct by
  +0.07 × stature, and that correction, plus trunk pitch, is worth **±10–15 points**. **So every hip percentage here
  is ±10–15 points. I say it once and it applies to all of them.** The band matters, not the number; I match nothing
  to the centimetre.
- **Denominator, stated as the skill demands.** Hip height as a fraction of **straight-legged standing hip height**
  (≈ 0.53 × stature) — **the same frame the five earlier documents used**, so these numbers are comparable with
  theirs, and the same frame `3.5/stance-frame.md` recommends (the game's own straight leg, 0.88 m). **I never set a
  video fraction beside one of the game's metres**: where I name a game stance I name the *rung*, not a metre.
- **How I got the fraction.** Per frame: scale from **shoulder → waistband** (≈ 0.218 of stature, and robust to head
  tilt, which the head-top landmark is not), then hip joint = waistband + 0.07 × stature, then
  *hip% = (sole − hip) ÷ (0.53 × stature)*. Cross-checked against the head-to-hip ratio the earlier documents used.
  The two methods disagreed by up to 20 points on folded-trunk frames, which is why §3.3 exists.
- **Sampling.** Roughly **70 stills** via `video.currentTime`, each seek confirmed by printing the reached time into
  the image. Steps: **1/16 s (0.0625)** through the pop-up, **0.125 s** through 11.25–13.0 and 16.4–18.0,
  0.25–1.5 s for the survey across 11–26 s. Magnified crops at 1.25–2.2× centred on the rider, each carrying a
  **20-source-pixel grid** so joint heights were read off a ruler rather than guessed.
- **Camera.** A **long lens from the beach**, hand-held, tracking. At 11.0–12.3 it is **behind and above** the rider
  (worst angle for hip height, thighs foreshortened); at 12.3–12.9 **behind and level**; at 16.6–17.6 it is close to
  **side-on** (the best angle in any clip in this series, and the source of the most trustworthy numbers here).
- **One ride or a montage?** After the cut at ~10.4, I found **no further cut**. Same rider, same yellow board, same
  light, same water. **But he is invisible for 3.35 s (12.95–16.30)**, which is long enough to hide a splice, so I
  report 11.0–12.95 and 16.30–17.9 as **two readable segments of what is probably one ride**, and draw no conclusion
  that depends on them being continuous.
- **A tooling note worth keeping.** The browser pane repeatedly fell to `document.hidden === true` mid-read, which
  **freezes painting**, so screenshots silently returned the *previous* frame. Two defences worked: print the reached
  timestamp and a frame counter **into the canvas**, so a stale capture is self-evident; and take **two screenshots**
  per draw, reading the second. Closing the artifact pane restored painting once. A route that would have bypassed
  the problem entirely — POSTing canvas PNGs to a local HTTP sink — is **blocked**: the pane refuses localhost with
  `ERR_BLOCKED_BY_CLIENT`.

---

## 2. Part A — what the body does

### 2.1 Stance through the window

Video clock; all figures estimates at ±10–15 points; denominator = straight-legged standing hip height.

| time | what I see | hips (est.) | rung |
|---|---|---|---|
| 11.05–11.12 | **Prone**, paddling, one arm through a stroke, head up | — | — |
| 11.18 | Chest up, hands under the chest on the rails, legs still extended behind | — | — |
| 11.25 | Mid pop-up: hips lifting, feet coming under, **both hands still on the deck** | — | — |
| **11.32** | **First frame on his feet.** Crouched, trunk folded well forward, hands still low near the deck | ~70 % | Tall (low edge) / Crouch gap |
| 11.38–11.45 | Folded over the board, **lead hand reaching down past the rail**, knees bent, board on the face | ~70 % | Crouch gap |
| **11.50** | Trunk near horizontal over the board, head forward, hips the highest point of him; knees bent, shins vertical | **~74 %** read | Crouch gap |
| **11.63–11.88** | **Deepest of the clip.** Still folded; hips down relative to the shoulders; lead arm down and forward, rear arm low and back | **~68 %** read (55–75 % corrected) | **Crouch gap, bottom edge possibly Compress** |
| 12.00 | **Opening.** Legs extending, trunk lifting, **one arm swinging up** toward head height, the other low at the board | ~75–80 % | Tall (low edge) |
| 12.13 | Extended further, arm clearly **above shoulder height**, board flattening at the bottom | ~80–85 % | Tall |
| **12.25** | **Through the bottom turn.** Legs near extended, **both arms spread wide**, board on its new line | ~85 % | **Tall** |
| **12.50** | **Trimming left, back to camera, arms spread wide and roughly level**, legs close to straight | **87 %** (cleanest measurement in the clip) | **Tall** |
| 12.63–12.75 | Same, arms still spread, slight knee bend | ~85 % | Tall |
| **12.88** | **Braced:** trunk folds sharply forward, both arms forward and down, as the foam lands on him | ~65–75 % | Crouch gap |
| 12.95–16.30 | **not visible** | — | — |
| 16.30–16.55 | Torso rising out of the foam, board beneath him | not readable | — |
| 16.75 | Standing, trunk pitched forward ~25°, **both arms hanging low**, lower legs in spray | ~95–105 % read (feet obscured — low confidence) | Tall |
| 16.88–17.00 | Standing, trunk pitched, legs close to straight | ~95–100 % read | **Tall** |
| **17.13** | Standing, trunk pitched ~35°, **lead hand down in front near the knee**, rear arm low behind | **~80–88 %** | **Tall** |
| **17.25** | Side-on and clean: legs only lightly bent, trunk pitched ~30° | **~79 %** (second cleanest measurement) | **Tall (low edge)** |
| **17.38–17.50** | Knees bend a little more, hips settle; trunk upright-ish | **~75–80 %** | **Tall (low edge)** |
| 17.63–17.9 | Lost in spray, then a low/prone shape on the board | not readable | — |

**Where he spends the window.** Of roughly 23 readable sampled frames: **~15 read Tall (75 % and above)**,
**~8 read in the 65–80 % Crouch gap**, and **none reads below ~65 %**. There is **no frame in the Compress band
(55–65 %) as a state**, and **no frame anywhere near the tuck band (35–50 %)**.

**On the Crouch rung specifically — this is the closest any clip has come to a counterpart.** Five clips of five
showed no rider sustaining ~66 %. Here the rider sits in the **65–75 %** zone for about **0.6 s** (L1), which brackets
the shipped Crouch depth. **But I would not call it a confirmation**, for two reasons: it is the **take-off drop, not
a riding stance**, and my error bar (±10–15 points) is wider than the rung itself. The honest statement is:
**the shipped Crouch depth finally has something near it in the footage, and that something is a drop, not a turn.**

### 2.2 The one turn, in four beats

**The bottom turn, ~11.95 → ~12.35, about 0.40 s of video clock.**

- **Entry (11.95–12.05).** He is **already at his lowest and already extending**. The board is still pointing down
  the face. Trunk folded; one arm starts to swing up.
- **Load (12.05–12.20).** Legs extending *through* the load, not collapsing into it. The board flattens at the base
  and begins to come round to the left. Hips rise about 10–15 points of stance in ~0.15 s.
- **Peak (12.20–12.30).** Board on its new line; **arms spread wide**; legs near full extension; trunk upright-ish.
- **Exit (12.30–12.35).** Straight into trim, arms still spread. No second compression.

**The upper body does not lead this turn.** Through 12.0–12.3 the shoulders and hips come round together within what
I can resolve (±15°). I could not see a shoulders-ahead-of-hips lead anywhere after 11 s, which is a quiet
disagreement with Nias and video 5 — though a behind-and-above camera is a poor place to look for it, so this is a
weak "did not see", not a "was not there".

**Repeated, counted (whole window).** Direction changes: **1**. Tall frames with arms spread: **5** (12.25–12.75).
Tall frames with arms hanging low: **7** (16.75–17.55). Pumping: **0** — no rhythmic rise and fall anywhere.
Hand on the rail or deck: **3** (11.25, 11.38, 11.45 — all during the pop-up). Any limb above head height: **2**
(12.00, 12.13). Tube ride, snap, cutback, floater, air: **0 of each**.

### 2.3 The arms — three patterns, switched by the manoeuvre

1. **Pop-up (11.25–11.45):** **both hands on the board**, on the deck and the rail. Ends the moment he is upright.
2. **Drop and into the turn (11.63–12.13):** **asymmetric.** One arm is **down and forward, past the rail**; the other
   comes **up, reaching head height or above** at 12.00 and 12.13. **I read the raised arm as the REAR arm and the
   low one as the LEAD**, from the board's nose direction and a regular stance on a left — **but the camera is behind
   and above and I cannot be certain which arm is which.** Said with that caveat, the pairing is
   **lead hand low + rear arm up and back** — i.e. **exactly video 5's pairing**, and the mirror of nothing else.
3. **Tall trim after the turn (12.25–12.75):** **both arms spread wide and roughly level** at shoulder-to-chest
   height. Classic Kirra/Pupo.
4. **Tall trim in segment 2 (16.75–17.55, 7 frames):** **both arms hang LOW, below the waist** — lead arm in front
   near the front thigh or knee, rear arm behind and low. **No arm above the shoulder in any of the seven frames.**

**The finding that matters is 3 versus 4.** The rider is in the **Tall band in both**, by the same measurement, and
the arms are completely different. **So arm height is not a function of leg depth.** In this clip it tracks what he
is *doing*: spread and level while he is working a turn out of the bottom, hanging low while he is coasting a
shoulder. **"Arms are spread and level only when TALL" survives as a one-way implication at most — tall does not
imply spread.**

---

## 3. Against the five existing reads — leading with disagreement

**3.1 — DISAGREES with all five on where the low sits in a turn. This is the headline disagreement.**
Every readable turn in clips 1–5 had the low at **turn entry**, with tall before it: Nias 2 of 2, Pupo, Kirra's
remainder 3 of 3, video 5 3 of 3. **Here the low comes BEFORE the turn and is spent BY it.** The rider is at his
lowest at the end of the drop (11.63–11.88), is **already extending when the board starts to come round**, and is at
his **tallest at the peak of the turn** (12.25–12.50). **Tall → low → tall timed to the turn is not what happens;
what happens is low → tall, with the turn in the "tall" half.**
Two honest qualifications. **(a)** This is **one turn**, and it is a **bottom turn out of a take-off** — the low it
inherits is the pop-up's, so the sequence may say more about take-offs than about turns. **(b)** It is nevertheless a
real counter-example to "the low arrives at turn entry, in every readable turn", which was 8-for-8 before today and
is now **8 of 9**. It also happens to be the pattern the skiing and skateboarding literature predicts
(`stance-frame.md` §6(d): flex between turns, extend through the arc) — the one borrowed source whose sign had
**disagreed** with all the surf footage. **In this clip the borrowed sign is the one that matches.**

**3.2 — DISAGREES with video 5 on holding, and with clips 1–4 on dipping, by containing neither.**
Video 5 reported three holds of 1.75 / 2 / ≥ 2.9 s at 45–60 %. Clips 1–4 reported 0.25–0.7 s spikes at 35–50 %.
**This window has no low below ~65 % at all, for any duration.** That is not a rebuttal of either — it is a
**different kind of surfing**: a late drop, one bottom turn and a trim on a shoulder, with nothing in it that loads
the legs hard. **It does, however, refute any claim that a rider is low *as a matter of style or of this sport*.**
When there is no load, this rider stands up.

**3.3 — A caution about my own deepest number, stated because it is the one a later reader would misuse.**
L1 reads **68–74 %** by the shoulder-to-waistband method. The earlier documents' head-to-hip method gives the same
frames **~74 %** and **~68 %**. **But at 11.5–11.9 the trunk is folded nearly horizontal and pointing away from a
camera that is behind and above**, which foreshortens the trunk and therefore **over-reads the hip fraction, by up to
about 10 points.** So **L1's true band is 55–75 %**, and whether the clip's deepest moment touches Compress is
**genuinely undecidable from this footage.** It is the least certain number in this document and should not be
quoted without this sentence.

**3.4 — AGREES with video 5 on the arm pairing at the load, and adds a third pattern neither it nor Kirra has.**
The **lead hand low + rear arm up and back** pairing appears here at 12.00 and 12.13 (2 frames, with the
which-arm-is-which caveat of §2.3). That is video 5's finding reproduced on a **different rider** — the first time
the series has had that. **But §2.3's pattern 4** — both arms hanging low below the waist while **tall** — is in no
earlier document, and it is what breaks the "tall ⇒ spread" half of the synthesis.

**3.5 — AGREES with every clip that the rider's resting stance is below a straight-legged stand**, and sits where
they did: **75–95 %**, with the game's Tall (89 %) inside it. One more confirmation of
`stance-frame.md` §3.1's choice of denominator.

**3.6 — Cannot confirm or contradict: hips fore-aft over the tail** (Kirra gap 2). The behind-and-above view at
11–12.3 and the side-on view at 16.6–17.6 are both poor for it, and at 17.25 his weight looks evenly carried.
**No claim.**

**3.7 — I did not inherit any metre figure.** The centre-of-mass-for-hips error in `video-ref-2.md`,
`video-ref-3.md` and `kirra-reference-50-196s.md` is avoided here by construction: this document names rungs, never
metres.

---

## 4. What this clip says about the round's live question

**The question was: what distinguishes a held low from a dip?** This clip has neither, so it cannot separate them,
and **"I cannot separate these from one clip" is the true answer for this clip.** But a zero is informative if you
say what it is a zero *of*, so:

**Of the five candidates the brief listed, this clip can weigh exactly one — the manoeuvre — and it weighs it
hard.**

- **The manoeuvre: SUPPORTED as the controlling variable.** Across six clips the depth now tracks **how hard the
  manoeuvre loads the legs**, and nothing else as cleanly. Deep spikes came with snaps, lip hits and tube stances
  (clips 1–4); held lows came with long, drawn-out carves (clip 5); **and here, where the manoeuvres are a drop, one
  unhurried bottom turn and a coast along a shoulder, there is no low at all.** Same sport, same sea, a pro rider —
  and the legs stay long because nothing asks them to bend.
- **The rider: WEAKENED as an explanation.** This is a different rider again, and he produces neither pattern. If
  depth were a rider's signature, six riders would have given six signatures; instead the one clip with no loaded
  turn is the one clip with no low.
- **The wave's shape or speed: CANNOT TELL.** I was told not to read the wave and did not.
- **How far the rider travels through the turn: CANNOT TELL from one 0.4 s turn.**
- **Whether the board is on a rail the whole time: CANNOT TELL** — at this resolution I could not reliably see the
  rail engage and disengage.

**One structural observation this clip contributes that neither "held" nor "dip" covers.** L1 is a **third kind of
low**: not a turn-entry dip and not a sustained carve low, but a **landing-and-absorption crouch that the next
manoeuvre spends**. It arrives from the pop-up, it persists through the straight-line drop, and it is **converted
into the turn by extending**. If the game ever builds Ruling B's rungs, this is a fourth timing to keep in mind:
**a low that the turn consumes rather than a low that the turn causes.**

---

## 5. Part B — the mapping to the game's vocabulary

What the game has (`3.5/stance-frame.md` and the code it cites): **Tall** (hips 89 %, leg depth 0), **Crouch as
shipped** (66 %, 0.195 m), **Compress** (55 %, 0.30 m, held), **Snap** (0.30 m, or 0.45 m with `?snapDepth=deep`),
the **tube tuck** (0.45 m); a fore-aft trim input, a rotation stick, a hand drag. Moves: trim, drop-in, bottom turn,
carve, cutback, snap, pump, tube ride.

| # | what the rider does (clip time) | game stance or move | have it? |
|---|---|---|---|
| 1 | **Prone → standing in 0.20 s**, hands pushing off the deck, feet swinging under (11.12–11.32) | **drop-in / take-off** | **Partly.** A take-off exists; **this is 2–3× faster than anything the game does**, and the hands-on-deck push has no counterpart. |
| 2 | **Folded over the board through the whole straight-line drop**, hips 65–75 %, 0.63 s (11.32–11.95) | **Crouch** (66 %) | **Yes, for once — on depth.** First footage in six clips to sit at the shipped Crouch rung. **But it is a drop, not a riding stance**, and the game never puts the rider there for a drop. |
| 3 | **Extending THROUGH the bottom turn** — lowest at entry, tallest at the peak (11.95–12.35) | **bottom turn** | **Not at all** as a body. The game has the move; it has **no notion of spending a crouch to drive a turn**, and the one shipped timing (compress *into* the turn) is the opposite of this. **This is the most valuable row in the table.** |
| 4 | **Tall with arms spread wide and level** through trim after a turn (12.25–12.75, 5 frames) | Tall / trim + arm rig | **Partly.** Tall exists and reads 89 %, inside this; the spread-arm pose exists as a fixed pose, **not as something tied to the phase of a turn**. |
| 5 | **Tall with both arms hanging LOW below the waist** through trim on a shoulder (16.75–17.55, 7 frames) | — | **Not at all.** The game has no second arm carriage for the same stance. **This row is what breaks "tall ⇒ arms spread".** |
| 6 | **Lead hand low + rear arm up above shoulder height** during the drop into the turn (12.00, 12.13) | hand drag | **Partly.** A hand drag exists; **a stance-tied asymmetric arm pose does not.** (Same gap video 5 named; now seen on a second rider.) |
| 7 | **Brace**: trunk folds forward, both arms down and forward, as foam lands (12.88) | — | **Not at all.** There is no absorb-an-impact posture; the game's rider meets foam with whatever stance it already holds. |
| 8 | **A 3.35 s passage with the rider inside the whitewater and then riding out of it** (12.95–16.30) | — | **Not at all** as a body: no in-foam posture, no recovery-from-foam. (Not readable here either; listed because the gap is real.) |
| 9 | Hands on the deck and rail during the pop-up (11.25–11.45) | hand drag | **Partly.** The input exists, pointed at the water, not the board. |
| 10 | A long trim across a shoulder, legs lightly bent, ~1 s (16.75–17.55) | **trim** | **Yes.** The one row where the game and the footage simply agree. |
| 11 | Pump, cutback, snap, tube ride, floater, air | — | **Not in this window.** 0 of each. Nothing to map. |
| 12 | Compress-depth or tuck-depth lows | Compress, `?snapDepth=deep` | **Not in this window.** No frame below ~65 %. |

**The "not at all" rows are 3, 5, 7 and 8.** Row 3 — **a turn driven by extending out of an inherited crouch** — is
new to this series and is the opposite of the timing every earlier clip implied. Row 5 is the arm finding. Rows 7 and
8 are both about meeting whitewater, which the game has no body for at all.

**Two standing checks, answered.**
- *A `tall → low-at-entry → held → tall` sequence timed to the turn:* **NOT PRESENT.** The sequence here is
  **low → tall, with the turn in the tall half** (§3.1).
- *The lead-hand-down + other-arm pairing at a low's peak:* **PRESENT, 2 frames, with a which-arm caveat** (§2.3),
  reproducing video 5 on a different rider.

---

## 6. Part C — what I could not see, and why

- **Anything at all for 3.35 s (12.95–16.30)** and for the **last 8 s (18.0–25.98)**. Together that is **more than
  half the owner's window**. The whitewater hides him completely in the first; the camera simply holds on empty
  water in the second.
- **Whether 11.0–12.95 and 16.30–17.9 are one ride.** No cut is visible, but a 3.35 s blackout is long enough to
  hide one. All conclusions are stated per segment.
- **The exits of L2 and L3.** Both end in spray or foam; I never see him come up out of either.
- **Which arm is the lead arm at 12.00 and 12.13.** The camera is behind and above; I read it from the board's nose
  direction, which is an inference, not an observation.
- **Knee angles anywhere.** At 11–12.3 the camera is above and behind and the thighs are foreshortened; at 16.6–17.6
  the knee is a smooth contour under boardshorts and the ankle is often in spray. **I report no knee angle in this
  document** — deliberately, because a fabricated one would be the twenty-ninth number in the wrong frame.
- **L1's true depth to better than 55–75 %** (§3.3).
- **Whether the board is on a rail**, and the rail's angle, at any moment.
- **Fore-aft hip position** over the board (Kirra gap 2).
- **Foot placement** and whether the rear foot is on the tail pad. At 17.125 the rear foot appears to lift, but spray
  and an ankle strap make it unreadable.
- **Face and gaze.** The head is turned with the trunk wherever I can see it; the face is never resolvable.
- **The encoded frame rate.** The cadence test failed its own control (§0.5) and is reported as a failure, not a
  result.

---

## 7. What this round did not do

- **No `src/` file, and nothing under `server/`, was touched.** This is evidence, not a fix.
- **Nothing was ridden, built or measured in the game.** Every game figure here is quoted from
  `docs/research/new-rider/3.5/stance-frame.md`, by rung.
- **The five earlier reference documents were not edited**, as the brief required.
- **Nothing before 11.0 s is reported**, beyond locating the cut (§0.1), as the owner required.
