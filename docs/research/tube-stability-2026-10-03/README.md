# Tube stability checkpoint — 2026-10-03

The shared crest-ray correction removes the reproduced across-front folding from drawing, contact and crash geometry. Existing paced crest motion now finalizes arc coordinates before geometry, widths, throws and landing/gate calculations consume them. The loft emits its vertices once. It retains authored profiles and crest anchors rather than dropping reversed strips.

[Shared rays](shared-rays.md) documents the continuous bound, supported domain, Float32 transport parity, exact CPU fixtures and reproduction commands. [Frozen geometry](frozen-geometry.json) rebuilds eea68720f and the candidate against identical physical input: reversed drawing/contact rows667/667 and729/728 become zero in both specimens. The final minimum uploaded advances are80.34mm and49.56mm. [Crash consistency](crash-consistency.json) records material, timing and ray consistency; arc-derived widths correctly follow finalized geometry.

[Moving regression](moving/README.md) retains complete compressed reports and selected original PNGs from serial24/64-component Wave Lab sessions. Baseline reversed indexed rows55,900/89,426 become zero. Both candidates pass geometry, active upload, snapshot freshness and indexed run-end checks while open tubes, new throws and touchdowns occur. Their fine-grid intrusive measurements are not ordinary FPS evidence. Close images still show flat roofs, fins/facets and seams; tube appearance and complete physical correctness remain unfinished.

## Performance evidence

[Ordinary Padang Big](ordinary-padang-big-fps.md) uses the normal menu route, High graphics, Rich water, High particles, original pixel normals, native DPR and the production60-frame cap on the M5 Pro. The adjacent baseline/candidate passive90-second samples both render60 frames/s. Fresh water publications are55.81/53.20Hz, with simulation/wall progress0.930/0.887. The4.7% publication gap is recorded and not dismissed as proven noise or attributed solely to tube code.

[GPU diagnostics](ordinary-padang-big-gpu-pair.md) found similar actual scene GPU cost8.34/8.26ms median, matched full-bin draw counts and less than0.2% full-bin triangle differences. This separate60-second intrusive pair did not reproduce the passive cadence difference. It excludes the final30seconds and does not establish preservation of late-breaking throughput.

[Two-step catch-up](ordinary-padang-big-fps-catchup-batch2.md) is a rejected experiment. It improves average physics progress to56.80 fixed steps/s and0.947 simulation/wall, while publishing only28.64 fresh water states/s;98.4% of advancing publications contain two steps. The default remains one-step publication. [Scheduling notes](offline-catchup.md) describe exact state/event tests and the tradeoff. The fixed1/60 physics step, High effects and explicit online options remain intact.

The final production build after restoring the default matches every tested frozen4201 index/JavaScript/CSS byte-for-byte: ten files, aggregate SHA256 `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`. Main `index-Dhp1E5Jm.js`; worker `surfZoneWorker-BH6FhcTP.js`. The temporary rejected experiment preview4202 was closed. The user play preview4200 was closed on request and has not been reopened. QA previews are separate from the working source.

## Checks and remaining work

Focused crest-ray/loft/contact, crash/physical-water, mask/renderer and CPU-report tests passed; the23 worker tests also pass with one-step default and explicit batch contracts. The two actual simulation arc-finalization cases pass. Production TypeScript/Vite build and server typecheck pass. These are focused checks, not a claim that every historical test is green. [Inherited rider failures](../performance-2026-10-03/rider-legacy-diagnosis.md) are documented separately; no rider fix or weakened assertion is included.

Continue with a strictly held object/world-ID capture to distinguish filtered-mask coverage, shader complement seams and dry/seabed exposure. The mask audit scripts are still being validated separately from this checkpoint. Then address the remaining roof/lifecycle appearance with physical evidence and pursue the unchanged foam/aeration and late-breaking worker costs. No reference-level visual quality or flawless-tube claim is made.
