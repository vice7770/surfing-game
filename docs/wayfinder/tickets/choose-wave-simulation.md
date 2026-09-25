# Choose the wave simulation representation

Status: RESOLVED  
Type: wayfinder:grilling  
Assignee: Codex  
Blocked by: none

## Question

Which practical, parameterized wave representation and simulation update approach should the MVP use so that the visible surface and board interaction remain stable and coherent at browser frame rates?

## Resolution

The initial prototype used a deterministic parameterized traveling wave. The MVP now represents the incoming wave inside a deterministic evolving CPU shallow-water field shared by rendering and board physics. Three.js WebGL 2 remains the rendering baseline; WebGPU compute is deferred until synchronized CPU board sampling and browser compatibility are demonstrated. See [ADR 0002](../../adr/0002-interactive-water-field.md) for the decision and limitations, and [Investigate the interactive-water foundation](investigate-interactive-water-foundation.md) for remaining performance/browser validation.
