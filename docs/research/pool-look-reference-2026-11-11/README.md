# The pool wave against the owner's reference (2026-11-11)

**The owner's ask.** They rode the pool's Barrel with `?tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolFloor=inside` and filmed it (15 s; nine frames in `owner-build-sheet.jpg`). Two points:

1. The wave is too fast to catch: the tube reaches the surfer quickly.
2. The focus now is the wave itself. It must match this clip much more: https://youtu.be/JNbgaMo9PZo?t=13 (Surf Abu Dhabi, Kelly Slater; the owner said to watch 10 s from 0:13).

Nothing was built in this round. This page is the brief for the next one. The reference was watched in the browser at 0:14, 0:17, 0:17.6, 0:20 and 0:22.5; its frames are not stored here.

## What the reference shows (0:13 to 0:23)

- **A long wall ahead of the tube.** At 0:17.6, seen from the shore side, the unbroken face runs far ahead of the surfer at one height, about twice a crouched surfer. It is smooth and glassy.
- **The face is the darkest thing in the picture.** Deep blue, darker than the flat water in front of it and than the sky. The flat water is a lighter grey-blue.
- **A thin lip.** The lip throws as a thin curtain, pale and see-through where it is thin, with a feathered white edge along the crest for a few metres ahead of the throw.
- **A tall white pile right behind the tube.** The whitewater stands as high as the wave or higher, round and bright white, with no gap between it and the tube's mouth. Turns on the face throw white spray above the crest (0:14).
- **The surfer keeps up.** The break moves along the wall at the surfer's pace for the whole clip.

## What the owner's film of the game shows

- **The wave shows only where the tube is.** A short dark-blue box with a flat white lid travels over a flat pale sea. No wall can be seen ahead of it. Its front end is a hard vertical edge.
- **Everything else is pale.** The sea is a washed-out cyan and the sand's light pattern shows through everywhere. The tube is the only saturated thing.
- **The whitewater is flat.** Behind the tube it is a flat beige patch that reads as sand, not as water.
- **The lip is a flat white strip** on top of the box.
- **The tube arrives fast** and passes the waiting rider.

## The gaps, ranked by how much of the picture they are

| # | Gap | Likely cause in the game (reasoned from earlier measurements, not measured this round) |
|---|---|---|
| 1 | No tall dark wall ahead of the tube | The solver's wave is about 1 m with a face of about 17 to 19°. The tube's shape stands taller and steeper than the wave it sits on, so the tube reads as a separate box. The wall's height and steepness ahead of the throw are the wave generator's job (the floor and the machine's wave) |
| 2 | Pale water, no contrast | A steep face shows the sky less and the deep water more, so gap 1 causes part of this. The rest is the pool's bright sand under shallow clear water. The reference pool's water reads deep blue |
| 3 | Flat whitewater | The roller lens lifts the surface by only 0.06 to 0.14 of the wave's height (ruling 11). The height after the tube can only come from the solver's bore, or from a drawn pile |
| 4 | Flat white lid in place of a thin curtain | `lipLook=fray` has one of five parts. The eased, thin start of the lip and the feathered crest ahead of the throw are not built |
| 5 | The tube outruns the rider | The peel speed along the crest. On the default floor the break runs at about 9 m/s |

## Proposed order (for the advisor first, then the owner)

1. **Measure the gap in numbers.** From the reference: the wall's height against the surfer, the face's angle, how far the wall runs ahead of the tube, the pile's height against the wave, the peel's pace. From the game: the same five at the same view. A headless still from the shore side at the reference's angle, next to the reference.
2. **The wall (gaps 1 and 5 together).** Ask the advisor what floor and machine wave give a 2 m wall that stands steep for tens of metres ahead of the throw and peels at a surfer's pace (7 to 8 m/s). Both are set by the reef's angle to the wave and the depth along it. Behind a switch.
3. **Colour (gap 2).** A deeper, bluer water body for the pool behind a switch. Render only.
4. **The pile (gap 3).** The advisor's ruling 11 call 2: land the lip's water so the solver makes the bore, or draw a sourced splash-up body.
5. **The lip (gap 4).** The rest of `lipLook=fray`.

**The owner's decision (2026-11-11):** re-size the pool to the reference: faces of about 2 m, the break moving at a surfer's pace (7 to 8 m/s). The advisor's ruling on how is `ruling-13.md` beside this page.

## Ruling 13 in short (2026-11-11, the advisor; nothing measured, nothing built yet)

- **The pace.** A correction to the table above: the barrel section already peels at 6.45 to 7.1 m/s (measured 2026-11-01). Only the start section, where riders wait, runs 8.5 to 10.4 m/s. And 9 m/s is a normal pace for real riders: it is too fast for a 17° wall, not for a 2 m one.
- **The first step: `?poolSize=ref`.** Today's 1.8 m Barrel made 1.11 times larger in every length (platform 5.0 m, crest 1.0 m, period 10.5 s, a feed wave of about 1.47 m), with the big tube case scaled the same way. No new Basilisk run.
- **Then `?tubeForm=early`.** The tube's forming shape starts at the library's first frame, about 2.1 s before the throw: about 16 m of wall ahead of the tube against 2.7 m today.
- **Then the pool's colour**, render only.
- **The warning.** Size alone will likely not make the catch easy: outside the tube's shape the wall stays near 17°.
- **The owner's calls:** the rider waits further along the reef (about 70 m) or stays at 40; 2 m as a third size or in place of one; period 10.5 or 10 s; one wave or the train; whether a dark 15 to 19° wall is enough or a Basilisk run on a shallower platform is worth it.

## Step 1: `?poolSize=ref` (built 2026-11-11, opt-in)

- Built behind the switch. The default is unchanged. The write-up, the bars, the probe and two stills are in `step1/README.md`.
- It runs 600 s without a blow-up, and the fastest water is 1.11 × today's.
- It misses most bars. Faces at the take-off 2.3 to 2.7 m (aim 2.0). Peel 6.2 m/s (aim 7 to 8; today 6.45). Lip jets on 56 to 60 % of onsets (aim 90 %; today 90 to 96 %). The wall ahead of the tube is 1.3 to 1.5 m tall, as today.
- Likely cause: with the pool's wrapped sides, the 10.5 s wave leaves the machine at 41.8° where the 10 s wave leaves at 39.1°. The reef lies at 40°.

## Ruling 14: why step 1 missed, and what is next (2026-11-11)

- The ruling is `ruling-14.md` beside this page. Its two probe runs are in `ruling-14-runs/`.
- **The cause.** The build is not an exact larger copy, because the wrapped window stayed 280 m wide. Two wavelengths must fit across it, so the longer 10.5 s wave turned (41.8° at the machine, 30.6° on the platform, against 39.1° and 27.4°). That made the height uneven along the reef (2.42, 2.04, 1.92 m).
- **Two misses were the counting, not the wave.** The lip still throws once per wave in every column (93 % on u 40 to 90). The probe counted a second break line near the beach as failed throws. And the meter's 2.3 m came from that second line in 5 of 16 waves; at the reef the best faces have a median of 1.97 m.
- **The pace is not settled.** The probe's time step is too coarse to tell 6.2 from 6.45 m/s.
- **Next build: widen the window to 311 m for this size only** (280 × 1.11), period 10.5 s and feed 1.47 m unchanged. The advisor's short run with it: height along the reef 2.01, 2.06, 2.09 m; lip jets in every column out to u 110; peel 6.65 m/s (5 waves only); fastest water 8.01 m/s, right at the limit of 8.02.
- **Then**, if those hold: the reef's lengths along its line × 1.11 too.
- **The bars are re-stated** (A: the reef's own largest face per wave, 2.0 ± 0.1 m; B: 6.5 to 7.2 m/s over at least 20 waves at a 1/30 s frame; D: jets per column per wave on u 40 to 110, at least 90 %; E: a height share only; new: readings at 480 to 600 s within 10 % of 60 to 180 s).
- **The wall will not steepen with size.** Slopes do not change when a wave is scaled (14°, 11°, 9° at 10, 20, 30 m ahead). Steepness belongs to `?tubeForm=early` or a new Basilisk case.
- **The owner's calls:** whether "2 m" means the measured face or the drawn tube; a wall at the wrap against a slow drift over a session; where the rider waits (u 40 or about u 70); the fastest water at the limit.
- Next: the advisor on the period and the direction, before the owner rides it and before `?tubeForm=early`.
