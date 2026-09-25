# Set control mappings and tuning ranges

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: [Choose the wave simulation representation](choose-wave-simulation.md), [Define spawn, paddling, and wave catch behavior](define-catch-behavior.md)

## Question

What keyboard mapping, parameter units, defaults, ranges, and update timing should the MVP use for wave height, period, speed, paddle strength, and the board response control? Define board response as a specific tunable property rather than the whole physics system.

## Resolution

Use Space or ArrowUp to paddle, Left/Right to steer and shift balance, and R to replay. Provide visible Replay and New Wave buttons. Tuning values use SI units: wave height 0.6–2.4 m (default 1.4 m), period 5–12 s (default 8 s), propagation speed 1.5–5 m/s (default 3 m/s), paddle force 5–25 N (default 14 N), and board response 0.5–2.0 (default 1.0), where board response is the multiplier on steering torque and attitude correction. Sliders apply to the next run; changing them during a run marks the setup as pending, and Replay starts with the captured values unless the user chooses Apply & Replay. Display effective values and seed in the tuning panel.
