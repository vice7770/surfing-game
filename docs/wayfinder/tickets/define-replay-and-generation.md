# Define replay and wave generation

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: none

## Question

What conditions must replay reproduce, and how should a new wave differ?

## Resolution

Each generated wave has a seed. Replay reuses the seed and selected tuning settings to reproduce the starting conditions. New Wave selects a different seed. Replayability means the same initial conditions and simulation behavior; it does not imply recorded playback of player inputs. The precise reset and determinism contract remains an open implementation-level decision in [Specify replay reset and reproducibility](specify-replay-contract.md).
