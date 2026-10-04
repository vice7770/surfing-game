# Compress force ledger — source-only preparation

This is an unexecuted diagnostic, not a physics candidate or performance test. Production is unchanged. The supplied [legacy diagnosis](/Users/regina/Desktop/Projects/surfing-game/docs/research/performance-2026-10-03/rider-legacy-diagnosis.md) is accepted as prior evidence; this does not reclassify its tests or rerun the rejected depth/assist candidates.

## Exact fixture and scope

Use the current real `BoardBody`, `AttachedRider`, `PlaneWater`, hull patches, fins, rails, implicit coupled solve and projected feet contact. Match `AttachedRider.test.ts:1165–1204`: default board shape; standing regular rider; identity orientation; initial position `(0, shape.centerOfMass.y, 0)`; initial velocity `(0,0,speed)`; flat still `new PlaneWater()`; dt1/60; 18steps settle (0.3s), set steer1 and take30steps (0.5s), then take60steps with Compress either0 (held control) or1. Speeds7/8/10/11m/s, 8cases total. No towing, water solver, tube/contact replacement, extra crouch/trim/hand input, forced bank or clearance changes. Current standing subdivision remains the actual32substeps minimum and its original entry refinement (`BoardBody.ts:95,499,687–694`).

Each case has an independently initialized, entirely unwrapped control with the identical input sequence. After every one of108outer steps, compare complete reachable own-data state for board/rider/water: exact typed-array bytes, numeric Float64 bit tokens, enums, private scratch, accumulated work, contacts and water reactions. Instance observer function shadows are ignored on both sides; no data key is ignored. Getter descriptors are not invoked by this parity serializer. This establishes unchanged trajectory/state for this run, rather than trusting that wrappers are harmless. Failure terminates the single operation and preserves its report/logs; no automatic repair or retry.

## Instrumentation without numerical source edits

`observer.ts` installs temporary instance-method wrappers on the original methods. Every call uses `Reflect.apply(original,this,args)` exactly once, returns the exact result and propagates the exact original error; removal restores its original own descriptor/prototype lookup. Logging uses new vectors/quaternions and own copies; it does not call the production scratch/transform/sample helpers or mutate forces, inputs, outputs, arrays or contact limits. No source/class numerical formula is copied, and no source patch or production API is required.

The observed sequence is:

1. Original hull `substep`: state before/after, actual substep dt, board/rider work differences and kinetic diagnostics.
2. Rider `prepare` entrance: actual completed six-dimensional hull RHS and6×6implicit matrix before rider joins. These contain hydrostatic/pressure/friction/foil/gyro and added-mass/entry/radiation contributions, so they are explicitly **combined impulses**, not a fictitious separated force ledger.
3. `compressAssist`: body bank/reference/leg rest and velocities at force formation; original pull/carry/lean-out force vectors and signed dot products with current rider velocity and board path velocity. This runs before `prepareLeg` and `prepareBank` (`AttachedRider.ts:1468–1474`); the force is based on the existing previous reference and raw Compress input, not a recreated achieved-depth candidate.
4. `prepareLeg` then `prepareBank`: achieved rest/extension depth, leg load/stiffness/damping/rate, bank/reference/rate, ankle rest/torque, swing angle/rate/torque and hand yaw, with before/after snapshots. No controller calculation or parameter changes.
5. `coupleStanding`: original8×8matrix/RHS before and after addition. RHS delta is logged as the **combined rider coupling contribution**, including mismatch/external forces and leg/ankle/swing/twist terms; no claim each entry is pure force.
6. Original `project` and `settleStanding`: actual requested/projected world and board-frame impulse, returned feasibility, CoP/support, desired CoP, contact limit, raw margin, solution increments and leg/bank speeds after solve. Normal cap and friction coefficient come from hash-gated original constants; reported friction cap is coefficient×returned projected normal. It is a derived witness of the original cone, not an observation of the inaccessible pre-clamp local `tangential` variable (`AttachedRider.ts:2207–2245`).
7. `finish`: actual accumulated signed assist/carry/lean-out/gravity/water/contact work differences, the rider velocities before/after, board rider-contact work differences, attachment and limit state. Production uses mean pre/post rider velocity for these work entries (`AttachedRider.ts:2052–2076`). Formation-time powers and these work differences are separate fields.

Full per-step output includes body/reference bank, board roll, yaw rate/heading, speed, achieved leg rest/extension, CoP/support/contact forces/load/limits, hand/swing/ankle state, all public board mean force vectors, and the unchanged cumulative work ledgers. A compact per-substep trace preserves these signs and combined RHS changes for all phases/cases. Rich original stage/matrix/projection observations are retained in bounded windows: first Compress frame and32substeps before/after first infeasibility, each first contact limit, first >10°bank excess, original70°bank cap, or separation. The10°marker is a diagnostic label, not a new physical constraint or adopted threshold. At most512rich rows/case; no silent widening.

The historical yaw turning-point/deadband algorithm remains unchanged for comparison. Store turning-point indexes/values, largest swing and sign flips; never interpret a zero held swing denominator as a physical tolerance. Chronological first limit/force/work change is evidence to locate the failure. It does not prove causality; any later counterfactual force isolation needs separate authorization and a separate experiment.

## Energy and attribution limits

Actual signed force work can establish when assist/carry supplies or removes energy and whether it precedes a contact limit or bank growth. `BoardBody.kineticEnergy` and `AttachedRider.kineticEnergy` are the original public measures; the latter reports only linear kinetic energy upright (`AttachedRider.ts:1157–1164`). The logged `(ΔreportedK−ΣbookedWork)` residual is **not** a closed total-energy conservation claim: elastic leg/ankle storage, rest/stiffness actuation, torso swing/twist rotor storage, correction drive and hard clamps are not all represented by those public measures. Do not attribute an unexplained residual directly to Compress, nor equate contact impulse/RHS with pure external work. This diagnostic identifies the next specific energy accounting question instead of retuning constants to make residuals or tests green.

## Source authority and preparation gates

`authority.json` pins the real module runtime-import closure, three runtime package/module bytes, core classes/test/doc and referenced historical probe source. `prepare.py` records exact hashes from source reads only; historical probes are authority references, never executed or imported. The driver rechecks every pinned file before constructing any fixture. The owned TMP `node_modules` pointer is read-only-use of the existing canonical dependencies, not an installation or copy. Current runtime dependency closure includes `PhysicalSurfWater`/barrel modules because of existing imports; the fixture only instantiates `PlaneWater`, so none of their solver or tube update methods run. Root review must confirm current sources and freeze the future standalone bundle hash after compilation. No guessed historical build or stale legacy runtime is substituted.

Preparation has not run syntax checks, tests, typecheck, bundling or any numerical path. Five source-written tests cover unchanged wrapper receiver/argument/return/error/descriptor behavior, exact state token handling, independently specified turning points, and real7m/s2Compress-step stage order plus full own-state parity after the exact48step entry. These are proposed checks, not passed evidence.

Proposed authorized verification, sequentially under a quiet CPU lease:

```sh
/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/vitest run --config=/private/tmp/compress-force-ledger-20261004/vitest.config.ts --maxWorkers=1
/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/rolldown /private/tmp/compress-force-ledger-20261004/driver.ts -o /private/tmp/compress-force-ledger-20261004/driver.mjs --format=esm --platform=node
```

No full legacy suite or water/GPU/browser operation. Preserve logs and terminal failures; stop for root review rather than automatic repair. After root reviews compiled authority, propose **one** operation:

```sh
python3 /private/tmp/compress-force-ledger-20261004/launcher.py --run=true
```

The driver checks a20scooperative bound between source checks/case/step/substep work; the launcher enforces30sabsolute Node wall lifetime including final JSON/gzip serialization. Max60,000observed substeps;512rich stage rows/case;64MiBcompact uncompressed report; exactly8cases/864observed +864unwrapped-control outer steps. Bounds are failure guards, not targets; no automatic extension, new cases or retries. The fresh output path refuses overwrite. Raw compact JSON has explicit nonfinite tokens and deterministic gzip; stdout/stderr and actual start/terminalUTC/PID/exit/timeout are retained. This is CPU diagnostic work, with observer overhead and no cost/FPS claim.

## Expected decision

Use the paired full trajectories to identify the earliest actual sequence of bank-reference/leg-depth mismatch, signed assistance work, contact support/friction/load limit, ankle/swing response and yaw reversal at each speed. Report whether the observations support a specific force/control accounting hypothesis, and the missing causal counterfactual if any. The only current proposal is this observation. Do not change Compress magnitude, bank/contact limits, crouch depth, support or existing meaningful assertions.
