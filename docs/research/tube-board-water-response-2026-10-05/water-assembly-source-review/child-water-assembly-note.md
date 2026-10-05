# Frozen water assembly: source only

No actual 4030 capture, owner, log, trace, receipt, numerical probe, or executable check was read or run. This note describes the frozen 143-field source. It does not identify a native cause. Parent owns postsolve work, force reporting, reactions, and actual eight-group comparison.

Paths below are absolute. `B` denotes `/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts`; `H` denotes `/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/hullForces.ts`; `P` denotes `/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts`.

## Exact assembly and units

At B:338–346, station beam b is summed planform area / station length. The constructor fixes μ=ρπb/8 (kg/m²) and γ=ρ·2ζ√(gπb/8) (kg/(m²·s)), with ρ=1025 kg/m³ and ζ=.5. B:61–76 describes added strip mass, inelastic newly gained mass, and radiation as a modelling choice. Neither coefficient reads sampled void fraction. The shape's area is planform area and its bottom normal is unit length: `/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/boardShape.ts`:102–119.

Each leaf substep first rotates the patch and samples water at its bottom centre (B:727–738). Relative velocity is v+ω×r−flow (B:777–780). H:137–152 zeroes face areas before the wet/outside guards. Both face wet shares use the same sampled surface height: bottom at y and deck at y−n_y·thickness. The 1 cm ramp is clamp(.5+depth/.01,0,1) (H:77–81). H:171–174 writes face areas before the zero-speed return; motion is not necessary for nonzero added mass.

For each patch, B:831–868 computes, in this order:

```
ν = (−slopeX,1,−slopeZ) / hypot(slopeX,1,slopeZ)
p = |n·ν|
A = μ (bottomWettedArea + deckWettedArea) p       // kg
R = γ bottomWettedArea p                         // kg/s
u = (v+ω×r−flow)·ν                               // m/s
E = max(0,A−A_previous)                          // kg
A_previous ← A                                  // line 844
g = [ν, r×ν]
q_water += −(hR+E) u g                          // N·s; angular N·m·s
M_board += (hR+A+E) g gᵀ
```

The matrix addition is a positive semidefinite rank-one term when its nonnegative scalar is positive; translational, mixed, and angular units are kg, kg·m, and kg·m². ν points upward and comes from slopes, not `sample.normalXYZ`. For u<0 the explicit impulse points along +ν; for u>0 it points along −ν. There is no approach-only u<0 guard. A contributes to implicit acceleration but not to the explicit water RHS. B:880–885 adds the six water impulse accumulators outside the h-scaled force/gyro sum. B:893–912 prepares the rider, copies the board matrix/RHS, copies the 41 aggregate primitives, then augments the coupled system.

## History and conditional bookkeeping concern

The old mass exists only as `this.previousAddedMass[k]` in the subtraction at B:843. There is no prior-mass local. Its overwrite at B:844 occurs on every leaf patch, including dry/outside patches whose force areas were zeroed. Arrays retain current A/E/R/u/ν until a later leaf; they do not retain the previous direction or flow. Initialization is zero (B:348–352); `place` resets prior mass to zero (B:427). The whole-step loop does not reset it. Thus increasing A produces E, decreasing A produces E=0 and records the decrease, and a later rewet/reset with A_previous=0 produces E=A. Then the water matrix scalar is 2A+hR. These are algebraic source facts, not observed events.

Under the explicitly restricted interpretation of a frozen generalized direction and flow, with A_new the TOTAL associated moving-water mass and E=A_new−A_old>0, the source's added/entry impulse is `−A_new Δu−E u_new`. A single backward momentum difference would instead be `−(A_new u_new−A_old u_old)=−A_new Δu−E u_old`, equivalently `−A_old Δu−E u_new`. The source differs by `−E Δu`, corresponding to an extra increment E in the implicit matrix. This is a conditional potential overlap in entrained-mass bookkeeping. It is not a proven physical defect: A's intended meaning, separate entry modelling, rotating/projection-changing directions, changing flow, and pressure/slam modelling limit that scalar comparison. No removal or clamp is proposed here.

## Branch and projection conditions

* A can increase through face area OR |n·ν|; the entry test does not distinguish wetting from a changed projection. The absolute projection has a derivative cusp at n·ν=0. Two fully wet faces contribute two patch areas to A while R uses only the bottom. Whether that represents overlapping associated water requires a physical model decision, not just source inspection.
* H:160 reduces buoyancy/pressure/friction density to ρ(1−voidFraction); B's μ/γ remain at fixed ρ. Aeration can therefore change their relative contributions without directly changing A/R. P:550–558 has a plume-depth inclusion gate. No actual aeration change is established.
* P:317 sets wet from column depth>.01; swept `hit.inWater` does not replace that flag in P:469–491. Outside sampling sets wet=false/outside=true (P:579–600). The guards can therefore zero A and its history independently of a smooth face ramp.
* P:472–483 retains the raw swept normal but bounds its graph slopes at tan60 for normalY<.5. The resulting ν stays upward even for an overhang. For normalized continuous normals the threshold is continuous in value, with a derivative change; selected contact or degenerate horizontal direction can change the supplied slopes. `/private/tmp/tube-board-rhs-components-native-20261005/source/src/wave/barrel/sweptContact.ts`:261–289 selects surface crossings by strict height/parity branches. These are possible branch transitions, not evidence that one occurred.
* Flow can depend on bore/shallow/profile and roller branches (P:324–363), and curl-water lip blending when contact and waterFloorY are present (P:364,499–506). Those choices enter u. The physical sampler is wired at `/private/tmp/tube-board-rhs-components-native-20261005/source/src/wave/SurfZoneRunner.ts`:376.
* Refinement uses the latest cached samples before the fresh leaf sample (B:701–720), halves h to depth four (B:686–693), then updates mass history per leaf. Its hR factor and history timing differ with leaf subdivision; no actual subdivision discontinuity is claimed.

## Minimal prospective passive copies

Existing 143 words expose the combined six-channel water RHS and assembled board matrix, not per-patch A/E/R/u or history. Available primitives in the force-loop scope are k/h, r/n/point, area/thickness, sampled wet/outside/surface/slopes/raw normal/flow/voidFraction/regime/layer flags, both wetted areas, μ/γ, ν/projection/u, A/R/E, push, r×ν, and inertia. Copy A_previous BEFORE B:844; after that it is gone. The force and direction scratch objects are overwritten on later patches. Current A/E/R/u/ν caches survive the loop but lose old history and branch provenance.

If actual eight-group evidence warrants more observation, a bounded per-patch numeric copy of old A_previous and these existing assembly operands at this stage permits offline source-order reconstruction without another water query. Separate entry/radiation six-channel totals or component rank matrices are NOT already computed; adding them would require new observer arithmetic. Old ν/flow are not cached, and the sampler's contact boolean/lip share are private transient operands; inferring them from a new query would change query order. Any future observer requires its own state/query/reaction parity gate. This is a design inventory only; no observer implementation or new helper family was created.
