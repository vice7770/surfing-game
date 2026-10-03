# Failed late JavaScript CPU profiling attempts

**Both attempts produced zero CPU profiles and no CPU cost finding. Their FPS JSON is diagnostic evidence, not passive FPS acceptance.** Both failed before any `Profiler.enable`, `start` or `stop` command. No third trial, deadline widening, production change, commit or hardware run was performed while creating this archive.

| Attempt | Observed failure | Retained profiles | Cleanup evidence |
| --- | --- | --- | --- |
| v1, started 2026-10-03 23:30:29 UTC | Sole worker had the expected parent identifiers but an empty target URL; strict identity check rejected it. | `{}`; no profiling commands | Workflow exit 1; owned CDP 9546 returned TCP `ECONNREFUSED` at 23:32:31 UTC. |
| v2, started 2026-10-03 23:34:41 UTC | Exact parent-frame/context match and flat session attachment succeeded. Worker-session `Runtime.evaluate` of `self.location.href` hit the local 10-second deadline, 23:36:25.924–23:36:35.926 UTC. | `{}`; one failed identity command, no profiling commands | Workflow exit 1; owned CDP 9547 returned TCP `ECONNREFUSED` at 23:36:43 UTC. |

The intended observation was 8 seconds of page and actual worker CPU sampling at 1 ms, beginning 75 seconds after canonical sample entry. That origin followed the existing five-second warmup and actual ready/native guard; the separate ride-screen timestamp was also retained. The owned launcher imposed a 360-second hardware lifetime plus 500 ms cleanup, with a separate post-launch action deadline. Neither run reached the intended capture. Browser metadata was Chrome 154.0.8037.93.

## Exact retained evidence

The [manifest](manifest.json) records every stored byte hash, original path/byte hash, decompressed hash and omission. Each retained original has one explicit alias; identical helper files remain separate v1/v2 copies. Code is archived as `.mjs.txt`, avoiding execution/test discovery. Large diagnostic FPS JSON uses gzip with empty filename and mtime 0; decompression reproduces the original bytes. Exact drivers, session/profile/attribution helpers, derived survey, readiness records, dry logs, actual preparation metadata, raw CPU error reports, workflow cleanup, diagnostic FPS JSON, console and interpretation are retained. Prepared READMEs are historical instructions, not authorization to run them.

V1's original `preparation.json` was overwritten by the live driver with `planOnly:false`: those actual bytes are [preparation-postrun.json](v1/preparation-postrun.json). Its pre-launch readiness hash describes the earlier preparation bytes; 8 of 9 current source records still match, and this metadata transition is explicit in the manifest. The standalone pre-run JSON is not fabricated or reconstructed; the original [dry-plan log](v1/dry-plan.log) remains exact. V2 retains both [dry preparation](v2/preparation.json) and [live preparation](v2/runtime-preparation.json); all 9 dry readiness records remain exact. The preparation object's `chromeStarted:false` is written before launch and is not cleanup evidence; the actual workflow results establish closure.

Two failed-run PNGs were deliberately omitted, with their original hashes/sizes listed in the manifest. No visual quality claim is made, and no runtime JS bundle is copied.

## Frozen runtime authority

Both attempts used frozen port 4211, with build manifest SHA256 `c3d6faf1490a7ac2882b14be2af8bc3b95e5c06ec3966face712e092ed83025b`; the exact same manifest is already durable at [paced throw crossing](../paced-throw-crossing/gameplay-build-manifest.json).

- Main `index-BBfxZIFO.js`: `fd2c2bd093073e04d25b191833a9b45b4465554b743cf1fd1faca7208987e8a0`.
- Worker `surfZoneWorker-0gFT5nyl.js`: `21b796673a700d9ecb8c46fb32c913795a89134c51adb0860e98f646f65371fa`.
- Source checkpoint `56bf750996cd48cdc5ef45954c479a268053c0b9`; published clock commit `58ceb6a29617c00f93fb3b21eff3058d824319d5`. Four runtime hunks in `BreakingFront.ts` and `SweptCrash.ts` followed that checkpoint. The served hashes establish runtime authority; commit metadata alone does not.

## Protocol interpretation remains inferential

[V2 interpretation](v2/interpretation.md) cites primary Chromium/V8 source. Chromium creates discoverable worker hosts with empty URL; parent-renderer child-target reporting later supplies the URL and worker agent connection. Auto-attachment activates that reporting. The session code can retain commands while no renderer session is available. This mechanism is consistent with the observed empty URL and absent Runtime response, but the retained evidence does not establish the backend binding state or exclude a client routing issue. It is not a confirmed Chrome 154 failure cause or a demonstrated repair. Current `main` source was inspected, without a verified matching Chrome release revision. V8's `Runtime.evaluate` has no `Runtime.enable` gate; no evidence establishes that enable alone would fix the timeout.

No attribution to contact preparation, tuple allocation, foam, shading, GPU waiting or another bottleneck follows from these failures. Inclusive/self timing and worker/main interpretation rules remain in the notes for context, not as measured results.
