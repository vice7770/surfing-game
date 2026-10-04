# Exact future commands, source preparation only

Owned directory: `/private/tmp/surf-sparse-upload-fps-20261004`.

Accepted source6f3 and sparse patch63e8 are fixed. `prepare-source.py` extracts complete tracked `src`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`; verifies each archive blob; creates two arms with read-only-use `node_modules`/`public` links; and regenerates the exact eight-path patch. No game imports or checks occur there. The full source byte proof is separate from the prior successful launcher's 246-file compiled import authority, which is not reused.

After root closes the competing hardware lease, only accepted read-only source extraction/preparation is proposed:

    python3 prepare-source.py
    python3 freeze-source.py

After a separate reviewed CPU check/build lease, stop on first failure and retain separate stdout/stderr/command/UTC/exit and exact source before/after:

    node baseline/node_modules/typescript/bin/tsc --project=baseline/tsconfig.json --noEmit
    node candidate/node_modules/typescript/bin/tsc --project=candidate/tsconfig.json --noEmit
    env BUILD_ID=6f321d704-qa-sparse-upload SPARSE_FPS_READY_SHA256=<reviewed-ready-sha> node build-only.mjs

No tests/cohorts are added: previously reviewed sparse CPU15 and real-GPU/whole-worker gate remain separate evidence. This builds client+ordinary worker once per matched arm with the same explicit BUILD_ID, unchanged source flags and shared pinned dependencies; no server/Chrome/GPU.

Only after both strict checks/builds pass and root reviews actual compiled manifests:

    python3 bind-launch.py
    node --check native-owned.mjs
    node --check passive-guard.mjs
    node --check survey.mjs
    node --check pair.mjs
    node pair.mjs --run=false

These future local checks do not launch Chrome or fetch. `bind-launch.py` snapshots the pending bindings and emits actual per-arm compiled/output pins plus reviewed-launch-ready inputs. A separate sole GPU lease is required; this source proposal cannot launch the pair.

Future hardware command template, to be fixed to actual reviewed launch-ready hash and fresh output before any operation:

    env SPARSE_FPS_LAUNCH_READY_SHA256=<reviewed-launch-ready-sha> node pair.mjs --run=true --out=/private/tmp/surf-sparse-upload-fps-20261004/run

Arm commands are unchanged successful route/config/90s flags, with only ports/compiled directory/source baseline bindings changed:

    node survey.mjs <baseline-fps.json> --url=http://127.0.0.1:4219/?diagnostics --dir=<baseline/dist> --features=true '--only=High (baseline)' --spot=Padang --swell=Big --warmSeconds=5 --rideSeconds=90 --gpuTiming=false --diagnosticGpu=false --edition=single-step-publication --width=1708 --height=966 --cdp=9629 --commit=6f321d704269f9f1afc73750ab2b1f4a86f61122

Candidate HTTP4220/CDP9630 is serial after baseline valid and TCP-closed; adds the retained baseline matching argument. Both ports are freshly owned, source-required public assets served from pinned existing whitelist38 files, all built bundles byte-verified before Chrome. Baseline/candidate180s total each,175s abort+cleanup5, no retry. Port4200 always closed. Exact native CSS1708×879/DPR2/backing2989×1538 is required, with no sizing intervention. No source/quality/physics overrides, GPU timer queries, profiler, clock cross-realm attribution or SET1 import.

Ready/source/compiled and result hashes must be reviewed at their actual stage. This directory currently records source preparation only; no imports, typechecks, builds, syntax/dry checks, browser, server, GPU or FPS occurred.
