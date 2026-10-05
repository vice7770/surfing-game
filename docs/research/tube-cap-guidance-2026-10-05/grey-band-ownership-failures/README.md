# Grey-band ownership: preserved failed attempts

This archive preserves the actual ID V2 preparation failure and separate ID V3 and ID V4 native failures. **ID V3 completed zero physical steps and produced zero PNGs. It failed during inspection installation before the baseline image or any ownership probe.** It did not identify the grey band's drawable and did not establish a production fix.

## ID V2: preparation failed

The actual preparation exited 1 while trying to recover `node_modules/three/build/three.core.js` as committed source from historical commit `6bcae3aa0740cb66187f572a03cc8abbb1981030`. The dependency was untracked in that commit. [root-prepare-failure.json](v2-preparation-failure/root-prepare-failure.json) records the failure and the absence of prepared dist, historical source scratch, source provenance, build, seal, owner or candidate outputs. No native execution or owned port was started by this preparation.

The exact eight preparation source files and their [preparation-freeze.json](v2-preparation-failure/preparation-freeze.json) are preserved under `v2-preparation-failure/`. Their original README and `sourceOnly`/`executionPending` flags are historical planning records; the later actual failure receipt supplies the outcome. Its `complete: true` flag means the failure was recorded completely, not that preparation succeeded.

## ID V3: preparation completed; native ownership capture failed

[prepare-result.json](v3-native-failure/prepare-result.json), [build.json](v3-native-failure/build.json), [seal.json](v3-native-failure/seal.json), and [source-provenance.json](v3-native-failure/source-provenance.json) preserve the actual completed historical preparation. It copied the immutable earlier optical application; it did not compile current production. The prior build recorded 15 production and 77 diagnostic source entries. After deduplication, the preparation provenance records 80 committed receipt sources, 2 declared `node_modules/` diagnostic dependencies, 1 outside-repository diagnostic entry, and 6 additional committed optical sources without invented prior build hashes. The dependencies were verified absent from the commit through bounded Git existence reads and copied from their exact existing compiled-source receipts. Dependency and external entry records claim no historical Git source recovery.

The actual owner run was tool handle **16008**, exit **1**, after **53.450254833s**. [owner.json](v3-native-failure/owner.json), [candidate-first/report.json](v3-native-failure/candidate-first/report.json), [native.log](v3-native-failure/native.log), and [launcher.json](v3-native-failure/launcher.json) remain byte-exact. The failure was `Untargeted legacy lip must retain actual zero draw range`. It occurred inside `installGreyOwnershipInspection`, before baseline capture or the shader/material ownership probes. The report's ownership conclusion is null, playability is false, and no production fix was adopted.

The owner recorded owned group absence, closure of ports 4301/9711, preservation of protected ports 4312–4315 with the same PID/start/full-command identities, and no cleanup failure. Its `complete`, `postExecutionPinsVerified` and `copiedAndHistoricalSourcePinsPostVerified` remain false. The browser launcher separately recorded that owned Chrome closed. None of these cleanup observations turns the failed ownership experiment into a successful capture.

## Independent later root audit

[root-post-failure-pins-and-closure.json](v3-native-failure/root-post-failure-pins-and-closure.json) is the separate root audit recorded at 2026-10-05 16:17:57.909790 UTC. It verified **223 unique executable pins**, the absent owned group, closed owned ports, and preserved protected identities. It sent no signals and did not alter the failed owner or report. It explicitly did not reverify mutable live-source paths appearing only as historical metadata.

The audit's `complete: true` describes this later independent pin/closure check. It does not override ID V3's failed run, supply missing PNGs, establish ownership, or prove ride quality. Archive creation additionally compared those 223 original file pins using reads only; the process/port observations remain the earlier root audit's observations, not new archiver probes.

## Corrected historical reasoning: proposal, not this capture

[corrected-legacy-guard-proposal.md](corrected-legacy-guard-proposal.md) records the source-level correction prompted by the failure. Requiring a zero draw-range count did not express the intended historical invariant. The proposed replacement checks empty indexed/position geometry while preserving actual range, visibility, groups and attribute identities. ID V3 failed before recording those proposed actual counts. The correction therefore remains an unvalidated proposal within this evidence set. The later actual V4 failure is preserved separately under [id-v4/](id-v4/README.md); it also produced no baseline or probe. It does not retroactively validate the ID V3 capture.

## ID V4: separate failed installation

[id-v4/README.md](id-v4/README.md) and its own manifest preserve actual tool handle **66322**, exit **1**, after **48.462664709s**. It failed on `Actual loft draw index prefix differs` during installation before any baseline image or ownership probe: **0 steps, 0 PNGs, 0 PNG bytes**. Its original failed owner/report and 227-pin independent later root audit remain distinct. The possible winding cause is inference only. The audit's closed ports/group describe its time of observation, not later work that may reuse those ports.

## Preservation and reuse

The V2, V3 and separate V4 directories retain exact source, preparation freezes and receipts. [manifest.json](manifest.json) pins all files and maps essential earlier optical/cap/authored-mask/readonly proposal inputs to hash-verified relative archive paths. The earlier optical gameplay run itself failed its 640-second wall deadline after 1525 rows; its complete immutable application build is not a gameplay-success receipt.

Large `dist/`, historical source/dependency/diagnostic trees and duplicated baseline imagery are not recopied. Their complete pin rosters remain in build, seal, source provenance and the independent root audit. `live.json` snapshots are omitted as intermediate progress evidence. Original receipts and helpers retain historical absolute paths and temporary dependencies; this is portable evidence indexing, not a runnable diagnostic bundle. Only finite file reads/copies, JSON parsing, decompression and SHA256 checks were performed to archive it. No compiler, test, Git command, native run, process/port probe or source mutation was performed by the archiver.
