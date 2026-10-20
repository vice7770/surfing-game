# The roller front: a tumbling white front over the Canyon's bore (2026-10-22)

The owner's feedback (2026-10-22): "the foam is not good, just a white soft movement after the wave breaks". They
chose a tumbling front: a churning, rolling wall of white at the front of the bore. Built on `claude/roller-front`
(from `main` plus the lip's round 5), after the water-physics advisor's option e: a ribbon of its own, drawn only, in
Rich.

Dev switch: `?rollerFront=off` (no ribbon, no toe spray); in a page, `waterRollerFront(false)` hides the ribbon and
`waterRollerFrontTune(lumps, shade)` scales its numbers live (1 as shipped).

## What was built

**The band's look beside its table** (`SpillingCurl.drawBand`, `BAND_LOOK_FIELD`). Per slot and column, the time since
that column's curl landed and the wave's H (its lens's section, or the nominal H on a bridged gap). It travels in the
snapshot as `rollerLook`: 2 floats an entry, 5 KB at the Canyon (the surface is 896 KB). The drawn table is unchanged
with it, and the felt table is never read back (tested).

**The ribbon** (`src/scene/RollerFrontMesh.ts`). A `MeshStandardMaterial` with its own vertex and fragment code.
- **Geometry.** One instanced patch per slot and column pair: half-metre sub-columns by 20 points across (60
  vertices), the points packed toward the nose. The patches are static. The vertex shader reads the drawn table from the water's own roller texture, as
  the band does, and the look from a small RG32F texture. A patch with neither end drawn collapses to a point.
- **The section.** Buried 4 cm at ξ = −0.3, over the crest and down the face. At the band's wandering toe (its toe
  noise) it rounds a nose of 0.1 H that curls under the water, at most 0.3 of a young band's length.
- **Lumps.** Billows of a gradient noise on the band's pcg3d hash: rounded lumps between creases, upward from the felt
  top.
  - σ = d′max × an envelope: 0.4 at the crest, all of it over ξ 0.5–0.9.
  - The cap is the roller's thickness t(ξ): the lens's own, or 0.235 H where that is thinner. The Canyon's lenses
    measure 6 H and more long, so their crest thickness comes out at 0.08–0.16 H, against the advisor's 0.20–0.27 H.
  - The nose is a row of bulges, 0.6–1.4 × 0.1 H.
  - Young to mature: σ falls from the table's d′max to 0.155 h₁ over 6.5 breaker depths of travel. Inshore, the
    table's Fr-based d′max stays at its 0.4 cap, and without this the aged bore stood in 0.2–0.3 m lumps.
- **Motion.** Each region is carried rigidly along the arc in two flow-map phases a lump's lifetime apart (1 s), each
  phase a new lattice:
  - behind the crest, shed at −0.5 c;
  - on the face, creeping at +0.05 c;
  - over the nose, tumbling at +0.18 c.
  The 0.5 h₁ clumps between the lumps are the churn tile's, carried along the section in the fragments, at the face's
  and the nose's pace.
- **Shading.**
  - The foam colour, matte (roughness 0.8), with the band's capped wrap.
  - The normal is bent toward the sky as a scatterer's, steep faces more.
  - Creases between lumps (0.84 of the light) and between the churn's clumps (0.64), calmer once mature.
  - Fresh is brighter: light × (1 + 0.6 φ) × mix(0.85, 1, φ), with φ = e^(−since/1.5 s). That is 1.6× the band's at
    touchdown, 1.43× at 0.4 s and 0.86× once aged (1.55× between the landing and 5 s later). Fresh foam fills its
    creases and glows where it is backlit.
  - Its detail fades as it shrinks on screen (as the curl's `DISTANCE`).
- **Handover.** It reads the drawn table, so it starts where the band starts (at touchdown, with the 0.15 s flash, as
  the void fills over 0.5 s) and frays where the band frays (round 5's peel-side cut and the upcoast fray, through the
  drawn scale). It fades into the band at its rear (ξ −0.3 → −0.06) and at its run's ends. The band stays underneath,
  and its rear edge hands over to the lace.

**The toe's drawn spray** (`SprayCloud.toeSpray`; Rich only). A sparse fringe off each landed band's toe line (0.9 of
its drawn length): 2.5 drops a metre a second while young, 0.3 of that after 2 s. They are thrown along the lens's
water velocity at 1.5 c, 30–45° up, and fall at 7.3–8.1 m/s (2.5–3 mm drops). They come from their own random stream,
so every other drop is as before (tested). The simulation hands the spray the drawn table once a step
(`rollerToes`).

## Nothing felt changed

The ribbon writes nothing. The look array and the toe spray are drawn only. The felt table, `heightAt`, the push, the
lip's felt identity, rollerScope and rollerFeel pass unchanged. `SurfZoneConfig.rollerFront` only gates the toe spray.

## A cost found on the way

The first build rewrote seven instance buffers with each snapshot. On the M1, ANGLE's Metal stalls a buffer rewrite on
a frame still in flight: the water sheet's back-to-back frames timed it at +9.3 ms. The curl's own per-snapshot
rebuild times at +6.8 ms the same way. A texture upload times at nothing, hence the static patches and the textures.
The in-game frame loop leaves the GPU time to finish, so the curl measured within noise in round 4. The curl's rebuild
may still be worth moving to a texture.

## The fresh/old ratio

The tool is round 5's `waterSheetLipContrast`. The ride camera stands 3.6 m up, 15 m from the white. Medium, High, seed
1. The landing is at 157.3 s: a 1.8–2 m set's columns 0.15–0.65 s after touchdown (x −38 to −31). The white 5 s older
is at 161.6 s: the same wave's columns 4.5–5.5 s after (x −36 to −30). The two come from separate frames. The new
`layer` option also gives each region's mean over the front's own pixels.

| | Front off | Front on | Front on, its own pixels | Front on, 90th percentiles |
| --- | --- | --- | --- | --- |
| Midday: landing ÷ 5 s older | 0.89 (0.653 / 0.736) | **1.14** (0.691 / 0.607) | 1.29 (0.776 / 0.602) | 1.07 |
| Sunset | 0.92 (0.594 / 0.648) | **1.26** (0.710 / 0.563) | 1.39 (0.788 / 0.566) | 1.15 |

**Short of 1.5–2×.** The front's light runs 1.55× from the landing to 5 s later (the test holds it between 1.5 and 2),
but on screen the gap closes, for three reasons:
- **The tone mapping.** Neutral compresses above 0.76, so the young front's lit tops saturate near 0.9. Under the first
  build's 3.5× gain the landing's own pixels reached only 0.90, and the young front was a flat white cut-out (see
  below).
- **Dilution.** The landing region (1 m behind the crest to 6 m ahead) holds foam pixels the front does not cover:
  the collapsing curl and the band's thin edges.
- **The old white.** Five seconds later the aged front reads 0.60 at midday, against 0.74 for the band alone.

Reaching 1.5 on the tool's measure means the aged front at about 0.5. That is greyer: the `aged` 0.8 build measured
1.28 on the tool and 1.45 on the front's own pixels, and its aged bore read as grey stone. That is the owner's call;
the knob is `ROLLER_FRONT.aged`.

Big's ratio isn't measured. Five seconds after its landing the wave has no curl slices left, and the tool skips a wave
without them.

## The cost

The M1 Air, shared: another session's tab rendered on the same GPU throughout, so frame times ran 8–129 ms. The pane
was hidden. `waterSheetGpuAB` alternated three arms frame by frame (off, off again as the control, on). The figures are
the median per-cycle difference, on minus off, then the control's, then the net (on − control), in ms, over 50–60
cycles. "Away" looks offshore with the front behind the camera, so it times the vertices alone.

| Size, preset | Ride camera, 15 m | Down the line, 4–5 m | Lineup, behind | Overview | Away (vertices only) |
| --- | --- | --- | --- | --- | --- |
| Medium, High | +0.22 / +0.25 / **−0.04** | +0.28 / −0.11 / **+0.39** | +0.92 / +1.12 / **−0.20** | +0.47 / +0.16 / **+0.31** | +0.31 / +0.22 / **+0.09** |
| Medium, Medium | +0.59 / +0.39 / **+0.20** | +0.23 / −0.28 / **+0.51** | +0.36 / −0.04 / **+0.40** | +1.24 / +1.02 / **+0.22** | +1.05 / +0.62 / **+0.43** |
| Big, High | +0.53 / +0.10 / **+0.44** | +0.17 / −0.05 / **+0.22** | +0.41 / −0.07 / **+0.48** | +0.90 / +0.63 / **+0.28** | +0.52 / +0.48 / **+0.04** |
| Big, Medium | +0.33 / +0.16 / **+0.17** | +0.24 / −0.09 / **+0.33** | +0.32 / −0.03 / **+0.35** | +1.29 / +0.79 / **+0.51** | +1.09 / +1.35 / **−0.26** |

- **The rows' builds.** Medium, Medium is the 27-point build, with three noise evaluations a vertex. The other rows
  are as shipped.
- **Within budget.** Every net figure is within +0.6 ms. The controls run to 1.35 ms, so the single figures are good
  to about ±0.5.
- **Vertices** (as shipped):
  - live: 3.6k at Medium (55 drawn entries, about 60 patches) and 13k at Big (210 entries, 220 patches);
  - run, the collapsed patches included: 38k a frame (4 slots × 159 column pairs × 60).
  - The quarter-metre, 27-point build ran 30k live at Big, and its vertices alone timed +1.1 ms (Big, Medium preset).
  - With three noise evaluations a vertex it timed +0.6 ms at Medium, High (away).
- **CPU** (measured in the page, the same engine as the worker):
  - The page lays out the look's texture once a snapshot: 0.003 ms.
  - The snapshot's drawn table with its look: 0.0124 ms against 0.0104 without; +5 KB on a 0.9 MB snapshot.
  - The worker's toe spray: 0.017 ms a step, the drawn table rewritten once a step included.

## The stills and strips

All are from the dev water sheet, Rich, with the front off and on side by side, at midday and sunset.
- **Medium:** `medium-stills.jpg`, `medium-aged.jpg`, `medium-tumble.jpg`. Canyon Medium, seed 1, at 157.3 s (a
  1.8–2 m set landing at x −38 to −31) and 161.6 s (the same columns 5 s later).
  - The stills are from the start (the ride camera, 15 m), down the line (4 m, on the face), the lineup (behind,
    20 m) and the overview.
  - The tumble strip follows the nose of column x −34.5 from its side, 0.15 s apart, for 1.35 s.
- **Big:** `big-stills.jpg`, `big-aged.jpg`, at 212.3 s (a 2.5–2.9 m set landing at x −50 to −46) and 216.8 s.
- **Small:** `small-run-ends.jpg`, at 86.9 s: the run's peel-side and upcoast ends, and short runs inshore.
- **The contrast regions:** `contrast-landing-midday.jpg` and `contrast-old-midday.jpg`.

**My read.**
- **The landing.** Where the band was a soft translucent white, the front now stands up as a lumpy white heap. Beside
  and down the line it has a silhouette against the water and sky, rounded lumps, and a row of bulges at the toe. From
  the ride camera it reads as a crisper, brighter white mass. From the lineup and the overview it barely changes.
- **Young to aged.** It brightens at the landing and greys as it ages. At 5 s the aged bore reads as a field of soft
  grey-white cauliflower foam, calmer than the young front. At sunset it is peach-white, and its relief reads more
  like sand than at midday (the low sun).
- **The toe from low angles.** The nose's front still reads as a step or ledge from water level (the tumble strip),
  with the wandering toe stepping it in plan. It is lighter than in the first builds, but it is the clearest flaw left.
  The lumps' rolling over the nose (0.18 c) and their shedding behind the crest (−0.5 c) are motion: the strip shows
  the lumps shifting from frame to frame, but stills can't show the tumbling.
- **Run ends.** At Small the ends taper as the band's do. The short inshore runs become lumpy mats with a defined rim
  where the band was soft.
- **The first builds**, for the record:
  - a slab: lumps biased upward and saturated at the cap;
  - a dark wall at the toe;
  - a blown-out cut-out under the 3.5× gain;
  - grey stone on the aged bore (big lumps, 0.8 aged light).

## Tests

`RollerFrontMesh.test.ts` (7):
- the patches' reads: the dead-end rule and the slopes;
- the fresh ratio, held between 1.5 and 2;
- the envelope, and the lumps' bounds;
- the static layout and the look-only upload;
- the program's reads.

Also:
- `SpillingCurl.test.ts`: the look beside the table, and the table unchanged with it;
- `SprayCloud.test.ts` (2): the toe fringe at 1.5 c and 30–45°, Rich only, landed only; its own random stream;
- `WorkerSurfZone.test.ts`: the look in the transfer list;
- `textureUnits.test.ts`: the front's program (rfLook, waterChurnMap, waterRoller and waterSurface, plus three's).

Thirteen files around the change pass (180 tests): SpillingCurl, SpillingCurlMesh, SpillingRoller, rollerScope,
rollerFeel, rollerLook, SprayCloud, textureUnits, SurfZoneHost, RollerFrontMesh, drawnEdges, WorkerSurfZone and
hazeLand. `tsc` is clean apart from the known `zzProfile` errors. The full suite wasn't run.

## For the owner to record

- **In the game, Canyon Medium and Big, Rich (High), with `?rollerFront=off` for the before.** A take-off and a ride
  down the line beside a fresh landing, 2–6 m from the white.
  - Does the front read as a churning wall that tumbles forward over its nose, or as a white heap?
  - Does the aged white behind it read as foam or as grey lumps?
- **Low and slow.** Paddle or sit at water level as a bore passes. The toe's front can read as a ledge; is it?
- **Sunset.** The front is peach-white, and its aged relief reads as sand. Is it warm enough, and is it too lumpy?
- **The fringe of drops.** Off the toe, while young: is it visible, and is it too much?
- **The board in the froth.** It sits up to 0.25 H into the front (accepted).
- **Frame rate.** On the M1 Air with the pane shown, at Big's sets (the most live patches).
