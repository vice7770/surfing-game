# Water physics research

Markdown export of the Wave Physics Research doc
(https://claude.ai/code/artifact/5eca44ce-d128-48b3-916d-6fcb8ea94624),
taken 2026-09-29. The online doc is the living copy; these files are a snapshot
so local sessions can read the findings and decisions without the doc.
Images and in-doc diagrams are placeholders here.

Scope: why breaking, the lip, tubes and whitewater don't read as a real surf
wave, and what to change. Wave starting and forming are out of scope.

## Start here

1. `00-overview.md`: verdict, why it fails, ranked changes, decisions.
2. `09-consult-log.md`: decisions made so far and advice given to other sessions, newest first.

## Pages

| File | Topic |
| --- | --- |
| `01-correct-shape.md`, `01a-along-the-crest.md` | What a correct breaking profile looks like, and how it varies along the crest |
| `02-tubes.md` | Why the tube reads as a pocket, and the fix |
| `03-breaking.md` | Breaking onset, lip timing, the solver's face-angle limit |
| `04-foam-and-whitewater.md`, `04a-roller.md`, `04b-roller-build.md` | Whitewater with a body: the surf roller, foam ageing, build plan |
| `05-graphics.md` | Lighting and shading: lip glow, throat, spray |
| `06-swept-barrel-build.md` | Build plan for the swept surface (the decided approach) |
| `07-padang-padang.md`, `07a-padang-build-sheet.md` | Padang Padang, the swept barrel's first testbed |
| `08-solver-stability.md` | Why big Reef swells blow up the solver, and the options |
| `99-sources.md` | Papers and references |

Raw research notes behind these pages are in
`.claude/water-physics/research_notes/`.
