# Specify replay reset and reproducibility

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Choose the wave simulation representation](choose-wave-simulation.md)

## Question

Which generated values and simulation state must reset when replaying a seed, and what level of same-build repeatability should the MVP promise? Clarify whether the promise covers identical starting conditions only or also trajectories when the player supplies identical inputs.

## Resolution

Capture the seed and the complete effective tuning parameter snapshot when a run starts. Replay resets elapsed simulation time, fixed-step accumulator, board position/velocity/orientation, run state, wave phase, and seeded PRNG state to that snapshot. The fixed simulation step is 1/60 s; rendering may vary independently. In the same build, same seed/settings plus the same ordered input events must yield the same state trajectory within floating-point tolerance. Replay does not record or reproduce player input automatically. New Wave advances to a distinct seed and regenerates seed-derived crest variation while keeping explicitly selected tuning values.
