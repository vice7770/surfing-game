# Set MVP physics calibration checks

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Choose the wave simulation representation](choose-wave-simulation.md), [Define spawn, paddling, and wave catch behavior](define-catch-behavior.md)

## Question

What observable MVP checks will count as physically plausible wave/board behavior (for example buoyant support, paddle acceleration, drag, lift, wave catching, and seeded replay), and what reference or qualitative criteria should be used without claiming production-grade ocean simulation?

## Resolution

Expose diagnostics for water height/normal/local motion, board world and water-relative velocity, board support, distance to crest/face, pop-up eligibility, run state, and seed. Test: (1) bounded stable board support; (2) paddle acceleration and drag after release; (3) the incoming wave exists in the authoritative evolving field and is sampled consistently by render and physics; (4) a valid Get Up timing initiates riding while an early input does nothing; (5) with paddle released, simulated board-water forces carry the board with the wave for at least 3 seconds; (6) hull disturbance remains bounded; (7) steering and terminal states remain stable; (8) replay is deterministic; and (9) WebGL 2 baseline works. Do not use timed translation or staged ride animation to satisfy travel checks. This is qualitative physical plausibility, not empirical ocean calibration.
