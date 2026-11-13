# Ruling 33: C2 step 3b, and step 4 next (2026-11-13)

Advisor: this session (Opus 5.5, max effort). Read: `c2-step3b.md`, its bars in `c2-step3b-runs/`, and the before and
after stills in `c2-step3b-stills/`. No run.

## Decision: merge step 3b over step 3, still opt-in work in progress

- It beats what is on main on every look and on almost every number.
- Off is unchanged:
  - the 2 m pool's hash is 0545d279d79bafe7;
  - both Canyons keep main's hashes, from fresh spin-ups;
  - `tsc` passes for the app and the server, and the suite passes.

## What it fixed (accepted)

- The box ends, the pleats on the face and the faceted bore are gone. From the front, the tube now peels smoothly into
  the shoulder.
- Folded quads fell from 6.1 % to 1.45 %. After touchdown they fell from 80,842 to 3,962.
- Drawn = felt where the mask is off: the 0.95 m error is gone. It is 0 without the after-tube lens, which is drawn only,
  by its design.
- The A0 segment switch was real: 5.4 % of neighbour pairs. The weights are now continuous.
- Cost: the worker's extra stays at about 5.3 ms (the probe's median), and the page's draw is 5.4 ms.

## What remains, and where it goes

- **Steps in the lip's white edge, lane by lane** (the channel views), and J1's and J2's worst. The cause is neighbouring
  clocks where the lanes themselves change: at lanes 6/7 the bed slope doubles. The fix is to smooth the lanes' slope
  key and the throw time along the crest. Later, in a polish round.
- **The band's felt error** (p99 0.036 m): flat pad triangles over curved water. The fix is pads at half the spacing, or
  a mask that ends with the lift. Later; the owner's rides will show whether it can be felt.
- **The folds in the 0.6 s collapse** belong to step 5 (the bore and the foam).
- **The inside view:** the lip's curtain is a flat sheet, ruled between slices. It matters for riding the tube. It goes
  with step 5's lip and foam look, with the water-physics advisor consulted first.
- **The stipple where the tube meets the whitewater:** step 5's foam covers that join.
- **The height bar** waits on ruling 31's ten runs (about 18:00). Read it again then.

## Decision: step 4, the water's speed from the library

Plan step 4. A fresh agent, effort **xhigh**: a new data path, sampling and blending, and the water's acceleration.

- **Why now:** the owner can ride the library's wave only once it pushes like the wave it draws. The look's remaining
  problems do not block a ride.
- **The game files gain the cases' velocity.** The C2 files hold it at two depths, as float16. Keep to the plan's file
  budget: about 17 MB for the nine cases with velocity.
- **The rider's water samples the library's velocity** where a slice is whole. It blends with the sea's through the
  hand-over, in the same way and frame as the surface.
- **`flowAccel` (Du/Dt) comes from the library's own frames,** so B's wall rule (`wallBody=stream`) reads the library's
  acceleration.
- **Bars (the plan's):**
  - within 2 % of VELOUT at the stored points;
  - no jump over 0.3 m/s within 0.1 s under a board at the hand-over;
  - the crest water's share follows the measured 0.6 → 0.84 → 1;
  - off byte-identical;
  - the cost reported.
- **The swell:** step 4 uses today's pool swell. The owner's swell call (ruling 31: a bigger swell, so the wave stays
  2 m and breaks where it did) changes the pool's wave maker, not this step's code. If the owner says yes, it is a
  separate small change, and the bars are read again.
