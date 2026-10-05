# Independent source review — aggregate board RHS observer

2026-10-05. Full text deltas read against the exact frozen 102-field native oracle. No runtime/parser/TypeScript/test/build/script/numerical/physics/native execution was performed. This is passivity **by source**, not executable proof.

## Pins and exact scope

Candidate BoardBody: `/private/tmp/tube-board-rhs-components-observer-20261005/source/src/physics/BoardBody.ts`, SHA-256 `eb49becb36b6f8b1a9f34f956a001eeda100c7abfe84b75b5ff7ef3278c45917` (worker reports55693 bytes).

Candidate AttachedRider: `/private/tmp/tube-board-rhs-components-observer-20261005/source/src/physics/AttachedRider.ts`, SHA-256 `85e4ca8149292bf85b95c7c709531b15e220b14b2489e18f02c5a9e41b979cf1` (worker reports159692 bytes).

Exact 102-field oracle is `/private/tmp/tube-native-trial-balance-native-20261005/source`: AttachedRider SHA-256 `1a92e1b5ebe216c4a29f32a12e274a0d7f713d4bed0202ff54f4c1742cb2a2f4`, BoardBody `7ce22c47a4ea3025dedaa5ec494d861bfb66d5dc7363481b77f3a8e02e2150c4`. Full diffs contain only BoardBody's one scalar-call insertion and AttachedRider's appended interface words, appended factory words and new scalar-only helper. Old102 names, assignments, marker/reset/settlement logic and all existing source mathematics/control flow/imports are untouched.

## Passivity facts

BoardBody903–912 calls the helper inside the existing attached-upright branch, after rider.prepare and after the original6×6 system/RHS are copied to s8/r8, immediately before unchanged coupleStanding. Arguments are exactly existing numeric aggregate members:18 buoyancy/pressure/friction force/torque totals;12 fin/rail totals;3 gyro words; weight; h;6 water force/torque impulse increments. No new query, force computation, solve, integration, reaction, input/control choice, limit/rest or physics-state mutation appears in that insertion.

AttachedRider's new helper has41 explicitly numeric positional parameters and41 direct assignments to the same-named landingDemand properties. Its only local reference is the already existing diagnostic object; it stores no vector/array/system/RHS/external object alias, adds no query/import/helper computation, and writes no physics variable. Factory initialization appends41 numeric zeros. Existing102 insertion order and old marker value are preserved. Availability remains governed by the unchanged prepare reset and settleStanding activation; marker0 invalidates stale new words, and marker1 denotes a captured trial, including a rejected trial.

The positional source mapping matches the named groups. Parent BoardBody618 chooses `base=foil.kind==='fin'?0:6`;619–624 stores forces then torques, so ft0..5 means fins and ft6..11 rails. RHS880–885 adds weight to world Y, subtracts gyro in the angular RHS, multiplies aggregate force/torque terms by h, and adds water impulse terms directly. Captured gyro is the existing positive `w×Iw`, weight the existing negative scalar. The helper copies signs unchanged; it does not pre-negate or convert them.

## Meaningful limits

These41 words separate the existing **explicit aggregate RHS** contributions, not final applied or total hydrodynamic forces. Matrix-dependent pressure/foil damping and water inertia still affect the solve separately. Water increments combine radiation/entry terms; they do not split those mechanisms or per-patch contributions. Body rider external force, uncaptured rider twist torque and physical attribution caveats from the 102-field decomposition plan remain. Scalar copy count and complete source preservation do not prove zero execution overhead; the additional observer method/properties naturally add observational work.

The prospective fixture preserves complete old102 graph/water/stage equality and excludes only41 qualified additions. Its extra helper hook checks scalar copies/stage order, not independent physical aggregate recomputation. Prototype method bodies are outside the own-instance graph representation; the full source delta review covers the new method's behavior. Only two existing276-step witnesses are included; they do not cover every native-phase/latch/invalid-marker scenario or establish causal correctness. Detachedness tests cover all returned records that actually occur. Root must execute actual strict/parity/native gates and independently freeze hashes before claiming readiness.

No concrete source passivity defect was found in the reviewed two-file runtime delta. Observer metadata/config/fixture readiness is source-reviewed only and must not be reported as an executed pass.
