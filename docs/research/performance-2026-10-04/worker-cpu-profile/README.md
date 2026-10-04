# Retained worker CPU profiles and preceding setup failures

The accepted V4 observation produced two valid worker-only CPU profiles on the ordinary High Padang Big route. This is a diagnostic capture, with no production optimization or stable 60 FPS acceptance. Earlier setup failures remain exact and separate.

| Version | First native outcome | What it establishes |
| --- | --- | --- |
| V1 | Setup failed; no initial target inventory retained, zero CDP commands/events. | Neither the initial URL nor a missing websocket cause can be inferred. No game navigation, worker identity or profile was reached. |
| V2 | 92 inventory observations; received page inventories retained the sole NewTab page with websocket, but no exact about:blank selection. Zero CDP commands/events. | The required initial setup did not occur in this run. This does not establish a general Chrome flag mechanism. |
| V3 | Exact owned inert bootstrap loaded, both pinned serving/arming witnesses passed, then the strict menu geometry guard failed. Actual inner1708×934, backing2989×1634, DPR2, outer1708×966. | Parent autoAttach preceded game navigation. Big route, actual worker identity and profiling were not reached. The original879inner guard was preserved. |
| V4 | Normal private window with positional bootstrap URL passed the original inner1708×879/backing2989×1538/DPR2 guard. Distinct first protocol and later profile operations succeeded and independently closed. | Exact parent/page/frame/browser-context/child-session/execution-context relations and bounded inside-worker self.location.href were accepted before worker-only sampling. |

V4 first protocol report SHA256 is `b72cdc9466337f2c18bd472cb4ae9e6a7eb2ccaa2bb9f43373fe40c51db2166c`. The later profile report is `982d49b42945c0614c1a42991bdce24ae2c37e83362f6d4f56fca8f57727f42e` (16,875,048 bytes). Its driver retained exit0, independent server/CDP/4200 ECONNREFUSED, Chrome exit0 and106.091714seconds within the unchanged175+5/180second bound. Command deadlines remained10seconds; there was no widened worker command deadline, weakened viewport guard or automatic profiling retry.

The owned bootstrap is128bytes with SHA256 `220abad565261d5962aaf5512258389607c811297a257df92b9f69041978953e`. It contains no script/assets/worker. Pinned bootstrap GET and absence of game-serving were witnessed before/after parent Target.setAutoAttach(autoAttach:true, waitForDebuggerOnStart:false, flatten:true), before the original ordinary game navigation. Worker commands used the exact child session delivered on the parent socket. The successful method does not prove the precise reason for earlier failed browser-root direct attachment or Chrome setup behavior.

## The two captured windows

Only the identified ordinary worker was sampled, at5000µs intervals. Its unchanged route retained original High settings, page-only deterministic survey RNG, GPU116,000cells/C64/rider/one-step mode and original five-second warmup. No page profiler, numerical timing wrapper, GPU timer or heap/allocation timer was used. Loaded bundle source snippets were bound to exact served bytes; no source maps or rebuild were used.

| Capture | Requested offset | Raw elapsed | Samples | Weighted elapsed | First delta | Unassigned trailing residual |
| --- | --- | --- | --- | --- | --- | --- |
| Early | 5.012831s after sampling origin | 8.034682s | 1,485 | 8.029550s | 31,507µs | 5,132µs |
| Late | 75.013910s after sampling origin | 8.022182s | 1,367 | 8.020115s | 19,109µs | 2,067µs |

The raw profiles are retained as [early](payloads/ffb201f94da8b3edd4c5fbbb3056517dda76786762ee94ee1018d7c1bf1e4831.gz) and [late](payloads/32e34c3c692befc9747458a8543ff661a985cb7ee6c353eeeb9adfe1499d722b.gz). Decompression reproduces the original `.cpuprofile` bytes. Raw profiles were saved before validation/attribution; empty or zero-weight profiles would have remained retained while being rejected.

Each timeDeltas[i] describes the preceding interval, from profile start for the first sample or the prior sample thereafter. Assigning that interval to sample i is an estimator, not its known execution duration. First interval, derived last sample/time/offset and signed unassigned trailing residual remain explicit. Weights are not renormalized to the full profile duration. Sample coverage is99.9361% and99.9742%, respectively. Self weights are disjoint; inclusive rows overlap and must not be added. Idle/GC/program/native/unresolved categories remain in the exact tables. Idle does not uniquely identify GPU-map waiting, and sampling does not prove allocation escape/elimination or per-call costs.

## Published scalar context

The original host.port publication listener retained only existing scalar counts, status.stepMs and full original pipelineMs. An additive RAF observer retained callback cadence without wrapping existing callbacks. These are intrusive diagnostics. Eight-second half-open scalar bins use page observer.startedAt+5s and+75s; they are not the exact CPU command intervals or actual drawn FPS.

| Published observation | Early bin | Late bin |
| --- | --- | --- |
| Packets /8s | 477 /59.625per second | 467 /58.375per second |
| Median front/lip/tube counts | 0 /0 /0 | 101 /24 /0 |
| Median bubble/spray counts | 4,096 /4,096 | 4,096 /5,083 |
| Pipeline total p50 | 15.7ms | 16.1ms |
| Contact/front p50 | 0 /1.3ms | 1.4 /2.2ms |
| Foam/aeration p50 | 2.2 /1.7ms | 2.3 /1.7ms |

Pipeline statistics are last-step/publication context. Stage quantiles are neither request latency nor additive headroom. Within-run early/late windows are not phase-matched or thermal evidence. The contact/profile lookup source mapping provides a next investigation hypothesis; it is not an adopted optimization or proof of a single bottleneck. This capture does not establish actual draw FPS, flawless tube geometry or completion of the broader performance objective.

## Exact retained authority and verification

[manifest.json](manifest.json) inventories110 deterministic gzip payloads (1,797,156 compressed bytes),138 original aliases and618 immutable Git references. Every owned V1–V4 helper/readiness/delta/command/plan/root check, first native report/driver/log, raw profile, attribution and full scalar/publication/CDP trace is retained. All five requested root wrapper/session-mock files existed and are retained; missing files were not fabricated. Exact payload hashes and decoded hashes are checked, including the current ignored eleven-file dist compilation. Source/public assets are referenced through immutable accepted commit `0b17d603cb8d7b06bc60a56e599f06f4f362afd5`, comprising575 project/browser source/configuration files, five referred tracked evidence files and38public assets. They were byte-equal during preparation; future working-tree edits do not change that captured authority. Public binary assets and a redundant source tree are not copied.

Current runtime entry SHA256 is `57c1f053c56648b1178e4291cd48802570692ec2ee9a23838bf8ae5987f5ccfb`; worker is `e95ec065cc0ca427755de44f5329632651bcef8d4cc41b45b3e09a41ec1654e2`. The attributed root canonical build/test receipt is retained exactly. It is not fabricated raw build stdout.

Run the offline byte/arithmetic verifier from the repository:

```
python3 docs/research/performance-2026-10-04/worker-cpu-profile/verify.py
python3 docs/research/performance-2026-10-04/worker-cpu-profile/verify.py --git
```

Default verification checks retained encoded/decoded bytes, aliases, nested pin closure, native outcomes/identity/closure, complete raw node/sample/self/inclusive/category arithmetic, UTF16 source excerpts, first/tail/coverage, original5/75second scheduling and scalar bins. `--git` additionally reads all618 immutable commit-tree/blob authorities. It never imports/replays the archived helpers, runs the game, benchmarks CPU, issues native/API/network commands or claims FPS/thermal/exclusiveGPU/allocation/adoption acceptance. Default metadata closure alone is explicitly weaker than actual `--git` blob verification. The preparer ran the final default verifier successfully (1,920nested pin checks); root owns the separate immutable Git verification and integration.

Root also ran `verify.py --git` successfully. [The retained result](root-git-verification.json) records all 618 immutable Git blob checks, 1,920 pin checks, both complete profile weight calculations and the published scalar bins. This verifies the archived evidence; it does not replay or accept the game’s performance.
