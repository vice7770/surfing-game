# Set run transition and outcome criteria

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Define spawn, paddling, and wave catch behavior](define-catch-behavior.md)

## Question

What measurable conditions move a run through waiting, paddling, riding, missed wave, ride complete, and wipeout states, and which states allow replay or New Wave?

## Resolution

States include `ready`, `paddling`, a conditionally available pop-up window, `riding`, and terminal `missed`, `wipeout`, or `complete`. Get Up is a player action (on-screen button and Enter) enabled only when board speed and local wave conditions are suitable. Early attempts do nothing; the visual wave/board cue is primary. Missing the opportunity can result in `missed`; loss of support/stability can result in `wipeout`. A successful catch is sustained board travel physically driven by the shared water field after paddle release. Preserve Replay and New Wave terminal actions. Exact thresholds are to be calibrated and tested with the interactive-water prototype, not inherited from crest-passage timing.
