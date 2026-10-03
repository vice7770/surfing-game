# Shared crest rays — 2026-10-03

Sharp local crest kinks in the frozen Padang captures sent independent ±2m tangent normals through each other: corresponding roof, underside and face rows advanced backward **across** the front. The authored profile's intended overhang runs **along** its own ray. Correction retains crest anchors and authored profiles; it does not cut offending strips.

## One authority before emission

`CrestRayPlan` captures the complete front, including faded controls. Drawing, held contact, throws, landings and whitewater gates query one prepared field at arbitrary sigma. It bounds all nearest-slope authored frames and maximum Froude scale, including interior scale-branch crossings. The envelope is cached per library/slope; preparation builds no profiles. The loft plans metadata/rays before its single existing emission loop.

Object and record inputs capture **Float32 sigma, x, z, foot height and foot depth**; crash queries use transported sigma. Original Float64 physical positions, clocks, material/profile values, widths and source-cell bookkeeping remain outside that ray authority. Direct calls prepare afresh from mutable controls.

`SweptCrash` applies stalls/existing paced positions, remeasures each front's arc, then prepares plans. New throws share that stage. After committing all new paced z positions, it remeasures/reprepares before final slices, footprints, landing/gate calculations and serialization. This repairs formerly stale post-pace sigma.

## Continuous bound and supported domain

Let C be the transported crest polyline, n₀ its normalized ±2m ray, and n the normalized shared blend toward a feasible reference normal. The reference tangent `(1,m)` clips the front's mean slope into a 10% inset of every edge's feasible `dx + dz*m > 0` interval. It varies continuously at limiting edges. Valid straight, angled and gentle fields retain the original ray arithmetic exactly.

For any pair of slice queries separated by Δσ, either endpoint's across-front advance is bounded below by:

`Δσ * [B − U*D − R*(1−λ)*Ω/L]`

Here B is minimum reference progress, U maximum crest derivative speed, R maximum authored crest-relative reach plus extensions, D maximum corrected/reference normal difference, Ω a raw-normal derivative bound, and L minimum unnormalized blend length. Each slice's own profile offset cancels on its own tangent; the bound therefore permits different profile offsets/clocks at the two endpoints. A scalar bisection chooses a safe shared λ with 5% progress and Float32 rounding allowance.

Shifted source knots bound minimum raw-vector length. Ω uses differences of nearby source-segment derivatives: weight 1 for interval gaps up to 4m, continuously fading to 0 by 5m, divided by that minimum length. Every actual ±2m derivative pair retains weight 1. This conservative continuous maximum avoids a whole-front blend jump when a vanishing shifted-knot interval appears. A reproduced 10µm sigma perturbation exposed such a jump in the earlier exact interval-maximum bound; a direct continuity regression now covers it.

The sigma domain is `[first−1.5,last+1.5]`, including both emitted shoulders. `endBlend=2.5` eases existing vertices vertically and creates no further sigma queries. Base intervals divide a span of at least 2*extension; refinement halves them. The shared rounding spacing is therefore `0.5*spacing*(2*extension)/(2*extension+spacing)`, approximately **0.214286m**, rather than assuming the nominal 0.25m is always attained. Reversed/coincident controls, non-finite input and a rounding allowance exceeding available progress stay explicitly diagnosed. A fallback blend is not reported as a positive proof in those cases.

## Validation and limits

The focused geometry/contact command below passed **88 tests in three files**. It covers raw arithmetic, F32 object/record parity, phase/hold/refinement independence, stale sigma speed, translated coordinates, both continuity boundaries, invalid inputs, shoulder support, bit-exact uploaded crest anchors at their original planning queries, and positive uploaded row advances at **both** endpoint tangents on a real Padang-library kink. Strict TypeScript and `git diff --check` also passed.

```sh
npx vitest run src/wave/barrel/crestRays.test.ts src/wave/barrel/sweptLoft.test.ts src/wave/barrel/sweptContact.test.ts
npx tsc --noEmit --pretty false
git diff --check
```

Frozen validation rebuilds both candidate and **eea68720f** geometry on the identical retained physical inputs. Original captured drawing arrays are reproduction evidence, not the final source baseline. Collapsed consecutive profile-edge placeholders before a roof forms are diagnosed separately from unexplained degenerate geometry.

The retained [fixtures](fixtures/) contain exact height/foam subarrays aligned to the original 1m lattice, with a 32m band around active captured/candidate geometry. Their original capture hashes and crop coordinates are recorded in each file; original initialization metadata is retained as provenance. This reduces about 26MB of full captures to 731KB of CPU geometry fixtures. [Derivation checks](fixture-derivation.json) confirm bit-exact drawing, contact, metadata and all query results against the full captures, for both source versions. Occupied mask-node counts also match; cropped mask array dimensions/hashes differ. The fixtures do not initialize the complete solver or reproduce the original image.

The final frozen report passed against the regenerated eea baseline (runtime SHA256 `20b5ffd3117d95990d64c4289a135db2069d1eb31d3f5c3b6c659d5f441c44a5`):

| Fixture | Reversed rows, drawing/contact: baseline → candidate | Candidate minimum uploaded advance |
| --- | --- | --- |
| at-10 | 667/667 → 0/0 | 80.34mm |
| at-20 | 729/728 → 0/0 | 49.56mm |

Front IDs, sigma, clocks, phase, life, collapse, fade and uploaded crest x/z remained bit-exact. Finiteness, topology, mask/run-end support, full-scan contact and repeatability passed. Existing overlap decisions change: at-20 joined strips increase from 87 to 97, confirming that the check was not satisfied by dropping folded strips.

The final [static cost measurements](geometry-cost.json) use 21 rotating-order builds per specimen with the real cubic captured water. Baseline/candidate drawing medians are 0.764/0.856ms at-10 and 1.465/1.533ms at-20; contact medians are 0.822/0.895ms and 1.298/1.257ms. The candidate samples/emits once; an abandoned second emission pass was slower and is absent from production. These small geometry timings do not measure whole-game FPS.

```sh
mkdir -p /private/tmp/tube-eea-baseline-source
git archive eea68720f src | tar -x -C /private/tmp/tube-eea-baseline-source
cat > /private/tmp/tube-eea-baseline-source/entry.ts <<'TS'
export { SweptLoft } from './src/wave/barrel/sweptLoft';
export { SweptContact } from './src/wave/barrel/sweptContact';
export { libraryFromBytes } from './src/wave/barrel/barrelLibrary';
TS
./node_modules/.bin/rolldown /private/tmp/tube-eea-baseline-source/entry.ts -o /private/tmp/tube-eea-baseline-source/geometry.mjs --format esm --platform node
./node_modules/.bin/rolldown scripts/tube-geometry-regression-report.ts -o /private/tmp/tube-geometry-regression.mjs --format esm --platform node
node /private/tmp/tube-geometry-regression.mjs --input docs/research/tube-stability-2026-10-03/fixtures --frames 10,20 --baseline /private/tmp/tube-eea-baseline-source/geometry.mjs --out /private/tmp/tube-geometry-final.json
```

The two specimens are **Hs4m/T10s mixed-sea held snapshots**. Contact reconstructs the captured cubic 1m water surface, not uncaptured Float64 solver cells. Fixed-input geometry does not establish moving-wave stability, Big-wave fidelity, whole-physics correctness or FPS. Static CPU costs exclude solver, query-index construction, uploads and GPU work. Moving visual/FPS validation remains separate, including shallow detached roofs and front lifecycle changes that positive ray-row advance alone cannot resolve.
