# ADR 0003: Bounded 3D plunging sheet and collision

- Status: Accepted for the playable prototype
- Date: 2026-09-25

## Context

The bulk water is a single-valued height field. It provides board support and flow but cannot fold into a plunging lip or collide with a rider above the surface. The earlier lip mesh was decorative, so its overhang had no matching contact. A full three-dimensional fluid solver would be a much larger state and rendering change.

## Decision

Keep `InteractiveWaterField` as the bulk-water authority. Add `PlungingSheet` as a separate, bounded 3D authority for the detached lip only. The existing field's break strength and crest spawn up to 97 parcels per layer in an eight-layer ring buffer. Parcels advance in 3D under initial water velocity and gravity, and disappear when they hit the shared surface or age out. `PlungingSheetMesh` renders connected, thickened faces from those exact parcel positions. Each parcel's forward plunging span is also a capsule-shaped contact region; `BoardPhysics` queries it near the rider and applies a capped impulse to the board and the opposite impulse to the parcel. The HUD reports lip impact.

The module's working interface is `step(dt)`, `resolveSphere(center, radius, bodyVelocity)`, `forEachActive(visitor)`, and `reset()`. The sheet and renderer are separate modules; rendering and collision read the same evolving positions. A fresh sheet is created with each wave, so Replay and New Wave do not retain old lip state.

## Limits

- This is a connected-particle **lip model**, not a general 3D Navier–Stokes, SPH, or volume-of-fluid solver. It does not resolve entrained air, pressure throughout a tube, or arbitrary submerged bodies.
- Collision uses capsules along the parcels' forward spans. The rendered faces are thickened around the same positions and spans, but the contact surface is approximate rather than exact triangle collision.
- The height field feeds the sheet. Parcel impact on the base water currently removes parcels without transferring a measured volume or force back to the field. Rider collision exchanges a small capped impulse with the contacted parcel; its mass and stiffness are game constants.
- A full interactive barrel would need validated tube geometry, continuous collision/flow throughout the overhang, and a water/air coupling decision. This implementation provides a playable, inspectable seam for that work.

## Validation

Tests cover bounded parcel count, finite deterministic motion, reset, rendered position agreement, contact inside a rendered face, a rider/board response, lip contact during a carved ride, and clean catches on default and reef conditions. Existing fixed-step catch and ride tests still pass. The Windy Reef automatic ride completed in the local browser at approximately 120 FPS on this machine; the carve demo displayed lip impact near the wipeout. These are local observations, not device-wide guarantees.

The design is informed by the connected-particle wave patches used to extend shallow-water simulation in [Thürey et al., *Real-time Breaking Waves for Shallow Water Simulations* (2007)](https://matthias-research.github.io/pages/publications/breakingWaves.pdf). That work likewise distinguishes the hybrid breaking effect from a full 3D fluid simulation.
