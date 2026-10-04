# Three fixed initial screen rays

Completed bounded offline analysis using exactly the root-specified continuous PNG coordinates `(1350,350)`, `(450,450)` and `(900,150)` in the initial 1708×879 image, with top-left origin and no half-pixel offset. No alternate pixel, epoch, view, native run, resource, build or runtime source change was used. Only this analysis directory was written.

The report records the complete camera position/quaternion/column-major projection, inverse-projection ray reconstruction, exact source/sidecar/helper byte pins, decoded-array word hashes, all positive indexed-loft intersections, barycentric supplied normals, intended renderer winding and ideal reflected-ray intersections. Initial camera matches the saved initial checkpoint and observation0. Reprojection residual is below 1e-9 pixels; maximum ray/barycentric point closure residual is 2.864289338439558e-14 m. Initial mesh has 119 slices, 15,946 vertices and 31,122 indexed triangles. The verified phase2 sidecar is retained only as a provenance check; its geometry was not traced.

## Geometry results

All nearest hits belong to front 106, joined run rows 61–118, matching captured helper component 47880. Each raw triangle is reversed by the source default `facesOut` rule, and the resulting intended triangle is front-facing. Normalized supplied-normal versus intended geometric-normal dot products are 0.999511 (curtain), 0.990843 (wall), 0.994637 (roof). These three samples do not show a local supplied-normal/front-back reversal.

| Root visual label / fixed coordinate | Nearest barrel triangle / distance | Slice rows / contour indices | Ideal reflected ray's next barrel hit |
|---|---|---|---|
| Right curtain `(1350,350)` | 24363 / 2.451847327 m | 92–93 / inner-return75–76 | Lower-root93–94 in rows94–95 after 1.349141958 m |
| Green wall `(450,450)` | 24126 / 1.235716561 m | 91–92 / face90–91 | Inner-return74–75 in rows92–93 after 2.127105072 m |
| Roof `(900,150)` | 24382 / 2.523092401 m | 92–93 / upper-root85–86 | Inner-return78–79 in rows93–94 after 0.845129548 m |

The reflected rays all rehit the same joined component. The ideal reflection direction is invariant under reversing a normal's sign; correct DoubleSide orientation still matters for other material terms.

## Same-ray source angular gate addition

Root authorized one addition on the same three ideal reflected directions. The analyzer reconstructs the exact generated F32 per-vertex `SweptTube` and `SweptRay` attributes from each saved slice's tip, mouth distance, drawing ray and the outer-lip40→60 chord. It interpolates them and saved throat attributes using the hit's world-triangle barycentric weights, consistent with perspective-correct interpolation. This is a source reconstruction in double arithmetic, not captured GPU varyings.

The source `sweptLeaves` opening predicate is `across.y>=0 && across.x*tip.y-across.y*tip.x>=0`; the separate mouth predicate is `along*length(tip)>mouth*length(across)` (`SweptBarrelMesh.ts:219–228`). All three have throat.w=1. Both predicates fail, so the reconstructed ideal reflected-radiance multiplier is zero for all three (`250–264`).

| Fixed ray | Relative tip `(across,up)` | Ideal mirror `(across,up)` | Opening determinant | Mouth left / right | Result |
|---|---|---|---|---|---|
| Curtain | (+0.580237,−1.415985) | (−0.322280,−0.440972) | +0.712212 | 1.281840 / 2.428073 | Opening fails upward condition; mouth false |
| Wall | (+2.366199,−1.169867) | (+0.918031,+0.139915) | −1.405041 | 0.979296 / 4.624134 | Opening determinant fails; mouth false |
| Roof | (+1.588130,−1.873985) | (+0.940771,−0.320836) | −1.253461 | 0.269248 / 4.000288 | Opening fails; mouth false |

None exercises a below-fragment tip plus backward **upward** reflected direction passing the current opening predicate. Adding nonnegative-across/tip-height guards would not alter these three ideal gate results. These samples consequently provide no concrete evidence to justify that guard edit as a curtain correction. They also do not prove that the shader's approximate angular test agrees with full geometry for other inputs.

## Final same-ray thin-sheet transmission addition

Root authorized a final source reconstruction of `RICH_SHEET_TRANSMISSION` on these same three entry rays and ideal supplied entry normals. It computes entry refraction with source literal eta 0.750188, then exit refraction with eta 1.333000. The far-interface normal is the source-normalized mean outer-lip normal generated from barycentric `vSweptRay.zw`, signed according to its dot with the entry normal. Gate 1 requires the inside ray to point toward that normal's interface and the outgoing ray to be nonzero (`SweptBarrelMesh.ts:138–146`). The shader uses this path for a separate thin-sheet environment contribution (`163–187`); the mirror gate does not cover it.

| Fixed ray | Sheet thickness / weight / back | Inside dot far-inward normal | Ideal outgoing vector / gate |
|---|---|---|---|
| Curtain | 0.124586975 m / 1 / 1 | −0.845564666 | (+0.654089749,+0.221826358,+0.723159503), no TIR, gate 1 |
| Wall | 0 m / 0 / 0 | −0.256053547 | Zero, TIR, gate 0; sheet contribution inactive |
| Roof | 0.414198031 m / 0.736213100 / 1 | +0.338783699 | Zero, away from mean exit interface and TIR, gate 0 |

For the curtain, the mean outer normal is `(0,+0.626746920,+0.779222881)`. The ideal inside direction is `(+0.490689984,+0.366051791,+0.790714503)`. A positive ideal sheet-environment scalar support exists (sheetWeight×sheetBack×gate=1), even though its ideal mirror gate is zero. This is a concrete separate source pathway consistent with possible sky radiance; it does **not** establish actual pixel ownership, emitted radiance, the perturbed fragment gate or curtain causality.

The curtain's inner indices75/76/76 pair with exterior51/50/50 by `j=126-i` (`sharedUpperRoot.ts:56`). Their stored world X/Z match exactly; positive outer-minus-inner Y separations are 0.222348213,0.164723158,0.205175877 m. The paired interpolated supplied exterior normal is `(−0.046791924,+0.601836453,+0.797247389)`: 3.208419° from the mean exit normal. Its three paired vertex normals vary by at most 3.491723°. Discrete exterior contour turn divided by mean adjacent segment length is 0.285787,0.274584,0.347274 m⁻¹ at those vertices. These are local discrete bending metrics, not continuous principal curvature.

The explicitly hypothetical alternative changes only the far-interface normal to that paired supplied normal. Entry ray/normal and Snell literals stay the same. It still points toward the far interface (insideDotFar=−0.827738056), still has no TIR and keeps gate 1. Its outgoing direction `(+0.674661241,+0.223357060,+0.703522447)` differs by 1.631872°. The paired point is a vertical geometric correspondence, **not** the interior ray's established exit intersection. Therefore this sample exposes the mean-normal/local-curvature approximation but supplies no gate-changing evidence that replacing it will remove the curtain.

Wall90–91 is outside the shared underside68–88 domain and has no paired exit under this contract. Roof85–86 **is** a shared region: its exterior pairing41/40 has exact stored X/Z equality and positive separation. Its source mean-exit result is recorded above; the requested hypothetical paired-normal alternative was evaluated only for the curtain. No outgoing-refraction mesh-ray search or additional screen ray was performed.

## Provenance and source authority

Input report: 9,452,886 bytes, SHA256 `a4934771a954d4363d3618719ac0e4ef236aeac1ca2f6d938940dabd7f87a988`.

- Initial sidecar: 1,796,420 bytes, SHA256 `1a9722cc198f7cb4c4df56de1ece30e2417fbd462df2249c54d4cb143f17c32f`; epoch step0, seaTime361.80670943368096, surfaceRevision2.
- Phase2 sidecar: 2,280,086 bytes, SHA256 `fbbfce1016677cfdf0f87c38207602148870de1910b68d3a284a89acaf4b3f2d`; epoch step47, seaTime362.59004276701427, surfaceRevision49.
- Initial PNG: 960,567 bytes, SHA256 `1edc65f94ad788d211dfa626a9446c576dbd4a710f4e5976576a3ead2794b237`; decoded IHDR dimensions1708×879, same hash as root's pixel-inspection record.

Both sidecars match saved report bytes/hashes/counts/epochs. Every decoded array matches its declared active word count, byte length and dtype; the sum matches rawBytes. Thirteen needed source files match capture-seal pins and two capture helpers match helper pins. All inspected source, helper, report, sidecar, PNG and root-inspection bytes remain unchanged after analysis. Each exact pin is in `report.json`.

The source copies world-coordinate loft vertices and supplied normals (`SweptBarrelMesh.ts:97,401–404`), generates throat/tube/ray attributes (`423–449`), reverses raw triangle order if cross-dot-summed-normals is negative (`456–476`), and uses DoubleSide (`330`). The normal implementation comes from the locally available Three 0.186.1, whose exact lock entry is sealed; the specific dependency reference files were hashed separately because node_modules files are not individually in the capture source seal. Each vertex normal is normalized before interpolation, then fragment-normalized and oriented by gl_FrontFacing. Rich subsequently applies chop/ripple perturbation (`richWaterGlsl.ts:123–133`). The mesh is source-created with identity transform and added directly to the scene (`PhysicalMode.ts:547`); no GPU matrix or post-update index readback is retained.

Final analysis report after both authorized same-ray additions: 109,713 bytes, SHA256 `68b07164a2a68d1bf5521b806cbac6b9fe86184f7ef83eeedf81609be2f675e4`. `analyze.py` is the bounded standalone analyzer and `report.json` is its complete result. Earlier intermediate hashes in parent messages are superseded only for this new analysis output; no frozen capture/owner/evidence file was changed.

## Limits

Nearest BARREL geometry is not per-pixel GPU ownership. Ordinary-water triangles, barrel mask texture/dither outcomes, depth-buffer ownership and other draw objects were not retained. Fragment chop/ripple normals, actual varyings/float arithmetic, roughness-dependent environment sampling and final shader output were not retained. The ideal mirror/gate results therefore do not establish actual reflection admissibility or the cause of the observed sky curtain. No contour width, visible mouth, body passage, FPS or adoption conclusion follows.
