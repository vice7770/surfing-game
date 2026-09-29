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

(Filled in during execution.)
