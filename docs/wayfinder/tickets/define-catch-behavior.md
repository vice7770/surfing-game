# Define spawn, paddling, and wave catch behavior

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Choose the wave simulation representation](choose-wave-simulation.md)

## Question

Given the selected wave model, where and when does the surfer spawn ahead of the wave, how does paddle input add motion, and what measurable conditions count as catching the wave?

## Resolution

Use Three.js world axes with Y up, X along the crest, and +Z in the wave travel direction. The incoming generated wave is part of an evolving interactive water field shared by rendering and board physics. The player paddles to build speed, then explicitly triggers Get Up with an on-screen button or Enter when board speed and local wave conditions are suitable. Early attempts are ignored; missing the opportunity can result in a miss, while loss of support/stability can wipe out. Readiness is communicated mainly by visible wave/board behavior. A catch means sustained riding in which the shared water field physically carries the board forward after paddle release; crest proximity alone is not a catch. Never use scripted translation or staged ride animation to supply transport. Begin with modest two-way coupling: water forces affect the board and the hull creates a bounded small wake/disturbance. Detailed paddle-fluid interaction and fuller coupling are future work. Exact solver architecture is gated on the interactive-water research spike.
