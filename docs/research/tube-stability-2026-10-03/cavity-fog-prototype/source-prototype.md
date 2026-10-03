# Isolated bounded-cavity fog prototype

The original classifier can put a camera in underwater fog while its indexed drawn column and the independent swept-contact oracle both place it in air under the roof. This prototype changes only rendering classification, in an isolated copy of root source `1233de6e4bc57e84e8b5d93047f7ace2ffda792e`.

| Frozen state | Camera x / z (m) | Camera y (m) | Bilinear host height (m) | Known contact floor / ceiling (m) | Old / prototype underwater |
| --- | --- | --- | --- | --- | --- |
| 10 | 114.491678 / −9.801541 | 0.835540383 | 1.050738341 | 0.720342425 / 1.436574490 | true / false |
| 20 | 46.045549 / −108.538169 | 1.139146868 | 1.499766489 | 0.878527246 / 2.538703744 | true / false |

Tests load the durable compact physical fixtures, real authored library bytes and actual `SweptBarrel.draw`; they do not manufacture private draw provenance or force an above-water flag. Current independent `SweptContact` verifies both lower eyes are bounded air. Both camera columns also have opaque current mask support. Frozen rendering initialization explicitly zeros the legacy tube table, so the recorded host heights are the exact classifier lookup. A live capture should record actual `host.heightAt` and tube count rather than assume that condition.

Fog classification now occurs after `water.update()` and the actual `drawBarrel()`, using the actual camera passed to `drawPhysical`. That unifies ordinary, paused, recording-camera and normal `renderView` paths. The existing height-minus-0.1 result remains the fallback. A triangle query runs only when that old result is underwater and the active visible current mesh passes provenance, uploaded-attribute version and complete draw-range guards.

Only strict bounded air in one unambiguous three-crossing indexed strip overrides fog. The query uses the contact's half-open strip/triangle ties and one reusable 16-value scratch buffer. It builds no second loft, profile blend or contact index, and caches no geometry result. Overlaps, extra crossings, overflow, nonfinite fields, query-on-degenerate projections and malformed indices retain the old result. The current mask must be fully opaque at camera xz: every positively weighted node-centred linear-filter texel must equal 255. Partial dither edges deliberately retain raw classification; indexed geometry alone does not guarantee surviving fragments there.

The draw's explicit status identity, host/front/count, source surface revision, loft and upload versions prevent old geometry from overriding a new snapshot or same-time restore before the current draw. Held actual draws reuse geometry without uploads. The sound listener calls the same guarded method; a pre-draw listener call can retain the raw fallback until rendering prepares the current mesh. Drawing and held physical contact can differ during collapse: this helper classifies a rendered cavity and does not replace physics contact.

Validation: 44 tests in four files, including ten new tests, pass; strict TypeScript and isolated production build pass. The patch passes `git apply --check` against the unchanged root. Only four scratch source files differ, and all other source/config files remain exact. `surfZoneWorker-BH6FhcTP.js` is byte-identical to 4201 (SHA256 `eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5`). The source patch and full provenance are `cavity-fog.patch` and `cavity-fog-manifest.json`.

No browser, visual comparison, moving capture or FPS measurement has run. The candidate remains outside production. Later frozen QA must call real `drawBarrel` from the exact physical capture and verify active geometry against current exports, rather than fabricate freshness metadata.
