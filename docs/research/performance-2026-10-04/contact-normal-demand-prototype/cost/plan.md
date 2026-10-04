# Bounded complete contact cost plan

This is a prospective, unexecuted CPU experiment for the single successfully replayed actual F64 first epoch, sea time 125.99999999999488. It repeats that fixed epoch. It does not replay the other 14 epochs, model a historical sea, measure the renderer or establish browser FPS.

The corrected strict check and first actual parity replay passed. The original TS7022 failure remains frozen; the sole approved correction was a number annotation at replay line255. The passed proof is `checks/f64-replay-corrected-proof.json` (SHA256 2694b938529bc35f366804e35de42870144c3d9cf49202640dffc6656e121f31). All 20,117 ordered height callback triples, captured query geometry and original 627-call order/output/floor/traces matched; 441 query calls, 186 floorAt calls, 28 hits, 65 exact selected Float32 normals versus 23,852 eager normals. Its first epoch had zero anomalies; the separate synthetic actual-API anomaly test passed in the earlier 111/111 suite.

`src/wave/barrel/contactNormalDemand.cost.ts` owns the cost source. `performance/cost.test.ts` is the explicit driver and `vitest.cost.config.ts` discovers only that driver. It is excluded from the ordinary prototype test config. The five frozen normal runtime files are unchanged. The cost source/config have not been typechecked, run or measured.

Two persistent contexts use independent captured F64 h/bed/xCenters/zCenters/dz copies and the respective actual solver interpolation methods and actual PhysicalSurfWater plain provider/cache. Case bytes are plain owning Uint8Arrays before independent decodes. There is no Proxy, field tracking, callback trace spy or timer inside a measured call. A candidate prototype.update wrapper acquires its raw QA backend during one untimed empty setup epoch, restores in finally, and cannot persist into preflight/warmup/measurement; the original gets the same empty setup epoch. Nineteen imported method identities are guarded and function-text hashes are reported. All original non-test TS runtime source in both trees, plus this cost source/driver/config, is hash-pinned in authority.json; root must freeze that authority hash before execution.

Each complete workload resets the five stats fields, executes the full original or private contact update with the real scoped plain-height cache and original eager Y/seals/profiles/topology, then calls every original query/floor input in its original mixed order. Each query restores all recorded initial hit fields. Frozen private facade dispatch, normal-ready and final-run invalidation, lazy buckets and demanded normal computation are therefore charged. Preallocated sinks retain every boolean result, every hit field and every floor result. Sink writes are common added driver cost charged equally; no height/geometry/normal work is omitted. No per-workload h/bed snapshot copy is introduced by this normal-only candidate.

Predeclared schedule: one empty setup and one full preflight per variant; sixteen full alternating warmups per variant; sixty four-trial blocks alternating ABBA and BAAB. There are exactly 120 measured complete workloads per variant, 274 total complete fixture workloads including preflight/warmup, plus two empty setups. Every trial uses one outer performance.now pair around the workload only. Afterwards, exact guards compare all retained outputs to the capture, active positions/indices/contact-read metadata and the selected 65 normal slots to captured bytes, plus exact stats 441/28/0/142/0. Stats and both physical snapshots remain exact. There is no drain of hypothetical unused private normal/mouth/sheet history.

The report retains every raw trial and paired block. Each block uses the mean of its two original trials minus the mean of its two private trials; report the median of those paired differences along with separate complete-path medians. Do not infer a saving from contactMs, normal-only loop timing or the quantized observer clock. Do not silently retry a bad run. A failure freezes its report/log/source. Module layout and JIT differences remain a limitation of this two-module controlled experiment, not evidence of FPS.

Proposed commands only after root source review and explicit quiet CPU lease:

```sh
./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.json
./node_modules/.bin/vitest run --config vitest.cost.config.ts --maxWorkers 1 performance/cost.test.ts
```

Root should pin the ready manifest/authority and preserve terminal logs plus performance/cost-first-report.json whether successful or failed. No benchmarks, broad Runner tests, build, GPU/browser/server or production/Git operations have run or are authorized by this preparation.
