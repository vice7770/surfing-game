# Paddling and Swimming Implementation Plan (the riding body, step 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The paddler and the swimmer move like real ones, measured against published studies. The drawing is fixed where it is wrong; where the physics is wrong, the gap is measured and put to the user.

**Architecture:** First measure, then fix only what the measure proves wrong. The body film already paddles for 20 s ("paddle then glide"). It gains a swimming film: off the board at 0.5 s, stroking from 1 s. The measures read the drawn body, as a player sees it.

**The references** (checked in the papers; step 2's approved set lists them):
- **Paddling cadence and board motion** (Nessler et al. 2019, *J Strength Cond Res*; 12 recreational surfers in a swim flume on a short board):
  - 35.9 ± 9.7 to 53.6 ± 5.1 strokes a minute per arm, from 0.6 to 2.0 m/s;
  - the board pitched 12.3 ± 2.3° on average, whatever the speed;
  - its roll through each stroke rises from 26.9 ± 7.9° to 44.9 ± 0.6° from 0.6 to 1.9 m/s; the roll grows as board volume falls.
- **The stroke's shape** (Nessler et al. 2015, *PLOS ONE*; a swim-bench ergometer paced at 25 strokes a minute): 970 ± 64 mm long, 170 ± 67 mm wide, the wrist through 424–468 mm vertically, the shoulder through 129–137° in the sagittal plane.
- **The swimmer's roll** (Payton et al. 1999, *J Sports Sci*; six male swimmers at 200 m race pace): at most 57 ± 4° toward the non-breathing side and 66 ± 5° toward the breathing side. Barden and Barber (2022, *Sensors*) read the hips' peak roll at 45–54° at a submaximal 1.3 m/s.
- **The swimmer's stroke rate** (Kjendlie et al. 2004, *Eur J Appl Physiol*): adults take 0.38 ± 0.04 arm cycles a second at 1.0 m/s.

**The baseline** (measured before this plan, at 60 Hz):
- **Paddling at 1.69 m/s:**
  - the drawn hand's path is 940 mm along the board, 220–260 mm across and 510 mm vertically: within one SD of Nessler 2015;
  - 60 strokes a minute per arm, where Nessler 2019's line gives about 50 at 1.69 m/s;
  - the board pitches 10.3°, within one SD of 12.3°;
  - it rolls only 7° through each stroke, against 27–45°.
- **Swimming at 0.99 m/s:**
  - the drawn swimmer lies on its side: its shoulders stacked, 84° from level, from 5 s on;
  - the crawl turns at 0.8 cycles a second, twice Kjendlie's 0.38 at the same speed.

**Tech Stack:** TypeScript, three.js, vitest; the body film and the body report.

**Spec:** the grilling (memory `riding-body-animation`):
- paddling and swimming are the plan's last part;
- realistic by default;
- secondary motion from the physics only;
- the physics posture changes only where measured wrong, as a separate measured step.

## Global Constraints

- **The physics is untouched.** The paddle's stroke rate and the board's roll are the physics'. They are measured and reported, not tuned.
- **Every drawn constant is cited** in its `RIG_DETAIL` comment. Coaching-only shapes stay out.
- **Nothing pops:** the switch tests pass, and the paddle's stroke ends blend out.
- **The riding body is untouched:** the stance tests, the stance map and the step 1–7 films hold.
- Performance is never a gate. English only.

## Review Focus

1. **The facing when the spine is near horizontal:** a body lying flat faces down, an upright one faces its heading, and every angle between turns smoothly (no flip as the spine passes through the heading).
2. **The fallen body tumbling** in whitewater: its facing must not flip frame to frame (the fall films' switch spikes).
3. **The breath held** (under water, duck-diving): the swimmer's head does not turn up to breathe.
4. **The display rate:** the crawl's roll at 30 and 120 Hz.
5. **Remote swimmers** draw from the same rig, with nothing new on the wire.

---

### Task 1: The measures

**Files:** `src/dev/bodyFilm.ts` (a "swimming" film; `paddleStroke`, `boardMotion`, `swimRoll`, `crawlRate`), `src/dev/bodyFilm.test.ts`, `scripts/body-report.ts`.

- `paddleStroke(film, side)`: the drawn hand's path in the board's frame (along, across, vertical, mm), and its cycles a minute.
- `boardMotion(film)`: the drawn board's mean pitch and its roll range per arm cycle.
- `swimRoll(film)`: the drawn chest's roll about the swimmer's long axis: its peak each side and its mean.
- `crawlRate(film)`: the drawn hand's cycles a second about its shoulder.

- [ ] **Tests:**
  - the paddle's hand path within the references (Nessler 2015 ± 1 SD);
  - its stroke ends blend out (`switchSpikes` of the paddle film);
  - the report rows print the baseline.
- [ ] Commit.

### Task 2: The swimmer faces down

**Files:** `src/scene/rig/HumanoidRig.ts`, `src/scene/rig/HumanoidRig.test.ts` (or the film tests).

- A fallen body faces the sum of its heading and the world's down, each made perpendicular to the spine:
  - upright (treading water), the heading's share dominates;
  - lying flat, the down's share dominates;
  - neither is ever the only term, so the facing turns smoothly between them.

- [ ] **Tests:**
  - the swimming film's mean chest roll is within 10° of face-down;
  - a body treading water faces its heading;
  - the fall films still blend out.
- [ ] Commit.

### Task 3: The crawl

**Files:** `src/scene/rig/HumanoidRig.ts` (`RIG_DETAIL.crawl…`), tests.

- **The rate:** 0.38 cycles a second (Kjendlie 2004, at the physics' own 1.0 m/s swim), quickening short of breath as before (Part B's body cue).
- **The roll:** the body rolls toward the pulling arm's side, peaking as each hand passes under the shoulder. Peaks: 57° toward the non-breathing side and 66° toward the breathing side (Payton 1999).
- **The breath:** every cycle, to one side (the recreational swimmer's habit is an assumption, marked provisional). The head turns with the roll on the breathing side and stays down on the other. Held (under water, duck-diving), it stays down.
- **The hand's circle** lies in the plane of the heading and the rolled body's own up, not the world's vertical. The recovering arm swings out over the water as the body rolls.

- [ ] **Tests:**
  - the peaks within 45–70° each side, the mean within 10° of face-down;
  - the rate 0.38 ± 0.04 cycles a second with the breath full;
  - no joint spike above a brisk limb's pace at 30 and 120 Hz;
  - the head down with the breath held.
- [ ] Commit.

### Task 4: The hand-over

- [ ] The findings, including the physics gaps for the user: the paddle's stroke rate and the board's roll.
- [ ] The ROADMAP line, the suites, the review, the PR.

## Findings

### The paddler

The measures found more than the plan expected. The drawn paddle stroke depended on the display rate: its hand's path was 53 cm across the board at 30 Hz, 22–26 at 60 and 8–11 at 120, and it popped at 120 Hz (10 m/s at a joint, 16 rad/s at a bone). Four causes, each fixed where it arose:

1. **The physics' drawn hand path jumped 25 cm** at each end of the pull. The recovery started at the deck's height, not where the pull left the hand under the water.
   - The recovery now leaves the water at the hip and re-enters at the reach with no speed at either end, low (0.12 m over the deck) and swinging 10 cm out over the water.
   - This path is only drawn: the physics pushes on the water during the pull alone, as before. The physics and riding suites are unchanged.
2. **The arm snapped straight** four times a stroke. The physics' hand is out of the drawn arm's reach through most of the pull, and a two-bone arm's elbow turns infinitely fast at full reach. Lying, the arm now comes to its reach smoothly (`armEase`, a tenth of its length), as step 3's legs do.
3. **The elbow and the hand flipped.** The elbow's side (up and a little out) met the arm head on as the pull passed under the shoulder. The hand's back fell back to the chest's facing, which faces the deck lying down, and spun half a turn.
   - Lying, the elbow is now high, out and trailing, as a paddler's high elbow. The hand's back points up, out and forward.
   - Both stay 36° or more off every way the arm points through the stroke.
4. **The arm folded tight past the shoulder.** A recovery at the shoulder's height passed the hand 12 cm from it, and the fold turned the arm fast enough for a 30 Hz display's smoothing to read the turn as a jump.
   - The low, wide recovery (above) keeps the hand clear.
   - Its width matches Nessler et al. 2015: 19 cm, against 17 ± 7.

**Tried and reverted:** counting the smoothing's jump spread in time rather than frames. It fixed the rate dependence here, but broke the pop-up's switch blend, which relies on three frames. So the fix went to the source signals instead.

**The stroke now,** the same at 30, 60 and 120 Hz, and for another player's paddler:

| Measure | Drawn | Reference |
|---|---:|---|
| Hand path along the board | 73 cm | 97 ± 8 (Nessler 2015) — **short, pinned** |
| Across | 19 cm | 17 ± 7 |
| Up and down | 37 cm | 42 ± 8 to 47 ± 9 |
| Fastest hand frame | 4.4–4.6 m/s | the physics' 4.4 |
| Board pitch | 10.3° | 12.3 ± 2.3° (Nessler 2019) |

### The swimmer

- **It faced wherever its spine leaned.** A fallen body faced its heading made square to its spine, which vanishes when the spine lies along the heading, so the swimmer drifted from face up (−157°) to one side and the other. It now faces the water lying flat or diving, and its heading upright, turning smoothly between.
- **The crawl as swimmers swim it:**
  - **Rate:** 0.38 cycles a second, where it drew 0.8. That's Kjendlie et al. 2004's adults at 1.0 m/s, the physics' own swim speed.
  - **Roll:** the body rolls toward each pulling arm, 66° toward the breathing side and 49° the other way. The rig asks for Payton et al. 1999's 57° and 66°. The film reads 49° because the physics' spine leans as it swims, and the rig rolls about it. That's within Barden and Barber 2022's 45–54° at a submaximal pace.
  - **Head and arms:** the head turns with the roll only to breathe, and stays down with the breath held. The arms circle in the rolled body's plane.
- **Another player's swimmer** matches the local one within a degree.

### Open, for you

- **The physics posture of the paddle** (the plan's rule: the physics changes only as its own measured step). Three gaps go together:
  - **The board's roll:** 7° through a stroke, against 27–45° (Nessler 2019 on a short board; less on bigger boards).
  - **The stroke rate:** 60 a minute a side, where Nessler's line gives about 50 at the game's 1.7 m/s.
  - **The drawn stroke's length:** 73 cm against 97. The physics' hand enters and leaves 0.7 m from the drawn shoulder, past the arm's reach. Real paddlers reach with the shoulder and roll with the board.
- **The swimmer breathes each cycle to its right:** a provisional choice, no source.
- **Falling off the board while lying down** flings the drawn arms at 5–8 m/s. The switch spike reads 2.3 m/s at 120 Hz, over the 2 m/s limit; it read 2.4 before this step. It's the fall's own, not the swim's: open.
- **Another player's swimmer under water** still turns its head to breathe, because the pose doesn't carry the head being under. No wire change.
- **The flutter kick** still beats twice a second. A six-beat kick at 0.38 cycles would be about 1.1 a second per leg. Out of scope.
- **The duck-dive** stays parked (memory `wipeout-duck-dive-requirements`: the rigid rider can't dive).
