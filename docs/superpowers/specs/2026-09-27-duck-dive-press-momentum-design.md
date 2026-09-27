# Duck-dive: the press pushes the nose (design)

Status: **agreed** with the user on 2026-09-27 (brainstorming: the user chose "the rider pivots on its hands", then the revision below, after the solver showed what the pivot actually needs). A follow-up to the [wipeout and duck-dive spec](2026-09-27-wipeout-and-duck-dive.md), Part A's duck-dive. The milestone's principles hold: physical inputs, not scripted moves; checks are never tuned into passing; performance is measured, never a gate.

## Why

The duck-dive's stages now ease in (PR #51), so the body stays on the deck, and in the surf zone early dives keep the board more often than paddlers who stay on top. What still loses it is capsizing, about 1.7–2 s into the broken water. The dive is perched: the chest is up out of the water over a board sunk level.

On still water the press tips the board further nose-up (9° to 13°). The spec says "arms push the nose", and coaching sinks the nose 40–60 cm (survey §5). The open check `the arms sink the nose first` records the gap. Investigated (the roadmap's P11 entry):

- **The board is already under water.** Lying prone, the reference board (25.8 L) is fully under water, as a small shortboard under a prone surfer really is. Its buoyancy acts at z −0.056 m with no waterplane, so small moments set its pitch.
- **Statically, the press is balanced.** It brings the rider's centre of mass to z −0.067 m, level with the board's buoyancy. The rider's static pitch moment about it stays within ±4 kg·m.
- **The press alone does sink the nose, too slowly.** With the knee stage removed, the nose goes 0.38 m under after 1.2 s. The knee arrives at 0.3 s, long before that.
- **The fast push is missing.** The rigid rider moves its centre of mass with the posture but not the angular momentum of its changing shape. As the chest rises faster than the legs, the body's pitch momentum changes, and the reaction should turn the board nose-down at the hands. In the knee stage it should push the tail down at the knee.

## Design

1. **The posture's own angular momentum.** While the duck-dive is engaged, the rider's angular momentum includes that of its parts moving relative to the board:
   L = Σ mᵢ (rᵢ − c) × (uᵢ − u_c)
   where rᵢ is each part's place in the board frame, uᵢ its rate from the press and knee tracks' rates, and c, u_c the centre of mass and its rate. Each substep the coupled solve takes the change in L from the composite's angular momentum, so its reaction turns the board: the body's shape change pushes the nose down at the hands as the press rises, and the tail down at the knee. No new unknown enters the solve.
2. **Scope.** Only the duck-dive's press and knee (and their release). Paddling, lying down, the pop-up and standing keep today's coupling. The pop-up has the same omission (its shape change turns nothing), noted for later, not changed here.
3. **The supports.** The couple is carried by the rider's supports on the deck, the hands and the lower body, and is not limited separately. The hands' grip keeps today's limits on the contact force.
4. **Energy.** The couple's work on the board is booked to the board's ledger of the rider's work (`board.work.rider`), where the rider's muscle work is read from (contact work plus work on the board), so the ledgers still balance.
5. **Unchanged.** The ducking roll balance, the stage timings (`MinimumJerkTrack`), the postures, and the drawn rider.

## Later, only if the measurements call for it

A free pivot: the body's pitch about its support as an extra unknown in the solve, with the arms' strength and a one-sided stop for the lower body. It matters only if the prescribed motion asks more of the arms, or pulls the lower body off the deck further, than they can give.

## Checks

- A posture change on its own turns the board the opposite way, and the composite's angular momentum is conserved (a unit test).
- The open check `the arms sink the nose first` passes: the press tips the board nose-down and puts the nose under by 0.3 s. It is not tuned; if it fails, it stays open with the reason.
- Recorded against the survey: still-water depth (0.5–1 m, open); ducking from paddling speed without rolling over (open).
- The test bore and the surf-zone duck-dive report are re-run. Hoped for: divers keep the board more often than paddlers on top; a timed dive is set back under half as far; weaker inside stays met. Reported, not asserted.
- Every paddling, standing, pop-up and energy-ledger test passes unchanged.
