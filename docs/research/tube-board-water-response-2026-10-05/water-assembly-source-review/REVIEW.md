# Combined-water assembly: source-only review

The current 143-field capture can identify the **combined** water RHS channel, but cannot identify its radiation, mass-growth, projection or sample-history cause. Existing per-patch values are sufficient for a narrowly scoped later passive observer; no new field query or force calculation is needed to retain them. Current capture data has not been read or processed for this review.

Source authority is the frozen candidate at `/private/tmp/tube-board-rhs-components-native-20261005/source`, including its observer-only BoardBody change. The existing 143 words are unchanged. This directory contains analysis only; CPU, native, physics and adoption acceptance are unclaimed.

## Existing operands and their stage

| Needed distinction | Existing values to retain by primitive copy | Source location |
|---|---|---|
| Sample/flow versus rigid-body motion | Patch index, `samples[k]` water values, `r/n/point`, pre-update `v/w`, `relative.x/y/z` | [BoardBody.ts:726](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:726), [BoardBody.ts:767](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:767) |
| Wetting versus projection | Existing `force.wettedArea/deckWettedArea`, `projection`, `ν`, per-area constants, current `addedMass/radiation` | [BoardBody.ts:831](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:831) |
| Newly associated mass versus continuing inertia | Old `previousAddedMass[k]` **before line844 overwrites it**, current `addedMass`, existing `entrained`, `intoSurface`, actual `h` | [BoardBody.ts:839](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:839) |
| Signed generalized geometry | Existing `r`, `ν`, and `r × ν` locals `cx/cy/cz`; pre-solve `push`; stored surface speed/normal | [BoardBody.ts:841](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:841) |
| Attempted trial versus actual board impulse | Existing final `rhs` six, `surfaceChange`, `radiated`, `inertia`, mean point velocity | [BoardBody.ts:912](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:912), [BoardBody.ts:968](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:968) |

The last patch's `force`/`relative` scratches are reused; references to them would not preserve all patches. At the current pre-coupling observer call, stored `previousAddedMass` already equals the new mass. Copying it there loses the old value on mass decline. Copies should occur where each existing local is valid; the current marker/attempted-trial semantics must remain explicit. Computing separate pre-RHS radiation and entry vector totals would add arithmetic, since only their combined `push` is currently formed; retaining the existing scalar operands avoids that expansion.

## Conditional entrainment bookkeeping question

Source facts: `E = max(0, A_new − A_old)`, `qwater = −(hR+E)u_old a`, and `Kwater = (hR+A_new+E)aaᵀ`. After the applied solve, added-mass/entry impulse is `−A_new Δu − E u_new` ([BoardBody.ts:843](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:843), [BoardBody.ts:971](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:971)).

Under the **conditional scalar model** of fixed direction/arm and water velocity, with `A_new` meaning the total associated moving mass and `E=A_new−A_old>0`, a single momentum increment is:

```
−(A_new u_new − A_old u_old)
 = −A_new Δu − E u_old
 = −A_old Δu − E u_new.
```

The implemented expression differs by `−E Δu`. Equivalently its matrix has `A_new+E`, whereas that single momentum increment has `A_new`. This is a concrete possible duplicate-increment condition, not a finding that the capture's force is wrong. The interpretation depends on what the authored added-mass/entry approximation intends: projection, direction/arm, flow and coefficients can change, and the source explicitly treats acceleration inertia plus inelastic entry as separate terms. Source algebra does not establish whether any relevant actual patch has `E>0`, its size, its applied `Δu`, or whether it explains the loss. No correction is proposed before those operands are available.

## Reporting and next decision

[The independent assembly note](/private/tmp/tube-board-water-assembly-source-review-20261005/child-water-assembly-note.md) retains the detailed source branches and read pins. The conditions relevant to a possible jump are specific:

- Current mass uses **both** bottom and deck wetted areas; radiation uses the bottom only. An increase in either wetting or `|n·ν|` produces `E`, even if no extra physical patch area wets. After a dry/outside sample or placement reset, the next positive mass has `E=A` and the matrix coefficient is `2A+hR` ([BoardBody.ts:427](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:427), [BoardBody.ts:839](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:839)).
- The face wetting ramp is continuous, but the sampled `wet/outsideDomain` guard can zero its areas and history separately. Sample wetness is based on column depth, while swept-contact layer/parity selects geometry ([hullForces.ts:137](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/hullForces.ts:137), [PhysicalSurfWater.ts:317](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts:317)).
- Raw swept normals are retained, while graph slopes are bounded for steep/overhanging normals. Water inertia uses the upward slope-derived normal, not raw `normalXYZ`; selected crossing changes and bounded-slope behavior therefore matter separately ([PhysicalSurfWater.ts:469](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts:469)). The absolute projection and slope bound introduce derivative changes; those are not themselves evidence of a value jump.
- Hull-force density responds to air fraction; added-mass/radiation constants use fixed seawater density. Flow regime and lip blending affect `u`. Cached samples decide subdivision before a fresh leaf sample; each actual leaf updates mass history ([hullForces.ts:160](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/hullForces.ts:160), [PhysicalSurfWater.ts:324](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PhysicalSurfWater.ts:324), [BoardBody.ts:686](/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody.ts:686)).

[Applied impulses and reaction signs](/private/tmp/tube-board-water-assembly-source-review-20261005/postsolve-and-reactions.md) gives the exact final-solve ledger. Post-solve mean forces cannot substitute for separated pre-RHS channels. In particular, a rejected standing trial and the fallback board solve may use different changes. Reactions consistently return the opposite **horizontal** body impulse where wet receiving cells exist; vertical reaction is only tallied by the depth-averaged adapter.

If root's actual eight-group analysis implicates combined water, first preserve the per-patch existing operands above at the two neighboring substeps and their applied changes. That can distinguish flow/slope changes, wetting-area changes, projection-only growth, reset/re-entry history, and continuing inertia without selecting a guessed mechanism or changing physics. Per-hydrodynamic causes, full fluid momentum, posture improvement, tube quality and performance remain unproven.
