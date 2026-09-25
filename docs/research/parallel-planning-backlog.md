# Planning while P2c water integration is underway

Status: **proposed planning backlog**, 2026-09-25. The concurrent wave branch has completed P2a/P2b and is implementing P2c. This list names work that can be specified without editing game code or assuming P2c's final water API. It supplements the [wave formation plan](wave-formation-plan.md), [board and surfer physics plan](board-surfer-physics-plan.md), [validation protocol](board-surfer-validation-protocol.md) and [video brief](gameplay-video-reference.md).

The prototype already has a coastline, sunset, reflective-water approximation, improved surfer silhouette and board, sustained legacy ride, mobile controls and basic HUD. Those are established baselines, not new tasks here.

## Recommended order

| Priority | Planning package | Can be completed now | Later dependency | Reviewable output |
|---|---|---|---|---|
| **1** | **Practice and natural-session experience** | Specify the mode selection, first-attempt flow, manual pop-up cue, assist setting, wipeout/restart, Replay/New Wave semantics and how a player sees why a catch failed. Sketch desktop and narrow/mobile layouts using existing controls. | Hooking cues and state into P2c/B2 diagnostics. | Screen-state map with interaction text and a short walkthrough from launch to second attempt. |
| **2** | **Surfer, shortboard and camera alignment** | Use the measured reference dimensions/mass in the [integration handoff](board-water-integration-handoff.md) to specify rendered hull scale, stance and contact anchors, prone/push/landing/ride/fall silhouettes, and camera framing. Compare with the [user video](gameplay-video-reference.md) without copying its physics or HUD values. | Physically driven pose/contact transforms in B1–B4. | Pose/contact sheet and camera shot list; dimensions and origins stated in metres. |
| **3** | **Spot and wave experience matrix** | Define what Beach, Point, Reef and Canyon should teach or challenge; identify which offers the 30-second practice face and which waves should close out or be missed. Specify the qualitative distinction between practice forcing and natural sets. | Measured face lengths, breaking/rideability and seed selection after P2c/P3. | One-page matrix of each spot's player goal, wave cue, likely failure and visual identity. Quantitative percentages wait for the solver baseline. |
| **4** | **Calibration and telemetry ledger** | List every board/rider tuning parameter, physical unit, evidence class and expected effect. Identify which force and contact traces are necessary for diagnosis and which existing values are gameplay constants. | Coefficient fitting and worker cost after P2c/B0. | Parameter table with source, uncertainty and no unexplained values; report template for one seeded ride. |
| **5** | **Audio and accessibility cues** | Decide whether paddle rhythm, approaching lip, rail bite, loss of contact and underwater fall need sound or haptic cues; design color-independent HUD and readable focus/contrast states for both modes. | Event hooks and implementation after gameplay physics stabilizes. | Small cue map and accessibility check list. This is lower priority than readable movement and control. |

## Boundaries with the active wave work

- P2c owns water integration, worker timing, seabed/render alignment and bicubic sampling. This planning branch does not define or change its implementation.
- G2–G6 already cover far-field swell, water shading, advected foam, caustics and spray in the wave plan. Appearance planning here focuses on **what players need to read** during a catch and turn, rather than a second rendering roadmap.
- The agreed board implementation order remains P2c handoff → B0 seam and baseline → B1/B2 rigid board and rider contacts → B3/B4 fin, fall and calibration work. These packages prepare decisions and assets for that order; they do not authorize changing board physics before P2c.
- The [validation protocol](board-surfer-validation-protocol.md) already defines the 30-second practice gate and natural-wave reporting method. Do not create a second set of pass criteria in a UI or art plan.

## Next planning package

Start with **practice and natural-session experience**. It is the most independent of P2c and closes a real gap: the physics requirements say what a valid catch and wipeout are, but do not yet specify how a new player discovers the controls, reads the pop-up opportunity, selects assists, restarts immediately, or understands a failed attempt. Keep the interface minimal so the wave face remains the visual focus.
