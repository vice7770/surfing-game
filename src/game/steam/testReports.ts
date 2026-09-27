/** A state report's bytes after its ID (WebHID's `data`), laid out as SDL's TritonMTUNoQuat_t: 45 bytes (spec C1, for tests). */
export function stateBytes(fields: { buttons?: number; lt?: number; rt?: number; lx?: number; ly?: number; rx?: number; ry?: number } = {}): DataView {
  const view = new DataView(new ArrayBuffer(45));
  view.setUint8(0, 1);
  view.setUint32(1, fields.buttons ?? 0, true);
  view.setInt16(5, fields.lt ?? 0, true);
  view.setInt16(7, fields.rt ?? 0, true);
  view.setInt16(9, fields.lx ?? 0, true);
  view.setInt16(11, fields.ly ?? 0, true);
  view.setInt16(13, fields.rx ?? 0, true);
  view.setInt16(15, fields.ry ?? 0, true);
  return view;
}

/** A one-byte report body. */
export function byteReport(value: number): DataView {
  return new DataView(new Uint8Array([value]).buffer);
}
