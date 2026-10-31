# The two-body duck-dive (duck-two-body, 2026-10-31)

The owner approved `docs/research/duck-dive-2026-10-31/two-body-plan.md`. This is the first checkpoint: steps 1–4 (the submerged board, the grip, the arm push and the knee, the hand-over and the hand-back). Steps 5–6 come next: the measurements under broken water are already here; the drawn dive and the online pose are still to do.

This work was done on the M1 Air, on branch `claude/duck-two-body` from main at fef92d3b. It used headless probes and the duck-dive report; no SurfZoneRunner rider sessions ran in tests. Switch: `?duckBody=old` (online rooms use the default).

## In short

| Target (the coordinator's) | Before (rigid rider) | Two-body | |
| --- | --- | --- | --- |
| The nose goes down first | 9° → 13° nose-up at 0.3 s | 9° → −4.5° from rest, 11.4° → −1.1° from paddling; the nose deeper than the tail | met |
| 0.5–1 m deep (flat water) | 0.42 m | 0.61–0.78 m | met |
| A 50 L board under half the reference's depth | 0.25 m against 0.43 m (0.58 of it: not met) | 0.58 m against 0.61 m | **not met** (open) |
| The board kept through a 3 s hold from paddling speed | rolled over 1.1 s in | kept; lain on again within 6 s | met |
| Canyon whitewater: the timed dive keeps the board clearly more often than on top | 6 % against 20 % | **100 % against 20 %** | met |
| Early and late dives cost more than on time (Canyon) | not met | early 5.4 m, late 7.9 m, on time 4.6 m | met |
| The drawn duck-dive reads right | — | step 6, next checkpoint | to do |

**Canyon whitewater:** seeds 2–4, the same as the duck-dive-l3 README's, 14 episodes.
- The timed dive is set back 4.6 m against 15.5 m on top, keeping the board in every meeting, at 0.93 m deep.
- The survey's three checks are all met (on time under half of on top; early and late worse; weaker inside).

## Step 1: the board under water

`src/physics/hullForces.ts` (`SUBMERGED`) and `src/physics/BoardBody.ts` (`BoardBodyOptions.submerged`, `plateAllowed`).

- **Cross-flow drag.** A board deep under water meets the flow on both faces.
  - Its normal force gains the cross-flow drag the planing law leaves out: ½ρ(C_D90 − C_n)|v_n|v_n. C_D90 is 1.18, Hoerner's finite flat plate; C_n is the planing coefficient, about 0.46.
  - Its small-incidence lift stays the planing law's. Along its length the board is a plate of aspect ratio 0.27, whose lift slope (Helmbold, 0.42 a radian) is the planing coefficient's within a tenth.
  - A free linear lift slope across the board, as large as its aspect ratio across allows, made a loose board in a bore flutter and blow up.
- **Added mass.** The other side's water: each station gains ρπb²/8 a metre along the board's normal, so the plate's heave added mass is ρπa², twice the one-sided strip's (Newman 1977, §4.13).
  - Roll needs nothing added: the strip's spread already gives ρπb⁴/96 a metre, more than a deep plate's ρπb⁴/128.
- **Wave radiation.** It fades with depth as e^(−2kd), k for motions over about 1.5 s (Newman, §6.17).
- **When it applies.** From 15 cm to 50 cm under the board's shallowest face, smoothstepped.
  - That is beyond a prone rider's resting deck (13 cm), and by the beam's depth the free surface's image changes a plate's added mass by about 6 %.
  - Only under a plain surface (normal within 45° of up and a gentle slope), never in a fold or a tube.
- **Where it is used.** Only for the two-body dive's board (`plateAllowed`).
  - Measured first on every board, it changed the free board after falls, the board a swimmer holds and the climb back on.
  - A rigid rider perched on a deep board is top-heavy, and the climb leaned on the hull law's spurious deep damping. One of twelve swim-back falls then took 7.7 s against at most 5.5 s, and the recovery animations' scenarios changed.
  - So falls, holds and climbs keep the law they were calibrated on (an open item for the owner).

## Steps 2–4: the ducking body

`src/physics/duckingBody.ts` and `src/physics/RideSession.ts` (`ducking`, `beginDucking`, `stepDucking`, `backOver`).

- **The hand-over.**
  - Lying on the board, the Duck-dive input hands the rider to the swimmer's own seven-part body (its masses, buoyancy and drag). The parts start where the rigid rider's were, moving as they moved: the fall's own hand-over.
  - The rigid rider is set aside but still counts as on the board (`rider.attached`, prone), so nothing reads a dive as a fall.
- **The grip.**
  - Each hand is held to its rail by a rope at the arm's reach (0.3 m from the arm part's centre), pulled two ways: on the arm part, and on the board at the grip.
  - The hands hold 0.3 m ahead of the board's middle while pressing, and come back to the chest as the press is let go.
  - They hold up to one body weight between them (the old rider's DUCK_GRIP). Pulled harder for 0.2 s, they lose the board (`rider.release`: a fall). No outcome is scripted.
- **The press.**
  - The arms push along themselves, chest to hands, 250 N at full press: the survey's "250 N or more" against a 25.75 L board's 234 N net buoyancy.
  - The push acts on the board at the grips, ahead of its middle, so the nose goes first, and back on the chest.
  - Straight, they hold the chest at 0.6 m from the hands.
- **The knee.** 0.3 s into the press, the back leg swings to the tail (0.35 m from it) on a bounded spring, and on it presses the tail down with 150 N.
- **The follow.** As the knee comes on, the arms stop pushing and draw the chest back down to 0.25 m from the hands.
  - Coaching: push the nose, then the tail, and keep the board close as the wave passes.
  - At arm's length over a deep board the pair is top-heavy (the board a quarter of its volume, a twentieth of its mass) and rolled over within a second.
- **The balance.**
  - Close or not, the pair under water is still top-heavy. The body shifts toward the board's high rail, as the old rider's DUCK_SHIFT did on the deck: 1.0 m a radian of roll, 0.3 m per rad/s, at most 0.22 m, by a muscle of at most 200 N between the trunk and the hands.
  - Letting go, it levels the board the same way along it (0.4 m a radian of pitch, at most 0.25 m).
  - These are internal forces: the pair's weight moves, not its momentum. Modelling values, like the prone balance's.
- **Timing.** The old rider's, along minimum-jerk paths: the press over 0.35 s, the knee over 0.25 s after 0.3 s, both given back over 1 s.
- **The hand-back.** Once let go, the rider lies back on the board from where the body is (`AttachedRider.climbFrom`, the swim-back's climb) when all of these hold:
  - the deck is within 0.45 m of the surface;
  - it is within 35° of level, turning slower than 1.5 rad/s;
  - the chest is over it, within 0.45 m.

  Not so within 6 s, the swimmer holds the board as after a fall (`BoardRecovery`).
- **Breath.** Ducked under, the body holds its breath: about a sixth of it in a long dive, refilled once back on the board.

## Measured

### Flat water and the test bore

`duck-probe.ts`; outputs in `duck-probe-output.txt` (two-body) and `duck-probe-output-old.txt` (`--old`, which reproduces the duck-dive-l3 README's numbers).

| Case | Deck deepest | Nose deepest | Pitch, rest → 0.3 s | Roll, most | Board | Lain on again |
| --- | --- | --- | --- | --- | --- | --- |
| 1.5 s press from rest | 0.61 m | 0.97 m | 9.0° → −4.5° | 21° | kept | 3.2 s after letting go |
| 3 s press from rest | 0.62 m | 0.92 m | 9.0° → −4.5° | 44° | kept | 2.8 s after |
| 1.5 s press from paddling (1.62 m/s) | 0.78 m | 1.25 m | 11.4° → −1.1° | 45° | kept | after more than 4 s |
| 3 s press from paddling | 0.75 m | 1.29 m | 11.4° → −1.1° | 37° | kept | after more than 4 s (within 6 s: the test) |

**The test bore** (1.2 m broken wave, five starts each). The setback is how much further shoreward the board is 4 s after the front than on still water; "on" counts riders still with the board.

| Depth | On top | Early (9 m) | On time (2.5 m) | Late (0.3 m) | On time, 3 s hold |
| --- | --- | --- | --- | --- | --- |
| 2.5 m | 5.7 m, 3/5 on | 2.9 m, 5/5 | 2.2 m, 5/5 | 1.1 m, 5/5 | 1.6 m, 5/5 |
| 1.2 m | 10.4 m, 0/5 | 4.6 m, 1/5 | 4.8 m, 5/5 | 3.0 m, 4/5 | 4.9 m, 5/5 |

- **The late check under this bore** (open, `duckDiveBore.test.ts`). The late dive is set back least here.
  - Both pairs stay under, held, for 3–4 s after letting go, carried shoreward in the crest's current. The earlier diver is under it the longer.
  - This bore's depth-averaged current reaches every depth alike, where the Canyon's whitewater does not. In the Canyon, late is worse.

### The Canyon's whitewater

`scripts/duck-dive-report.ts`, seeds 2–4 run side by side (`canyon/`, pooled by `canyon/pool.mjs`).

| Way of meeting it | n | Median setback | Range | Still with the board | Median depth diving |
| --- | --- | --- | --- | --- | --- |
| on top | 15 | 15.5 m | 4.3 to 17.5 m | 20 % | — |
| dive on time (2.5 m) | 16 | 4.6 m | 0.9 to 10.5 m | 100 % | 0.93 m |
| dive early (9 m) | 16 | 5.4 m | 1.2 to 10.2 m | 100 % | 0.68 m |
| dive late (0.3 m) | 16 | 7.9 m | 1.6 to 13.5 m | 100 % | 0.73 m |
| on top, 15 m inside | 19 | 11.5 m | 6.7 to 25.7 m | 53 % | — |
| dive on time, 15 m inside | 19 | 8.1 m | 5.3 to 15.7 m | 100 % | 0.92 m |

The same seeds with the rigid rider (the duck-dive-l3 README): on time 6.6 m and 6 % kept; early 5.8 m and 13 %; late 11.6 m and 0 %.
- "Still with the board" counts a diver still ducking (holding the board under) 4 s after the whitewater reached them.
- No diver lost the board in these meetings: the hands' pull stayed under their grip.

## Tests

- **New:** `duckTwoBody.test.ts`, `BoardBody.test.ts` (the board under water).
  - `duckTwoBody.test.ts`: the nose first; 0.5–1 m; the board kept through a 3 s dive from paddling speed and lain on again; lain on again after a dive from rest; `duckBody: 'old'`; and the 50 L board as an open check.
  - `BoardBody.test.ts`: sinking face-on as a plate; twice the water in heave only well under; a board with its rider on it unchanged.
- **Changed:**
  - `RideSession.test.ts`: the press read from the session; the breath holds a little in a dive.
  - `duckDiveBore.test.ts`: early is met; late is an open check, with its numbers.
- **tsc:** clean.
- **Main suite** (with the globs): 2972 passed, 20 expected fail, 36 skipped.
- **SZS filter:** 10 passed. The eleventh, the Canyon's Big roller keeping the shoulder clean (no rider), timed out at 900 s in the full run and passed alone in 168 s.

## Open (the owner's calls)

1. **The 50 L board** sinks nearly as deep as the reference (0.58 m against 0.61 m), though the arms and knee push 400 N against its 460 N net buoyancy. Not yet explained; possibly the body's weight in air over the deck early in the press (unverified).
2. **Lying back on after a dive from paddling speed** takes 4–6 s. The pair levels and rises slowly with the body on it.
3. **The plate for every submerged board** (falls, holds, climbs): measured to change the climb and the recovery animations. It waits for a climb that does not rest a rigid rider on a deep board.
4. **The late dive under the analytic bore** (see Measured).
5. **Step 6, the drawn dive:** today the page draws a prone rider in its duck pose from the press, the points from the swimmer's parts. The body following the board under needs the rig to draw the swimmer's pose while ducking, then strips from the chase and side cameras.
