# Real CPU material lifecycle proof

One fresh F64 CPU trajectory followed actual `FrontPoint.id=3` and its generated strip `2`: launch and open drawing at step **664**, touchdown and strip closure observed at **679**, then F64 and published F32 profile fade zero plus actual strip-ID retirement at **684**. The front point still exists. Packed `(front, X)`, unchanged point presence and neighboring geometry are therefore insufficient material-lifecycle identities.

The [21 retained traces](evidence/run/result.json.gz) and [proof summary](evidence/v2/proof-summary.json.gz) come from accepted runtime `e3e630bc45339e0f7564e59cfdd556275c06de92`. The fixture is Padang, seed3, Hs1.2m/T16s, C12, 320m width, dx2/fine2/coarse4, one period of actual CPU water spin-up, then full simulation steps at 1/30s. It searched664 steps and followed20 more. Separate read-only profile/drawing libraries observed the real CPU solver/front/crash/lip trajectory; no forced clocks, injected strip or callback replacement was used. JSON converts packed NaN pace to null, so this is event/identity evidence rather than floating-point byte-parity proof.

Strict TypeScript and the single lifecycle test passed on the only executed attempt (04:08:15–04:08:42 UTC). The [terminal](evidence/checks-first/terminal.json.gz), test logs and byte-identical before/after inventories are retained. The [v2 readiness](evidence/v2/ready.json.gz) and proposal preserve their original pre-execution labels; completion is established by the terminal and proof, not a rewritten readiness file.

V1 was **unexecuted**. Its observer incorrectly required permanent point-to-strip association and absence of a neighboring joined bracket after the selected point faded. The [observer-only correction](evidence/v2/observer-semantics-v2.patch.gz) instead reports association changes without retargeting, treats neighboring geometry as optional context and requires actual selected strip-ID absence after observed closure. Original v1 sources/readiness remain byte-exact; identical files share payloads through the manifest's explicit aliases.

This is a small-swell fresh CPU trajectory, not Padang Big, a GPU/native worker run, visual seam proof, FPS evidence or full tube acceptance. Strip closure was observed at679; its stored `closedAt` belongs to the lip subsystem's clock. The total landing counter is aggregate and does not attribute every landing to this strip. A surviving faded point does not imply that its material strip remains alive or that the complete local loft disappears.

[manifest.json](manifest.json) records stored/decompressed/original hashes and paths. Runtime56/case4/dependency7 records remain external metadata with e3 provenance; no canonical source, asset or binary copy is included. Archived test sources use `.test.ts.txt.gz` to avoid normal test discovery. Verify without executing game code:

```sh
python3 docs/research/tube-stability-2026-10-04/material-lifecycle/verify.py
```

Verification checks stored bytes, deterministic gzip headers, decompressed bytes, every original alias and external reference. Original `/private/tmp` files are required for the full original-byte check; the archive retains each original hash if those temporary paths are later removed.
