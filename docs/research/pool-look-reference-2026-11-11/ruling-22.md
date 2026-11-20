# Advisor ruling 22: after `?wallFoot=dug` (step 9, PR #269)

Water-physics advisor, 2026-11-12. Docs only. No probe run, no game code.
Tags: [M9] measured in `step9/README.md`, `step9/dug.txt`, `step9/base.txt`; [M] read by me from the committed library file (`ruling-22-runs/knee.py` → `knee-big.txt`, a few seconds, no sea); [C] code; [R] reasoned; [P] provisional.

## Short answers

1. **The line along the wall is not the dig.** It is the case's own hollow knee: the foot of the steep wall. It was there before the dig. It cannot be removed with this method, and it should not be: it is real water. Its wobble can be reduced (the second library). No ramp is to be built.
2. **The white patches are most likely the sun in the hollow.** Not a mesh fault. One cheap check, no fix.
3. **Cap the dig, softly.** Two rules, under `wallFoot=dug` itself. K7 is restated.
4. **Leave the fold and the spacing.** Count the fold at the next run.
5. **Accept the 8-point crest ramp.** It is ruling 21's own fallback.
6. **The cap first (small), then the second library.** The owner can ride now; none of this blocks a ride.

## 1. The line along the wall

Your reading (the dig drops 0.3 to 0.4 m where the share starts) does not fit the numbers:
- J2 "where the share starts" is 1.67° at 90 % [M9]. That cannot draw a line. Only its rare tail moved (4.8 → 12.2°).
- The same crease is in step 8's normals still (`step8/still-view-along-150s.jpg`), before any dig, at the same place. The dig only let it run on down to the trough, where the sea used to cover it.

What it is [M]: on the run's own frames of `big`, the face has one hollow knee, where the steep wall eases into the lower face.

| Clock, s | Hollow turn over 0.4 m each side | Over 0.2 m | Its place (0 crest, 1 toe) |
|---|---|---|---|
| −1.9 | 2.4° | 1.3° | 0.82 |
| −1.3 | 4.0° | 2.2° | 0.81 |
| −0.8 | 6.3° | 3.3° | 0.54 |
| −0.5 | 8.8° | 4.7° | 0.40 |
| −0.24 | 13.1° | 8.1° | 0.33 |
| −0.05 | 21.3° | 17.4° | 0.28 |

- It grows smoothly and climbs the face as the wave steepens. Along the wall that is one line, faint at the wall's start, strong at the tube. The probe's drawn turn equals the raw case's (K1 0.0°) [M9]. So the game draws it truly.
- The Rich look is right to show it: steep water above is dark, flatter water below takes the sky.
- I did not match the still's line to the knee point by point. This reading is [R] from the numbers above.

What is not true water in it:
- **Its wobble.** The stored stand-in frames move the knee: at −0.27 s its place jumps 0.32 → 0.45 and its turn over 0.2 m doubles (7.5 → 15.4°); at −0.11 s the place jumps 0.29 → 0.54 [M]. Along the wall that is a kinked line. Ruling 20's second library removes this.
- **Where it starts.** The sea ahead has no knee, so the line begins where the pre-made wall begins. At 2 to 4° it should be faint there. This start is the hand-over itself.

**Plainly, for the owner:** a line along the foot of the steep wall stays. On a real wave it is there too. What marks "two parts" is that it begins about 15 m ahead of the tube instead of running the whole wave. Only a sea with its own steep face (C2) changes that.

No build. Not a longer along-crest ramp, not an earlier dig: both would move true water to hide a true line.

At the next probe run, add two prints (no extra run): the knee's place in m past the toe by distance ahead, and its step between neighbour slices. Bar after the second library: that step 0.15 m at 90 % [P].

## 2. The white patches in the hollow

- Classic does not show them, and the normals still shows one smooth shade there [M9]. A mesh fault would show in both. So it is the highlight [R].
- A hollow facing the sun does glint on real water. Before the dig that place was the sea's 17° face, which threw the sun elsewhere.
- Cheap check, stills only: the same 90 s frame at another sun (the sunset sky). If the patches move or go, it is the sun. If they stay in place, hand it back.
- No fix. If the owner finds them too broken, that is the glitter's own grain, a look question for later.

## 3. K7 and the deepest dig

- The 0.3 m bar was mine and arbitrary. Base already reads 0.325 m [M9]. Thin water under a trough on a ledge is real.
- But 1.15 m under the sea is not the case's shape. The structural dig is at most about 0.6 m (0.35 H): 0.3 to 0.4 m at the toe plus the 0.18 m the trough falls past it [M8, M]. More than that means the sea was unusually high there (a second crest, or white water), and the fixed case does not know it.

**Build, under `wallFoot=dug` itself (no new switch).** In `wallFoot.ts`, used by `seamY` and by the contact through the same value:
- **Depth cap.** With dig = sea − drawn (m, over 0): untouched up to 0.35 H; above it eased so it never passes 0.5 H:
  `dig' = a + (b − a) · x / (1 + x)`, `x = (dig − a) / (b − a)`, a = 0.35 H, b = 0.5 H. Value and slope are continuous at a. No new crease.
- **Bed rule.** `dig'` is never more than half the sea's own depth there (sea − bed). The drawn water keeps half the solver's depth. If the loft has no bed read, pass one in the way `heightAt` is passed.
- H is the drawn height, as `REST_DUG` uses. All [P].

Bars (step 9's probe, base `step9/dug.txt`):
- C1, hard: the deepest dig 0.5 H at most (0.85 m).
- C2, hard (K7 restated): the drawn surface over the bed is at least half the sea's depth at that place, always.
- C3, report: the share of dug vertices the cap touches. I expect under 2 %. Over 5 %: stop, hand back.
- C4, hard: K1 to K6 as in `dug.txt` (K4 0.000 / 0.000 m at share 1). The contact follows the capped surface (K6).
- C5: print where and at what clock the old −1.15 m stood, and the sea's turn there.

Must-nots: the throws' list byte-equal; A to F equal; the default byte-equal; switch off equal to `step9/base.txt`; no low-pass; one 300 s run. Stop rule: one build, one run; if C4 misses, revert the cap and hand back.

## 4. The fold and the spacing

- −0.042 m once in 300 s; base was already at +0.027 m [M9]. The forward mesh is 9 m longer, so rays on the inside of a curved front can just cross. Nothing shows in the stills.
- Leave it. In the cap's run, print how many forward quads fold and at what distance past the toe. Fix only if over 0.1 % of them fold or a still shows it. The fix would be to shorten the reach of that slice to where its ray meets its neighbour's.
- Spacing 0.57 to 0.62 m: accept. K3 passes with it. Do not add vertices.

## 5. The crest ramp

Accept. It is the fallback ruling 21 named, and J2 at the crest alone is unchanged [M9]. Under `loftMesh=arc` eight points are about 0.5 m of face. Keep it at eight.

## 6. The order

1. The cap (this ruling), with the extra prints of points 1 and 4 and the still of point 2 in the same run.
2. The second library and the anchor on it (ruling 20). Then read the knee's step.
3. `?lipEdge=one`.
4. `?wallRise=carry`.
5. The owner rides. A ride before step 1 is fine too.

## Corrections

- Ruling 21 said the streak "goes with the dig". Wrong: the streak was the case's knee, seen above the old corner. The dig removed the corner, not the knee.
