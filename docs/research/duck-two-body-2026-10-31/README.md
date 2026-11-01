# The two-body duck-dive (duck-two-body, 2026-10-31)

The owner approved `docs/research/duck-dive-2026-10-31/two-body-plan.md`. Steps 1–4 (the submerged board, the grip, the arm push and the knee, the hand-over and the hand-back) merged as #176; the measurements under broken water (step 5) are here. Step 6, the drawn dive and the online pose, followed on 2026-11-01 (its section below), with a final Canyon re-run.

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
| The drawn duck-dive reads right | the lying duck pose from the swimmer's parts: hands 0.77 m off the rails, legs 16 cm through the deck | step 6: on the rails, kneeling on the tail, nothing through the deck (strips) | met |

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

## Step 6: the drawn dive (duck-drawn, 2026-11-01)

Branch `claude/duck-drawn` from main at 02ae066e. Switch: `?duckDrawn=old` draws the same physics as main drew it.

**What was wrong.** While ducking, the snapshot's points are the swimmer's own parts. The arms' and legs' parts are the
limbs' middles. Main drew the lying pose's duck from them as though they were hands and feet:
- the hands up to 0.77 m off the rails;
- the legs folded 16 cm through the deck.

**What the rig draws now** (`HumanoidRig`'s `DIVE_DRAWN`):
- **A flag.** The snapshot's swim field carries `SWIM_BITS.ducking` while the session ducks.
- **The hands** hold the rails where the physics' grips are (`DuckingBody.gripPoint`), by the drawn press, within the
  arm's reach.
  - Each elbow's bend is carried on round its arm from the last frame (`keepElbow`, as a fallen arm's). Whichever way
    a fixed pole points, an arm reaching its rail from some side lies along it, and the elbow went over in a frame.
- **The trunk** is the physics' own. The chest faces square to the spine and the board's across: the deck while the
  spine lies along the board, the tail as the head goes down.
- **The legs** are drawn straight through their parts, as a fallen body's.
  - The back leg kneels on the tail as its part comes onto the physics' knee point (`DUCK_BODY.kneeAt`). Its share is
    read from that nearness, followed no faster than the knee's own 0.25 s.
  - The knee sits on the deck within the thigh's reach of the hip; the shin lies back along the deck, 15° off it.
- **In:** over the press's 0.35 s, from the lying pose as last drawn. The hands come in over the rail.
- **Out:** the hand-back is drawn as a climb from the water (1.2 s). The feet, knees, elbows and facing start from the
  dive's; the hands slide back along the rails.
- **The page's layers.** `PointInertia` and `BodyInertia` read the dive in the world. The bones' layer takes nothing in
  the dive, or the climb straight after it, for a jump: taken so, it held the arms 0.5 m off the rails as the chest
  drew down to the hands.
- **A physics fix.** `AttachedRider.climbFrom` turns the body with the board at once. Its own turn was the one it had
  when it last rode, so the first step back on drew the parts turned by it: the legs 0.5 m out for a frame.

**Online.** The duck-diving flag (wire flag 16) now carries the two-body dive whole. The others draw it from the seven
points they already get, at no new bytes. The press is not sent, so another player's dive is drawn at full press
(the grips 0.3 m ahead, the head tucked) until the hand-back.

**Measured** (the body film's new `a duck-dive` scenario: paddling, a 1.5 s dive on flat water, back on; the page's
posing):

| | Main's drawing | Drawn as the dive |
| --- | --- | --- |
| A wrist off its rail, pressing | 0.77 m | under 1 cm (another player's 1 cm) |
| Limbs through the deck while ducking | 16 cm | none (a knee's centre line at the deck's top; another player's elbow 2 cm into it for a moment) |
| The back knee | — | 9–14 cm over the deck, 0.40–0.48 m behind the middle (the physics' knee point is 0.55 m) |
| The fastest joint, 60 / 120 Hz | 27 / 86 m/s | 6.0 / 7.1 m/s |
| A frame's spike over its neighbours, joints | 7.8 / 12.1 m/s | 4.4 / 4.9 m/s |
| A frame's spike, bones | 16.6 / 21.6 rad/s | 12.9 / 14.6 rad/s |

- **Reading the joints.** While ducking they are read about the hips, as a fall's (`FilmFrame.free`): the body is its
  own there.
- **Not within the falls' limits** (2 m/s, 6 rad/s). What spikes remains is the physics' own:
  - the board kicked into a 17.6 rad/s roll for a step at 0.28 s by the balance's push at the rails (see Open);
  - the body stopping against the board in a step as the hand-back joins them (an inelastic join).
- The hand-overs are each under 4.9 m/s joint spikes (in) and 3.5 (out).

**Strips** (`?inpage&duckDiveStrip`, `src/dev/duckDiveStrip.ts`): a 1.5 s dive on time (the broken water 2.5 m away) at
the Canyon (Medium), and on a still sea. Frames 0–4 s into the dive, from behind, from the side, and from the side with
the sea's surface hidden (x-ray: the body is under water and the water hides it):
- `drawn/duck-dive-flat.jpg` and `drawn/duck-dive-canyon.jpg`;
- the old pose of the same physics, `drawn/duck-dive-flat-old.jpg` and `drawn/duck-dive-canyon-old.jpg`;
- the frames' depth, pitch, roll and press in `drawn/strip-log.txt`.

What they show:
- **Flat water:** the hands on the rails, the chest drawn down to them, the board nose-down, the knee on the tail and
  the other leg trailing; back on at 3 s.
- **The Canyon:** the whitewater passes over at 0.6–2 s. The body hangs on the board as the bore pitches it 36° nose-up
  and rolls it 44°. At 4 s the pair is still under, 0.85 m deep.
- **The old pose:** the arms flung past the nose, the legs folded through the board.

**Tests (step 6).**
- **New:**
  - `bodyFilm.test.ts`: the two-body dive drawn: the grips, the knee, the deck, against the old pose; and its pace at
    60 and 120 Hz, here and for another player.
  - `RemoteSurferViews.test.ts`, `ownPose.test.ts`: the duck-diving flag.
  - `riderVisualState.test.ts`: the ducking bit.
  - `PhysicalMode.test.ts`: `?duckDrawn=old`.
- **tsc:** clean.
- **Main suite** (with the globs): 314 files passed (30 skipped); 2977 tests passed (20 expected fail, 36 skipped).
- **SZS filter:** 11 passed (93 skipped by the filter), 913 s.

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

**The final re-run** (2026-11-01, on the merged code: main at 02ae066e with step 6). Seeds 2–4 again, as
`canyon/final-seed2–4.json`. Every row is the same as above, to the centimetre: 14 episodes (8 abandoned).
- **On top:** 12 of the 15 lost the board, a median 0.9 s after the whitewater reached them; 15 m inside, 9 of 19
  (1.8 s).
- **Diving:** no diver came off.
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

1. **The 50 L board** sinks nearly as deep as the reference (0.58 m against 0.61 m), though the arms and knee push
   400 N against its 460 N net buoyancy. Looked into on 2026-11-01 (report only, nothing tuned). The depth is not set
   by the push against the buoyancy; it comes from how the ducking body is coupled to the board:
   - **The water's net lift is small.** Traced through a 1.5 s dive from rest, the board's net vertical water force
     is only 15–70 N for either board. Its buoyancy is 259 N (reference) or 503 N (50 L). The plate's pressure
     (cross-flow drag), heave added mass and radiation take −200 to −1,100 N of it each step.
   - **Why so much.** Each step, after the board's own water step, the ropes, press, knee and balance act on it as
     impulses (`DuckingBody.step`). They leave it rising at 0.4–2.1 m/s while its depth holds steady (0.35–0.46 m).
     The next water step's plate terms then take that speed out (the drag on 1.3 m/s over the plate is about 1 kN).
   - **So the hold-down is the drag on a step-rate jolt,** whatever the board's volume, rather than the arms' 400 N.
   - **The likely fix** (a physics change, not made): solve the grips, press and balance inside the board's substeps,
     or as compliant springs, then re-check the 50 L board (the survey: practically un-diveable).
2. **The board rattles in the dive** (new, seen drawing it). Through the press its roll rate flips sign every
   2–3 steps:
   - ±4–5°, 10–20 Hz; one 17.6 rad/s kick for a step 0.28 s in;
   - 17 large flips in 0.9 s, 1 with the lateral balance switched off.
   The balance's spring-damper pushes the body and, back, the board at the rails above its centre of mass, and its
   roll-rate term feeds the light board's roll back into the push. Capping the damper at the step's reduced mass did
   not help; a filtered roll rate rolled the pair over. It is the same family as item 1 (impulses after the board's
   step) and wants the same fix. It shows on the drawn board and hands.
3. **The hand-back is a stop.** The body joins the board in a step (an inelastic join) while still moving against it.
   That stop is the drawn climb's largest spike (3.4 m/s at a joint). A hand-back gated on the body moving with the
   board (0.3–0.8 m/s) delayed lying back on past the probe's window, so it was not kept.
4. **Lying back on after a dive from paddling speed** takes 4–6 s. The pair levels and rises slowly with the body on it.
5. **The plate for every submerged board** (falls, holds, climbs): measured to change the climb and the recovery
   animations. It waits for a climb that does not rest a rigid rider on a deep board.
6. **The late dive under the analytic bore** (see Measured).
7. **Another player's press is not sent.** Their dive is drawn at full press until the hand-back. A byte would carry
   it; the pose codec's flags are all used.
