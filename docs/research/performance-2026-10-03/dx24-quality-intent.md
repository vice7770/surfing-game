# Proposed dx2 → dx4 physics-quality trial

**Planning record.** Preparation used no Chrome/GPU; the subsequently executed [quality pair rejected the uniform dx4 default](dx24-quality.md). This tests a numerical approximation, separate from the rejected sub-millisecond exact shortcuts and from ordinary 90-second FPS verification. Production sources, defaults and the existing resolution helper remain unchanged.

The isolated adapter is `/private/tmp/gpu-dx24-quality-adapter.mjs`; it retains the canonical helper in `scripts/browser/gpu-resolution-fidelity.ts`, requires each source replacement to match exactly once and records before/after hashes. Plan compilation and injected helper/instrumentation syntax checks passed without launching Chrome. The generated plan is `/private/tmp/padang-dx24-quality-20261003/plan.json`; the exact [plan metadata](dx24-quality/adapter-meta.plan.json) and distinct [run metadata](dx24-quality/adapter-meta.run.json) are retained durably. Generated source/launcher are in `/private/tmp/gpu-dx24-quality-adapter/` and the archive.

| Controlled input | Both variants |
| --- | --- |
| Frozen runtime | Port 4201, `/private/tmp/surf-tube-stability-current-20261003` |
| Sea | Padang Big, Hs 3.8 m, T 18 s, direction 0, spreading 150, 64 components, seed 8761 |
| Cross-shore grid | Original `fineSpacing=1`, same stretched edges, 725 rows |
| Alongshore grid | dx2: 160 columns/116,000 cells; dx4: 80 columns/58,000 cells |
| Initialization | Independently completed two-period spin-up, start sea time 400 s; initial differences retained |
| Quality clocks | 1,800 completed steps at exactly 1/60 s; checkpoints at 0/5/15/30 simulated seconds |
| Render/contact/mask | 1 m render and contact sampling; independently checked 1 m mask support |
| Visual settings | Native High, Rich, High particles, caustics and spray enabled, production pixel normals, numeric `frameLimit=60` |
| Native guard | 1708 × 926 CSS viewport, browser DPR 2, effective render ratio 1.75, 2989 × 1620 canvas |

This is a paused riderless quality fixture. The adapter intercepts the **actual Worker `start` request**, retains its original options/barrel cases and adds `options.contact=true`. A `scene.contact` field would be dropped by the normal factory route and is not used. Each run echoes and guards actual worker config, `rider=false`, contact enabled, render spacing and a nonempty barrel case list. It requires finite contact timing, positive contact timing with active fronts in retained timeline samples and nonempty renderer loft at a checkpoint. Those checks establish the exercised contact/geometry workload; they do not certify a board/contact trajectory.

RAF advancement is held before controlled initialization. Checkpoints use the same cloned camera and manual native rendering. The adapter rejects a changed canonical helper or frozen aggregate before launching; both variants then verify every served index/JS/CSS byte against that immutable directory, GPU compute without fallback, resolved sea/grid settings, no queued steps before each advance, exact per-step/cumulative clocks and finite exported fields. A paired six-hundred-second deadline and owned Chrome cleanup bound the trial; warm initialization separately times out at 180 seconds and each advancing run at 240 seconds. Planning allowance is roughly one to four wall minutes, based on prior stage costs rather than a measured duration for this trial. No ANGLE implementation is forced.

The canonical GPU spin-up advances water at its grid-dependent CFL limit for 36 solver seconds; it does not run fixed 1/60 steps. Both variants must finish with the same solver/sea clocks and phase. The subsequent 30-second quality window uses identical 1/60 calls. This preserves the runtime initialization method while retaining all grid-dependent warm-state differences.

Outputs retain absolute and crest-aligned height/slope errors on common transects, matched crest phase and height, breaking indicators/onset, cell-area integrated dense/residual foam, air volume, plume-depth and void-fraction area, front widths/throw clocks, launch counts/volume/jets/rollers, loft structural indicators and paired native images. Column-width proxies are labeled separately from particle/event counts. Initial states and independently spun-up differences are reported rather than normalized away.

Limitations: exported SET1 fields are Float32 and omit turbulence and transient foam source. Active breaking area is a source proxy, not complete injection parity. Front/jet summed widths can overlap. Loft orientation/finite checks do not prove complete self-intersection or contact fidelity. The riderless fixture does not assess body buoyancy, wipeouts or tube-contact trajectories. Thirty simulated seconds is a bounded quality screen, not long-duration numerical certification or an FPS result. Cell-count reduction alone establishes neither acceptable visuals nor speed.

Revalidate the plan without hardware:

```sh
node /private/tmp/gpu-dx24-quality-adapter.mjs --plan=true
```

After the parent explicitly releases the sole GPU lease, the prepared execution command is:

```sh
node /private/tmp/gpu-dx24-quality-adapter.mjs --plan=false --url=http://127.0.0.1:4201/ --dir=/private/tmp/surf-tube-stability-current-20261003 --out=/private/tmp/padang-dx24-quality-20261003 --cdp=9524
```

Plan provenance:

| Artifact | SHA-256 |
| --- | --- |
| Unchanged canonical resolution helper | `b50f34679b8d66983fcde3d832de276e810dfd133aed8bf97ecca5ada65f8939` |
| Isolated adapter | `78f5fb140697180d36fbc2a49efa57e49111065bee1d5e4adea1e06870162758` |
| Derived helper | `69dd43aedd980f94161f90bfe43aed0654f6661fce90b2150384bb5dbfc7fb02` |
| Owned launcher | `2d74984b72d2b2ba42ccc590792578f252c0ad807830b040b3a5463cfa7c9bb8` |
| Expected frozen index/JS/CSS aggregate | `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3` |
| Generated plan JSON | `e1e531352f6c6bd93bd33ad06069b7eb66ae4878aab7dca923c2b0f06e7994dc` |
| Plan metadata JSON | `e9439018de6525b9ebb1433a35a028ee51ccbe5fc231e8e9b62fb651bb735d9b` |

No candidate has been selected by this preparation. Later evidence must be reviewed before changing a production physics grid.
