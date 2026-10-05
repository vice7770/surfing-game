# Applied impulses, reporting and reactions

Read-only source assessment of the frozen 143-field candidate. No current native owner, trace, report or results were inspected. This note introduces no observer or physics changes.

Source root: `/private/tmp/tube-board-rhs-components-native-20261005/source`.

## The post-solve ledger

For one patch, let `a = [ν, r × ν]`, `u = a·[v,ω] − ν·flow`, and `Δu = a·[Δv,Δω]`, with surface normal/arm frozen at the substep's assembly. `A` is current added mass (kg), `E` the nonnegative mass increment (kg), `R` radiation damping (kg/s), and `h` the actual substep (s). The pre-solve combined water channel is `−(hR+E)u a` (linear/angular impulse); its matrix is `(hR+A+E)aaᵀ`. After the applied board solve, the existing locals are:

```
Jradiation = −hR(u + Δu)
Jadded     = −A Δu − E(u + Δu)
Jwater     = Jradiation + Jadded
           = −(hR+E)u − (hR+A+E)Δu
```

These are source identities, not an inference from capture data. Assembly is at [BoardBody.ts:831](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:831); applied reporting is at [BoardBody.ts:968](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:968). Thus the reported impulse equals the pre-RHS contribution minus its implicit matrix times the applied change. Splitting a recorded mean `forces.addedMass` into a separate pre-RHS entry channel would be incorrect: it already contains both the acceleration and entry terms.

The solver may reject the attempted upright coupled trial and solve the board with `pushBoard` instead ([BoardBody.ts:912](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:912)). The post-solve loop uses this final `rhs` at line934. Current marker-qualified trial diagnostics can therefore describe an attempted trial while reported water impulses use the fallback's applied board change. Availability marker1 does not prove the trial was accepted.

`forces.*` accumulate impulses during every actual refined substep, then divide by the whole `dt` once; they are latest-step mean forces in N ([BoardBody.ts:495](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:495)). `work.*` persist since placement and accumulate impulse times mean **world** point velocity, including rotational point velocity. They are J, not relative-water dissipation. Moving water may supply positive board work; no blanket negative-work assertion follows from the damping sign ([BoardBody.ts:936](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:936), [BoardBody.ts:973](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:973)). The ledger is recorded before `resolveBed`, pose integration and `rider.finish`; a later board/body snapshot can include those further changes ([BoardBody.ts:1004](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:1004)).

## Reaction sign and scope

Explicit hull hydrodynamic impulses are accumulated once at [BoardBody.ts:807](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:807). The post-solve pressure correction and complete water-inertia impulses are added once at [BoardBody.ts:985](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:985). Each patch's total is then handed to `addReaction` once after all board substeps, at its time-mean position (`Σx h/dt`, not an impulse-weighted position). Foils use their separate matching path. This is additive explicit-plus-implicit bookkeeping, not two calls returning the same impulse.

The interface receives the impulse **on the body**, J; the water takes −J ([SurfWater.ts:88](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/SurfWater.ts:88)). `PhysicalSurfWater` subtracts horizontal J from depth-integrated flux using `ρ × cell area`, redistributing over the four currently wet neighbors; outside/no-wet-cell reactions are unapplied. Vertical J is only tallied as `unappliedVerticalImpulse`, not applied to a vertical water momentum state ([PhysicalSurfWater.ts:377](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts:377), [PhysicalSurfWater.ts:409](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts:409)). Source sign consistency therefore does not establish full three-dimensional fluid momentum closure.

The runner updates swept contact once after the water step, then advances bodies ([SurfZoneRunner.ts:513](/private/tmp/tube-board-rhs-components-native-20261005/source/src/wave/SurfZoneRunner.ts:513)). The board defers its own reactions until its whole step ends. A change across consecutive whole steps can coincide with a new field/contact sample; this source ordering alone does not identify a discontinuity in the actual run.

## Existing values available for a later passive observer

The applied `rhs` six changes, pre-update `v/w`, `surfaceChange`, `surfaceMean`, `radiated`, `inertia`, `pressure`, and patch reaction entries already exist in the reporting loop; scalar copies there need no new water sample or solve. They must be labeled **applied** and kept distinct from attempted coupled-trial changes. Their associated `h`, `A/E/R`, stored `u/ν`, patch arm/normal/position and existing sample are still available.

No new capture, observer implementation, calculation, runtime acceptance, physical cause or gameplay fix is asserted.
