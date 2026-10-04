# Current material ownership and eligibility (source only)

Accepted e3 source references are relative to each frozen `original/` or `candidate/` arm.

| Owner/path | Material writes | Candidate maintenance |
| --- | --- | --- |
| AerationField constructor (original 65–74) | new F64 air/depth/TKE and three scratch arrays, +0 | private factory allocates all-clear byte tags only under native authority; no scan |
| stir (75–89) | stirred + turbulence | prepareMutation checks ordinary eligibility before following window; valid wet stirring conservatively marks active even if target does not increase |
| addBore/addPlunge/addAir → addTo (92–128,189–194) | air/depth on cell or spread plume | source-call guard before mutation; each addTo marks active, preserving original source iteration/evaluation order |
| Simulation lip.onLand/onAir (609–625) | calls addPlunge/addAir after foam splash and existing impact ledger | unchanged callbacks; therefore original injection arithmetic and actual marks execute |
| Simulation aerateBores (1192–1204) | sparse breakingCells/dissipation → addBore + stir | unchanged complete callback loop, after full foam update and before air update |
| Aeration advect + finish (129–149,196–261) | scratch interpolation, then three sets; degas/cap/TKE/dry clear | opt-in lookup shortcut only on proven +0 neighborhoods; original full finishing expressions plus final tag writes |
| Aeration followWindow (269–288) | shift/clear three arrays | same per-row shift of tags only while valid; invalid metadata waits for reseed |
| Simulation importState (729–736) | imported air/depth, then TKE.fill(0); may throw partway | invalidate before any stateArrays mutation; next positive eligible update reseeds inside measured call |
| Public generic direct writes/update | tests/tools may write material arrays or substitute methods | ordinary owner never selected by generic constructors; generic update invalidates metadata before unchanged original numerical body |

GPU readback is solver H/QX/QZ/RATEH/STRENGTH/AGE/NU/PREDX/PREDZ (gpu/GpuBoussinesq.ts 10–15,33–35). NU is solver viscosity, not AerationField.turbulence. CFL/Boussinesq viscosity updates and accepted private water prefetch do not write these material arrays. Board/remote/landing fluid reactions change h/q, not air/depth/TKE; the existing same-step AdvectionStencil matches the resulting post-water flow and is consumed once. Bubble/Spray/PhysicalSurfWater/snapshot consumers read material values rather than writing them.

Actual WorkerCore retains its private runner, builds replies from separate snapshot buffers, and exports copied state. Public `SurfZoneRunner.forWorker` is still technically callable; no global/WeakMap scheme can observe arbitrary direct writes through a leaked array. This experiment relies on the documented actual ordinary ownership contract, while keeping generic/public direct-write paths exact. It does not intercept proxies, restored custom field methods, or external reentrant mutation of a leaked owned array.

A persistent changed native descriptor, typed-array copy override, array alias/replacement, stencil override/accessor, or initial non-native import disables the optimized call before mutation. Missing/stale lookup preserves the original independent departure path and still records resulting tags. Valid finite fractions plus *four all-positive-zero source cells* are required; negative zero/NaN/nonzero fields remain active. Wetness is still checked separately every destination, so a later h/dry change cannot use a stale wet mask.
