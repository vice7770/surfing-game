# One live aeration argument capture — ready for review, not executed

The complete scratch tree was made with `git archive` at **56bf750996cd48cdc5ef45954c479a268053c0b9**, retaining the original crest clock. Its `node_modules` is a symlink to the shared installed dependencies. No production file was changed.

Exactly two scratch source files differ: `src/wave/AerationField.ts` and `src/game/surfZoneWorker.ts`. Their unapplied-to-production diffs are `AerationField.patch` and `surfZoneWorker.patch`. All 626 source/config files in the manifest scope were compared to the explicit base git blobs; every other file matches. The worker entry consumes a nonce-tagged QA arm/collect/cancel channel before the original handler, observes actual start/advance serials, and arms only its settled actual runner's aeration field. Ordinary request/reply/transfer objects are unchanged.

`npm run build` passed once. The archive has no `.git`; Vite's existing nonfatal git metadata lookup appears in `build.log`, and the actual fallback `build.json` is retained. Explicit base/hash provenance is in `manifest.json`, not a fabricated build version. The frozen patched worker is `surfZoneWorker-BiS1HSwW.js` SHA256 `6a59a6367a8eb25c4d53fd5a9becdf9c8462d86ebb9b8c9237a1a50ec0b70aef`. The page entry is `index-D_CFvyTQ.js` SHA256 `c5e70fe12e916607c3711de03b17d95f8c1c752d3ed9b98ad4a1c28ac945b635`.

Six cheap node toy tests passed (zero failures). They compare the original exact source class to the scratch class, including every public/scratch F64 field byte, public array identity, and ordered `Math.exp` arguments. Cases cover normal advection, dry/source/stir/boundary behavior, shared stencil, finish-only NaN/signed-zero/skip edges, single-instance/single-positive-update arming, and cancellation/double-arm rejection. This is not a hardware/material-state result. Counter computation preserves the exact argument and still calls every original exponential.

The default adapter invocation outputs its plan only. It opens neither server nor browser:

```
node /private/tmp/aeration-live-arguments-20261004/adapter.mjs
```

Proposed ONE hardware command, only after root review and exclusive GPU release:

```
node /private/tmp/aeration-live-arguments-20261004/adapter.mjs --run=true --out=/private/tmp/aeration-live-arguments-20261004/run
```

The adapter owns a temporary static server on4214 and a fresh headed Chrome/CDP9624 profile, refusing occupied ports and an existing output directory. It uses ordinary menu→Surf→Padang→Big→Paddle out, seed8761/High/Rich/High particles/C64/GPU-auto, no runtime physics/render overrides. Native guards are CSS1708×926/browserDPR2/backing2989×1620, default dx2/fine1/render2/mask1/rider+four cases and one-step batching. Then it warms normal RAF for **five wall seconds**, holds subsequent RAF, settles outstanding work, and arms/steps/collects **one** real update through the normal host. The build is observational even while unarmed: there is no FPS sample or steady-state saving claim.

Fixed bounds: initialization180s from owned Chrome spawn; overall240s from that spawn; settle15s; entire one-capture arm/step/collect15s; no retry or extension. Every partial result/error is retained. Finally cancels the hook if reachable, closes only the owned Chrome, verifies its CDP listener is gone, and closes the owned server. It never opens or changes the user's play server. Scalar IDs tie run/start/advance/field and actual dt/solver-time/sea-time/window to the completed one-step reply. Captured aeration/pipeline timing includes observer work and is diagnostic only.

Status: source patch, bootstrap, build, tiny tests, syntax and plan branch prepared. **No browser/GPU or actual argument scan/count has run.** `ready.json` holds current hashes for review.
