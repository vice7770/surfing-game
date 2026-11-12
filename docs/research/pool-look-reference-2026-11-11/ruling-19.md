# Advisor ruling 19: after `?loftMesh=arc` (step 6, main a40f1bc9)

Water-physics advisor, 2026-11-12. Pool Barrel, `poolSize=ref`, `tubeForm=early`, `wallBody=stream`.
Tags: [M] measured by me for this ruling, [M6] measured in `step6/README.md`, [M18] measured for ruling 18, [C] read in code, [R] reasoned.
One light run was made (no sea, 1 s): `ruling-19-runs/frame-true.txt`, probe `ruling-19-runs/frame-true.ts`. No heavy run. No game code was written.

## Short answers

- **(a) Yes, space each frame by arc before joining, before the throw.** It is the truer curve where it matters. Measured below. The simpler rule (lip at the throw's share) is enough; interpolating the lip's share gains nothing. The fold bars 10/20 deg become a report. Two hard bars stay.
- **(b) Drop `anchorLine=smooth`.** R1 does not matter for the look. I was wrong in ruling 18 to name the anchor's roughness as the first cause of the ribs. Leave it off and remove it.
- **(c) Build 3 goes after (a), not before.** The part of the rise that matters now is the case's own growth. Carrying it needs smooth frames. The spec is below, switch `?wallRise=carry`.

## (a) The frame join

What the mark is [M6, C]: before the throw the lip mark is "the face's steepest point". Its share of the crest-to-toe arc goes 0.05, 0.34, 0.29, 0.08, 0.29, 0.38, 0.05 from frame to frame (`step6/frame-blend.txt`). A place in the water does not jump 0.3 of the face in 0.016 s. The mark is noise on a face of nearly even slope. Joining point by point carries that noise into the curve.

The test [M]: leave each stored frame out, rebuild it from its two neighbours (0.032 s apart), and measure how far the rebuilt curve lies from the real frame, crest to toe, both ways.

| Clock | Join | median | 90 % | most |
|---|---|---|---|---|
| −0.6 to 0 s (35 frames) | point by point (today) | 0.032 m | 0.097 m | 0.109 m |
| | arc first, lip at the throw's share | 0.016 m | 0.016 m | 0.056 m |
| | arc, the lip's share interpolated | 0.016 m | 0.016 m | 0.056 m |
| −1.6 to −0.6 s (60 frames) | point by point (today) | 0.006 m | 0.025 m | 0.095 m |
| | arc first, lip at the throw's share | 0.011 m | 0.018 m | 0.105 m |
| | arc, the lip's share interpolated | 0.011 m | 0.019 m | 0.105 m |

- In the last 0.6 s the arc join is truer: half the error at the median, six times less at 90 %.
- Earlier it is a little worse at the median (0.011 against 0.006 m) and a little better at 90 %. Both are small against the case's 1.9 m.
- So the moved curve is closer to the Basilisk frames, not farther. "Up to 0.10 m" of change is the removal of today's error.
- Interpolating the lip's share is no better. Do not build it.
- Limit of the test: neighbours 0.032 s apart, twice the real gap. Real errors are about a quarter of these [R]. Two of the 95 frames rebuild exactly point by point; they look built from their neighbours. They do not change the result.

Build: switch `?frameJoin=arc` (opt-in; the stored library's bytes do not change).
- In the library's `profileAt`, before the throw (the lip has no underside: `jetLength` 0 in both frames), space both frames with `arcRespace` at the throw's share, then join. From the throw on, as today.
- If one of the two frames already has a jet and the other not, use today's join. Report how often.
- `loftMesh=arc` then finds its vertices already in place. Keep it on.
- The wall water, the contact and the crash read the same joined curve. One water.

Bars (ref 311, 300 s, waves 60–270 s, against `tubeForm=early&loftMesh=arc`):
- A1, hard: at each stored frame's own time the curve lies within 0.005 m of the raw frame, crest to toe. (Today a frame against itself re-spaced is 0.0017 median, 0.0042 most [M6].)
- A2, hard: the leave-one-out error in the last 0.6 s is 0.02 m or less at 90 % (now 0.097).
- A3, hard: at clock 0 and after, no vertex moves (0.000000 m).
- A4, hard: no quad over 90 deg at the mouth, upper and lower face (lower face now 2.1 % [M6]).
- A5, report: folds at −0.5 to −0.15 s (now 12/37 and 12/30 deg) and J2 where the share ends (now 41 deg). Expect them to fall. No number gate: the eye no longer sees ribs, and 10/20 was my guess of what the eye needs.
- A6, hard: stills at 90 s and 150 s, front and along: no rib, no slit, nothing new.
- Must not change: the throws' list byte for byte (the throw is at clock 0, untouched); lines A–F; J3; J4 (0.02 m); the drawn crest's largest move in one step (0.355 m); the default.
- If the throws' list changes, find which reader of the curve before the throw feeds the crash, and say so. Do not accept a drift.

## (b) `anchorLine=smooth`

- Arc alone removed the ribs, with R1 unchanged at 0.051 m [M6]. So the ribs were the mesh and the frame join, not the anchor line. My ruling 18 put the anchor first. That was wrong.
- What R1's 0.05 m still does: the "soft, wide bumps" on the wall in `step6/still-arc-front-150s.jpg`. They read as water, not as a seam.
- The smoothing broke a must-not (0.355 → 0.631 m in one step) and the crash could not use it [M6]. A line that the drawing reads and the crash does not is also a small break of "one water".
- **Ruling: drop it. Leave it off. Remove it in the next clean-up.** Do not trace its step in time now.
- R1 stays as a report line only. Return to it only if build 3 misses W2 and the miss splits along the crest at the records' spacing.
- If that day comes, the fix is not more smoothing along the crest. It is to remove the cause: the cap in `continueAnchor` acts on each point alone while its neighbours hop cells. The right form is one cap on the smoothed line as a whole, in the wave's frame, so no point's history differs from its neighbour's [R]. Not now.

## (c) Build 3: carry the rise, `?wallRise=carry`

Why after (a):
- With `tubeForm=early` the share is whole for the last 0.5 s. The rise there (0.68 / 2.59 m/s [M6]) is the case's own growth: +0.15 m of height, face 41 → 63 deg [M18].
- Ruling 7 left that term out because differencing frames was noisy. The noise is the frame join: 0.016–0.098 m of wobble in 0.016 s is 1–6 m/s [M6, R]. After (a) it should be about 0.016 m in 0.032 s or less.
- Building it before (a) would carry that wobble into the water the rider feels. That is ruling 7's finding again.

What is carried (ruling 7's rule, with its third term now in). At a surface point, along the surface's normal n̂ in the ray–vertical plane:

R_c = α̇·δ + α·G·τ̇ − α·(v_a − c)·s

- α̇·δ: the hand-over. The share's rate at the place, times the case's height over the sea. As ruling 7.
- α·G·τ̇: the growth. G is the joined curve's speed along its own normal at the vertex's arc place, from the frames two before and two after (a 0.064 s window, as `landmarkVelocity` uses [C]). τ̇ is the clock's rate (`FRONT_FIELD.tauRate`).
- α·(v_a − c)·s: the anchor's slip through the wave, times the case's slope. As ruling 7.
- Added to `wallBody=stream`'s flow after its blend: Δu = R_c·n_y·n̂. The gain is 1. No fade with depth.
- Clock window: from the course's start (−2.3 √(h0/g)) to the throw. From the throw to +0.15 s the term falls to zero on the face below the lip; the lip's own water keeps its rule.

Bars (same run, against (a)'s build):
- W1: drawn wall 5 m ahead within 0.05 m of the case's own height at that clock. Already met (1.87 against 1.89 m [M18]). Must stay.
- W2: the slip (the surface's rise less the carried speed across the surface, at places carried with the wave, 0–3 m ahead of the crest point): median 0.4 m/s, 95 % 1.0 m/s. The step 5 probe reads the rise; add the carried speed beside it.
- W3: print the three terms apart (median, 95 %, most), as ruling 7's table.
- Must not: the felt water's 99 % and its share of jumps no more than 10 % over the build without the switch (ruling 6's two bars); the fastest water at the reef (6.66 m/s); the throws' list; lines A–F; no low-pass in time; no gain other than 1.
- Stop rule: one build, one run. If W2's 95 % stays over 1.5 m/s, or the felt water's 99 % grows by more than 10 %, stop. Leave it off. Hand back W3's table. Do not tune.

## For the owner: what still shows the pre-made part

I looked at `step6/still-arc-front-150s.jpg` and `still-arc-along-150s.jpg`.

| What shows | Cause | Can this method remove it? |
|---|---|---|
| A bright line along the wall's foot, and a bright streak across the lower face | The case's steep face meets the flat sea at a corner. The light catches the corner [R]. | **Yes.** First. It needs a small probe first: the slope's jump across the foot line, per slice. Then the foot is joined over a longer stretch. |
| Soft wobble of the wall near the throw | The frame join. | **Yes.** Build (a). |
| The surface moving through the water the rider feels | The rise is not carried. | **Yes.** Build (c). Felt, not seen. |
| A rounded far end | The share goes 0 → 1 over about 7 m of crest, on a case that stands 0.2 m higher and 1.4 m ahead of the sea's crest [M18]. | **Partly.** A cleaner foot makes it softer. It cannot start earlier: the wave is first seen 1.76 s before the throw [M18]. |
| The drawn crest 0.2 m over the sea's | The 1 m sea does not peak its crest as the real wave does [R]. | **No.** Only if the sea's own face changes (C2). |
| A steep dark wall standing out of a flatter, paler sea | The sea holds 17–21 deg and 1.78 m. The case goes 24 → 63 deg and 1.9 → 2.0 m [M18]. The colour follows the slope. | **No.** The steepening itself is real. But the sea 10–30 m ahead stays at 8–14 deg [M18]. A long tall wall ahead needs C2. |

Plainly: three of the six can go with this method, one partly, two cannot. The two that cannot are the same fact: the sea under and ahead of the drawn wave is lower and flatter than the real wave. On a large beach that is what would show. The answer to that is C2, where the zone that draws the wave also owns the sea's face. This method is still the right first step: C2 needs the same clock, the same frames and the same carried rise.

## Build order

One change at a time. Each opt-in. The default stays byte-identical. Canyon hash check before each merge.

1. `?frameJoin=arc`. Bars A1–A6. Must not: throws' list, A–F, J3, J4, the crest's largest step, the default.
2. The foot line: a probe (slope jump across the foot, per slice, by clock), then a ruling on the join. No build before the probe.
3. `?wallRise=carry`. Bars W1–W3. Stop rule as above.
4. The owner rides it (`…&loftMesh=arc&frameJoin=arc&wallRise=carry`).
5. Remove `anchorLine=smooth`.
6. C2 on the pool, for the height gap and the wall ahead. An owner's call.

Corrections to ruling 18: the anchor line was not the ribs' first cause. The fold bars 10/20 deg are now a report. The curve bar "0.005 m" applies at the stored frames' own times, not between them.
