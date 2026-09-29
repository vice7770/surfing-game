# Tubes: why they read wrong, and the fix

The void is already about the right size. What is missing is the wall under the lip, a lip with body, and one clock along the crest. A swept 2D overturn gives all three at once, and it is how film and the newest surf game build their barrels.

**Decided on 2026-09-28:** build the swept surface. A new Padang Padang spot will be its first testbed, because that reef's slope sits inside the sourced overturn fits.

## Why the tube reads wrong

- **No wall.** Only the lower half of the overturn is cut into the solver's 17–27° slope. The tube is a pocket high on the face, and the jet lands about a quarter of the way down instead of at the foot.
- **No body in the lip.** The jet's water, 0.012–0.27 H², is spread along an 8-parcel strip and drawn as its own see-through sheet. It shows thin and dark.
- **No shared clock.** Each 1 m column throws, flies and closes alone, and neighbours at different stages make the teeth. A real barrel changes smoothly along the crest, from the throat to the pit to the closing section, over several metres.
- **Reef tubes too narrow.** The fits cap width/length near 0.45, while reefs reach 0.67–0.70. The Reef Part B work is fixing this.

## The fix: one swept overturn surface

1. **Keep the solver as clock and ledger.** It already predicts onset, peel, height and depth. The jet's water still leaves it and returns to it, as today.
2. **Track the breaking front as one line** ([Thürey et al. 2007](https://matthias-research.github.io/pages/publications/breakingWaves.pdf)), with a slice clock: the time since each point's face went vertical. Neighbouring slices stay within one step of each other, the "soft update" of [Mihalef et al. 2004](https://www.math.fsu.edu/~sussman/BreakingWavesElectronic.pdf). That removes the teeth.
3. **Look up a 2D overturn sequence** for each slice from an offline library of simulated breakers. Pick it by the bed slope over half a wavelength offshore ([O'Dea et al. 2021](https://www2.whoi.edu/staff/elgar/wp-content/uploads/sites/153/2021/08/145.pdf)), plus the height and depth, and scale it to the solver's H. One slope parameter sets the shape ([Pick & Feddersen 2026](https://falk.ucsd.edu/pdf/Pick2026JFM_ScalingWaveOverturning.pdf)), so the library stays small.
4. **Sweep it along the crest** into one mesh: face, lip and cavity, blended into the solver's water behind the crest and ahead of the toe.
5. **Draw and collide the same surface.** The rider tests against the profile in wave-attached coordinates, with the floor below and the lip above, as *Surf's Up* kept its boards on the wave ([Bredow et al. 2007](https://www.imageworks.com/sites/default/files/2023-10/making-waves-for-surfs-up.pdf)).
6. **Keep parcels only for what leaves the profile:** the pour, the splash-up and the spray, launched from a "crash curve" along the landing line.

## What you would see, and what it costs

- **On screen:** the face stands up and pitches, and a thick lip lands at the foot of the wave. A round, full-height barrel peels as one: young at the peak, roundest in the pit, closing down the line.
- **Per frame:** a table lookup plus a few thousand vertices (my estimate). No extra render passes.
- **One-off:** a set of 2D breaker simulations, from our own Basilisk runs on the game's bed transects, with published data kept only for checking them (decided 2026-09-28; see Swept barrel build).
- **Online:** deterministic. The same solver state gives the same surface on every machine, so the lip and tube match between players.
- **Precedent:** *Surf's Up* swept 2D profiles along the crest. [True Surf](https://www.meta.com/blog/true-surf-launch/) (2025) blends 2D slices from its own 2D simulation and peels from spilling to barrel on a Quest headset.
- **Risks:**
  - The seam where the swept surface meets the solver's water.
  - The rider's contact moves from height samples to profile tests.
  - The library must cover everything from a small spilling curl to a heavy plunge. [New et al. 1985](https://www.cambridge.org/core/journals/journal-of-fluid-mechanics/article/abs/computations-of-overturning-waves/1C114232AF35590F75E52775F7B41044) show these form one continuum.
