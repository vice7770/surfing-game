# Coherent startup: active fronts, no observed tube entry

The startup change was adopted after a completed native trial and root integration checks. It advances the existing water, breaking, front, crash, lip, foam and air lifecycle together during startup. This archive establishes published physical lifecycle activity; it does not establish a visually satisfactory tube, successful entry, body clearance, or the cause of the earlier missing-front trial.

The build used accepted base `0ab379ba1cdb64b44e8023833399a428990afa60` plus the three pinned startup source/test files. Geometry remained the accepted raw/held profiles. The rejected 0.25H descending-curl renderer was absent from this isolated build and was subsequently restored out of the root checkout. See the exact [source pins](candidate/source-manifest.json), [production patch](candidate/candidate.patch.gz), [root adoption](native/root-adoption.json), and [root integration checks](native/root-integration-validation.json). Older build/preparation receipts retain their original pre-adoption flags.

## Recorded ordinary trial

Actual Big menu settings, no overrides: 64 components, seed 1, dx 2 m, fine spacing 1 m, spreading 150. One ordinary manual popup; standing steering limited to ±0.2 with slew 0.4 input units/s, crouch 1, Compress 0, trim 0, pocket reflex disabled. The driver used ordinary single 1/60 s advances, ride-follow camera, no resets, placements, retargeting or retries.

| Checkpoint | Step | Raw front records | Drawn loft slices | Drawn indices | Original PNG |
| --- | ---: | ---: | ---: | ---: | --- |
| Prone, after install/ready | 0 | 74 | 129 | 90,972 | [Startup](native/00-initial-prone-after-install-ready.png) |
| First standing | 83 | 80 | 171 | 127,680 | [Standing](native/01-first-standing.png) |
| First balance fall | 385 | 115 | 203 | 158,004 | [Final](native/02-final.png) |

Startup published 77 lip launches/jets and 120.5634 m³ lip volume. All 385 recorded steps had nonzero raw fronts and drawn loft geometry. First standing to balance fall lasted 302 advances, 5.0333 physical seconds; resets remained zero. Every measured standing witness was outside. There was no partial, connected entry, contained interval, or full-body clearance pass. Closest finite standing curl distance was 12.5 m. Root's visual review did not accept tube appearance or entry.

The original [1,825,733-byte WebM](native/standing-motion.webm) began at step 240 when finite curl distance reached the predeclared 15 m near-front gate while the witness was still outside. It ended at step 385: 145 ordinary advances, 146 canvas requests, 2.4167 physical seconds and 5.9795 wall seconds. Canvas requests do not count encoded/decoded frames; no FPS or fixed physical playback claim is made.

## Validation and closure

The isolated source checks passed 37 front tests, 5 startup tests, and strict TypeScript. The broader five-suite run recorded 124 passes and zero failures before intentional cancellation; terminal exit 143 and owned-group closure are preserved. Long full-CPU Big fixtures and remaining checks were unfinished. No full-suite green claim is made.

Root integration again passed 37 front tests, the corrected 5-test startup filter, strict TypeScript, and diff checking. The earlier wrong filter skipped all 86 tests; its exact receipt is retained and counts as no validation. A separate [command correction](native/root-integration-command-correction.json) pins the untouched integration receipt and supplies the actual quoted wrong-filter command; no results changed.

Native owner exit was 0, with independent closure valid, no remaining owned PIDs, ports 4292/9702 closed, user ports 4310/4311 preserved, and copied assets, diagnostic sources and isolated candidate inputs unchanged. The first build failure (missing isolated `index.html`) and the accepted-base-only restoration precede the successful build receipt; neither receipt was rewritten.

## Preserved evidence and byte verification

`candidate/` retains exact source, patch, original review, focused/partial/cancellation receipts and log. `native/` retains exact frozen preparation, build lineage, driver/owner/helpers, launcher, closure, three original PNGs, original movie, lossless report and NDJSON. `review.json` is the concise archive interpretation. `manifest.json` records both stored and decoded hashes plus original paths; `original-scratch-inventories.json.gz` records the read-only originals.

The 49 game assets are referenced by exact build hashes instead of copying another dist. The unchanged 347,555-byte compiled Autopilot bundle and shared CDP helper are hash-verified references to prior research archives in `input-references.json`; the Autopilot bundle was not newly compiled from the repointed entry. The 327-file candidate input inventory is retained, with byte-identical pre/post-build receipt aliases.

Run `python3 verify.py` from this directory for portable archive/gzip/reference checks and stored receipt consistency. `python3 verify.py --original` also reads the original scratch files, inventories and dist hashes while those paths still exist. The verifier imports no game code, advances no simulation, launches nothing, and probes no ports. These are storage and receipt checks, not a numerical/native rerun or tube adoption pass.
