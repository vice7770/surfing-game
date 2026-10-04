# Three-arm complete contact cost proposal

**Source-only, unexecuted.** This folder owns only the cost source, explicit driver/config and plan. It imports the unchanged eager oracle and frozen normals-only runtime from `/private/tmp/contact-normal-demand-prototype-20261004`, and the height runtime from `/private/tmp/contact-height-demand-prototype-20261004`. It copies no runtime source, assets or capture and edits none of those folders. Execution is blocked until height parity has passed and root reviews and approves this exact source/authority under a quiet CPU lease. An earlier height source review or normals-only benchmark is not execution approval for this experiment.

The experiment repeats only the original first captured F64 epoch, sea time `125.99999999999488`. Capture SHA-256 is `e7bbbb85cf03450f97fe8807414f749dbada7a5b5fa814e490f578f26f965e2f` compressed and `a9c1e4d0b759aac2a9123e9d02cef97a957e959415d65ad098f53b3f99287648` expanded. This is not a 15-epoch history, solver/body simulation, cold-start benchmark, renderer measurement or browser FPS experiment.

## Three actual paths

- **A-eager:** independently archived `ef60d3cee120d6b157fe94386d923b6b4392205b` classes. Full original eager loft update under its real scoped plain-height cache, then original direct query/floor methods.
- **B-normal:** the frozen private normals-only owner. Its actual full eager Y/seals/profiles/topology, original scoped live plain-height memo, frozen query/floor facade, final-run cache invalidation and selected Float32 normals.
- **C-height:** the reviewed owned-height owner. Every nonempty update must execute actual h, bed and full xCenters snapshot copies, owned-cache invalidation, recipes and all mandatory global rest/profile/XZ/overlap/seal/topology work, followed by demanded heights, separate initial/seal stores and selected normals. Its own frozen query/floor facade is used exactly as in B.

Each arm has independent captured F64 h/bed/xCenters/zCenters/dz state, independent Float32 packed records and independent decoded case bytes. These setup copies happen once, outside measurements. The numeric receivers inherit each arm's actual solver prototype and use its actual unbound methods; there is no live-bound interpolation, Proxy, read tracking, fake height formula, callback spy or step. Source state is fixed and must remain byte-identical; no per-trial external snapshot restoration is needed. **C's internal h/bed/x copies still occur inside every timed update.** At this fixture they total 1,857,280 bytes per nonempty update (928,000 h + 928,000 bed + 1,280 full xCenters bytes). The extra recipe/cache/geometry work is not omitted or timed separately.

The measured workload is the actual update plus every original mixed call in its original order: **441 query and 186 floorAt calls**, 627 total. Each query restores its recorded initial reused-hit fields inside timing. Common preallocated sinks retain every result, inWater value, all 16 numeric hit fields and every floor. Facade dispatch, buckets, row/normal readiness reset and lazy preparation belong to the measured path. One outer `performance.now` pair encloses it. The five common statistic resets occur outside each arm's measured window consistently; sink writes and individual hit restores remain inside all three windows. This reset boundary differs from the earlier two-arm cost run, so its old numeric medians must not be treated as directly comparable measurements.

## Constructor and allocation warmth

Constructors, case decode and initial numeric/record copies are untimed. Each arm receives one empty setup epoch. B and C temporarily wrap their contact update and loft build prototypes only during that empty epoch to obtain QA handles, restoring both in `finally` before any full preflight, warmup or measurement. The prototype identity guards reject lingering wrappers.

Each arm then receives one full, untimed nonempty preflight. In C this includes first owned-provider construction and its fixed-grid/layout copies; all arms can grow their actual spatial/bucket/cache capacities here. Those first allocations are excluded from the steady-context estimate and explicitly reported. This is a warmed persistent owner experiment, not a claim about cold allocation. A production sequence that creates new water/providers or shifts other histories requires separate evidence.

## Predeclared bounded schedule and paired estimators

There are **18 warmups per arm**, interleaved by the six permutations `ABC`, `ACB`, `BAC`, `BCA`, `CAB`, `CBA`, repeated three times. Every arm receives each position equally. Measurements use **60 blocks**, cycling those permutations ten times. Each block executes its permutation followed by its reverse: `ABCCBA`, `ACBBCA`, `BACCAB`, `BCAACB`, `CABBAC`, `CBAABC`. Each arm appears twice in each block; position and central consecutive-arm occurrence are balanced.

The bound is exactly **120 measured workloads per arm / 360 measured trials**, plus 54 warmups and three full preflights: **417 complete fixture workloads and three empty setups**. There are no adaptive extra warmups, sample-count extensions, automatic repair/retry, alternate timers or additional benchmarks.

For each block, take the mean of its two A, two B and two C trial durations. Retain all raw trials and block means. The three primary paired differences are **A minus B**, **A minus C** and **B minus C**; positive means the destination arm saved time. Report the median and mean of each difference across 60 blocks, plus positive/negative/zero block counts. Separate arm medians are descriptive only; their differences are not saving estimates. The three differences share blocks and are not independent evidence. There is no FPS, statistical-significance or universal-history inference.

## Guards outside measured windows

After every full preflight/warmup/trial, compare all retained outputs using Object.is (preserving signed zero and NaN semantics), exact 441/28/0/142/0 statistics, active topology and all contact-read metadata to the capture. A and B's active positions remain fully comparable. C's entire eager XZ and already prepared Y are compared bitwise; its ready rows must stay within the original 15-row crossing/normal-halo union. Every captured selected normal is compared to exact captured Float32 bits, and each private arm must have exactly 65 active normal-ready vertices, including all captured selected vertices. There is **no forceActive, historical buffer drain or unused normal/mouth/sheet gate anywhere in this driver**. Guard diagnostics allocate per-vertex strings only on a mismatch.

All state and packed records remain exact at the end. Source hashes, prototype identities, output/geometry/normal guards, fixture decoding and reports remain outside timers. Source files are hash-checked before and after; prototype identities are checked before each trial and after completion. Input parity and immutable-source guards provide correctness authority; the timed path contains no tracing to measure callback counts. Mandatory copy byte counts come from the pinned actual source and fixture, not an in-window spy.

The differing geometry guards run outside timing and remain a limitation alongside common sink overhead, module layout/JIT, GC/runtime interactions and this fixed warmed epoch. Balanced order reduces order bias; it does not turn a Node measurement into browser performance evidence.

## Approval authority and precise future commands

`authority.template.json` is intentionally **not executable approval**. Root must create `approved-authority.json` only after inspecting the passed height terminal evidence and the final cost source. Its exact SHA-256 must be supplied as `CONTACT_HEIGHT_COST_AUTHORITY_SHA256`. The harness rejects missing/incorrect authority, pending parity, runtime files that differ from the three files frozen with passed height parity, incomplete source coverage, changed prototypes or wrong capture identity.

The approved authority must pin every non-test `.ts`/`.d.ts` under all three imported source roots, the six helper files named in `cost.ts`, and each source tree's package metadata. It must pin the root-approved passed height evidence, the exact three height runtime files, the previous passed normals-only F64 proof, and this source-preparation ready manifest. Runtime hashing happens outside measurements. No approved authority file is generated by source preparation; there is no result file or passed claim yet.

Only after root separately grants the exact controlled CPU lease, proposed commands from this folder are:

```sh
./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.cost.json
CONTACT_HEIGHT_COST_AUTHORITY_SHA256=<exact-reviewed-hash> ./node_modules/.bin/vitest run --config vitest.cost.config.ts --maxWorkers 1 cost.test.ts
```

The dedicated config discovers only this one driver. Preserve the original strict/terminal logs, approved authority, source freeze and `cost-first-report.json` whether pass or fail. Partial raw trials/blocks are retained even when a later guard fails. Stop on the first failure; any repair/rerun requires a new explicit root review. No typecheck, test, timer, build, server, browser/GPU, production edit or Git mutation has run in this source-only preparation.
