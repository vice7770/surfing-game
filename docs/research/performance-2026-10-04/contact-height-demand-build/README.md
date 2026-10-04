# Contact height demand — two-arm compiled checkpoint

**Both strict TypeScript arms and both client/worker builds passed on the first attempt.** This archive contains the exact two compiled output sets and their source/build authority. It is bundled-only evidence: live FPS, runtime asset binding and visual acceptance remain pending. No production adoption or gameplay FPS result is established.

| Arm | Compiled files | Exact compiled bytes | Real worker |
| --- | ---: | ---: | --- |
| Independent eager ef60 baseline | 11 | 1,982,858 | `surfZoneWorker-C17EHetv.js` (437,218 bytes) |
| Frozen normal + owned-height candidate | 11 | 1,992,309 | `surfZoneWorker-gVTILj2Q.js` (442,029 bytes) |

The complete output sets live under [baseline/dist](baseline/dist/index.html) and [candidate/dist](candidate/dist/index.html). Their [baseline manifest](build/baseline-manifest.json) and [candidate manifest](build/candidate-manifest.json) pin all 22 compiled file paths, byte counts and SHA-256 values, plus actual client/worker entries. CSS and build.json intentionally appear in both complete arm sets even though their bytes match. Compiled JS bytes are stored directly; no bundle rewriting or test-only transformation occurred.

Both arms use the same literal **BUILD_ID `68e263250-qa-contact-height`**. Their identical 39-byte build.json has SHA-256 `c589d5dfc40fcdb3c42b6d646db4f9c4113c53d807a4e5bf577b2bf83eb5b141`. This QA label comes from documentation HEAD `68e263250c55cd0a3b45878da605849ae28bdd92` observed during preparation; the independent runtime/source baseline remains Git `ef60d3cee120d6b157fe94386d923b6b4392205b`. A common ID avoids changing build-ID-derived state between arms; source and compiled identities distinguish the arms.

## Source and build authority

The lossless [source manifest](source/source-manifest.json.gz) pins 246 literal closure files per arm, including the original index/main entry, real surf-zone worker URL, four dynamic client imports, CSS and the WebGPU declaration. Original sources were extracted from exact ef60 Git blobs and checked by Git SHA-1 and SHA-256; no unresolved/nonliteral import blocker was found. Baseline copied-source bytes total 2,439,606; candidate 2,451,196. Candidate applies five frozen normal overlays followed by three frozen height overlays, changing exactly five final existing runtime paths. The 246-file trees are not duplicated in this archive.

The [source extraction helper](source/prepare-source.mjs), [build driver](source/build-only.mjs), [ready authority](source/ready.json), [prepared plan](source/plan.md), [strict config](source/tsconfig.build.json), [installed dependency identities](source/dependency-authority.json) and [binding schema](source/manifest-schema.json) retain exact original bytes. Their source-only/unexecuted language is historical preparation metadata; the later terminal records establish the checks that subsequently ran. Ready SHA-256 is `66c56ee8490cfcfa5694152318ad82f64b039cc4bd13212bbcf963098ff2b02c`.

Installed Vite 8.3.1 and the exact baseline vite.config.ts build both arms with identical programmatic settings: `configLoader:'runner'`, per-arm scratch cache, isolated per-arm dist, `copyPublicDir:false`, `emptyOutDir:false`, and the common BUILD_ID. Remaining baseline config and Vite client/worker/minification defaults stay active. Runner avoids the default bundled config loader's node_modules/.vite-temp writes through shared dependency links. Vite added empty worker/optimizeDeps objects to its flags object in both manifests; the actual recorded settings are otherwise identical modulo arm paths.

## Actual first-attempt checks

The [command record](checks/first-check-results.json) retains exact argv, cwd, environment overrides, PID, UTC start/end and zero exits: baseline strict, candidate strict, then one driver that builds baseline followed by candidate. Each strict command used `--noEmit --incremental false -p tsconfig.build.json`; successful strict logs are both empty and represented by exact aliases to [strict.log](checks/strict.log). No automatic source repair, retry, output deletion, unit test or benchmark was run.

The [original combined build log](checks/build-first.log) records 249 transformed modules per arm, both successful bundles and the ordinary chunk-size warnings. Vite reported 264 ms baseline and 216 ms candidate build times; those build durations are not a performance comparison. The [build terminal](build/terminal.json) and [first-attempt freeze manifest](checks/first-run-freeze-manifest.json) pin both final arm manifests and completed checks.

The lossless [input inventory](checks/source-inputs.json.gz) represents byte-identical before/after snapshots of 502 approved source/preparation inputs. Both original inventories and equal first-run freeze copies are aliases, not duplicate payloads. The 502 checked scratch source/preparation inputs stayed unchanged; this build task edited no prototype or production source. The earlier [height prototype archive](../contact-height-demand-prototype/manifest.json) retains functional/first-F64 parity and controlled cost authority; the [normal foundation archive](../contact-normal-demand-prototype/manifest.json), [normal patch](../contact-normal-demand-prototype/prototype/candidate.patch) and [normal runtime hashes](../contact-normal-demand-prototype/prototype/runtime-hashes.json) preserve its independent predecessor. This checkpoint does not expand those results into history/FPS/visual approval.

## Assets, portability and remaining scope

No root public assets, node_modules, captured inputs or source tree are copied. [External asset needs](source/external-asset-needs.json) identify the four Padang cases among eight indexed barrel assets, three school recordings and the selected sky/surfer/audio inputs. With copyPublicDir disabled, these outputs require a separately reviewed read-only public fallback and exact asset binding before live use. No server, preview, browser or GPU operation is part of this build checkpoint.

[Archive manifest](manifest.json) and [archival verification](verification.json) record stored/expanded/original-alias bytes and hashes. Metadata gzip uses level 9 and mtime 0. Original absolute paths remain authority; relative archived paths are portable. Reconstruct exact baseline sources from ef60 Git and the source closure, then restore pinned normal/height overlays and helper/config paths when needed; compiled artifacts are already retained independently. No live .test.ts files exist. Archival verification is copy/hash/path bookkeeping, not a new runtime check. No new build, test, timing, server, browser/GPU or Git mutation ran while creating this archive.
