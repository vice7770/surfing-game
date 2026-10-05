# Board RHS source assessment — preparation only

The captured pre-rider board RHS is a sum of several explicit force/torque terms and a combined surface-normal radiation/entrainment impulse. The net RHS and matrix do not identify which load mechanism changed. No candidate implementation is authorized or supplied here.

Root supplied transition1356/sub32 →1357/sub1: qBY .18873031945 →−16.953996276542, qBZ .009805877608 →−11.840921975768, qBangularX .018989060873 →−13.261262762918, h approximately .0005208. Root also supplied jump/combined-board-RHS attribution +.8338514759, board-matrix +.0218823, rider-RHS −.00107314, rider-matrix −.000048, and residual1.11e−15. These are external context, preserved without recomputing or validating decomposition bookkeeping. No trace/report/owner/media was read or processed for this assessment.

All line references below refer to `/private/tmp/tube-native-trial-balance-native-20261005/source/src/physics/`. World coordinates are x along shore, z toward beach, y up; these RHS rows are world quantities, not board-local fore/aft demand (`SurfWater.ts:14–34`). Translation RHS has units N·s; angular RHS has units N·m·s. Forces/torques inside the h-multiplied totals have units N/N·m. The solve unknowns are board Δv/Δω. The same `rhs` storage later holds solved deltas, so the stage of a copy matters.

`BoardBody.ts:876–885` writes exactly:

```text
qTranslation = h*(gravity + buoyancy + pressure + friction + fins + rails) + waterImpulse
qAngular     = h*(buoyancyTorque + pressureTorque + frictionTorque
                  + finTorque + railTorque - w×(Iworld*w)) + waterTorqueImpulse
gravity      = (0, -mass*g, 0)
```

The source channels and their boundaries are:

| Existing source channel | Production and sign | What stays mixed |
|---|---|---|
| Hull buoyancy6 (`totals.b*`) | `BoardBody.ts:783–792`; `hullForces.ts:148–169`. Wet/domain gate, geometric submergence and mixture density produce support·(−slopeX,1,−slopeZ). Torque uses the submerged centroid arm, not necessarily the bottom-patch arm. | All patches, their density/submergence/slope changes, and centroid shifts. |
| Hull pressure6 (`totals.p*`) | `BoardBody.ts:793–799`; `hullForces.ts:173–183`. Explicit pressure is −k·speed·(relative·bottomNormal)·bottomNormal; positive incidence uses bottom wet share and negative incidence uses deck wet share. Thus its world-Y sign depends on incidence and rotated normal. Torque is r×F. | Patches, bottom/deck branch, wet share, speed/normal incidence, mixture density and strip pressure redistribution. |
| Hull friction6 (`totals.f*`) | `BoardBody.ts:800–806`; `hullForces.ts:185–193`. Explicit tangential resistance opposes relative tangent velocity. Torque is r×F. | Patches, both wet faces, tangent velocity, wetted length and Reynolds/friction coefficient. |
| Fin6 / rail6 (`foilTotals[0..5]` / `[6..11]`) | `BoardBody.ts:532–639`. Fin midpoint sample sets immersion; board-frame relative x/z feeds `finForces.ts:83–118`, then force is rotated to world. Rails use −k2·speed·into·normal only when into>0 and wet share>0. Torques use each wetted point arm. | Individual fins/rail faces; immersion, incidence, attack/stall and geometry. Fin helper density is fixed WATER.density; hull force density includes void fraction. |
| Gyro3 and weight1 | `BoardBody.ts:876–885`. Gyro is w×(Iworld·w), subtracted in angular rows; weight is negative world Y only. With fixed mass/g/h the gravity impulse is unchanged, but that premise must be checked. | Gyro combines angular velocity and rotated inertia. It is an inertial torque term, not a hydrodynamic load. |
| Combined water impulse6 (`waterX/Y/Z`, `waterTx/Ty/Tz`) | `BoardBody.ts:831–858`. Unit surface normal ν=(−slopeX,1,−slopeZ)/norm; u=relative·ν. Per patch, push=−(h·radiation+entrained)·u, accumulated along [ν,r×ν]. It opposes signed normal relative motion, including outward motion where a coefficient remains active. | Radiation and newly entrained mass, all patches, slopes/projection/arms/relative velocity and previous added-mass history. This aggregate cannot distinguish radiation from entry. |

Added mass is not a separate explicit pre-rider RHS force in this source. Current addedMass enters the matrix coefficient `h*radiation + addedMass + entrained` at `BoardBody.ts:859–868`; entrained=max(0,currentAddedMass−previousAddedMass) enters both that matrix and the explicit water impulse. Previous mass is updated per patch at843–848 and reset by placement at427. Added mass includes bottom+deck wet area, while radiation uses bottom wet area; both use projection on ν at838–840. Their per-area constants are prepared from full WATER.density and station beam at343–346. Pressure and foil derivatives separately add h*damping·a·aᵀ to the matrix at814–824 and630–639. Therefore a net board-matrix difference also remains a mixture of pressure/foil damping, surface inertia/radiation/entry and rotated rigid inertia.

Call order is source-supported, without replay reconstruction: `step` chooses at least32 substeps for an attached upright rider (`BoardBody.ts:499–508`); `advance/entering` may halve h using previous patch samples (`686–723`). Each actual substep rotates geometry, queries every bottom patch, determines wet length and pressure placement (`726–746`), assembles hull terms and surface impulses, samples/assembles foils, then writes qB and adds rigid mass/inertia (`748–889`). Rider preparation follows at893. The pre-board system/RHS are copied into the8×8 system at898–900; `AttachedRider.ts:2137–2196` copies them before rider augmentation. The coupled solve and settlement/fallback follow at902–908. Only afterward are solved implicit impulses booked, velocities updated, bed impulses applied and pose advanced (`932–1009`). Reactions reach water once after the whole board step (`510–524`); `SurfWater.ts:88–93` defines the water reaction as −J. Bed/contact can affect later state, but bed impulses are not a term in this same pre-rider qB assembly.

The minimal first observation should copy **41 already computed scalars**, with no additional water queries or force calculations:

- Existing buoyancy/pressure/friction force+torque totals:18 words.
- Existing fin6 and rail6 totals:12 words.
- Existing gyroXYZ, weight, h:5 words.
- Existing combined water impulse/torque:6 words.

Copy them in the existing upright branch after `rider.prepare` and before `coupleStanding`, alongside the pre-board system copy, while these locals remain available. Their values must be scalar copies, not references. Keep the existing boardPreRhs6 as the independently captured sum oracle. Let the existing substep trial-availability marker qualify these records:0 invalidates stale words;1 means the coupled trial was captured before projection/fallback, not feasible/applied/realized motion. Root can reconstruct all eight aggregate RHS channels offline and compare their sum with qB. This is a prospective source plan only; no field/interface/code changes were made.

There are no separate pre-RHS radiation6 and entrainment6 aggregates to copy. Splitting the existing water6 requires additional observer-only accumulators at849–858, not merely copying existing totals. That expansion should follow only if the combined water channel is implicated by actual aggregate observations. Whole-step `forces.radiation`/`forces.addedMass` are unsuitable substitutes: they are postsolve impulses, include solved Δv/Δω and are averaged over the whole step (`951–993`, `510`). The same limitation applies to public pressure/fin/rail means and to last-substep wettedArea/submergedVolume.

If later required, bounded primitive observations would distinguish terms: per-patch wet/domain flags, surfaceY/slopes/flow/voidFraction; bottom/deck depths and shares; position/normal/centroid arms and relative normal/tangent velocities; strip pressureScale inputs; previous/current addedMass, entrained, radiation and projection; and fin/rail immersion/incidence/attack/stall data. These are optional future observations, not evidence of the present transition. Neither the supplied combined RHS nor this source reading establishes pressure, added mass, wetting or any hidden hydrodynamic cause.

Only this note and its read-file pin manifest were written. No source/helper/frozen-audit edits, numerical scripts, tests, builds, probes, resources, Git or native execution occurred.
