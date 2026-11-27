# Claude coordination for Breakline

When Vicente asks Claude to coordinate surfer or wave work, the lead advises, briefs builders, reviews their evidence, integrates accepted changes and reports back. Vicente plays the game and judges feel. Claude builders own implementation. Codex provides an independent review under the [project reviewer instructions](AGENTS.md).

## Dispatch

- Run the Claude coordinator on Opus 5.5 at max effort when configured. Dispatch physics builders and the [water-physics advisor](.claude/agents/water-physics.md) on `opus`. State the effort and the reason in each brief. Use low for mechanical documentation or merges, medium for a specified one-file change, high for diagnosis or an implementation with open causes, and xhigh or max for a hard root-cause investigation.
- Keep one builder per active track. Surfer and wave builders can work concurrently when Vicente has opened both tracks. Give each its own worktree and branch. Queue further builds within that track. An independent Codex review can proceed alongside the builder.
- Delegate footage reads using the [surf-video-read skill](.claude/skills/surf-video-read/SKILL.md), which calls for `sonnet` at its default effort. Let independent readers record their observations before comparing interpretations. Delegate HTML, diagrams and other presentation work to a low-effort or cheaper agent. The coordinator decides which claims the evidence supports.
- Brief each builder with the owner’s question, the starting branch and revision, the permitted scope, and the evidence to return. Claude-authored commits carry the project’s `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer when authored with that model.

## Review and handoff

Read recent owner feedback and the [signed Claude–Codex consultation](https://github.com/vice7770/surfing-game/blob/claude/the-record/docs/research/new-rider/3.5/consult-codex-2026-11-18.md) before dispatching movement work. Verify consequential findings against the source, saved measurements or footage. Include the input, sample, time and reference frame when reporting a physical result. Record findings and corrections under your own signed heading, preserving the other reviewer’s text. Scope changes and approvals come from Vicente.

Once `npm run report:stability` exists (step 3.6a), every surfer-track round includes it in its evidence. Run the quick run after each change and the full run before review.
- **A regression** is a ride that lasted its hold and now falls, a balance fall that comes 0.25 s or more sooner, or any ride whose lowest balance reserve drops by more than 0.10.
- **Each regression** is reported and explained before review.
- **The baseline moves** only when Vicente accepts an improvement.

The [stability-system entry in the consult log](https://github.com/vice7770/surfing-game/blob/claude/the-record/docs/research/new-rider/3.5/consult-codex-2026-11-18.md) records the agreed design.

## Living docs

Vicente asked on 2026-11-27 that these docs stay current. Each one describes the game as it is now. Update a doc in the same round as any change that concerns it, for example:
- a function or file line it names moves;
- a behaviour it explains changes;
- a number it quotes is measured again;
- a switch it describes ships or is removed;
- a finding it reports is corrected.

Who updates and how:
- **The builder** updates the doc on its branch. If the doc lives on another branch, the builder lists the needed edits in its hand-back.
- **The coordinator** checks each concerned doc at review, applies the edits on `claude/ride-everything`, and republishes any published page from that file. It notes the update in the round's consult-log entry.
- **A change behind an off-by-default switch** is described as a switch. The main description changes when Vicente accepts the change.
- **A new doc of this kind** is added to the table when it is made.

| Doc | What it describes | Update it when |
| --- | --- | --- |
| [How the Surfer Moves](docs/research/new-rider/how-the-surfer-moves.html), also published as the private claude.ai page of the same name | The new surfer's chain from the pad to the board: each function and line in order, the measured problems and the options | A function in the chain changes or moves; the balance's reference, cost, senses, actuation or fall test changes; a number it quotes is measured again; a round settles one of its options |
| The current cross-machine pickup (below) | Where every track stands | At every dispatch, review and owner decision |
| The [surfer and wave handoff](docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md) | Standing project decisions | Vicente adds or changes a standing decision |
| `docs/research/stability/README.md` and `baseline-*.json` on the surfer track's branches | The stability report and its baseline | The report's rides or rules change, or Vicente accepts a new baseline |

## Pickup

For a cross-machine pickup, link the pushed branch and commit, the work order, the supporting evidence and the question still open. Verify the commit is reachable on the remote. The [surfer and wave handoff](docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md) records standing project decisions. The [cross-machine pickup](https://github.com/vice7770/surfing-game/blob/claude/ride-everything/docs/superpowers/handoffs/2026-11-20-cross-machine-pickup.md) and the [sharp-steer work order](https://github.com/vice7770/surfing-game/blob/claude/ride-everything/docs/superpowers/handoffs/2026-11-20-work-order-sharp-steer-collapse.md) record the November 20 movement handoff. Their current successor is the [November 24 cross-machine pickup](https://github.com/vice7770/surfing-game/blob/claude/ride-everything/docs/superpowers/handoffs/2026-11-24-cross-machine-pickup.md): start there. Follow later successors as work advances.
