# Existing contact integration preparation

This new directory is source-only preparation. No syntax/typecheck, test collection/execution, replay, build, cost, browser/server/GPU or Git mutation is authorized or performed here. Parent review and a separate quiet CPU lease are required before any command below.

The independent source baseline is `ef60d3cee120d6b157fe94386d923b6b4392205b`. `prepare.py` exports only the literal relative-import closure of three unchanged existing suites. It applies the five reviewed normal runtime files first and the three reviewed height runtime files second, requiring their known SHA256s. Normal/height prototypes, their oracles, root production and all prior proof remain untouched. The source manifest records every baseline Git-blob identity, final bytes/hash, edge, both overlay stages, selected test identity and narrow case input.

Proposed sequential checks, only after authorization:

```sh
./node_modules/.bin/tsc -p tsconfig.integration.json --pretty false
./node_modules/.bin/vitest run --config vitest.integration.config.ts --maxWorkers=1
```

Strict failure must stop before tests. The first failure/log/report must be preserved without automatic fix or retry. Capture command start/end, process handle/exit and stdout/stderr to `checks/strict.log` and `checks/tests.log`; Vitest is configured to retain `checks/integration-tests.json`. No package scripts, wider discovery or build is proposed.

The three suites declare 74 expanded tests by source inventory: Runner 43 ordinary `it` calls; Worker 15 ordinary calls plus three `it.each` tables of 2, 2 and 4; Host 8 ordinary calls. This is expected collection, not an executed result. Existing explicit 300 s/600 s per-test timeouts are retained byte-exact; no assertion or test is edited. A future lease should explicitly account for the existing practice-Reef and swept-Padang CPU tests.

Tests exercise runner/body/snapshot/restore behavior, asynchronous/mock-device worker delivery, batching and local host sampling. Existing Worker suite is configured at Point without barrel cases, so it does not alone demonstrate an ordinary Padang worker owner active across frames. The separately verified first-epoch owned-height fixture/parity and cost remain separate evidence. No runtime adoption, full physics equivalence or FPS claim follows from these proposed integration checks.

`readBarrelCases()` is called without a spot by the unchanged Runner tests. It therefore reads all eight binary files enumerated by the exact baseline barrel index, even though Padang uses four authored cases. Only those eight files are read-linked to the exact resolved inputs of the normal prototype's `public` authority; no public tree/assets or full repository is copied. Their contents are pinned and must not be changed. `node_modules` is a read-only-use symlink to installed root dependencies, with versions/package identities recorded; no install/update is proposed.

No client entry/index/Vite config is present or proposed. Any later client production-build closure requires separate authorization.
