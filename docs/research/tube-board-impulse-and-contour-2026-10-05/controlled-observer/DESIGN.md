# Trial balance: observer-only source preparation

The only copied source is `source/src/physics/AttachedRider.ts`. Its parent is the frozen original V8/V11 runtime, 146425 bytes, SHA256 `d6d54aa4f6e20ff7ffcebc39450957b7a81ec26cf14886edec7882d8ecae7b31`. No rejected compliance runtime is used. Dependencies, compiler configuration, test runner and native helpers were not copied or modified. Root must materialize and pin the candidate dependencies before compilation or execution.

The existing38 flat diagnostic operands remain exact. The existing interface/factory/contact-sample `Object.assign` route now carries63 more primitive numeric operands and one numeric `standingTrialAvailable` marker, for102 fields. No array, vector, matrix, RHS, trial buffer or scratch reference is retained. The five additions are the interface, factory, prepare-entry marker reset, couple-entry scalar copies and settle-entry scalar copies. Removing their exact text restores the byte-exact parent. Original imports, observer assignments, solve arithmetic, projection, limits, rest logic, queries, controls and timing are unchanged in the proposed source.

## Exact stages and availability

- At `coupleStanding` entry, before its first matrix/RHS write:36 `boardPreMatrix00..55` copy `system[i*8+j]` for i,j<6; six `boardPreRhs0..5` copy rhs[0..5]. These are the board's assembled6-by6 block and RHS embedded in the8-by8 standing system, before rider augmentation. The stride is8, not6.
- The same entry copies15 prepared scalar components: `preparedBoardVelocityXYZ`, `preparedBoardSpinXYZ`, `riderExternalXYZ`, `forceArmXYZ` and `carriedArmXYZ`.
- At `settleStanding` entry, before scratch writes, projection or fallback: six `trialBoardDeltaVelocityXYZ` / `trialBoardDeltaSpinXYZ` copy x[0..5] from the solved coupled8-by8 system.
- `standingTrialAvailable` resets to0 at every `prepare` entry and becomes1 only after those six settlement copies. Zero invalidates all new words, including stale values from earlier substeps. One means the complete standing trial was captured; it does not mean contact was feasible, accepted, or realized by the board. If projection rejects it, the original separate-board fallback may produce another delta. Latched diagnostic samples retain the availability of their own recorded substep.

Velocity units are m/s, spin units rad/s, arms m, and rider external force N. Board RHS linear components are impulses and angular components are angular impulses. Matrix blocks have the units of the actual linear/angular assembly; they are not a standalone scalar mass measurement.

## Existing freshness and assembly limits

In the original `prepare`, phase/posture/inertia preparation precedes the `boardVelocity` and `boardSpin` copies. The force arm is then copied from current `rider.position - board.centerOfMass`. The following two `frame` calls update frame/target words rather than the rider position. `carried` is constructed after the second frame from that target plus the existing standing leg/bank adjustments. `external` is the existing sum after water-force and assist preparation. The observer reads these already-prepared operands at coupling entry; it does not remeasure an arm, substitute the target for the force arm, or query the water again. BoardBody calls prepare, embeds its board assembly, couples, solves, and settles before integration.

The copied matrix/RHS are combined assembly results. They cannot separately attribute buoyancy, pressure, radiation, added mass, foil loads, gyro or other hydrodynamic components. Likewise `riderExternal` is a prepared sum, not separate water/gravity/assist components. These fields expose a trial balance for later analysis; they do not establish a causal fix or a native acceptance result.

## Bounded prospective parity fixture

`tests/trialBalance.parity.prospective.test.ts` is source only and has never been executed. It imports the exact V8 parent as independent oracle and the partial candidate by its ordinary relative imports, with nominal class guards at attach. It preserves the two retained cases:276 steps each at1/60 s, yaw0.23362283028731087; flat6 m/s horizontal tow through all276 steps, and15-degree9.2 m/s downhill tow through180 only; ordinary pop-up at181. It does not alter push .72 s or landing .48 s.

The serializer keeps every original own rider/board/water field, including `landingDemand`, all38 old diagnostic operands, private scratch/state, board.rider alias identity, typed-array bytes, maps/sets, property descriptors and symbol/nonenumerable keys. Only the exact64 new names are filtered, and only on records carrying the original38 operand fields. No wholesale scratch, landingDemand, reference or diagnostic exclusion is used. Prototype-only wrappers hold their observations externally, so no instrumentation own property needs filtering.

Whole-step comparisons include all original diagnostics. Finish-substep wrappers compare the same complete original own-state graph and the water-call prefix. Independent couple/settle entry captures copy scalars before the original methods run, compare old/new stage words, and check the candidate's copied fields. They retain no matrix/RHS/x/vector references. Water wrappers compare ordered sampleAt entry/returned sample values, surfaceAt calls and every reaction position/impulse. Detachedness probes mutate every numeric field in all available returned samples/latches, including both old38 and new64, and compare the full unfiltered candidate state afterward.

The fixture makes no landing-success, shader, sea, contact-fix or performance claim. Its required dependency materialization, source syntax, TS, parity tests, builds and native checks all remain pending false. Root owns later actual gates and their receipts. Geometry design and all frozen parents/helpers remain untouched.
