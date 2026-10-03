# Late JS CPU sample: prepared, not executed

Frozen new-clock build: `/private/tmp/paced-crossing-gameplay-20261004/dist`, http://localhost:4211/?diagnostics. Root manifest SHA-256 `c3d6faf1490a7ac2882b14be2af8bc3b95e5c06ec3966face712e092ed83025b`; main `fd2c2bd093073e04d25b191833a9b45b4465554b743cf1fd1faca7208987e8a0`, worker `21b796673a700d9ecb8c46fb32c913795a89134c51adb0860e98f646f65371fa`.

The quality-source comparison uses `56bf750996`, the pre-clock source checkpoint recorded by that frozen manifest. The frozen runtime includes four subsequent source hunks across BreakingFront.ts and SweptCrash.ts (now published in 58ceb6a29617c00f93fb3b21eff3058d824319d5). The eight quality-source files compared by the existing survey match 56bf; this does not claim the whole runtime is 56bf. Exact loaded runtime authority remains the pinned served entry/worker and other artifact bytes. FPS output stays diagnostic with `baselineComparable:false`.

Dry plan (no fetch/browser/profiler):

```
node /private/tmp/late-js-profile-20261004-v2/driver.mjs --plan=true
```

Only after root reviews preparation and releases hardware:

```
node /private/tmp/late-js-profile-20261004-v2/driver.mjs --plan=false
```

Default owned CDP 9547; refuse existing runtime evidence. The exact frozen ordinary 90 s survey route and its 360 s owned launcher are reused, with only observer/scheduling/diagnostic-label changes. The launcher uses the actual 4211 URL, not about:blank. Main/worker profiling is a diagnostic; the resulting FPS row explicitly has `baselineComparable:false`.

Clock origin is the canonical sample entry **after its original five-second warmup**, with a successful actual `PhysicalMode.ready`/GPU/native config/worker identity guard. The original ride screen-observed time is also retained. The unmodified route's `onScreen('ride')` checks only DOM screen and does not itself await physical readiness. Therefore this explicit ready-guarded origin is later than DOM ride time; record both rather than claiming a precise physical activation instant. Profiler starts 75 s after that origin and runs 8 s; the retained CDP command boundaries and raw profile timestamps show actual starts/stops.

Worker constructor/start observers preserve the native start request and transfer lists; no nonce exists in that protocol. Readiness guards use actual `mode.host.port` fields. Browser targets must contain one exact page URL and a UNIQUE worker with the current page `parentFrameId`; the page/frame and browser context are retained. Attach `flatten:true`, then evaluate `self.location.href` in that exact worker session and require the pinned worker URL before any Profiler command. A nonempty contradictory TargetInfo.url still fails; an empty optional URL is retained without inferring its cause. The worker target must survive, and its inside URL is checked again after profiling. Missing/ambiguous parent-frame or wrong inside URL remains invalid; there is no retry or weaker identity fallback.

Raw outputs: `result/cpu/{page,worker}.cpuprofile`, attribution tables, and `result/cpu/report.json` containing commands, targets, pre/post state and the existing pipeline witnesses in that window. `result/fps-diagnostic.json` retains the ordinary diagnostic context. `workflow.json` records child outcome and CDP port cleanup; early loader failures retain that report and console.log even if a CPU profile never started. Each successful raw profile is saved before attribution. Idle/program/GC/native/unresolved samples remain visible; inclusive columns overlap. Exact loaded bundle URL/hash plus zero-based line/column excerpts provide initial attribution without a source-map rebuild. CPU stacks cannot establish whether V8 eliminates tuple/object allocations.

The exact launcher hardware watchdog begins at Chrome spawn and closes its own browser at 360 s, with 500 ms cleanup. A separate 360 s action deadline begins after page launch and guarantees the driver finally path; it does not extend hardware lifetime. Profile CDP/page observer commands have 10 s deadlines, and browser-session connection has 5 s. Console/error evidence is retained even on a failed action. These limits are not automatically widened.

Only syntax checks and the dry plan are authorized at preparation time. No runtime/hardware execution has been performed by this adapter.

V2 is separate from the invalid v1 under `/private/tmp/late-js-profile-20261004`. V1 stopped before any Profiler command because TargetInfo.url was empty, despite its actual host guard and unique parent-frame relationship; it has zero profiles and no cost finding. All v1 prepared/source/result bytes remain unchanged. V2 adds the explicit in-worker identity observation instead of depending on that absent optional metadata. Live v2 writes runtime-preparation.json, preserving dry-plan preparation.json and its readiness hashes.
