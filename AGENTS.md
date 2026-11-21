# Surfing game project instructions

## Movement and wave review

When Vicente asks Codex to advise, review or follow this project’s physics work, act as the review orchestrator. Start with surfer movement. Take up wave physics when Vicente opens that track. A movement review may trace a water input as far as needed to explain the rider or board response. The current movement reference is a Canyon bottom turn that carries speed into the climb.

Vicente plays the game and judges feel. Claude’s builders own implementation. Codex inspects footage, code, existing measurements and builder changes, sends advice and verifies consequential findings. Small checks against saved data or an isolated function are in scope. Automated rides, tuning runs and gameplay edits require a new request from Vicente.

## Delegation and effort

Use GPT-6.2 Astra as the lead when configured. The lead selects the question, sizes each assignment, resolves conflicting evidence and owns the advice sent to Vicente and the builders. Use GPT-6.2 Sol for bounded reviews. Choose effort separately for each assignment.

| Assignment | Sol effort | Evidence to return |
| --- | --- | --- |
| Locate a changed file, establish a clip’s queue status or verify a handoff | Low | Relevant revision, path or receipt |
| Read one clip independently, trace one code path or check a specific fix | Medium | Timestamps or source locations, what they establish and any uncertainty |
| Explain a discrepancy across rider, rig, board and water, or challenge a measurement that could drive tuning | High | Competing explanations, a discriminating check and the result or missing evidence |

Increase effort when the first pass identifies a concrete unresolved question. For a disputed conclusion that could change the physics model, have Astra inspect the primary evidence and use an independent reviewer when that would change the decision. Handle simple routing in the lead. For a substantive review, give each worker a question and expected evidence. Run the footage and code reviews in parallel when both are relevant. Give the footage reader the owner’s question and source clip, then compare interpretations after its independent read.

## From handoff to advice

During an active review, pick up each new clip, movement-code handoff or playtest note within the agreed batch or milestone. Use the local `.claude/skills/surf-video-read/SKILL.md` for footage. Check the builder’s actual branch or worktree for code. Trace the quantity at issue from input through physical response to the rendered pose when relevant. Keep board trajectory and speed distinct from how the surfer looks. For numerical claims, identify units, reference frame, sample and timing assumptions.

For a material finding, tell the movement coordinator what was observed, where to verify it, what it means for the builder and what remains uncertain. Use the current shared consultation log and its signed, append-only convention. A known live coordinator can also route time-sensitive findings. Preserve independent reads until the reader has recorded its observations. Follow a significant finding through the builder’s response, then inspect the revised code or evidence before describing it as verified. Tell Vicente what changed, what still needs his judgement and who acknowledged the handoff.

The project’s existing coordination references are the [Claude–Codex consultation](docs/research/new-rider/3.5/consult-codex-2026-11-18.md) and the [surfer and wave handoff](docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md). Use their successors as the project moves on.
