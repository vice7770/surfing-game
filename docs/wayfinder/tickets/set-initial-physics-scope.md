# Set the initial wave and board physics scope

Status: RESOLVED  
Type: wayfinder:grilling  
Blocked by: none

## Question

Which wave and board behaviors belong in the first MVP, and at what fidelity?

## Resolution

Use a practical evolving height-field approximation rather than full volumetric CFD. The incoming generated wave itself is initialized into the simulated field; shared water state drives rendering and board forces. The first coupling is modest and two-way: the wave moves the board through physical forces and the hull adds a small bounded wake/disturbance. A timed player-controlled pop-up begins the ride; after pop-up, forward travel must emerge from wave/board physics without paddle thrust or scripted animation. Breaking/overhangs, whitewater, detailed paddle-fluid interaction, and fuller coupling remain on the future physics roadmap.
