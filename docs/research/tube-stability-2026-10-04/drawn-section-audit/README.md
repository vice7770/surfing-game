# Actual drawn sections: one projected fold per retained frame

The completed offline audit found **one proper projected core crossing in each of the three retained Big frames**, at slices 16 → 17 → 18. Only four sections per frame met the fully weighted, fully formed OPEN criteria. This is a narrow geometry finding from frozen actual drawn F32 inputs. It is not an exact 3D intersection claim, physics fix, completed five-frame capture, rendering diagnosis, or FPS result.

The original [live Big capture](../live-big-capture/README.md) failed after three consecutive drawn publications because another publication was not drawn. This audit reads those three states only; it does not retry native capture, reconstruct missing frames, evolve a solver or import its later export. The repeated initial front/sigma selection is retained as original metadata and does not establish persistent material identity.

## Findings and limits

All 84 section rows are phase OPEN in the captured metadata. **24 of 28 per frame are excluded** from section topology because they are placeholder, unformed or partially weighted/faded; exclusions can overlap and eight rows per frame are placeholders. Twelve sections total qualify for the fully weighted/formed OPEN audit.

| Frame / sea time | Qualified sections | Crossing slice | Whole-134 segment pair | Core-128 segment pair | Opposing OPEN quad normals |
| --- | ---: | ---: | --- | --- | ---: |
| 0 / 327.8077132243035 | 4 | 16 | 77 / 80 | 74 / 77 | 2 |
| 1 / 327.82437989097014 | 4 | 17 | 74 / 77 | 71 / 74 | 0 |
| 2 / 327.8410465576368 | 4 | 18 | 72 / 75 | 69 / 72 | 3 |

The three crossings lie within the core underside branch. Whole-134 indexing includes three extension samples at each end; core-128 pairs therefore differ by three. The whole/core crossing coordinates and strict interior shares are preserved in the [full report](evidence/run-first/report.json.gz). Actual F32 rows are not exactly planar: the maximum stored transverse projection residual is **1.4753486084373435e-5 m**. The section helper measures a 2D projection along each actual slice ray; a crossing there is a projected fold, not proof that the original 3D segments meet exactly.

Qualified sections have no reported underside-below-face ray gaps, nonadjacent endpoint touches, collinear overlaps, duplicate points or zero-length profile segments. The actual drawn triangles have no exact zero-area triangle. Joined strips have no opposing rays or negative row advance in this report. Fully formed OPEN adjacent Jacobian reversal counts are zero in all three frames. The opposing OPEN quad-normal counts 2 / 0 / 3 are descriptive local orientation results, not an automatic defect verdict. Whole-grid reversal records outside this qualified scope remain in the report.

Each frame has 7,182 drawn triangles and 3,591 quads. Winding is compared with the canonical grid index order; actual normal attributes were hash-only in the capture, so the report does not claim an outward-normal comparison. There are no PRE or POST examples here. Three publications cannot establish a material lifecycle, all Big waves, or the cause of the visible tube problem.

## Actual execution and unchanged inputs

Root executed exactly three commands: Node strip-types syntax check, unarmed source/plan command, then one bounded offline numeric gate. All exited 0 in **2026-10-04 06:26:25.209009–06:26:25.667939 UTC**. The 56 before/after input pins were unchanged. The [root terminal](evidence/root-terminal/terminal.json.gz), all three original logs and [audit terminal](evidence/run-first/terminal.json.gz) retain the actual commands and result. No tests, build, browser, GPU, physics step, image capture or timing benchmark ran in this gate.

The gate decoded exactly 45 selected existing gzip field inputs, 397,548 expanded bytes. It measured the actual retained drawn positions/indices, front records and 12 per-slice fields per frame. The independent tested geometry helper is reused literally; its existing eight-test source/proof is SHA-bound to the [profile-phase archive](../profile-phase/README.md). Those tests were not rerun here. No predicate helper was copied or replaced.

The exact [audit source](evidence/audit.ts.txt.gz), [input manifest](evidence/inputs.json.gz), [proposal](evidence/proposal.md.gz) and [readiness](evidence/ready.json.gz) are retained losslessly. The raw readiness still records source-only/no-execution preparation flags; that is historical status. The current outcome is the completed single offline audit above. Ready SHA256 is `cbfe80e092ceab41e7f2e69d948c5112aa70bea240d681973381e0f4312b8515`.

The raw report is **9,242,991 bytes**, SHA256 `b849e0c84102fecd3a7200b454bb00a1fd06b289449ada35b384baedb426acc5`; its deterministic lossless gzip is 1,213,636 bytes, SHA256 `0159b8746622dca1c338ed98581d11c93f8c946064731bdacf753393c588a965`. The report retains every section flag, projection, crossing/ray result, joined-strip measurement, quad and reversal record.

## Archive verification

Run `python3 verify.py` for stored/expanded/alias hashes, closure and arithmetic consistency within the stored report. `python3 verify.py --external` additionally checks the exact existing field/helper archives and committed source blobs. [verification.json](verification.json) records the completed archive verification. **The verifier does not import the audit/helper, rerun intersection tests, recompute geometry metrics, evolve physics, render or measure FPS.** Its only external process reads immutable Git blob bytes.

[manifest.json](manifest.json) preserves original paths/bytes/SHA aliases verbatim. All ten owned source/check/output payloads are deterministic gzip with `mtime=0`; archived source has a `.txt` suffix and no live test file is introduced. The 45 compressed capture inputs are references to byte-identical payload aliases already in the live Big archive, with original compressed and expanded identities checked. The helper and its prior test proof reference exact profile-phase payload aliases. The two canonical numerical/render source identities resolve to immutable Git **`b0e003b8670c9d0be83bc9bb24c30b5382a54499`** blobs. Raw metadata is never rewritten to change historical paths.

This archive duplicates no captured fields, solver state, full source tree, runtime bundles or assets. It changes no production formula, contact, geometry, renderer or snapshot schema. Further acceptance remains separate from this projected-section evidence.
