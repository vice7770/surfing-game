# Rejected roof thinning

These three offline trials raised only underside points65–87, preserving every X coordinate, outer crest→lip, lip/throat endpoints and throat→toe floor. All used the same half-separation coefficient, four-point endpoint ramp and continuous onset over 0.15×crest height above toe.

The five captured front48 rows gained room: selected row126 maximum air gap rose **1.192→1.498 m**, with **0.645 m** of width providing ≥1.4 m vertical clearance. No captured row gained a crossing. This local result did not survive the full shipped-case audit:

| Trial | Ceiling | Result over all 293 eligible frames / eight assets |
|---|---|---|
| V1 | Highest outer crossing | Two frames gained crossing pairs; one previously clean Point frame became crossed, and an existing Reef crossing moved. Core crossed frames8→9. |
| V2 | Nearest strictly higher outer crossing | Same air/crossing metrics; one periodic Padang vertex moved less. Both failures remained. |
| V3 | Nearest strictly higher original nonincident contour | Five frames gained crossing pairs, four previously clean. Core crossed frames8→12; full authored-profile crossed frames10→14. |

**Rejected and stopped. No production geometry change was adopted.** Vertex ceilings did not preserve ordering between whole segments. V3's problem receipt clarifies its misleading original-separation metadata labels; use the separately retained before/after roof-order measurements.

The compressed receipts are exact originals. Inputs retain all five captured xyz polylines; the case-frame index records exact offsets and hashes into the eight existing `public/barrels/*.bin` assets, avoiding duplicate case payloads. Case meter conversions are illustrative at h0=7 m; captured measurements are in meters. Core air metrics use the original parity algorithm; V3 additionally checks all128 authored points. Captured rows contain only points32–112.

From this directory, run `python3 replay.py`. Optional `--repo PATH` selects a repository containing the hash-matching assets; `--output PATH` requires a new directory. Replay checks archive and asset hashes, then verifies exact captured-section and case-frame results. `manifest.json` records every archived file; `archive-origins.json` records original paths and hashes. Joined triangles, rendering and physical rider/contact behavior remain unverified by these trials.
