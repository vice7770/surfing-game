# Aeration live argument adapter v2 — source preparation only

V1 failed before any game/phase/counter: `Owned Chrome blank page unavailable`. Its raw report confirms owned Chrome and server closed. The cause is **unknown**: it retained neither target inventory nor startup/exit state, so no specific launch failure can be asserted. All v1 files, worker build, source patch, manifest and failed report stay unchanged.

V2 changes only the adapter. It launches the actual QA URL like the known working owned launcher, selects the **sole page** of its fresh owned profile and previously empty CDP port, injects the early bootstrap, then navigates a fresh document to the actual URL. It never assumes that Chrome reports `about:blank`. Multiple owned pages fail as ambiguous. Retained diagnostics include the last complete target inventory/poll error, chosen target, process PID/profile/spawn event/error/exit/stderr (bounded32KiB), and live process status immediately before cleanup. Initial pre-bootstrap document workers are discarded by fresh navigation; only the fresh observed rider worker may arm.

The original selection limit (100 attempts, each150ms sleep plus bounded500ms fetch; not a strict15s total),180s initialization,240s overall,15s settlement/capture, five-second ordinary warmup and one armed update remain. No automatic retry, timeout increase, worker rebuild, production change or hardware execution. Same4214/CDP9624 with fresh output `v2/run`. Preparation remained source-only during the root hardware lease. After its quiet release, node syntax and the default no-launch plan branch both passed. No browser/server was started.

After syntax/dry checks and root review, proposed ONE command:

```
node /private/tmp/aeration-live-arguments-20261004/v2/adapter.mjs --run=true --out=/private/tmp/aeration-live-arguments-20261004/v2/run
```

`adapter-v1-to-v2.patch` is the complete small driver delta. `manifest.json` retains exact original source/build authority and v1-failure/working-launcher provenance. No game/counter result exists for v2.

Cleanup closure proof is now a loopback TCP probe using the original300ms check bound: only ECONNREFUSED proves closure; a connection proves open; timeout/other error is null and invalidates a completed run. No hardware was used to prepare this change.
