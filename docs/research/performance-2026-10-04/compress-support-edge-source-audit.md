# Support-edge transition: source and retained witnesses only

Scope: current source inspection plus subtraction of values already retained in `/private/tmp/compress-force-ledger-compact-20261004/derived.json` (580,626 bytes, SHA256 `e6398ce5cc75d0aac54c56ce41c3df1e2b7bd72a0dccd87840c2397a20be17b9`). No fixture, numerical solver, test, build or physics update was run. This is a structural continuity question, not a causal conclusion or proposed retuning. The retained archive is separately frozen; this note does not modify it.

## Exact switch

- [BoardBody.ts:894](/Users/regina/Desktop/Projects/surfing-game/src/physics/BoardBody.ts:894) copies the existing board-only six-dimensional matrix/RHS into the upper block of an eight-dimensional system. `coupleStanding` adds rider coupling; `solveLinear` produces the proposed board velocity/spin change plus leg and bank-rate changes.
- [AttachedRider.ts:1997](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:1997) computes `legRateAfter = leg.rate + x[6]`, `bankSpeedAfter = bankSpeed + x[7]`, the proposed rider velocity, then requested contact impulse `J = m(v_rider_proposed − v_rider_old) − h*external`. It projects J before checking feasibility.
- [AttachedRider.ts:2008](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:2008) accepts iff `|P(J) − J| <= 1e-9 * max(1, |J|)`. This is an impulse-distance threshold, not the `limit` label. The support clamp can set `limit='tip'` while a sufficiently small difference still passes.
- [BoardBody.ts:904](/Users/regina/Desktop/Projects/surfing-game/src/physics/BoardBody.ts:904) copies the first six solved values if accepted. If rejected it instead calls `pushBoard(rhs)` and `solve6(system,rhs)` on the original board-only system. It does not retry projection against the resulting six-dimensional motion.
- [AttachedRider.ts:2013](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:2013) pushes only `−P(J)` and `−arm × P(J)` into that board RHS.

## Projection is continuous; the complete branch need not be

For the retained first-tip cases the positive normal impulse is below its cap and tangential impulse below its friction cap. Only the +x support edge binds. [AttachedRider.ts:2212](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:2212) has `freeX = local.x − H*Jx/Jy`; it clamps this to the edge, then sets `Px = (local.x − edge)*Jy/H`. With `freeX = edge + ε`, `Px − Jx = ε*Jy/H`. Thus P(J) approaches J continuously as ε approaches zero (holding H>0/Jy>0 and the other constraints inactive). Its derivative changes at the clamp; the feasibility boolean changes at the stated tolerance. This does not by itself establish a finite impulse jump.

The coupled board equation has extra angular RHS terms. [AttachedRider.ts:1980](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:1980) adds `+h*handYaw*Y`; [AttachedRider.ts:1987](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:1987) adds `−h*swingTorque*rollAxis`; [AttachedRider.ts:1991](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:1991) adds `−h*twistTorque*up`. Define their combined six-vector as `T = (0, h*handYaw*Y − h*swingTorque*rollAxis − h*twistTorque*up)`. Let A,b be the original board-only matrix/RHS and B map a contact impulse to `(J, arm×J)`. Rewriting the first six coupled rows using the recovered requested impulse gives:

`A*dq8 = b − B*J + T`

The actual rejected-contact branch instead gives:

`A*dq6 = b − B*P(J)`

Therefore, where A is invertible:

`dq6 − dq8 = A⁻¹ [B*(J − P(J)) − T]`.

The B term shrinks with ε. T generally does not. At a fixed positive substep, dropping T is a structural discontinuity in the board update law even as the requested impulse approaches the boundary. If all these extra couples vanish, this particular difference approaches zero; this is not a claim that every other model branch is smooth. The finite difference is O(h) for bounded torque, not an h-independent instantaneous physical impulse. Source comments describe the upper-body swing/feet reaction and twist mechanics, so identifying a missing algebraic term does not alone establish the correct physical policy for infeasible contact.

## Recorded same-substep witnesses

Each row below is the first retained `first infeasible coupled contact` event. `Δωz difference` subtracts the discarded recorded eight-dimensional proposal from `stateAfter.spin.z − stateBefore.spin.z`; it does not solve a counterfactual or compare different initial states. The fixture has no twist/hand torque at these witnesses. Angular update differences may include the ordinary downstream board update; no new attribution experiment occurred.

| Entry speed | Event after Compress | Swing torque | h*torque | Deck Px−Jx | Actual Δωz minus proposed Δωz |
| --- | ---: | ---: | ---: | ---: | ---: |
| 7 m/s | 0.123958 s | 42.118704 N·m | 0.021936825 N·m·s | 0.000221307 N·s | −0.05645736 rad/s |
| 8 m/s | 0.086458 s | 33.124703 N·m | 0.017252450 N·m·s | 0.000062318 N·s | −0.07560773 rad/s |
| 10 m/s | 0.121875 s | 20.939796 N·m | 0.010906144 N·m·s | 0.000521334 N·s | −0.05506824 rad/s |
| 11 m/s | 0.009896 s | 26.316659 N·m | 0.013706593 N·m·s | 0.000007495 N·s | −0.04999294 rad/s |

These confirm the discontinuity candidate is relevant to actual recorded nonzero torque. They do not prove that it causes later low-speed detachment or high-speed yaw swing. The retained unwrapped control matches the same original behavior, so observer parity is not an alternate contact-policy experiment.

## Controller and rider state continuity

`prepareBank` runs before either solve ([AttachedRider.ts:1474](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:1474)). Reference bank is eased/rate-limited at1520–1521; ankle rest is eased at1535; torque is formed at1537. The rejection path does not reset these states or re-run their controllers. In the retained first-tip substeps reference changes are ordinary preparation increments (7/8/10/11: +0.000188456/+0.000046052/+0.000000125/+0.000001177 rad), while body-bank changes are +0.000316425/+0.000389107/+0.000355043/+0.000425329 rad. Such neighboring recorded increments are not a perturbation experiment establishing continuity of the whole coupled law.

[AttachedRider.ts:2031](/Users/regina/Desktop/Projects/surfing-game/src/physics/AttachedRider.ts:2031) uses the proposed leg/bank rates and the final board velocity for feasible rider motion; angular velocity is assigned from board yaw and proposed bank speed. Infeasible `finish` at2044 instead applies the projected impulse plus external force to the rider's old velocity. That branch leaves rider angularVelocity unchanged. The rejected `legRateAfter`/`bankSpeedAfter` scratch still exists but is not applied to its motion; subsequent `prepareLeg`/`prepareBank` remeasure rates from actual relative velocity. `frame` at2140 measures body bank from position and clamps at MAX_BANK. It does not reset reference bank or ankle rest on rejection. These are distinct update laws, with angular-state consistency needing its own accounting; no source change is recommended here.

The separate feasibility-only work branches at2058–2068 also omit swing/twist/hand reaction work when rejected, matching the disappearance of those added RHS terms. This is not a closed total-energy proof: the existing reported rider kinetic omits rotor/elastic/actuation terms. The supported next boundary is to review the intended infeasible-contact reaction policy, not loosen the support tolerance or label the clamp itself as an impulse jump.

## Physical-policy refinement

A subsequent source-only review distinguishes the terms in T. `handYaw` is an external hand-water moment about the rider's center of mass. `swingTorque` is an internal rotor exchange; its coupled correction prevents point-mass coupling from assigning the entire rotor couple to the board. `twistTorque` is an internal yaw exchange transmitted through the feet. Releasing inadmissible foot coupling is intentional, so simply adding all of T back to the board can bypass the support constraint. The algebra above identifies a change in update law, not a complete repair policy.

Both rotors advance before feasibility is decided, whereas rejected `finish` updates rider translation and leaves its angular velocity unchanged. Accounting for the external moment and released rotor exchange therefore needs review on the rider side. A consistent model must preserve the existing support, friction and load constraints, transmit only an admissible foot wrench, and retain remaining angular impulse in the rider and rotors. The current standing point-mass contract explicitly omits independent spin, so it does not determine a unique small patch.

A useful regression would start from identical states immediately on each side of the support boundary, separately enabling swing, twist and hand-water moments. It should check the admissible foot wrench, combined angular impulse and separation handoff. This review ran no new numerical experiment and does not establish that such a repair would cure the retained falls or yaw wobble.
