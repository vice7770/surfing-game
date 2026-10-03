The per-slice bounds fusion was rejected. It preserved every tested value but saved only 0.0053 ms and 0.0145 ms in paired complete-contact updates on the two frozen states. The production contact traversal was restored byte-for-byte to commit `1bcc7c0c9`; its source SHA-256 is `f3e3dc50315d2b9a68dde6d56d7da03cf95921d377b58dbc53130b2d8d6a7f0e`.

The candidate collected four Float64 extrema per slice during the existing projection traversal, then combined adjacent slice bounds when building strip boxes. Global bounds still included isolated slices. This removed repeated vertex reads but added 9,568 bytes of reusable storage at the current loft capacity. It did not cache across updates or change ray plans, normals, geometry, bucket preparation, queries or overlap ordering.

| Frozen state | Joined strips | Paired complete-update saving | Paired projection/index saving |
| --- | ---: | ---: | ---: |
| at-10 | 46 | 0.0053 ms | 0.0093 ms |
| at-20 | 97 | 0.0145 ms | 0.0223 ms |

These are static CPU measurements, not FPS evidence. Each phase used 25 warmups and 101 measured updates per runtime with alternating old/new order. Complete updates rebuilt the real held contact loft over the retained cubic water snapshot. The isolated phase replaced only `loft.build` with that runtime's identical frozen result. Complete-update paired p10–p90 savings ranged from −0.107 to +0.146 ms at-10 and −0.251 to +0.264 ms at-20, substantially wider than the median gain. No claim is made about the late 4.4 ms live contact cost.

[The raw report](contact-preparation-cost.json) retains fixture, case and runtime fingerprints, individual samples and paired summaries. Canonical pre-edit runtime: `/private/tmp/contact-preparation-1bcc7c0c9-before.mjs`, SHA-256 `b4015f9c1e9cf68a8ca22ff067012a7a73918c178deca6711b5d2f0793c7e4f9`. Rejected candidate runtime: `/private/tmp/contact-preparation-after.mjs`, SHA-256 `704011ae651b42a0fe63819abfb10babebbf41190482c3b16500e28c4adb94f5`.

Exact differential checks used the two durable fixtures, then an empty update and a reused at-10 update. All loft scalars and arrays, including padding, matched. All existing preparation arrays, cell bounds, strip order and reached bucket storage matched. The reused geometry report's independent half-open geometric oracle checked 4,016 + 8,404 + 4,016 query probes and compared complete successful hit values exactly. Physical inputs remained unchanged. The new independent full-vertex index regression also covers isolated slices that determine global bounds, moved geometry, capacity changes and empty updates.

All 19 `sweptContact.test.ts` tests passed with the candidate and again after restoration; the strict source typecheck passed with the candidate. The full-quad, lazy preparation, public-loft mutation and existing query regressions were retained. No browser, GPU or simulation was run for this experiment.

The retained runtime files allow rerunning the report without restoring the rejected production change:

```sh
./node_modules/.bin/rolldown scripts/tube-geometry-regression-report.ts -o /private/tmp/contact-preparation-oracle.mjs --format esm --platform node
./node_modules/.bin/rolldown scripts/contact-preparation-report.ts -o /private/tmp/contact-preparation-report.mjs --format esm --platform node
node /private/tmp/contact-preparation-report.mjs --measure --out /private/tmp/contact-preparation-repeat.json
```
