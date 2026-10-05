# Formation activation source candidate — 2026-10-05

This isolated source-only candidate copies the immediate raw-normal native source snapshot's 588 pinned inputs. It changes only `source/src/wave/barrel/sweptLoft.ts`: the existing true analytic-C formation scales the shared slice deformation weight and the C seam mask. Non-C lookups default to one. `e` still consumes `w` once. The provider, formation clock, contour, board, controls, and stepping are unchanged.

No test, build, physical simulation, CPU probe, native application, or server was run during preparation. No production workspace file was modified. Root must execute and judge all checks.

`tests/formationWeight.test.ts` prepares five actual-consumer checks:

- Formation zero: all imported C cases, negative and exact-zero ages, flat/plane/curved water. The actual final F32 loft lies on sampled ordinary water with zero lift/mask, and actual `SweptContact` floor/query calls throughout its footprint decline ownership. Input records must remain unchanged.
- Real ordinary worker: `SweptContact.forOrdinaryWorker` captures a nonflat physical water field with nonzero flow. Exact `PhysicalSurfWater.surfaceAt` and complete `sampleAt` results must match the ordinary water at points below, above, and well above the surface for negative/zero ages. This uses the real deferred owner; it does not merely inspect mask values.
- Formation one: all imported C cases, pre-impact and post-impact ages, flat/plane/curved water. All 37 active typed-array byte ranges, all public scalar/diagnostic fields, and counts must exactly match the unchanged immediate parent in drawing, eager contact, and fully prepared deferred contact modes. Byte comparison retains NaN payloads and signed zeros. Records must remain unchanged.
- Partial formation: all cases, 0.2/0.5/0.8 of the actual clear clock, neighboring age differences, and all three waters. Actual F32 geometry must remain finite and agree across drawing/eager/deferred consumers. Independent triangle-column witnesses check floor/underside/top order, positive world clearance and sheet thickness, and actual air queries with unit contact normals. Every late-partial fixture must expose a nonempty real air volume; earlier formation is surveyed without assuming the roof has already overturned. Failures and minimum observed distances can be retained via `FORMATION_METRICS`.
- Non-C control: actual raw provider at negative/zero/active ages, all three waters, drawing and eager contact, with the same complete parent word comparison.

Root commands (not executed here):

```sh
cd /private/tmp/tube-c-formation-trial-20261005
/opt/homebrew/bin/node /Users/regina/Desktop/Projects/surfing-game/node_modules/typescript/bin/tsc --incremental false -p tsconfig.fixture.json
FORMATION_METRICS=/private/tmp/tube-c-formation-trial-20261005/root-formation-metrics.json /opt/homebrew/bin/node /Users/regina/Desktop/Projects/surfing-game/node_modules/vitest/vitest.mjs run --config vitest.config.ts --reporter=json --outputFile root-formation-tests.json
```

Run the existing `source/src/wave/barrel/boundedCConsumers.test.ts` with cwd `source` separately, then the source build if this candidate survives the focused checks. The `public` and `node_modules` links only resolve immutable fixture assets/tool dependencies. Source runtime authority remains the direct parent manifest plus the single recorded delta.

Semantic risks requiring evidence:

- This intentionally adds activation of the loft to an already evolving provider contour; partially formed vertical clearance shrinks further. F32 thickness or layer ordering may fail on moving/sloping ordinary water.
- A newly acquired front already at formation one still starts at full weight. This change provides no temporal interpolation between solver generations, fronts, layers, or triangles.
- Ghost-to-positive contact ownership still begins at any positive weight. Birth/replacement or partly formed ordinary-water differences may still cause a discontinuity.
- Existing provider-derived cap transport and anchor velocity are unchanged; they are not an independently differentiated velocity of the newly weighted world deformation. Lip flow's existing weight uses the new shared slice weight.
- Formation-zero rows still retain their XZ carrier topology, but all masks and vertical lift are zero and the C contact weight check must decline them. This candidate does not prove standing, tube entry, passage, visual quality, or a fix for the observed landing jolt.
