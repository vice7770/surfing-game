# The Canyon's version B: a beach peak peeling into a reef bowl (2026-11-01)

The owner chose version B (2026-10-31): "the wave starts from the centre, is surfable into the reef area and forms a
tube … the most consistent, requires only wave work". Their decisions: the up-coast beach peak peels into the reef bowl;
the down-coast peak stays a spilling A-frame; the bowl plunges over 15–25 m with the tube off for now; its transect is
fixed so Basilisk tube cases can follow. This replaces canyon-beach-break's "leave the reef as it is".

Branch `claude/canyon-b` from main at 376d9cd4. Wave work only: no rider sessions in tests.
Switch: `?canyonBed=old` is main's Canyon at 376d9cd4, byte for byte. Online rooms run the default.

RESULTS_PLACEHOLDER

## The design (the water-physics advisor's, 2026-11-01)

The consult is logged in `docs/research/water-physics/consult-log.md`.

**The constraint.** On the bars the white travels along the arms by rule A's breaking age, at a visible 37–47°.
- A steep bowl breaks within about 2 m of the same place for each 0.1 m of wave height. The arm's peel arrives 6–9 m
  further out for each 0.1 m.
- So a bowl can be on time for one wave height only. The advisor tuned it to the smallest wave that breaks on it
  (about 1.2 m): the bowl never breaks before the peel arrives.
- At Medium the bowl backs off about 1–3 s before it pitches, at Big 5–9 s. The alternative is to move it 10 m
  seaward, so Medium's sets are on time and its smaller waves 1–2 s early. That is the owner's call.

**The bed** (`src/wave/Bathymetry.ts`, `CANYON`'s `reef`, `bowl*` keys; `canyonBarDepth`'s `bowlProfile`):
- **No reef terrace.** The old reef's arm, 120 m out at x −17, broke 25–35 m seaward of where the bar's peel had got
  to, so it always broke first. The bowl takes its place and inherits its rock, its breaking rules (the spot's 0.65
  onset, the 0.5 age gate), its spilling front and its readout.
- **The up-coast bar** (tip x −112, 1:50, the default start) is unchanged at its tip and on its −x arm.
  - Its +x arm runs on with no rip into the bowl, its contours at `bowlArmAngle` 32° (40° before; see the screens).
  - The arm itself is unchanged to 55 m from the tip (u).
- **The bowl along the arm** (u from the tip): ramping in over u 55–65; whole to u 80; its crest deepening from 1.2 to
  2 m over u 80–88, so the wave backs off; then bar and bowl fade into the floor over 15 m.
- **Its transect along +z** (Mead & Black's platform, ridge and wedge; Mead 2000):
  - the bar's 1:50 down to 3.0 m;
  - a platform level at 3.0 m for about 17 m, up to 0.35 m deeper than the bar beside it, which carries the waves
    unbroken to the face;
  - a knee rounded ±4 m;
  - a 1:21 face, 38 m wide, to a 1.2 m crest on the bar's 1.9 m contour, so its contours run with the arm's;
  - a top level for 9 m, then down at 1:30 to meet the bar; no lagoon.
  - Fixed for the Basilisk cases: below.
- **The channel** past the bowl is the plain 5 m floor, x −14 to the down-coast arm, out to the floor's edge and in to
  the 1:15 face's toe at z −75. It is never deeper than the floor: deeper water would lead the crests round the bowl's
  end (the advisor). The old reef's 6 m pocket is gone.
- **The down-coast peak** (x 121) is unchanged, value for value.
- **Rock** covers the bowl where it stands above its bar: its upper face, top and back. The bowl stands only 0.4–0.7 m
  proud, so its relief counts three times a ledge's (`BOWL_RELIEF`). The bars and the channel stay sand.

**Breaking.** The bowl breaks by the reef's rules (0.65 onset at every depth, the 0.5 gate) from where it ramps in. The
beach's rules (0.40 onset on water 3 m deep or shallower, rule A) blend in over 5 m on the arm's side.

**The readout.** The bowl is the up-coast peak's, not a reef of its own: "Spilling peak into a plunging reef bowl, left
…° and right …°" (`PeelEstimate.bowl`, the bowl's breaker at its own take-off, `canyonBowlTakeOff`). The Wave Lab's
peaks are the two beach peaks; the up-coast one's stretch runs on to the channel.

**The bowl's transect for the Basilisk cases** (along +z through the middle of the whole bowl, u 72.5, x −39.5; mid
tide):

TRANSECT_PLACEHOLDER

The M4's earlier Canyon reef cases (the reef's 1:23 take-off transect from the 6 m foot at x −9) no longer apply: that
reef is gone from the default layout. They still describe `?canyonBed=old`.
