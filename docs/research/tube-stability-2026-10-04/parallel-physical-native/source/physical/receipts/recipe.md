# Parallel C physical-coupling experiment

Based on frozen parallel-rays source. Keep C drawing/contact/throw vectors [0,1], all geometry, sigma clocks, end fades, and packet fields unchanged. C once-only pace conversion reads crestMotion at the original solver crest cell before bulk finalization, using its fresh physical direction.z. Retain the same historical smoothed normal-speed numerator, wave fallback and slow/fast normal clamps, then divide by max(0.5,physicalZ). Missing fresh measurement uses the immediate local pre-new-throw crest tangent as an explicit geometric physical-normal approximation; no extra retained direction or smoothing state. Already paced points are not re-paced.

C CrashCurve.slice width is half the neighboring positive X differences; RAW keeps exact old sigma arithmetic. No abs, floor or clamp on reversed input. This fixes orientation Jacobian of uniform constant-X extrusions. Existing local area*width quadrature/end footprints remain approximations for varying profiles, live water, end fades or clocks; no exact whole-mesh volume integral claim.

Own only this isolated tree. No build/native/browser/ports/Git/source changes elsewhere. Before adoption the corrected coupling still needs native connected-air/mouth evidence and normal rider entry/passage, plus inherited full-sheet switch/envelope limits.
