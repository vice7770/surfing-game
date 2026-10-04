# Read-only integration dependency review

The same modified profile must feed drawing, contact and crash geometry. A loft-only position change leaves original-profile dependencies stale.

| Quantity to recompute | Existing source and line |
| --- | --- |
| Held void height, collapseSeconds=√(2W/g), live-slice lifetime and fade | `src/wave/barrel/ProfileLibrary.ts:132`, `:308` |
| Opposite-run sheet thickness, underside formation weight, outer far-side sky view | `src/wave/barrel/lipSheet.ts:230` |
| Inner sky/lip view, normals including 64/88 neighbors, mean lip thickness 40–60 | `src/wave/barrel/lipSheet.ts:71`, `src/wave/barrel/sweptLoft.ts:685` |
| Held jet area, void area, diameter and axis; spray water/bubble air/crash timing | `src/wave/barrel/heldOverturn.ts:31`, `src/wave/barrel/crashCurve.ts:114`, `src/wave/barrel/SweptCrash.ts:401` |
| Loft positions/normals, triangle facing, formation-dependent mouth distance/uploads | `src/wave/barrel/sweptLoft.ts:742`, `:894`, `src/scene/barrel/SweptBarrelMesh.ts:457` |
| Contact projection/strips/grid/buckets/crossings; parity, floor/ceiling/clearance/normals | `src/wave/barrel/sweptContact.ts:198`, `:250`, `src/physics/PhysicalSurfWater.ts:469` |
| Draw mask support and camera-water crossings/revision | `src/scene/barrel/SweptBarrel.ts:120`, `src/scene/barrel/barrelWater.ts:22` |

Paths are relative to `/Users/regina/Desktop/Projects/surfing-game`. They were read only, not changed.

`ProfileLibrary.held` is measured at construction. Sheet tables use a WeakMap keyed by BarrelCase. CrashCurve.overturns is computed once. Crest-ray envelopes are library/slope-cached (`src/wave/barrel/crestRays.ts:38`). Fresh transformed case objects and fresh library/consumers avoid those stale caches; mutating the original case in place would not.

Only changing 65–87 leaves held selection/clear flag's fixed tip 64/throat 88 and lower 88–127 inputs unchanged. It also leaves case scaling/bracketing, touchdown/frame times, crest anchor, tip positions/velocities and fixed outer/floor landmarks unchanged. The selector never tests the proposed inner roof's validity.

This review was independently delegated and performed without edits, launches or verification runs. No production integration is authorized or established by this rejected offline receipt.
