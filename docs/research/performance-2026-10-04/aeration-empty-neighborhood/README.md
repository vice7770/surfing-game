# Aeration empty-neighborhood candidate — rejected

The complete CPU material chain was slower in every measured pair for both conditions. **Rejected: no production change, guard redesign, repeat, native/FPS trial or adoption.** Positive saving means original time minus candidate time; the paired column comes from each actual pair, not subtraction of independent quantiles.

| Controlled condition | Original median | Candidate median | Paired median saving | Positive pairs |
| --- | ---: | ---: | ---: | ---: |
| Imported air/plume, normal imported zero TKE |7.485208ms|12.938292ms|−5.368438ms|0/24|
| Same fresh import, synthetic dense TKE=.1 |5.412251ms|10.213459ms|−4.814271ms|0/24|

Both orders were slower: AB/BA paired medians were −5.331230/−5.384791ms for imported zero TKE and −4.904562/−4.757313ms for dense TKE. The included source-callback stage regressed strongly (+6.004542ms/+4.735959ms paired median): it includes per-source ownership checks. Whole-chain measurements determine rejection; no independent stage-quantile sum is used.

The imported condition skipped86,346 of114,792 final wet destinations; dense TKE skipped0. Each condition recorded167,869 source calls,163,369 guard checks and one reseed, with no hidden per-step reseed. Saving interpolation reads did not compensate for the measured bookkeeping in this implementation.

Root ran one quiet CPU operation at2026-10-04 **05:09:47.288361–05:09:52.428797UTC**, exit0,5.140235s outer duration. Its20s child bound plus bounded owned cleanup was unchanged; all440 input pins/7links stayed exact. Two fresh same-config/state arm pairs each performed one timed initial reseed,12warm pairs and24balanced adjacent AB/BA measured pairs:74pairs/148complete calls. The [raw report](root-cost-first/cost-report.json.gz) expands to60,678B, SHA4c3569adaa0c6b7544c205409f39891761bf3df5780f571982f8387de724b997; [actual terminal](root-cost-first/terminal.json) SHAe87191f6706a59a8bfb5283b5ffb1dfd514d60fec68ceeeeb63062a8986563e2.

The timer includes unchanged Foam.update, actual aerateBores callbacks, all owner/source guards and tag maintenance/reseed, Air interpolation/copies/finish, and fused snapshot writes into reused buffers. After-pair checks retained exact material/state/source-index-capacity/tail/stencil/snapshot bytes, identities and fixed water/window/solver/sea clocks. It excludes water/front/lip.step/body/contact/particles/postMessage/render. This is not an FPS result.

The candidate used a private actual WorkerCore-owner contract at accepted runtime e3e630bc45339e0f7564e59cfdd556275c06de92. Four positive-zero air/depth/TKE source cells and finite valid fractions were required; signed zero/nonfinite/custom-method/direct-write generic paths remained exact. Import invalidated before writes, injections marked cells, finish/window movement maintained tags. Externally leaking a forWorker-owned array remained outside that internal ownership contract; no arbitrary-write interception was claimed.

Fixture authority is the existing [render-scale F32 post-state export](../../performance-2026-10-03/render-scale/baseline-held-source.json.gz) from1bcc, controlled handover into e3:116,000cells, seed8761/Hs3.8/T18/dir0/spread150/C64/dx2/fine1. It is not historical pre-degas or live late-Big state. SET1 omits TKE, so real import clears it; dense.1 is synthetic. Gated whitewater was not exported; unchanged BreakingModel.update(0) supplied a declared ungated source proxy. Both arms evolved matched material phase on held h/q/time without per-pair resets. No quality/live steady-state saving is inferred.

First strict failed on a missing required FreshFoam decay argument; its exact logs/source are retained in checks/. The fixture-only correction was followed by strict PASS and25/26cases; a source-text extractor had selected the owner interface, preserved in checks-v2/. Class-scoping preserved the exact equality assertion, then [strict and26/26cases passed](checks-v3/terminal.json). The portable cases establish scoped parity, not FPS. Strict and standalone bundle subsequently passed in cost-checks/.

[The exact patch](prepared/candidate.patch.gz), [source/intake](prepared/cost.ts.txt.gz), [declared plan](prepared/cost-plan.md.gz), all historical sources/readiness/logs, and checksums are retained losslessly. Tests/code use .txt archival suffixes. Identical originals are explicit manifest aliases; before/after ledgers and empty logs may share one payload. The generated1,046,198B bundle remains external SHA34104461…; unchanged source/dependencies and the15.3MB fixture are hash-bound without duplicate trees/assets/binary copies. unexecuted-outer/ contains an unused prepared proposal only; root used its own inline wrapper, whose actual argv/PID/UTC/exit is preserved in the terminal.

Verify bytes only with `python3 verify.py`. [manifest.json](manifest.json) records stored/expanded/original aliases and external refs. This performs archival checks, with no experiment/test/build/hardware rerun.
