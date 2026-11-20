# The Canyon's curl down the line, and the roller front's toe (2026-10-23)

Branch `claude/canyon-curl-front`, from `main` at 7ef7d22b (#155's tube wiring and #156's Canyon round 2 merged in). This
work is drawn only: nothing felt changes, and the bathymetry and solver are untouched. The owner neither gave input nor
tested; the calls below rest on measured numbers and stills, on the 8 GB M1.

**Dev switches** (both default to today's look):

- **`?curlLocal=off`**: the curl, its band and the roller front's look take the nominal take-off H wherever a column has no
  H of its own, as before. It is part of the sea's config, so it needs a page load.
- **`?rollerToe=old`**: the roller front's toe as the first build drew it. In a page, `waterRollerFrontToe('old' | 'new')`
  switches it live.

## A. The curl's size down the line

**The question.** The worry was that the drawn spilling curl is sized by the take-off (or a foot crest) and stays that
size down the crest, while the solver's sets shrink as they peel. #156 measured the sets at 60 m at 1.70 m (Medium) and
2.53 m (Big).

**How it was measured.** `src/wave/probes/canyonCurlSize.probe.test.ts`:

- The game's swells, seed 1, 150 s after a period's spin-up, with the Canyon's tube library as the game loads it.
- Each column's curl is read as it touches down: one sample per column and wave, outside the tube's columns. Each sample
  has its H, the source of that H, its throw (where the lip lands ahead of the crest), its void W, its lip and τ_i.
- The local wave there at the same step is the solver's face: crest to the lowest water within half a wavelength ahead
  (`waveHeightAt`, as the size report's onsets measure it). The column's own last onset face is a second check.
- Samples are binned 0, 30, 60 and 90 m along the ride (arc length along the break line, ±15 / 7.5 m, as #156's ride
  report). Every standing slice is also tallied in every frame of its flight.

**What it found: the curl already follows the local wave.**

- **It is sized locally.** Each step, each column's curl takes its H from that column's roller lens. The lens is a section
  of the solver's surface, crest to trough. Its throw, void, lip, rise and touchdown τ_i = 0.6 √H all scale with that H.
- **At touchdown,** H ÷ the solver's face there has a median of 1.00 at every station, at both sizes.
- **In flight,** the median is 1.00 everywhere too.
  - A few per cent of slice-frames read a section before their lens is born. While the curl grows, the 10th percentile of
    H ÷ face is 0.76–0.93.
  - A column's H moves 5–13 % over its flight (median).
- **The nominal take-off H was never used** by a curl slice in either run.

The sets (top third by face) at touchdown:

| Station along the ride | Medium: H drawn / solver's face, m | Medium: throw, void W, lip, m; τ_i, s | Big: H drawn / solver's face, m | Big: throw, void W, lip, m; τ_i, s |
| --- | --- | --- | --- | --- |
| 0 m (±15) | 2.51 / 2.50 | 1.88, 1.00, 0.21; 0.95 | 3.06 / 3.18 | 2.30, 1.22, 0.26; 1.05 |
| 30 m | 2.29 / 2.28 | 1.72, 0.91, 0.19; 0.91 | 2.47 / 2.59 | 1.85, 0.98, 0.21; 0.94 |
| 60 m | 1.14 / 1.13 | 0.85, 0.45, 0.10; 0.64 | 2.51 / 2.54 | 1.88, 1.00, 0.21; 0.95 |
| 90 m | 1.20 / 1.20 | 0.90, 0.48, 0.10; 0.66 | 2.35 / 2.44 | 1.76, 0.93, 0.20; 0.92 |

- **All slices, medians** (H / face, m):
  - Medium: 1.75 / 1.75, 1.19 / 1.33, 0.83 / 0.86, 0.94 / 0.90.
  - Big: 2.48 / 2.49, 2.16 / 2.18, 1.87 / 1.94, 2.14 / 2.14.
  - Full tables: `curl-size-before-*.txt` and `curl-size-after-*.txt` (with the tube's share and the in-flight tally), and
    `curl-flight-before-*.txt`; the CPU A/B in `curl-cost-medium.txt`.
- **So the curl shrinks with the wave.** At Medium its throw falls from 1.88 m at the peak to 0.85–0.90 m at 60–90 m. At
  Big, where #156 keeps the sets 75–80 % of the peak, it falls from 2.30 m to 1.76–1.88 m. Pitch then pour already takes
  its Δy from the slice's own peak and its landing on the drawn face, so t_f = √(2Δy / 0.65 g) is already local.
- **The swept tube on these stations.** It takes the crest in these columns, so the curl draws nothing there. Its share of
  the touchdowns at 0 / 30 / 60 / 90 m:
  - Medium: 17 / 16 / 22 / 0 %.
  - Big: 22 / 38 / 34 / 43 %.

  `sweptLoft.ts` sizes the tube's slices by their foot crest, as the advisor noted. That is the barrel's code and is not
  changed here. If a take-off-sized lip shows down the line at Big, it is most likely the tube.
  - `SpillingCurl.height[column]` (public, every step) is the local lens H per curl column. The loft could read it, or
    the solver's face itself; no new interface is needed.

**What was still take-off sized, now local.** In three fallbacks the curl, its band and the roller front's look took the
nominal H, 0.8 γ h_b (1.40 m at Medium, 2.14 m at Big). Each now takes the local wave's H: linear between the nearest
columns of the same wave (or run) within 6 columns that have their own, and only then the nominal (`LOCAL_REACH`).

1. **A curl column with neither a lens nor a section.** Never seen in these runs, but it would have timed the column's
   white and its splash at the take-off H.
2. **The band of a wave other than the column's own curl:** its touchdown and landing line. Now from that wave's lens.
3. **The roller front's look H on a gap its run bridged.** At Medium this is 2–9 % of drawn entries (`roller-table-medium.txt`).
   In the short inside runs it is 9 %: drawn at 1.40 m where their lenses are 0.47 m, so the nose and lumps there were
   about 3× too big. This feeds problem 2 below.

**At the peak and take-off nothing changes.** The touchdown tables after the change are identical to before, line for
line: seed 1, 150 s, both sizes. Every curl column there has its own lens.

## B. The roller front's toe

**The consult.** Only one agent runs at a time now (the owner's credit limit), so the water-physics advisor was consulted
through its knowledge base (`docs/research/water-physics/roller.md`, `roller-build.md` and `foam-and-whitewater.md`)
rather than as a live agent. Logged in `consult-log.md`. What it says about the right look:

- **The roller covers about 2.9 H of face** (Martins et al. 2018). It is thickest near the crest, 0.25–0.5 H, and tapers
  to nothing at the toe; its top rises steeply from the toe, like a hydraulic jump's.
- **The look:** "a fingered toe with dark holes, up to a solid white band at the crest". Holes open in the toe half
  (Wüthrich et al. 2022). The toe wanders at 1 and 5–10 trough depths (Wang, Leng & Chanson 2017). Spray leaves the toe at
  30–45°; that spray is already thrown (`SprayCloud.toeSpray`).
- **Shedding:** the roller is shed once the bore stops breaking (Fr₁ below about 1.3), and as it sheds its air rises out.
  The lens's scale falls.
- **From water level, then:** an aerated, ragged, forward-leaning toe with spray, not a step.

**Why the first build read wrong.**

1. **The ledge.** The nose was a rounded white wall of radius 0.1 H centred on the water. It met the water vertically along
   one continuous contact line. That line was lit as a vertical band, with a dark line at its foot. The face's last third
   also rose by 0.06 H to its top, a ridge. And the toe line's short octave (1.5 m), sampled at the half-metre
   sub-columns, stepped it in plan.
2. **The mats with a rim.** The front was drawn at full opacity, and with its full nose, from a drawn scale of 0.5. A
   shedding roller's scale falls, and the band over it fades with it (its cover g × band). The front stayed opaque: one
   inside run 21 s old, at g 0.4, drew an opaque cauliflower mat with a rim over a faint band (`medium-inside.jpg`). The
   bridged gaps drawn at the nominal H (A.3) added oversized noses.

**What changed** (`ROLLER_TOE` in `src/scene/RollerFrontMesh.ts`; P marks a value set by eye):

- **`lean` 0.5** (P): the nose's upper half is sheared forward by half its height over its centre. It meets the water
  under an overhang, not as a wall.
- **`sink` 0.35 R** (P): the nose's centre sits under the water. It stands lower and meets the water about 20° up its arc,
  leaning forward, and the face's last third rises that much less to it, so there is no ridge.
- **`cut` 0.7** (P): the churn's clumps (0.75 m domes, carried at the nose's tumbling pace) cut the toe's edge into fingers
  and holes. The threshold rises from none at the nose's top to 0.7 at the waterline, so only the clumps' tops reach the
  water.
- **`air` 0.75** (P): the opacity kept at the waterline, for aerated water. At 0.5 the toe read as glass.
- **`holes` 0.5** (P): once aged (by the fresh gain's φ = e^(−since / 1.5 s)), the toe half opens in holes the same way,
  as the band's toe half does.
- **`shed` 4–8 s** (P):
  - Once old, the front's opacity and nose fade with the drawn scale g, as the band does. Its edges, its run's ends and a
    shedding roller are cut into broken foam on the way out.
  - While young it keeps the first build's fade, full from g 0.5. Its lens's scale is still growing then, over 6.5
    breaker depths of travel (3–4 s), and a linear fade would have dimmed the young front at the peak.
- **The toe line** takes the band's long lobes only (7.5 h₁). The fingers now come from the clumps, per pixel. This is one
  noise evaluation less per vertex.
- **The look's H** on bridged gaps is local (A.3).

**Stills** (Rich; old and new toe from one held sea, side by side, at midday and sunset; `waterSheetGrid`):

- **`medium-toe.jpg`**, Medium. Rows, top to bottom:
  - a paddler at 0.75 m, 7 m in front of a 6 s bore (H 1.2 m);
  - water level along that bore's toe;
  - the start camera, 3.6 m up and 15 m away;
  - the beach at the waterline, 1.7 m up, looking at a 1 s bore on the +x flank.
- **`big-toe.jpg`**, Big. The same rows, with a 7 s bore (H 2.2 m) and the swept tube at the start.
- **`medium-paddler-sunset-close.jpg`**: the paddler's view at sunset, larger.
- **`medium-inside.jpg`** and **`big-inside.jpg`**: short inside runs with the front off, old and new. Medium has a 7 m
  run, 21 s old at g 0.4; Big has runs of 5 and 8 m, 20–24 s old at g 0.6. They are seen from 3 m up at 11–12 m, and from
  water level.

What they show:

- **From water level** the old toe is a slab: a lit vertical edge and a dark foot line along the water, with a box corner
  at its run's end. The new toe has no vertical band. Its foot breaks into clumps with water between them, and its run end
  frays. The lumpy top of an aged bore is unchanged, so it still reads as a white mass.
- **The inside runs.** Old: an opaque grey-white mat with a rim. New: close to the band alone, a faint, broken white.
- **The start camera** (the peak's landing, and Big's tube) is unchanged.
- **Sunset** keeps its peach-white.

**Not done.** The lean is hard to see in stills; a moving bore should show it. The aged bore's lumpy top (the cauliflower
the first build chose) is unchanged. The toe spray is unchanged.

## Cost

**GPU** (`waterSheetGpuAB`, Big, Rich, the pane hidden, the M1 shared; 50 cycles of old, old again as the control, and
new). The per-cycle median against the first arm, ms:

| View | Frame median | New − old | Control − old |
| --- | --- | --- | --- |
| Paddler facing the bore (the front fills the frame) | 12.9 | +0.01 | −0.04 |
| Start camera | 24.4–26.0 | +0.04 | +0.02 |
| Beach | 30.4–30.6 | −0.06 | −0.01 |
| The sheet's bore shot | 48.7 | +0.03 | −0.06 |

- **Within noise:** the new toe is ±0.06 ms against the control.
- **No change to the Rich tank shader:** only the front's own program changed. It gained one varying and a few ALU lines in
  its fragments, and lost one noise evaluation per vertex. Its texture units are unchanged (`textureUnits.test.ts`).

**CPU** (Node, Medium, 60 s, the local H on and off on alternate steps of one sea):

- The roller and curl's step: 0.215 ms against 0.214 ms (median).
- The drawn band with its look (`writeRoller`): 0.046 ms against 0.044 ms a snapshot.

## Other spots

Nothing outside the Canyon's spilling curl, band and roller front changed. Only a sea with the spilling lip, which is the
Canyon alone, has a curl; the front draws only where its table does. `?rollerToe=old` compiles main's front program byte
for byte: checked once against 7ef7d22b's `RollerFrontMesh.ts`, and pinned by a test that the old program carries none of
the new code.

## Tests

- **`SpillingCurl.test.ts`:**
  - the look's H on a bridged gap, local and with `local: false`;
  - the look's touchdown for another wave's band, its lens's H or the nominal;
  - the band test's mock roller gains `lensOf`.
- **`RollerFrontMesh.test.ts`:** both toes' programs. The nose sinks and leans, and the fragments read `vRfToe` and the
  clumps. The old one has none of it and a different cache key.
- **The probe** (`canyonCurlSize.probe.test.ts`, opt-in with `PROBE=1`): the curl at touchdown and in flight against the
  local face (default), the drawn table by run (`TABLE=1`), and the curl's CPU cost (`COST=1`).
- **Results:**
  - `npx tsc --noEmit -p .`: clean.
  - The main suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation` and `SurfZoneRunner`): 303 files
    passed and 30 skipped; 2,886 tests passed, 18 expected failures, 36 skipped.
  - The Canyon simulation tests (`SurfZoneSimulation.test.ts -t "[Cc]anyon"`): 16 passed (687 s). No `SurfZoneRunner`
    rider sessions were run.

## For the owner to record

Canyon, Rich (High). Use `?rollerToe=old` for the before toe, and `?curlLocal=off` for the before fallbacks.

1. **Low and slow.**
   - Paddle out and sit 5–8 m in front of a bore about 5 s after it broke, at Medium and Big.
   - Does its toe read as a ledge or as an aerated, broken edge?
   - Watch it pass: does the front lean forward as it comes?
2. **The inside.**
   - After a ride, look at the short white patches left inshore, 15–25 s after the break.
   - Do they read as a faint broken foam, or as mats with a rim?
3. **The start camera at the take-off.** It should look exactly as before: the curl, the landing and the young front.
4. **Down the line.** Ride a Medium set to 60–90 m.
   - Does the lip shrink with the wave?
   - At Big, does a take-off-sized lip show in the swept tube's stretches? The tube is not changed here.
5. **Sunset.** Is the front's broken toe still warm, and not grey?
6. **Frame rate.** On the M1 with the pane shown, at Big's sets.
