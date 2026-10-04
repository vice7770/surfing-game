# Connected-air audit — 2026-10-04

Read-only audit at `8f79a120fb6b46667f04effc3c03573ec2a0bb03`. No production edits, browsers, servers or solvers.

## Result

`BarrelWater` can report false air if independent sea-connected water solids of one front overlap in XZ. It pools every crossing of that front and computes XOR, not the union of the solids. The scratch fixtures prove the limitation. They do **not** prove that current normal transport/building produces it.

- Three disconnected horizontal sea-connected sheets at Y = 0, 2 and 4, same front ID: query `(0.5,1,0.5)` returns **false**. Each sheet means water below its own surface; their union is water below Y=4, so expected **true**.
- Two such sheets at Y = 0 and 4: all tested queries return **undefined** because the pooled column has even total crossings. Ordinary renderer height then answers.
- Actual shipped Padang geometry: build a single normal 47-slice loft, copy it three times with Y offsets 0, 4 and 8 and no indexed connection between copies. At `(10.25,4.076630115509033,-98.47331619262695)`, independent actual `BarrelWater` answers are `[false,true,true]`; combined same-front answer is **false**. Their solid union is **true**.
- Positive control: a sea floor at Y=0 and a finite rectangular water roof spanning Y=2..3 are **two indexed components** (the roof's four vertical walls are included). Pooled parity correctly reports air at Y=1 and water at Y=2.5. A blanket component split retaining the odd-total guard would reject the finite roof's even-crossing column and lose valid roof membership. Indexed connectivity alone cannot determine bottom occupancy.

## Scope and consumers

- `barrelWater.ts:73..91` pools strips by front ID, rejecting even total counts then taking parity above the query. Prepared ranges use the actual active indices and joined strips. This does not invent triangles or holes in the rendered mesh.
- `rasterizeBarrelMask` takes the maximum triangle mask value, not crossing parity. The three-sheet fixture produces nine mask nodes all 255. It is unaffected by the grouping.
- `SweptBarrel.waterAt` forwards only to the drawn camera classifier. Its only game caller is `PhysicalMode.cameraBelowSurface`, which feeds underwater rendering and audio. Rider collision/contact uses `SweptContact`, not this classifier. `SweptContact` selects the first ray-bracketed strip and does not pool all same-front components; changing only `BarrelWater` does not repair rider passage.
- `dropOverlaps` compares different front groups, not disconnected runs within one front. However the normal `CrestRayPlan` uses increasing X/σ controls and a full-front reach bound to keep row advances positive. The synthetic vertically stacked copies violate that one-front construction. This audit does not establish that two normal disconnected same-front runs overlap in XZ, nor that current production canopies are this limitation.

## Next useful test / constrained fix

Retain run or actual indexed-component IDs with the crossings at a failing **existing native** camera/head point. Show at least two independent sea-connected runs cover that exact XZ and pool to a different membership than their separate answers. A source audit, a disconnected run by itself, or three crossings by itself does not prove the defect. The normal floor/roof/cavity legitimately has three crossings.

If production multiple-volume overlap is confirmed, a physical solid union requires per-component intervals with explicit bottom occupancy/closure followed by interval union; raw concatenation or OR of the current odd-total-only function is insufficient in the general case. The game's existing replacement policy is first front/strip wins instead, so an even smaller consistent fix may be to remove the conflicting same-front run at loft construction, updating drawing, mask and contact together. Do not rewrite camera parity before proving which construction/policy actually applies.

## Reproduction

Run from `/Users/regina/Desktop/Projects/surfing-game`:

```sh
node_modules/.bin/rolldown /private/tmp/tube-connected-air-audit-20261004/audit.ts -o /private/tmp/tube-connected-air-audit-20261004/audit.mjs --format esm --platform node
node /private/tmp/tube-connected-air-audit-20261004/audit.mjs
```

`report.json` is the authoritative numerical receipt. `audit.ts` preserves the exact input and independent component queries; `audit.mjs` preserves the source bundle used. `source-hashes.json` pins the relevant production source and scratch artifacts.
