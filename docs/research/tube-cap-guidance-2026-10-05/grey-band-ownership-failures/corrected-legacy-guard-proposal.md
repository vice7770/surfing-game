# Historical legacy guard correction: source proposal

The preserved ID V3 helper required `legacy.geometry.drawRange.count === 0` and failed at that guard before the baseline or any probe. Its failed receipt does not record the actual index count, position count or draw-range value, so no runtime count or Infinity value is inferred from it.

Historical source reasoning at commit `6bcae3aa0740cb66187f572a03cc8abbb1981030` showed that PhysicalMode passes zero legacy lip parcels for the swept mode. LipSheetMesh installs the built position and index buffers without assigning an explicit draw range. Empty indexed geometry may retain the default unbounded draw range while drawing no triangles. This explains why the count-equals-zero guard did not express the intended invariant; it remains source reasoning, not an observed ID V3 geometry measurement.

The proposed guard requires the actual indexed geometry and position attribute to exist with both counts zero. It snapshots the actual mesh/geometry identities, visibility, draw range, groups and attribute identities/words, verifies they remain identical after each intended draw, and records installation/capture state. Nonfinite draw-range values should be encoded explicitly as strings such as `Infinity`, rather than silently becoming JSON null. These actual state checks still require their own completed diagnostic outcome.

All shader RGB/cos delta, callback, repair, defines and material predicates were intended to remain unchanged by that guard-only proposal. This note includes no V4 runner/source freeze, execution result, baseline or probe; those belong to a separate attempt. It neither supplies the missing ID V3 runtime state nor identifies the grey band's drawable.
