# Advisor ruling 23: thinning the lip by hand on the 2 m pool case, and step 10's C4 / C1

> **Read ruling 23b at the end of this file first.** Step 11 built this spec to the letter and it missed L1 and L5. The advisor withdrew the lip part of this ruling the same day: a hand cut of the underside cannot give a thinner-looking lip. The answers on step 10 (Q2) stand.

Water-physics advisor, 2026-11-12. Docs only; the advisor wrote no file and no game code. Read on origin/main 01b9e279. One light run of `docs/research/lip-look-2026-11-11/tools/lip.mjs` (read-only, a copy in the scratchpad), no sea, no rider.

Tags: [M] measured by the advisor with `lip.mjs` on `periodic-pool-straight-big-l13` at foot 1.08 m (h0 3.04 m, H 1.75 m, time unit 0.557 s, touchdown 0.808 s); [M10] `step10/README.md`; [S] sourced in the lip-look ruling (`docs/research/lip-look-2026-11-11/README.md`); [R] reasoned; [P] provisional.

**Why it was asked.** The owner (2026-11-12) said the falling lip is "too thick for the size of the wave" and asked for it to be thinned by hand (the lip-look ruling's rank 4), pushed directly with no URL parameter of its own. Scope chosen by the session: on in the 2 m pool (`poolSize=ref`, the `big` case) only. The owner also rode the 2 m pool the same day: "looks visually better but not playable yet, the surfer falls when touching the wave tube part"; then "build it anyway".

## Short answers

- **Q1.** Rank 4 can be built, with two corrections to the lip-look ruling's wording: the ramp must not be linear, and the cut must fade after 0.2 s. A full cut all through the flight takes about 19 % of the drawn jet at 0.6 s [R from M].
- **Q2.** Step 10's C4 passed; keep the merge. For C1, H per slice is the right measure; the "0.85 m" figure was wrong to state in metres.
- **Falls.** The thinning should not make the fall on the tube part worse: the top face and the tip do not move, and the hollow only gains up to 5 cm of head room [R]. It will not cure it either.

## Q1 (a) The numbers and the points

- One capillary length is 0.0316 h0 = 0.096 m at the shown size = 0.055 H [M, S]. It scales with each slice, so apply it in the case's own units.
- **Tip** = point 64 (the lip mark). **Root** = point 88 (the throat). The underside is points 65 to 87. The top face is points 32 to 64.
- "Thickness" at an underside point = its distance to the top run 32..64, exactly as `lip.mjs` measures it.
- The ramp runs along the underside's arc length, s = 0 at point 88, s = 1 at point 64. It is **not linear**: at 0.10 s the underside is only 0.19 m long [M], so a linear ramp would kink about 27° at the throat [R]. Use smoothstep, w = s²(3 − 2s).
- Floor 2 cm at the shown size = 0.0066 h0.

## Q1 (b) Through the flight

- The later thickening is real water: the jet is fed from the crest. Surface tension sets the floor of a thin young sheet; it matters less once the sheet is thick [S: Mostert 2022, direction only; the fade's size is P].
- So: full cut until 0.2 s, fading to 0.35 of it by 0.5 s, then held.

## Q1 (c) The 0.10 H² must-not

- It was written for the water in the drawn and collided jet at touchdown. The solver's throws are a separate thing and stay byte-equal.
- Today the jet holds 0.098 H² at 0.6 s and 0.131 H² at 0.80 s, just before touchdown [M]. With the fade, expected about 0.091 H² at 0.6 s and about 0.124 H² at touchdown [R].
- The must-not stands at touchdown. At 0.6 s the bar is "at most 8 % less than now".

## Q1 (d) The ends

- Confirmed, with the smoothstep. Point 88, the roof (88 to 112) and the wall do not move, and the cut's slope is zero at the throat. No new crease there.
- At the tip, point 64 does not move, so reach and touchdown time are unchanged.

## Q1 (e) The fray look

- Only when `lipLook=fray` is on. Expected mid-lip after the cut: 0.046 m at 0.10 s (near full white), about 0.08 m at 0.20 s (about two thirds white), about 0.21 m at 0.40 s (glass) [R from M]. The root stays over 15 cm, so glass.
- That is the owner's own 11-11 wording: "start thin with foam, then thicker". A young lip that is white on its outer half is a little more than a clean pool lip shows; acceptable until the Bo 4000 case lands [R].
- It is part of "foam on the wave", not all of it. The white pile after touchdown and foam on the face are separate. Which of them the owner means is the owner's to say.

## Build spec

1. Apply the cut once, where the case's frames are decoded, so the drawn loft and the contact read the same frames. Do not change the stored `.bin`.
2. Key it to the case id `periodic-pool-straight-big-l13` only. The coming Bo 4000 case has another id and must not be cut.
3. For each frame with clock τ > 0 and an underside longer than zero, for each point i = 65..87:
   - t = distance from point i to the top run 32..64, and n = the unit direction to that nearest point;
   - s = arc from point 88 to point i, over the whole underside arc;
   - g = 1 for τ ≤ 0.36 time units (0.2 s), smoothstep down to 0.35 at τ = 0.90 units (0.5 s), then 0.35;
   - cut = w(s) · g · min(0.0316 h0, 0.5 t), then no more than t − 0.0066 h0, never under 0;
   - move point i by cut along n.
4. Points 0..64 and 88..127 are not touched. Frames before the throw (underside arc zero) stay byte-equal.
5. Keep one code constant (not a URL parameter) that turns the cut off, so the probe can print before and after.
6. If the fray's thickness is stored apart from the frames, recompute it from the cut frames.

## Bars (`lip.mjs` on the cut frames, and step 10's probe)

- **L1** mid-lip at 0.10 s at most 0.04 H (expect 0.026 H).
- **L2** no underside point's thickness goes under 2 cm where it was over; none grows.
- **L3** points 0..64 and 88..127 byte-equal in every frame; touchdown 0.808 s; reach equal.
- **L4** jet water at 0.6 s at least 0.090 H²; at the last frame before touchdown at least 0.10 H².
- **L5** no new crease: the underside's largest turn between neighbour segments at most 5° over the uncut; the turn at point 88 within 1° of the uncut; no folded underside segment.
- **L6** steady in time: an underside point's largest move between neighbour frames at most 5 mm over the uncut.
- **L7** the throws' list byte-equal; A to F, K and J bars equal to step 10's.
- **L8** the old default pool, Canyon and the other spots byte-identical (hashes); the fps trace equal.

## Must-nots

- Do not move the tip, the top face, the throw or its depth.
- Do not draw a thinner sheet than the one collided.
- No low-pass in time.
- No change to the solver's jets.
- Online rooms on the default.

## Stop rule

- One build, one run.
- If L3, L7 or L8 misses: do not push.
- If L4 or L5 misses: lower the held share 0.35 to 0.2 once, rerun; if it still misses, hand back.

The lip-look ruling's own must-not says "every change behind its switch". The owner has overridden that for this one change; the code constant keeps it reversible.

## Q2. Step 10

- **C4: passed, keep.** K4's tail (99 % 0.007 m, most 0.078 m) is the cap's own lift [M10]. Restate K4 from now on: "0.000 m where the cap does not act; where it acts, drawn less raw equals the lift, at most 0.15 H". K3's +0.1 to +0.2° is far inside its 10° bar.
- **C1: H per slice is the right measure.** The dig scales with the case's size. The "0.85 m" figure is withdrawn; it assumed H = 1.7 m, and the slices run 1.46 to 2.90 m [M10].
- **A correction from C5.** The advisor had guessed the deep digs came from a second crest or white water. C5 shows clean water at the take-off, half a second before the throw: the sea's own face was simply fuller than the case's there [M10]. That is the hand-over's mismatch in size, not a fault of the dig. The cap touches 0.93 % of dug vertices, so leave it. Read the same place again when `?wallRise=carry` is built.

---

# Advisor ruling 23b: the hand-thinned lip after step 11

Water-physics advisor, 2026-11-12. Text only; no file written, no run. Read: `step11/README.md` and `step11/lip-bars.txt` (branch `claude/pool-lip-thin`, bfcd2424).

Tags: [M11] step 11's prints; [R] reasoned; [P] provisional.

## The ruling in short

**Ruling 23 was wrong, and a hand cut of the underside cannot give the owner a thinner-looking lip.** The advice: hold `claude/pool-lip-thin` unmerged and tell the owner plainly. The owner said "build it anyway", so dropping it is the owner's call. If it is still wanted, the corrected spec is below, but it will not show.

## What was wrong in ruling 23

- It took `lip.mjs`'s "mid thickness" (0.091 m at 0.10 s) as the sheet's thickness. It is largely a distance to the tip. Across, the lip is 0.21 m at 0.10 s and 0.22 to 0.25 m through the flight [M11].
- The young lip is not a sheet. At 0.10 s its underside is 0.19 m long under 0.21 m of water [M11]. It is a blunt nose.
- A 0.096 m cut into a 0.19 m underside, with the tip and the throat fixed, is a notch. It needs slopes of about 45° [R]. That is the L5 miss; no floor rule cures it.
- "Expect 0.026 H" came from the wrong measure. Withdrawn.

## Will the owner see it? No.

- The underside faces into the tube. From the front, the owner sees the lip's outer face, which the cut may not touch.
- What reads as "too thick" in the front still is most likely the height of that pale outer face. It is the lip's fall (0.19 m at 0.10 s to 0.67 m at 0.6 s [M11]) and its pale look, not the sheet's thickness [R].
- A cut that makes no crease is 1.5 to 6 cm (see "How much"). That cannot be read at the stills' distance [R].
- What can show: the Bo 4000 case (a thinner, longer throw in the shape itself) and the lip's look (the pale band, `lipLook=fray`). The look is the faster of the two; it wants its own short consult.

## Corrected spec, only if the build is still wanted

1. **Direction and thickness.** Use the underside's own inward normal, taken on the stored underside (mean of the two neighbour segments). Thickness t = distance along that normal to the first crossing with the top run 32..64; no crossing means no limit from t. Do not use "same arc share": the two runs differ in length and the move would shear.
2. **Next to the tip.** The weight is zero at both ends: w = smoothstep(s / 0.3) · smoothstep((1 − s) / 0.3), s = arc share from point 88. Points 65 to 68 then barely move, and the sheet tapers into the fixed tip.
3. **How much.** depth = w · g · min(0.0316 h0, 0.08 × the underside's arc, 0.5 (t − floor)); g as in ruling 23.
   - The arc limit is new [P]. It keeps the slope under about 22° [R].
   - Expected depth: 0.015 m at 0.10 s, about 0.03 m at 0.3 s, 0.034 m at 0.6 s [R].
4. **The floor.** The builder's soft floor, cut ≤ 0.5 (t − floor), is confirmed. It replaces both the hard floor and the half-thickness limit.

## Bars, restated

- **L1** is now a report, not a bar: the mean distance from the top face 40..60 to the underside, before and after. Expect about 0.21 → 0.20 m at 0.10 s and 0.24 → 0.21 m at 0.3 s [R].
- **L4** stays: at least 0.090 H² at 0.6 s (expect about 0.091), at least 0.10 H² before touchdown.
- **L5** stays, and is the gate.
- **L6** is read per point and frame pair, 5 mm.
- **L2, L3, L7, L8** as before.

## Stop rule

One build. If L5 or L6 misses, drop rank 4 for good.

## The stored frames and the second way in

- **`storedFrames`: right, keep it.** The solver's jets, the clocks and the held frame must read the stored case. Drawn and collided still share the cut frames, so "one water" holds.
- **`?poolTubeCase=pool`: shut it out.** Key the cut on the 2 m pool running `big` alone, not on the case id. In the old pair a cut `big` would blend with an uncut `small`.

## Order the advisor advises

1. Hold the lip-thin branch.
2. A short consult on the lip's pale outer face.
3. The second library, as ruling 22 ordered.
4. The Bo 4000 case, when the M4 run lands.
