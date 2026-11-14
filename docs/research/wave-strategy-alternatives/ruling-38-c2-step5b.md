# Ruling 38: C2 step 5b, and what the stills say the next step is (2026-11-14)

Advisor: this session. Read: `c2-step5b.md`, its runs, and the stills. The advisor ran both `tsc` and the suite itself
and read the diff; it did not re-run the Canyon spin-ups.

## Decision: merge

The seatbelts pass and the default game is untouched:

- `src/wave/SurfZoneSimulation.ts` gains one optional call on `this.waveZone`, which is null unless `?wave=library`.
  Everything else is inside `src/wave/library/`.
- Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, the default Canyon `ea3d57a4d49f4b48` / `a1a2555739210f96`, the
  pool off `0545d279d79bafe7`, all from fresh spin-ups, all main's own.
- Both `tsc` clean. The suite passes but for the known `poolBarrelPerf` timeout (ruling 35 §"The suite's one failure").
- The page's draw is +0.23 ms against a 1 ms bar.

**The height bar still misses and the merge does not wait for it.** The owner's rule of 2026-11-13 stands: a merge is
gated on seatbelts, not on probe bars. This is opt-in work in progress and the owner has not adopted it as the default.

## The plan's GPU forcing pass is cancelled, not deferred

The plan's step 5 named "`handBack.ts` with a GPU forcing pass", written when it looked as though the library took the
wave away from the sea and would have to give the water back. It does not: over 120 s, switch on against off, the
solver's state is **the same hash**, the water against the beach is 0.90325 m both ways, and the mean currents
correlate to 1.000000 over 232,628 components. Not "within 30 %" — the same bytes.

The agent was right to leave it out, and right to flag it rather than quietly skip it. A forcing pass would put the
mean level, the backwash and the rips at risk to fix a bar that is not failing. **Cancelled.**

**The mean-level drift is struck as a bar, not recorded as a miss.** It misses by 0.0285 m, and the sea *alone* misses
it by the same number to the fifth decimal, because the pool is still filling over that window. A bar that the control
fails identically measures the control, not the branch. It is re-aimed in §"Carried" below.

## The foam is built, measured, and cannot be seen — and the stills say why

The agent's own headline: six of seven stills are identical to the pixel with the foam switched off, and **the owner
has not been shown the thing they asked for**. That is honest, and it is the right call to hand back rather than tune.

But the cause is not the cameras. **Look at the stills.** In `before-front-midday` the pool's water is a bright
near-white turquoise with heavy caustics in the whole foreground, brighter than any foam drawn on it could be. In
`after-ride-midday` — the one shot that looks down the line, where the foam lives — the broken water *is* paler than
the face, and it still does not read as white, because the unbroken water beside it is already almost white.

So this is not a foam problem at all:

> **The pool's water is too bright for white to exist on it.** Every white thing this track has tried to draw since
> ruling 25 has failed the same way: the streaks (step 13), the clouds, tiger stripes and net (steps 14–16), the lip's
> face (step 12), and now the bore's foam. Five rounds, one cause.

Ruling 25e named this and the water-light change merged as #282 (gain 1, exposure 1.6, on inside `poolSize=ref`).
**These stills say it did not do its job, or it is not on in them.** The advisor read the code for the second
possibility and found a mechanism that would explain all five rounds at once:

- The water light is **Rich only**: `applyWaterLight` takes `waterLightState(wanted, this.water.drawnLook)`, and
  `drawnLook` is `effectiveLook`, which is rich only when `currentLook === 'rich' && source.cubic`
  [C, `main.ts:1108`, `WaterSurface.ts:842`]. The physical source is cubic, so the gate that is left is the graphics
  setting.
- **The foam field is Rich only too**, and this is the sharper half: `WaterSurface` reads `source.writeAeration` at
  all only inside `if (this.effectiveLook === 'rich' && source.writeAeration)` [C, `WaterSurface.ts:543`]. In the
  Classic look the aeration is never written into the material, so **no foam of any kind is drawn** — not this
  branch's bore foam, not the sea's own.
- The owner's M4 report of 2026-11-11 is that the frame rate drops **next to the tube** and the quality falls
  Ultra → Medium. If Medium does not draw Rich, then the water goes bright and the foam disappears exactly where and
  when the foam matters, and recovers when the rider moves away.

**This is a hypothesis, not a finding.** It needs two facts: which looks the quality presets select, and which look
the still tool drew. Both are reads, not builds. If it holds, nothing about the foam was ever wrong, and five rounds
of drawing white on white were spent on a render gate.

**Stop drawing foam until the water is right.** The foam built here stays, unchanged and switched on: it is measured
correct (+0.45 of cover on about 200 nodes a wave, Koepke's ageing ratios, no white layer, the page's shaders
untouched), and it will appear by itself the moment the water stops being white. Nothing more is drawn on this water
first.

## Two other things the stills show, logged for later

- **Terraces on the face.** In `after-ride-midday` the dark wall carries horizontal ledges down its left. These are the
  lane steps ruling 33 left for a polish round. They are more visible from down the line than from the front, which is
  where a rider looks.
- **A dither stipple** across the foreground in both shots. Cause unknown; it is on in `before` too, so it is not this
  branch's.

## The one regression: a sparse new bed is worse than no bed

The A0 clamp went **277 → 717** when ruling 31's ten cases came in, because the two new beds carry only two A0 rows
each (0.25 and 0.355) and the matcher chooses the bed first, then A0 inside it. A slice at A0 0.13 on slope 0.06 now
lands in `b15` and clamps up to 0.251 — nearly double its own amplitude — where before it bracketed across `b1` and
`b2`, both of which carry all four rows.

- **It does not hold the merge.** It is a probe number, the switch is opt-in, and the ten cases also fix a great deal:
  the unclamped population grows from 10 slices at median 1.121 to 57 at 0.978, 90 % within 1.028, which says the
  shape is right wherever the keys reach.
- **The cure is named and cheap:** the A0 0.12 and 0.15 rows on `b15` and `b25` — four Basilisk runs, about an hour of
  one core each, no reasoning round. **They are started now** so the next wave round has them in hand.
- **The rule this writes down, for every library from here on:** a new bed goes in with its whole A0 column or it does
  not go in. Half a bed takes slices away from the neighbours that could have served them.

## Accepted judgment calls

- **The files grow 11.8 → 24.9 MB**, over the plan's 15 MB. Accepted for an opt-in switch on a local dev server. It
  becomes a real bar before `?wave=library` becomes the default, together with a question nobody has asked yet:
  whether all nineteen cases are fetched up front or only the ones the matcher reaches.
- **Reading the bore's front, not its top.** Round 1's hand-back reading hopped metres because a bore's top is flat.
  Correct, and a good catch by the agent on its own work.
- **The in-page aeration gap** (`writeUniformAeration` never applied the zone's aeration, so an in-page build drew the
  library's white over the sea's air) was a real bug, found and fixed in passing.
- **Ruling 35 item 3, the throw's kink:** closed. 13.6 m/s² measured at the crest, 0.32 m/s² felt under a board, and
  the felt acceleration is capped at 5 g. Nobody feels it; a C¹ clock would move every slice's shapes in time to fix
  nothing.
- **Ruling 35 item 4, the 0.6 s collapse fold:** closed as unfixable by this route, with its reason. The stored
  profile is folded at +3 τ in all 19 cases because the 128 points keep their arc parameterisation. The quantity that
  would key it is the void's closing, which the game's files do not carry. It is reopened only if the owner's rides
  show the collapse.

## Carried

1. **The pay-back's course.** The drift over the 2.4 s blend-out is not small: 39.7 % of 0.1 s windows over 0.3 m, and
   the case's crest stands a median 1.27 m from the sea's when the blend-out starts. A longer course would cut it
   about 2.5× and change no shape, at the price of re-measuring step 3b's set. First item of the next build round.
2. **The τ clamp is a lead, not a key.** 814 slices clamp, every one low, all on the gentle beds: those runs do not
   start early enough. Ten more cases cannot fix it; the runs themselves want a longer lead-in.
3. The mean level, re-aimed: run the set-up comparison from a **filled** pool, not a filling one, or drop it.
4. The lane terraces (ruling 33's polish round), seen from down the line.

## Next, in order

1. **The look gate** (reads first, then a build only if they say so): which look each quality preset selects, and
   which look the still tool drew. Then re-shoot the same stills with the look forced Rich. If the foam appears, the
   fix is that the pool must not drop out of Rich, or the foam must not be gated on Rich — the owner's call, and a
   much smaller change than repainting the water.
2. **Only if the look was Rich all along:** the pool's water colour and exposure are the next build — #282 did not go
   far enough, and the measurement to take is the water's own luminance against the foam's, not another foam attempt.
3. The four A0 runs land; wire them; read the A0 clamp again.
4. The pay-back's course.

The owner rides after step 1, not before: the foam will not be visible to them until the water is fixed, and a ride
spent on an invisible change is a ride wasted.

---

## Amendment, 2026-11-14: the 600 s set-up run landed, and it strengthens both calls

The run the step 5b agent could not finish inside its round completed about forty minutes after it handed back
(`c2-step5b-runs/setup-600s.txt`, 600 s of the 2 m pool, `?wave=library` on against off, both on the same 1/60 s
clock). It confirms this ruling's two decisions at the length the plan asked for:

| | on | off | bar |
|---|---|---|---|
| solver state (h, qx, qz, every 97th cell) | `f368a4bf` | `f368a4bf` | — |
| water piled against the beach (12 shallowest rows) | 0.93171 m | 0.93171 m | within 30 % |
| mean currents, 232,628 components over 540 s | correlation 1.000000 | | at least 0.8 |
| mean level, first to last | 0.03422 → 0.06037 m, drift 0.02614 | 0.03422 → 0.06037, drift 0.02614 | 0.01 m |

1. **Cancelling the GPU forcing pass stands, now over nine minutes rather than two.** The same solver bytes, a ratio
   of 1.0000 and a correlation of 1.000000 over the full window. Two windows agreeing to the fifth decimal is a
   stronger statement than either alone.
2. **Striking the mean-level bar stands, and the reason is better than the one given above.** This ruling said the bar
   measured "the pool still filling". It does not: the level's whole band over the nine minutes is 0.03422 to 0.07791
   m, and the 600 s figure (**2.61 cm**) is *smaller* than the 120 s one (2.85 cm), so **the tank rises and falls — it
   is the pool's own slosh after the spin-up at 21 s, not a drift.** Either way it is identical with and without the
   library to the fifth decimal, so it is a question for the sea and no C2 step can move it.

Carried item 3 ("run the set-up comparison from a filled pool, not a filling one, or drop it") is **re-aimed**: there
is nothing to fill. If the bar is kept at all, it belongs to the sea's own spin-up, measured over a whole number of
slosh periods.
