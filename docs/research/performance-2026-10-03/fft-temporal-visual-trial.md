# Held visual trial for 30 Hz FFT shading

Prepared driver: `scripts/browser/fft-temporal-visual-trial.mjs`. **Unrun after the performance rejection.** No visual GPU trial was performed. Production retains the original FFT. Any future trial requires explicitly applying [the archived candidate patch](fft-temporal-candidate.patch) before building a candidate, or explicitly identifying a retained immutable candidate preview, plus renewed exclusive GPU coordination.

The driver invokes the existing, unchanged `tube-frozen-render.mjs` for archived physical captures 10 and 20 on the original FFT build at 4201 and an explicitly identified candidate preview (the corrected frozen candidate was 4204; 4203 was the invalid-seed eager build). Both previews receive the exact same current continuous-plan drawing geometry and rasterized mask, copied under both filenames expected by the base harness. Camera framing comes from those same geometry bounds. Viewport is 1280×720 at DPR 1, midday lighting, High/Rich look and original pixel normals.

The archived sea times are 173.88921329749155 and 179.9392132974912 seconds. Their 30 Hz interpolation shares are approximately 0.6764 and 0.1764, so these are genuine in-between endpoint trials. Physics never advances. The saved full height/foam/front arrays are held; the archive does not contain original bed, flow, aeration, particles or rider state. The base harness reconstructs bed/far-field from the same configuration, uses identical zero flow/aeration and hides the missing rider/particle/lip effects. This is a held water/tube/optics comparison, not a full moving-scene or FPS result.

Actual game caustics remain enabled at the held sea clock. The driver does not freeze the caustic target, wrap shaders or use the FBO-based mask diagnostic; the candidate's extra FFT targets therefore do not enter old mask-target assumptions. It retains visible, hidden-tube and repeated visible PNGs for each build/capture. The hidden image must demonstrate that the actual tube affects the image.

All served JavaScript and worker hashes are verified against each supplied immutable directory and retained in the underlying reports. Exported geometry, masks, physical fields, camera, uniforms and light parameters must match across builds. Newly constructed texture/environment UUIDs are excluded from cross-process comparisons because those are object identities; texture content hashes and dimensions remain checked wherever the base harness exposes CPU content.

The existing pixel-metric helper compares original-versus-candidate and the repeated original and candidate images. The base harness requires pixel-exact repeats and rejects any difference. This driver preserves that rejection in the raw report. Only an explicit repeat-image failure with unchanged input/state/provenance/visibility can be classified as a state-valid trial with repeat variability; other failures stop the comparison. Repeat variability with caustics enabled is reported, not uniquely attributed to caustics. The comparison uses descriptive channel differences, with no arbitrary visual acceptance threshold.

Preparation and, after coordination, execution:

```sh
node scripts/browser/fft-temporal-visual-trial.mjs --plan --afterUrl=http://localhost:4204/ --afterDir=/absolute/immutable/4204-directory
node scripts/browser/fft-temporal-visual-trial.mjs --run --afterUrl=http://localhost:4204/ --afterDir=/absolute/immutable/4204-directory
```

Default output is `/private/tmp/fft-temporal-visual-trial`. Four short jobs run sequentially (two captures × two editions), each with a 60-second failure deadline. The base harness owns and closes each temporary Chrome instance before the next job begins. The original frozen play port 4200 is forbidden.
