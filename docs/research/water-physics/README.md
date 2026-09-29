# Water physics research

The knowledge base of the water-physics advisor: why the game's breaking waves, tubes, whitewater and foam don't read as real surf, what to change, and the advice given to the sessions building it. Each page is a one-page mirror of a tab of the Claude Doc "Wave Physics Research" (https://claude.ai/code/artifact/5eca44ce-d128-48b3-916d-6fcb8ea94624). The doc is the live copy. These files are here so any local session or agent can read them without the docs tools.

**Asking for advice:** before settling a breaking, lip, tube, roller or foam shape, message the "Water physics research" session (ListAgents, then SendMessage). If it isn't running, spawn the `water-physics` agent (`.claude/agents/water-physics.md`), which reads this folder. Log each consult in [consult-log.md](consult-log.md).

## The owner's standing decisions

- **Realism (2026-09-28):** every shape is sourced from measurements or physics simulations, or marked provisional. It need not come from the game's own solver: a precomputed 2D breaking simulation swept along the crest qualifies. Hand-authored shapes don't.
- **Order:** the breaking face and the tube first; then whitewater with volume, where the roller is geometry the rider hits; then spray and lighting.
- **Tubes** happen at any spot and any size, wherever the physics plunges.
- **One water:** the rider hits exactly what is drawn. The lip, the tube and anything collided match exactly between online players; spray, foam texture and mist may differ.
- **Looks:** Classic stays unchanged and new visuals go to Rich. The one exception so far: Classic draws the swept barrel, because the rider hits it (Padang Padang spec, item 15).
- **References:** Teahupo'o (Reef), Supertubos (Beach), Jeffreys Bay or Snapper Rocks (Point), Surf Ranch for measured tube sizes. Camera priority: chase, then tube, then Wave Lab shots.
- **Tube build (decided 2026-09-28):** one surface swept along the crest from simulated 2D overturn profiles, drawn and collided. It replaces the lip strips and the carved void, and is tested first at a new Padang Padang spot. Profiles come from our own Basilisk 2D runs on the game's bed transects; published data only checks them.
- **Performance** is measured, never a gate. Targets: M4 Pro; an M1 Air may run slowly.

## Pages

| Page | What it holds |
|---|---|
| [overview.md](overview.md) | The verdict, why the wave doesn't read as surf, and the ranked fixes |
| [correct-shape.md](correct-shape.md) | The reference card: correct numbers per stage (onset, throw, lip, tube, after) against the game |
| [along-the-crest.md](along-the-crest.md) | How a barrel changes down the line: the slice clock, open-tube length, lip taper, makeable peel angles |
| [tubes.md](tubes.md) | Why the tube reads wrong, and the swept-surface fix |
| [swept-barrel-build.md](swept-barrel-build.md) | Where the profiles come from and how to loft, seam and collide the barrel in real time |
| [padang-padang.md](padang-padang.md) and [padang-padang-build-sheet.md](padang-padang-build-sheet.md) | The break, and its sourced bed, bearings, tide, swell and wind |
| [breaking.md](breaking.md) | Why the solver's face stays near 17°, the crest-speed trigger, the stop rule, directional spread |
| [solver-stability.md](solver-stability.md) | Why the biggest Reef swells blow up, what published models do, and the options |
| [solver-rewrite-sketch.md](solver-rewrite-sketch.md) | What option (a)'s rewrite would take, following FUNWAVE-TVD's form |
| [foam-and-whitewater.md](foam-and-whitewater.md) | Foam contrast and ageing, persistence, the roller, spray |
| [roller.md](roller.md) and [roller-build.md](roller-build.md) | The roller's measured shape and effect on riders, and how to build it on the barrel's loft |
| [spray-and-mist.md](spray-and-mist.md) | Spray, spit, the offshore veil and haze: why they read as dots, the numbers, and what to change |
| [underwater.md](underwater.md) | The view below water: colour and fog, the sky seen from below, the water mass moving, bubble plumes and sand |
| [graphics.md](graphics.md) | Lip glow, the tube interior, break-up, spray and the tube camera |
| [consult-log.md](consult-log.md) | Every consult and decision, newest first, including advice that turned out wrong |
| [sources.md](sources.md) | Every source, opened and read, by topic |

## Notes

[notes/](notes/) holds the detailed research behind the pages, one folder per round:
- Round 1: breaking, foam and tubes.
- Round 2: barrel profiles, along the crest, Padang Padang, the roller.
- Round 3: the whitewater build.
- Round 4: spray and mist.
- Round 5: the underwater view.

They tag each finding as measured, modelled or inferred, and cite `path:line` in the code of their day. Where a note and a page differ, the page and the consult log are newer. Long quotations have been shortened to their opening words; follow the links for the full text.

## Open for the owner (2026-09-29)

- **Rich foam:** draw foam as a layer that adds light (prototyped), and how to apply Rich's body gain.
- **Roller:** Classic drawing it, roller density, surface rise, roughness.
- **Solver (decided 2026-09-29):** depth-aware dispersion plus a Froude cap and a smooth edge ramp, being built; PR #63 is on hold as a draft.
- **The peel meter:** measure peel with the solver's real crest speed. It moves every spot's skill rating (a task chip).
- **Spray and mist:** optics, haze above water, the budget, rainbows and the order (see [spray-and-mist.md](spray-and-mist.md)).
- **Underwater:** visibility (physical or a readability minimum), an underwater ride camera, and whether haze and sand are drawn only (see [underwater.md](underwater.md)).

## Handover

The advisor session moved to the cloud on 2026-09-29. [HANDOVER.md](HANDOVER.md) has its working state:
- the open decisions;
- the consults in flight;
- the underwater research round to restart;
- how to keep this folder in step with the doc.

## Keeping this folder current

When a tab of the Claude Doc changes, export it as Markdown and replace its page here. Add a row to the consult log for each new consult.
