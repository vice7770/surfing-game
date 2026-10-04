# Launcher-only revision, frozen numeric program

The new `device-gate-v3.mjs` leaves original ready26f2, old driver, both runtime variants, browser entry, compiled5bab/HTML/ES module, v1/v2 checks and first invalid hardware operation unchanged. The new launch authority requires both `FUSION_READY_SHA256` and `FUSION_LAUNCH_READY_SHA256`, verifies all34 original pins as before, and separately checks its own driver/CDP/oldready/compiled/two outputs. No bundle rebuild is needed or proposed.

The sole-page selector follows the successful frozen contact FPS native launcher: ignore background/browser_ui types; require exactly one actual page and its debugger URL; reject ambiguity; record the selected page before explicit navigation. The numeric parity/timing call and its result handling are unchanged. New evidence is capped Chrome stdout/stderr16KiB each, bounded first/last plus at most10 distinct inventories (12 targets,512 characters per field), latest poll error, and spawn error. Fetch has the successful helper's500ms timeout; startup retains100 polls/100ms and now explicitly stops at10s, under the same90s overall bound. No window resize or emulation is added. Cleanup remains owned TERM→KILL/TCP closure; no retry or borrowed browser.

Proposed **two** sequential cheap commands, not run, stop on first failure without repair:

```sh
node --check device-gate-v3.mjs
node device-gate-v3.mjs --run=false
```

Only a later separately reviewed hardware grant would execute once to a new output:

```sh
FUSION_READY_SHA256=26f2c678e0982ef08d82cb4d8b20ebbcaa91339e4bf572c41abb98ab6e699c28 FUSION_LAUNCH_READY_SHA256=<reviewed launch-ready-v3 hash> node device-gate-v3.mjs --run=true --out=/private/tmp/surf-viscous-update-fusion-20261004/run-v3
```

The first invalid operation remains a bootstrap failure with no GPU entry/parity/cost; it is not reclassified. This revision supplies evidence that the old operation omitted. Successful prior contact-v3 evidence retained a `chrome://newtab/` page under the same `--app=about:blank` flag; the actual failed fusion target URL is unknown.
