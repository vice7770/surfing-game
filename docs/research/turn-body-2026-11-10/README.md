# The turning body: what the clip shows, in numbers (2026-11-10)

**Measurement and diagnosis only. No source change, no default changed.**

The owner rode Canyon and said: *"I was able to make a cutback on a wave but the movement of the
surfer is very off. Also not able to turn as sharp as the video."* This study takes each thing
seen in the owner's clip, checks it against the game's own numbers, and says whether the cause is
in the **physics** (where the rider's body points really are) or in the **drawn** body (how the
rig poses the figure on top of those points). It ends with a ranked list of changes.

## How it was measured

A scripted probe (`turnbody.test.ts.txt`) drives the real physics rider and the real drawn rig
with fixed inputs and records both every frame. No rider session, no browser, no dev server.

- Water: flat water, and the analytic test wave calibrated to Canyon B (`canyon`).
- Rider: Regular stance, surfer 1. Speeds 8 and 11 m/s (29 and 40 km/h), cutbacks at 8.5 m/s.
- Plans: trim (no input); **Compress carve** (Compress + full stick for 2 s, toe side and heel
  side); **stick-only carve** (full stick, standing); **cutback** (Compress carve 1 s, then Snap
  held with the stick fully the other way for 1.5 s); **standing cutback** (same from a stick-only carve).
- "P" columns are physics, "D" columns are the drawn figure. Knee and hip angles are the angle
  *inside* the joint: 180° is a straight leg.

Files: `results-tables.txt` (every run, a row each 0.25 s), `results-onset.txt` (who moves
first), `run.sh.txt` (the exact commands), `tab.py.txt`, `onset.py.txt`.

**Limits.** Flat water gives no push, so slow runs stall. The test wave has no white water, so the
end of the clip (falling on the foam) could not be reproduced. One stance and one surfer. In
`results-tables.txt` a chest value like −227 means +133 (a wrap in the printout; the onset table is unwrapped).

## One thing to know first: the clip's labels

The on-screen labels BOTTOM TURN / TOP TURN / SNAP come from `src/game/rideAnalysis.ts`, which reads
the board's path only. **"BOTTOM TURN" does not mean Compress was held.** The clip's "folded at the
waist with nearly straight legs" matches the stick-only carve below, not the Compress carve.

## The measurements

### Standing (trim)

| | game, drawn | stance map target | reference surfer |
| --- | --- | --- | --- |
| front / rear knee | 125–145° / 131–140° | 135–165° front | visibly more bent, never straight |
| trunk from upright | 14–19° | 10–35° | |
| arms | hanging: 25° lead, 9° trail | | |
| hips over the deck | 0.78 m | | |

The legs bend 35–55°, which is what the stance map asks for (the map allows straighter still). The
arms are **not** held out in steady trim. They go out (60–100° lead, 50–80° trail, elbows straight)
whenever the physics balance margin is low, which is most of the time during and just after a carve.

### Stick-only carve (full stick, no Compress)

| | toe side | heel side |
| --- | --- | --- |
| hips over the deck (physics) | 0.77–0.78 m (no drop at all) | same |
| knees front / rear (drawn) | 106–144° / 122–160° | rear up to 160–175° |
| physics lean / board roll | 31–46° / 38–50° | same |
| drawn trunk from upright | 44–65° | |
| ends | **falls at 2.0–3.1 s, every run**, flat and wave | same |

The stick never bends the legs. The physics leans a full-height rigid body, and the rig then adds a
forward hinge of 30° toward the toes. Result: a tall body bent at the hips over nearly straight legs.

### Compress carve

| | toe side | heel side | stance map |
| --- | --- | --- | --- |
| hips over the deck (physics) | 0.48 m | 0.48 m | |
| physics lean into the turn | 30–47° | 30–47° | 30–50° |
| board roll | 36–48° | 36–48° | |
| knees front / rear (drawn) | 54–63° / 60–70° | 63–81° / 72–86° | 70–90° |
| hips front / rear (drawn) | 71–83° / 101–105° | 112–130° / 139–148° | 60–90° |
| drawn trunk from upright | 60–71° | 50–69°, 37–47° of it toward the nose | 40–60° |
| inside hand above the water | 0.05–0.13 m (trail hand) | 0.14–0.18 m (lead hand) | 0–0.3 m |
| turn rate at 8 m/s / 11 m/s | 60–100°/s / 50–55°/s | same | |

The legs are well bent here (deeper than the map). The physics body **does** lean into the turn. But
the drawn trunk goes 10–20° past the map's limit on the toe side (chest toward the water, not the
turn), and on the heel side most of the trunk's tilt points toward the nose instead of into the turn.

### How sharp

| | radius | time for a quarter turn |
| --- | --- | --- |
| Compress carve at 8–9 m/s | 5–8 m | 1.2–1.5 s |
| Compress carve at 11 m/s | 10.5–13 m | 1.6–1.9 s |
| Snap (flat water) | 2.3–2.6 m, peak 160–220°/s | 0.5–0.7 s |

The lean tops out near 47–50°. At a fixed lean the radius grows with the square of the speed
(radius = speed² ÷ (gravity × tan lean)): 11.7 m/s needs twice the room of 8.3 m/s. The clip's
27–42 km/h is 1.5–2 times what an everyday surfer carries through a linked turn, so the same lean
draws a turn two to four times wider than the reference.

### Who moves first

Time in seconds after the stick is pushed (first turn), or after Snap + opposite stick (rail change).

| | board rolls 10° | board turns 10° | drawn head 10° | drawn chest 10° | drawn hips 10° |
| --- | --- | --- | --- | --- | --- |
| Compress carve | 0.22 | 0.43–0.48 | 0.60–0.63 | 1.15–2.05 or never | never |
| stick-only carve | 0.23 | 0.58–0.67 | 0.70–0.73 | never | never |
| Snap, toe → heel (frontside cutback) | 0.47 | 0.75 | 0.20 | 1.37 | never |
| Snap, heel → toe | 0.47 | 0.77 | 0.23 | 0.25 | 0.98 |

In a carve the order is board, then head, then (sometimes) chest: the reverse of the reference.
In Snap the head leads the board by about 0.25 s; the chest leads only heel → toe. In the frontside
cutback, when the board has turned 10° the chest is 17° and the hips 26° **behind** it.

Why: nothing the rig receives says what the player asked for. The key poses
(`src/scene/rig/stageBlend.ts`) and the head (`lookWhereGoing` in `HumanoidRig.ts`) read the board's
*measured* turn rate through 0.25–0.3 s followers, so they can only follow. The physics upper-body
twist (`twistStep` in `AttachedRider.ts`) moves only for the pad's rotation stick or Snap; on a stick
carve it stays at 0.

### The cutback (Compress carve, then Snap held with opposite stick)

| | measured | real cutback (stance map) |
| --- | --- | --- |
| hips over the deck | 0.47–0.55 m for the whole hold | |
| knees front / rear | 54–100° / 51–75° | 100–130° / 110–140° |
| hips (joint) | 38–90° | |
| board roll on the new rail | 16–36°; flat for about 0.45 s on the way | 76 ± 5° |
| first 0.3–0.5 s of Snap | board keeps turning the **old** way, faster (75 → 110–155°/s) | |
| physics lean into the new turn | 14–50° | 40–75° |
| drawn lean, frontside cutback | −2 to 22°, about 0.4 s late | |
| hands above water, frontside cutback | **lead** hand 0.11–0.29 m, back hand 0.58–0.91 m | back hand low |
| drawn trunk, backside cutback | 62–109° from upright, hands to 0.29 m **under** water (physics trunk 21–50°) | |
| speed | flat 7.7 → 2.4–2.8 m/s; wave 9.2–9.8 → 4.7–5.9 m/s in 1.5 s | |
| ends | every run falls (2.5–3.8 s) | |

From a stick-only carve, Snap never gets the board off the old rail; the rider falls at 2.1–2.9 s.

### Coming out

After a Compress carve at 11 m/s the knees are back near 136°/141° in about 1 s, with the trunk still
43–47° off upright. After a Snap the rider is at 2.4–2.8 m/s on flat water, stands up, and falls on balance.

## Verdict for each thing seen in the clip

| seen in the clip | true? | cause | where |
| --- | --- | --- | --- |
| Cannot turn as sharp as the video | **Yes** | **Physics.** Lean tops near 50° and the game rides 1.5–2× faster than the reference; radius grows with speed² | `AttachedRider.ts` (`TURN_RADIUS`, `MAX_BANK`, balance) |
| Carve: folded at the waist, legs nearly straight | **Yes, for stick-only carves** | **Both.** Physics: the stick does not bend the legs. Drawn: a 30° hinge toward the toes on top of the lean | `AttachedRider.ts` (crouch only from Compress); `HumanoidRig.hinge()`, `stagePoses.ts` `BOTTOM_FRONTSIDE` |
| Carve with Compress: chest dropped forward | **Yes** (trunk 60–71°, map 40–60°) | **Drawn.** Hinge plus the reach-for-the-water bend go past the tilt limit | `hinge()`, `tiltRoom`, `bendToReach` |
| Body does not lean into the turn | **Half.** The physics leans 30–47° | **Drawn.** Toe side: the lean reads as a fold. Heel side: the hinge toward the toes cancels it (drawn lean arrives at 0.6–0.95 s) | `hinge()` (hinges about the body's own axis, not the turn) |
| Arms dangling in the crouch | Partly: inside hand skims the water (right), outside arm has no job | **Drawn** | `stagePoses.ts` arm targets |
| Between turns: stiff, legs straight | **Partly.** Knees bend 35–55° and it matches the map; the reference bends more and never stops moving | **Both.** The map target is tall; physics has no leg flex without Compress | `stanceMap.ts` trim; `AttachedRider.ts` |
| Arms held out | **Yes, in and after turns** | **Drawn reaction to a real physics state** (low balance margin → alarm pose, arms 90°, elbows straight) | `followAlarm`, `RIG_DETAIL.arms` |
| Cutback: tight ball over the tail | **Yes** (knees 51–100°, map 100–140°) | **Physics.** Snap drops the legs the full Compress depth and holds it | `SNAP_DEPTH = 1` in `AttachedRider.ts` |
| Cutback: board looks flat and pivots | **Mostly.** Roll 16–36° (real: 76°), flat 0.45 s, up to 220°/s | **Physics** (already listed as a miss in `docs/research/stance-map.md`) | Snap in `AttachedRider.ts` (`SNAP_RADIUS`) |
| Cutback: no visible lean | **Yes** frontside (−2 to 22° drawn, 14–50° physics) | **Drawn** | `hinge()` |
| Cutback: back hand not toward the water | **Yes: the wrong hand drops** | **Drawn.** The rule picks the hand from the low rail only; it cannot tell a backside bottom turn from a frontside cutback | `snapHands` in `HumanoidRig.ts`, `CUTBACK_FRONTSIDE` lead arm |
| Cutback: head and shoulders do not lead | **Half.** Head leads by 0.25 s; chest and hips trail the board frontside | **Drawn** (chest/hips follow the measured turn) | `stageBlend.ts`, `stagePoses.ts` |
| Carves: nothing leads | **Yes** | **Drawn has no intent signal; physics twist idle** | `RiderVisualState` (no steer field), `twistStep` |
| Stands straight up on the white water and falls | **Likely** (after Snap the rider is at walking speed, stands, loses balance) | **Physics**; not reproduced on foam | Snap speed loss |

## Proposed changes, in order of payoff

None of these is feed-forward lean-in, rail-first roll, a lean-cap hold, or a hidden moment or brake.
All are opt-in behind a URL switch; no default changes until the owner has ridden them.

### 1. Lean the drawn trunk into the turn instead of folding it (drawn)

- **Player sees:** in a carve the whole body tips toward the inside of the turn in one line from the
  board's rail to the head, on both sides. The chest stops dropping to the water on toe-side turns;
  heel-side turns show a lean for the first time. The face-down backside cutback goes away.
- **Where:** `HumanoidRig.hinge()` and `bendToReach()`; `hinge` and `tiltMost` values in `stagePoses.ts`.
  As the turn weight rises, shrink the forward hinge (toward 10–15°), keep the trunk within about
  10° of the physics lean line, and stop the reach bend from passing `tiltMost`.
- **Size:** small, about 40–60 lines plus pose numbers. Rig only; the ride is unchanged.
- **Could go wrong:** the inside hand may lift off the water (the reach bend was hiding short arms);
  the mass-over-feet correction (`backForMass`) may push the hips oddly. Check with the stance gauge.
- **A/B:** `?turnTrunk=lean` through `RIG_SWITCHES` in `stanceBlend.ts`.

### 2. Tell the rig what the player asked for, so head → shoulders → hips lead (drawn)

- **Player sees:** push the stick and the head turns at once, the shoulders open about 0.1 s later,
  the hips after, and then the board comes round. Today the board goes first.
- **Where:** add a `steer` field (−1..1) to `RiderVisualState` (0 for remote riders); use it in
  `lookWhereGoing`, in the chest and hip facing of the pose, and to start the rail/turn weights in
  `StageBlend.update` before the measured turn rate arrives.
- **Size:** medium, about 80–120 lines over 4 files. Rig only.
- **Could go wrong:** stick flicks make the head twitch (needs a short follower, 0.1 s); a pushed
  stick with no turn (stalled) shows a wound-up body going straight, which is honest but new.
- **A/B:** `?turnLead=on`.
- **Physics variant (later, changes feel):** let the stick wind the physics twist rotor a little. It
  is a visible limb, so it is allowed, but it moves the board and needs the owner's ride.

### 3. Drop the right hand in a cutback (drawn)

- **Player sees:** in a frontside cutback the back hand reaches for the water behind the heels and
  the front arm points where the board is going. Today the front hand goes down.
- **Where:** `snapHands` in `HumanoidRig.ts`: pick the hand from the redirect weight
  (`stages.weights.redirect` / cutback), not from the low rail alone; `CUTBACK_FRONTSIDE` lead arm.
- **Size:** small, 15–30 lines.
- **Could go wrong:** the two rules disagree for a moment during the rail change (blend, do not switch).
- **A/B:** `?cutbackHand=back`.

### 4. Snap from the legs: extend through the turn, not a held ball (physics)

- **Player sees:** the rider comes into the cutback low and drives the legs out through it (knees
  100–130° at the middle), instead of holding a ball over the tail. Probably more rail too.
- **Where:** `SNAP_DEPTH` and the Snap leg target in `AttachedRider.ts`.
- **Size:** small in lines (about 30), but it changes how Snap rides.
- **Could go wrong:** a taller body in Snap falls sooner (every scripted cutback already falls);
  the 0.3–0.5 s of turning the old way may grow.
- **A/B:** `?snapLegs=drive` via `devParam` in `PhysicalMode.ts` (same wiring as `legDriveSwitch`).

### 5. Legs that work without Compress (physics)

- **Player sees:** on a stick-only carve the knees sink with the turn's load (low at the bottom)
  and rise as it ends (taller at the top), and trim sits lower. No more straight-leg carve.
- **Where:** the leg rest length in `AttachedRider.ts`, driven by the carve's own load; could share
  the merged leg drive (`?legDrive=on`).
- **Size:** medium, about 60 lines; changes feel and the falls of standing carves (today 2–3 s).
- **Could go wrong:** it shifts balance; needs the owner's ride on Canyon B. Do **not** fix this by
  moving the stance map's trim target.
- **A/B:** `?carveFlex=on`.

### 6. Sharpness is the owner's call (physics)

The turn is as sharp as the lean and speed allow. Ways to match the reference: ride it slower (the
reference pair is near 5–7 m/s), or allow more lean with a real cause (a lower body, item 5, earns
more lean before the balance fails). Nothing here should be done by holding the lean cap.

**Build first: 1, 2 and 3.** They are drawn-only, cannot change how the board rides, and between
them answer "the movement is very off": the lean, the order of the body, and the hand.

## Surprises

- The clip's folded, straight-legged "bottom turns" are stick-only carves; the label is not Compress.
- Holding Snap first turns the board the old way, faster, for 0.3–0.5 s before it reverses.
- In a backside cutback the drawn trunk passes horizontal and both hands go under water while the
  physics body is at 21–50°.
- Every scripted full-stick standing carve and every scripted cutback ends in a fall.
- On flat water at 11 m/s a Compress carve gains speed (10 → 12.9 m/s): the carve carry.
