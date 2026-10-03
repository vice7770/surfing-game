# Frozen render-spacing fidelity screen

Changing render sampling from 1 m to 2 m kept crest-height differences small in these three held physical states. This compares the same underlying snapshot, not two independently advanced solver grids. It supports the render simplification; it does not validate coarser wave physics or establish gameplay FPS.

The fixtures are the original Wave Lab captures `at-10.json`, `at-15.json` and `at-20.json` in `/private/tmp/tube-live-original`. They are **Hs 4 m, Tp 10 s, direction 10°, spreading 11.7206, calm, seed 1, 64 components**, stage 2 on the GPU, with 203,200 physics cells. They are not the narrow Padang Big preset (Hs 3.8 m / Tp 18 s / spreading 150). Their actual sea times are 173.8892, 177.0059 and 179.9392 s; filename numbers are capture wall-time offsets. Raw captures remain outside the repository. The saved report records their SHA-256 hashes and complete parameters.

The 1 m render grid has 372,681 nodes (321 × 1161). The nested 2 m grid has 93,541 (161 × 581), taking every second original node. Both therefore contain samples from exactly the same physical state. `sampleCubicSurface`, the CPU mirror of the Rich shader, measures height and slope on common coordinates. The break band covers ±50 m alongshore and ±100 m cross-shore around the fixed break point. Crest neighborhoods cover ±8 m about the two highest separated crests on each of 21 alongshore transects.

| Capture | Crest-neighborhood height RMS | Height p95 / max | Slope-vector RMS / max | Normal-angle p95 / max | Crest peak-height max | Crest-position max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 5.53 mm | 12.46 / 40.28 mm | 0.01178 / 0.05397 | 1.25° / 3.05° | 17.79 mm | 0.375 m |
| 15 | 4.33 mm | 7.96 / 37.57 mm | 0.00935 / 0.06275 | 0.93° / 2.84° | 12.56 mm | 0.375 m |
| 20 | 1.95 mm | 3.97 / 19.86 mm | 0.00473 / 0.02692 | 0.58° / 1.54° | 7.03 mm | 0.250 m |

Each neighborhood contains 1,344 samples; each capture also samples 20,000 break-band points. Break-band height RMS ranges from 1.64 to 2.42 mm, with a maximum near 4 cm. Peak locations are searched in 0.125 m increments, so the reported shifts include that sampling quantization. These errors concern base-water interpolation only. They exclude changes to the loft's forward rest when `heightAt` changes, FFT chop, shader slope interpolation, foam aliasing and live rider dynamics.

The barrel mask remains on its own 1 m grid when water rendering uses 2 m. Re-rasterizing the same frozen loft on that independent grid gives **zero mask-byte and uploaded-byte differences** from the original 1 m mask: 282 covered nodes at capture 10 and 480 at capture 20; capture 15 has no loft. The world-grid uniforms also remain identical, so bilinear mask sampling and dither discard decisions are unchanged for the same geometry. This prevents additional mask-resolution gaps; it does not repair existing tube cuts or self-folded rays.

The current `SurfZoneRunner` also passes render spacing to `PhysicalSurfWater.nodeSpacing`. A 2 m default therefore changes the rider's base-water interpolation while leaving the Boussinesq grid untouched. Keeping this coupling matches the drawn base surface; retaining 1 m contact separately would preserve prior rider interpolation but introduce a small render/contact mismatch. Neither choice has been validated here through a live ride.

To reproduce:

```sh
./node_modules/.bin/rolldown scripts/render-spacing-fidelity-report.ts -o /private/tmp/render-spacing-fidelity.mjs --format esm --platform node
node /private/tmp/render-spacing-fidelity.mjs --input /private/tmp/tube-live-original --out docs/research/performance-2026-10-03/render-spacing-fidelity.json
```

The script advances no solver and opens no browser. Full metrics, mask checks and fixture hashes are in [render-spacing-fidelity.json](render-spacing-fidelity.json).

For a shared default, resolve spacing once in the `SurfZoneRunner` constructor, after the physical simulation exists, with explicit `options.renderSpacing` taking precedence. This covers worker, local, recorded and online hosts, and publishes the choice through `init.grid.spacing`. A stage-2 Padang policy can use the actual 1 m render-node count to distinguish a large tank from small report windows. Changing only `PhysicalSurfaceSource` would conflict with the snapshot host's declared grid, and changing only the main menu factory would miss recorded and online paths. No defaults were changed in this screen.
