# Define water appearance and shared surface behavior

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Choose the wave simulation representation](choose-wave-simulation.md)

## Question

Which visual water cues are required for the MVP's realistic appearance, and how must rendered water geometry and physics sample the same surface so that the board does not visibly separate from the simulated wave?

## Resolution

The MVP deforms a custom Three.js water mesh from the authoritative evolving CPU field also sampled by board physics. The incoming wave is part of the simulated field from initialization, not a render-only layer. Retain a finite surf zone, crest cue, profile diagnostics, and restrained foam. Breaking, whitewater, and overhangs are future scope. Sun-position lighting/reflections and underwater appearance are future visual features; see [ROADMAP.md](../../../ROADMAP.md) and [PLAN.md](../../PLAN.md) for source references. The stock Water add-on is not the physical wave; it is a reflective water effect [Three.js Water docs](https://threejs.org/docs/pages/Water.html).
