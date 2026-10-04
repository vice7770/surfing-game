# Opening inventory and attributed offline air-column audit

This native capture records the ordinary ready-prone state and exactly one neutral 1/60 s step. It establishes where the board and published fronts were at those two instants. It does not establish a safe tube entry, reachable route, suitable spawn change or successful takeoff.

The initial 13 joined row pairs satisfying the unchanged phase/formed/weight/life/fade gates were all on **front79**. Their crest midpoints were **146.958–147.432 m** from the board. Signed board-to-crest projection along the measured average front ray ranged from −146.637 to −145.107 m, so all 13 were labeled `boardBehindCrest`. Normals were valid, with dot 0.9335–0.9606; none failed normal validity/dot or the greater-than-14 m forward bound. The after-step snapshot again had 13 pairs rejected for being behind the crest.

Root's read-only review of the retained geometry reported the nearest drawn front of any phase as front56, approximately 82.6 m away, pre/unformed at tau approximately −0.312. That interpretation is attributed in `review.json`; archival did not recompute distances or perform a new selection audit. It does not identify an available entry opening.

## What was captured

Actual Big settings and the unchanged coherent-startup game build: 64 components, seed 1, dx 2 m, fine spacing 1 m, spreading 150, no overrides. The single input was `paddle:false, popUp:false, steer:0, crouch:0, compress:0, trim:0, pocketReflex:false`. Both snapshots stayed prone. There was no selector/approach attempt, popup, steering overlay, placement, reset, movie, air-height check or entry test.

The original [initial PNG](native/00-initial-ready-prone.png) and [after-step PNG](native/01-after-one-noop-step.png) total 3,851,178 bytes. The exact [active-state capture](native/active-snapshots.json.gz) decodes to 3,817,394 bytes. Each snapshot retains 74 raw front records, 129 drawn slices, 17,286 vertices, 90,972 indices, all 37 active loft typed arrays, and raw-front Float32 bytes. Base64 bytes and per-array hashes preserve NaN metadata bit patterns losslessly; no float reserialization is used. Raw records and drawn slices remain separate quantities.

The original [report](native/report.json.gz) contains the board pose, clock, world crest slot35, ray/normal, signed projection, distance and separate rejection predicates for every eligible pair. The native inventory made no air-height test. The completed offline audit below subsequently used the retained full indexed positions and metadata; archival copies its exact results without executing the audit again.

## Completed offline analysis

The separate `/root/tube_directed_entry` worker preserved the row eligibility rule and removed the player face/distance gates for its [fixed 24-column analysis](analysis/exact-global-columns.json.gz). In the initial snapshot, 13 eligible front79 pairs produced 698 coarse three-crossing intervals, including 284 at least 1.23 m tall. The fixed 24 tallest intervals all passed the unchanged indexed detector's single connected component and strict three-crossing requirements. The maximum sampled exact floor-to-roof height was **1.792662 m**, **148.882 m** from the initial board. After one step, 23 of 24 shortlisted columns passed, with maximum sampled height 1.789878 m. The failed shortlisted column remains in the exact receipt.

This is positive sampled air-height evidence on distant geometry. Coarse interval widths are discretization intervals, not opening width. The audit establishes neither an exhaustive maximum nor a reachable mouth, corridor, full body fit, water-contact parity or entry. The earlier directed trial still rejected all 10,755 repeated eligible row-pair observations before height generation; the later relaxed player gates do not rewrite that trial.

The [causal conclusion](analysis/causal-conclusion.json.gz), [raw/front/library timing audit](analysis/inventory-analysis.json.gz), earlier [source and selector audit](analysis/audit.json.gz), exact helpers and completed receipt are preserved. The earlier audit preceded these world snapshots and explicitly lacked crest coordinates; its original limitation remains intact. Nine source receipts match the frozen 327-input candidate, and the four Padang library assets and prior trajectory/helper bytes are referenced by verified hashes.

The completed causal review confirms crest slot35 is correct. The nearest raw front56 was pre/unformed at 82.597 m; its held void estimate is not an upper bound on future actual geometry. It recommends one independent ordinary valid manual popup before requiring a qualified local opening, while retaining the existing spawn and target gates. Neither source relocation nor a safe entry has been established. These are attributed conclusions and a proposed later trial, not new runtime or production changes in this archive.

## Closure, provenance and checks

Root's native session 64244 ended with exit 0. The owner records independent closure valid, no failures or remaining owned PIDs, diagnostic ports 4294/9704 closed, user ports 4310/4311/4312 preserved, and diagnostic sources, assets and candidate inputs unchanged. These are recorded facts, not fresh live-resource checks.

The exact frozen preparation/embedded policy, helper/driver/owner sources, source and extracted-fixture checks, copy/freeze receipts, prior policy/preparation, launcher and owner are retained. All 327 source input contents and 50 dist contents match prior coherent-startup receipts by relative path, byte size and hash; full source/dist copies are avoided. Prior source-only flags retain their historical meaning. No production source or adoption record changed during archival.

Run `python3 verify.py` for storage/gzip/reference, lossless typed-buffer and recorded-receipt consistency checks. `python3 verify.py --original` also reads the original scratch/source/dist bytes while available. Verification imports no game/collector/selector code, computes no new geometry or distances, performs no numerical/native rerun, and probes no ports. Capture completion is not entry or tube-quality acceptance.
