# Directed entry trial: selection stopped before air clearance

This completed native trial selected no target and attempted no popup. All **10,755 eligible row-pair observations** were rejected by the forward-face/normal gate before coarse air-height generation. These are repeated observations across steps, not distinct openings. The declared 1.23 m height demand was therefore never tested. This result does not establish insufficient opening height, absence of playable openings, or failed takeoff physics.

Read the exact root [result summary](result-summary.json), frozen [policy](policy.json), [selector source](source/tube-target.mjs.gz), [driver](source/native.mjs.gz), and [owner](source/run.py.gz). The selector's aggregate `faceEligibility` counter does not distinguish invalid normals, normal-dot rejection, behind-crest position or the 14 m ahead bound. A separate coordinate/rejection audit is the recorded next action; no audit results or new trial are claimed here.

## Recorded trajectory and selection funnel

The trial used the unchanged coherent-startup game build, actual Big menu settings with no overrides: 64 components, seed 1, dx 2 m, fine spacing 1 m, spreading 150. The predeclared policy required a qualified target before target steering or one ordinary manual popup. Steering was bounded to ±0.2 with slew 0.4/s; standing inputs would use crouch 1, Compress 0, trim 0 and no pocket reflex. There were no placements, resets, forced state, target hunts or retries.

| Recorded quantity | Result |
| --- | ---: |
| Ordinary 1/60 s steps | 545; 9.0833 physical seconds |
| Published phases | 544 prone, then fallen after losing board |
| Eligible row-pair observations | 10,755 |
| Forward-face/normal gate rejections | 10,755 |
| Coarse air candidates / air rejections | 0 / 0 |
| Exact air-column checks | 0 |
| Qualified targets / target-directed inputs | 0 / 0 |
| Popup pulses / maximum applied steer | 0 / 0 |
| Standing, entry, clearance or movie | None observed or triggered |

The nominal selector height was head top 1.13 m plus 0.10 m deck allowance. Recording this demand does not mean an air column met or failed it. Likewise, no standing or popup under this target-gated policy is not a takeoff-physics failure. Candidate-column qualification alone would not prove a connected mouth, reachable corridor or full-body passage even if a target had been selected.

Two original checkpoints are preserved: [initial prone](native/00-initial-prone-after-install-ready.png) and [final lost-board fall](native/01-final.png), totaling 4,384,341 bytes. There is no movie file because the predeclared standing/near-target-or-witness trigger was never reached. No entry, visual tube quality, FPS or fixed-playback success is claimed.

## Frozen inputs, closure and preservation

Native session 66575 ended with exit 0. The owner records no failures or remaining owned PIDs, independent closure valid, ports 4293/9703 closed, and all three user ports 4310/4311/4312 preserved. Copied assets, diagnostic sources and candidate inputs remained unchanged. These are recorded closure facts; the archive verifier performs no live port or process checks.

All 327 candidate input contents and all 50 dist file contents matched the prior [coherent-startup archive](../coherent-startup/README.md). Exact receipt references are retained in `input-references.json`, avoiding another full source/dist copy. Isolated source-inventory absolute paths differ while relative paths, byte sizes and hashes match. The compiled Autopilot bundle was reused unchanged. Historical build, startup-adoption and source-only preparation flags remain in their original copied receipts; they do not adopt the directed selector or prove this trial succeeded.

The archive retains exact helper/driver/owner/policy sources, extracted fixture/check receipts, preparation/freeze/base-copy receipts, root result summary, launcher/owner, original PNGs, and lossless report/NDJSON. `manifest.json` records compressed and original byte hashes. `scratch-inventory.json.gz` records the read-only original directory. Nothing in the original scratch or production source was changed by archival.

Run `python3 verify.py` for portable storage, gzip, prior-reference and recorded-receipt checks. `python3 verify.py --original` also reads the original scratch/source/dist files while those paths exist. The verifier imports no game or diagnostic code, generates no air heights, launches nothing and probes no ports. It checks preserved evidence, not selection validity, numerical physics or entry acceptance.
