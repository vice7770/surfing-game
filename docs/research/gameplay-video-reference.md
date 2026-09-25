# Gameplay video reference: ride, turns and camera

Status: **observational brief**, 2026-09-25. Source is the user-supplied `/Users/vicentealmeida/Downloads/m2-res_1080p.mp4` (1920 × 1080, 44.97 s). This records what is visible in the clip; it does not claim that the shown game uses measured surf physics or that its on-screen speed is ground truth. Frames were sampled every four seconds for this review, so event boundaries below are approximate.

## Ride sequence visible in the clip

| Approx. time | Visible behavior | Useful prototype target |
|---|---|---|
| 0–4 s | A rider approaches a long, oblique breaking line from open water. A wave-catching meter appears as the rider reaches the face. | Let the player see the incoming section and position for a manual catch/pop-up. Keep the wave geometry readable before action begins. |
| 4–8 s | The rider drops onto the face, accelerates, and turns to travel beside the advancing lip. The wave continues to peel into the distance. | Catch, drop and first direction change should form one continuous physical trajectory. |
| 8–24 s | The rider stays close to the steep face and lip while the whitewater advances alongside and behind. Barrel and snap labels appear. | A sustained, surfable pocket is the central play space. Lip proximity should affect forces and risk, while the rider remains free to leave or re-enter it. |
| 24–36 s | Repeated cross-face changes produce visible rail engagement and spray. Near 32 s the board climbs toward the crest for an off-the-lip maneuver, then descends again. | Bottom-to-top transitions must move the board through real space; spray and labels follow motion rather than causing it. |
| 36–45 s | The rider continues down the line as the nearby wave section flattens and eventually separates from the surfer; displayed speed falls. | A ride may end by losing the moving face. Practice mode needs a fresh rideable section without forcing board speed; natural mode can end in a lull. |

The clip appears to follow one ride without an obvious cut in the sampled frames. It shows a long peeling wall and multiple maneuvers over roughly 40 seconds. Our agreed **30-second practice ride with bottom and top turns** is a playable target inspired by this pattern, not a demand to reproduce every label or second of the video.

## Camera and presentation cues

- The camera is a wide, elevated three-quarter view that keeps the rider small enough to show a long stretch of crest, pocket and whitewater. It tracks the action while preserving a stable horizon and a clear sense of where the wave will peel next.
- The surfer is usually ahead of the collapsing whitewater; the open face and lip remain visible together. This is more useful for timing turns than a camera locked close to the board.
- Coastline, offshore rocks and low sun establish direction. The sun's reflection stretches across the unbroken water. These are visual references for the already planned coastline, sunset and reflective-water work, not physics inputs.
- The HUD displays speed, flow/wave-catching and short maneuver callouts. Its readings and labels are **presentation artifacts**. Use measured path, board attitude, contact state and water-relative motion to validate our physics, then derive any UI labels from those diagnostics.
- Spray appears around hard turns and off-the-lip motion, and whitewater advances along the crest independently of the rider. Effects should reflect contact force and wave dissipation rather than hide missing movement.

## Limits of the reference

Perspective and distance make the board's actual length, width and mass impossible to extract reliably from these frames. The precise wave speed, surfer speed, hydrodynamic loads, input timing and camera coordinates are also unavailable. The board/rider dimensions in the [integration handoff](board-water-integration-handoff.md) therefore come from measured surfboard and field studies, not from pixel estimates. The [validation protocol](board-surfer-validation-protocol.md) uses this clip for qualitative ride and camera comparison only.
