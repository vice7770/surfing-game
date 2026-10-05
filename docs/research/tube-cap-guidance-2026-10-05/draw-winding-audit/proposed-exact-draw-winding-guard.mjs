// SOURCE-ONLY, UNEXECUTED IDV5 proposal. Insert inside installGreyOwnershipInspection,
// where owner and must already exist. Keep existing all37, mask and position guards.
// Replace only the erroneous source-index byte-equality assertion in raw() with
// assertActualDrawWinding(loft). Keep immutable drawState/verifyDraw across stages.
function assertActualDrawWinding(loft) {
  const geometry = owner.mesh.geometry;
  const attribute = geometry.index;
  const count = loft.indexCount;
  must(Number.isSafeInteger(count) && count >= 0 && count % 3 === 0
    && geometry.drawRange.start === 0 && geometry.drawRange.count === count
    && attribute && attribute.itemSize === 1 && attribute.array instanceof Uint32Array
    && attribute.array.length >= count && attribute.count >= count,
    'Actual indexed loft draw range/type/capacity differs');
  const index = attribute.array;
  const { positions: p, normals: n, indices: from } = loft;
  for (let i = 0; i < count; i += 3) {
    const a = from[i];
    const b = from[i + 1];
    const c = from[i + 2];
    must(a < loft.vertexCount && b < loft.vertexCount && c < loft.vertexCount,
      'Historical triangle index exceeds active vertex prefix at triangle ' + i / 3);
    const [a3, b3, c3] = [3 * a, 3 * b, 3 * c];
    const e1x = p[b3] - p[a3];
    const e1y = p[b3 + 1] - p[a3 + 1];
    const e1z = p[b3 + 2] - p[a3 + 2];
    const e2x = p[c3] - p[a3];
    const e2y = p[c3 + 1] - p[a3 + 1];
    const e2z = p[c3 + 2] - p[a3 + 2];
    // Identical arithmetic and < 0 branch to pinned historical renderer lines515–519.
    const facing = (e1y * e2z - e1z * e2y) * (n[a3] + n[b3] + n[c3]) + (e1z * e2x - e1x * e2z) * (n[a3 + 1] + n[b3 + 1] + n[c3 + 1])
      + (e1x * e2y - e1y * e2x) * (n[a3 + 2] + n[b3 + 2] + n[c3 + 2]);
    const flip = owner.facesOut && facing < 0;
    must(index[i] === a && index[i + 1] === (flip ? c : b) && index[i + 2] === (flip ? b : c),
      'Actual draw triangle differs from exact existing winding rule at triangle ' + i / 3);
  }
}
