# Rejected candidate: prepared barrel profile queries

The contact loft repeats case selection for its contact profile, four drawing landmarks, and the two contact clocks used by both crest and lip velocity. A prototype prepared the case bracket once per slice and reused Float64 frame indices and shares. It preserved `pointAt`'s Float64 interpolation and `profileAt`'s intermediate Float32 stores.

The existing library tests and four new parity tests passed: **18/18**. Exact comparisons covered real-case profiles, every profile point, lookup metadata, frame blends, duplicate case boundaries, nearest-slope ties, held/touchdown clocks, legacy and shortened velocity arrays, interleaved queries, and reused output storage.

A bounded Node v23.10.0 benchmark used real cases and 1,000 varying slice queries, with warm-up and five alternating-order trials. Every checksum matched.

| Work per slice | Slices per trial | Median original | Median prepared | Saving per 300 slices |
| --- | ---: | ---: | ---: | ---: |
| Four drawing landmarks plus crest/lip at both velocity clocks | 10,000 | 3.526 ms | 1.486 ms | 0.061 ms |
| Those landmarks plus the contact profile | 5,000 | 4.944 ms | 4.304 ms | 0.038 ms |

These isolated lookup timings establish no gameplay FPS improvement. The saving is too small to justify the additional production API and prepared-query state for this performance pass. The prototype and its new tests were removed; original lookup functions remain unchanged, and no loft wiring was made.

The proposal source, patch, parity tests, benchmark source and raw report are retained in `/private/tmp` as `ProfileLibrary.prepared-proposal.ts`, `prepared-profile-proposal.patch`, `ProfileLibraryPrepared.proposal.test.ts`, `prepared-profile-bench.ts`, and `prepared-profile-bench.json`.
