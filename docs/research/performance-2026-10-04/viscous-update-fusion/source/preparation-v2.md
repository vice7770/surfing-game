# Viscosity/update dispatch fusion — isolated preparation

No production change or execution is claimed. The two GPU source variants preserve the unchanged water arithmetic and complete device step at the contact-adoption boundary `6f321d704269f9f1afc73750ab2b1f4a86f61122`. Both arm hosts bind their four shared solver/sea imports to the same canonical absolute source path, preventing duplicate private TypeScript class identities. Apart from that documented QA-only import binding, only the candidate's two GPU files differ. Immediate solver/sea dependencies and the installed dependencies are read-only links; no repository, public assets or historical snapshots are copied.

`viscous` reads settled `NU`, `QX`, `QZ`, `SHEAR` and their neighbours, then writes `VISCX/Z[i]`. `update` reads those same-cell stores and changes only `H/PBAR/QBAR[i]`, none of which viscosity reads. Running the two bodies consecutively for each cell needs no global intermediate barrier. Both original arithmetic bodies remain literal, including storage writes and reloads. The helpers contain any local early return; the fused entry always calls the update helper afterward. The actual pinned viscosity body has no dry/zero-viscosity early return (only its original entry bounds guard).

The candidate compiles all original diagnostic entry points plus `viscousUpdate`. Its default dispatch sequence replaces only `viscous,update` with `viscousUpdate` (17→16 kernels per CFL substep before existing optional-zone skips). Field layout, packing, CFL, queue submission, nine-field map/readback and adoption are unchanged. No submission or readback is batched. Unsupported periodic device steps remain refused by the original host; they are a source-only unchanged boundary, not a hardware parity claim.

`source-dispatch.test.mjs` has four literal-source/dispatch tests. `browser-entry.ts` uses the actual two `GpuBoussinesq.create/.step` implementations with deterministic supplied inputs. Six parity cases cover open/wall breaking, and open breaking-disabled water, each at one/multiple CFL substeps, three consecutive steps. The small65×19 nonuniform grid includes wet/dry cells, nonzero flow, predictors and plunge hold. Nine mapped fields (`H,QX,QZ,RATEH,STRENGTH,AGE,NU,PREDX,PREDZ`) must be finite and F32-bit identical after every step, with identical clocks/substep counts. First-step stored `VISCX/Z` bytes also match; breaking cases require nonzero terms. Breaking-disabled cases require zero `NU/VISC` while water changes, guarding an accidentally skipped update. No CPU fallback is allowed.

Only after parity succeeds, one timing sequence uses a supplied160×725=116,000-cell nonuniform grid,64 seeded sea components, offshore relaxation and actual side feed. It is not a historical or ordinary Padang state. Four paired warm steps precede24 alternating A→B/B→A pairs at1/60s. Each timed await is the unchanged complete `.step` (pack/CFL/encode/submit/map/unpack/adopt). Construction, extra viscosity readback, parity scans and statistics are outside that duration. All nine fields/clocks/substeps must still match after every pair. The report retains both total durations and the original component diagnostics; their quantization and one short sequence prevent an FPS or ordinary late-state claim.

Proposed sequential source/check lease, stop at first failure without retry or repair:

```sh
node --check device-gate.mjs
node --check bundle.mjs
node --test source-dispatch.test.mjs
/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/tsc -p tsconfig.fusion.json --pretty false
node bundle.mjs
node device-gate.mjs --run=false
```

For the initial frozen source, commands1–3 passed (four source tests); command4 stopped with three TypeScript nominal solver-identity errors. No bundle/GPU ran. All20 original owned/preparation/check files are retained byte-exact under `v1/`, including original readiness and failure. This revised source fixes only shared import identity and creates mismatch strings solely on failed parity conditions, avoiding success-path transient strings leaking GC into later timing. The revised commands have **not run**. The bundle command refuses an existing `dist`, verifies pinned source before/after, and writes only a QA HTML/ES module plus `compiled.json`. A separate reviewed hardware lease would run exactly once:

```sh
FUSION_READY_SHA256=<reviewed ready.json hash> node device-gate.mjs --run=true --out=/private/tmp/surf-viscous-update-fusion-20261004/run
```

The driver validates the same source pins and compiled bytes, owns a fresh Chrome/profile/static two-file server on4218/CDP9628, requires4200 closed, and never touches user5173. It uses only the borrowed CDP `Page/sleep` (no original launcher, resize, emulation, game, RAF, profiler or GPU timestamps). The command has a90s overall hard bound and a60s in-page gate, stops on first invalid operation, closes owned Chrome/server with TERM→KILL fallback and records TCP closure. It retains one result JSON and stage/stdout evidence. Complete-step saving is unproved until this gate runs; an ordinary FPS follow-up would require a materially positive complete-step result and another review/lease.
